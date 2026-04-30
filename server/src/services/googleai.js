const axios = require('axios');
const sharp = require('sharp');

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function apiKey() {
  return process.env.GOOGLE_AI_API_KEY;
}

function isConfigured() {
  return Boolean(apiKey());
}

function parseList(env, fallback) {
  const raw = (process.env[env] || '').trim();
  if (!raw) return fallback;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

const GOOGLE_TEXT_MODELS = parseList('GOOGLE_AI_TEXT_MODELS', [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
]);

const GOOGLE_VISION_MODELS = parseList('GOOGLE_AI_VISION_MODELS', [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
]);

async function toJpegBase64(imageInput) {
  let buffer;
  if (Buffer.isBuffer(imageInput)) {
    buffer = imageInput;
  } else if (typeof imageInput === 'string') {
    buffer = imageInput.startsWith('data:')
      ? Buffer.from(imageInput.replace(/^data:image\/\w+;base64,/, ''), 'base64')
      : Buffer.from(imageInput, 'base64');
  } else {
    throw new Error('Unsupported image input');
  }
  const optimized = await sharp(buffer)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
  return optimized.toString('base64');
}

// Convert OpenAI-style messages to Gemini "contents" format.
// Supports:
//  - { role: 'system', content: '...' }  → prepended to the first user message
//  - { role: 'user'|'assistant', content: '...' }
//  - { role: 'user', content: [{type:'text',text}, {type:'image_url', image_url:{url: 'data:image/jpeg;base64,...'}}] }
function toGeminiContents(messages) {
  const contents = [];
  const systemParts = [];
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemParts.push(msg.content);
      continue;
    }
    const role = msg.role === 'assistant' ? 'model' : 'user';
    let parts;
    if (Array.isArray(msg.content)) {
      parts = msg.content.map((item) => {
        if (item.type === 'image_url' && item.image_url && item.image_url.url) {
          const url = item.image_url.url;
          const m = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(url);
          if (m) return { inline_data: { mime_type: m[1], data: m[2] } };
          return { text: '[image]' };
        }
        return { text: item.text || '' };
      });
    } else {
      parts = [{ text: String(msg.content || '') }];
    }
    // Prepend system to the first user message's first text part
    if (systemParts.length && role === 'user' && contents.length === 0) {
      const sysText = systemParts.join('\n\n');
      const firstTextIdx = parts.findIndex((p) => typeof p.text === 'string');
      if (firstTextIdx >= 0) {
        parts[firstTextIdx] = { text: sysText + '\n\n' + parts[firstTextIdx].text };
      } else {
        parts.unshift({ text: sysText });
      }
      systemParts.length = 0;
    }
    contents.push({ role, parts });
  }
  // If no user message consumed the system prompt, prepend a user turn
  if (systemParts.length) {
    contents.unshift({ role: 'user', parts: [{ text: systemParts.join('\n\n') }] });
  }
  return contents;
}

async function callGemini(model, messages, { temperature = 0.3, maxTokens = 2000 } = {}) {
  if (!isConfigured()) throw new Error('GOOGLE_AI_API_KEY not set');
  const contents = toGeminiContents(messages);
  const { data } = await axios.post(
    `${API_BASE}/models/${model}:generateContent?key=${apiKey()}`,
    {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 120000 }
  );
  if (data && data.error) {
    const err = new Error(data.error.message || 'Gemini error');
    err.code = data.error.code;
    throw err;
  }
  const cand = data && data.candidates && data.candidates[0];
  if (!cand) throw new Error('Gemini returned no candidates');
  const text = ((cand.content && cand.content.parts) || [])
    .map((p) => p.text || '')
    .join('\n')
    .trim();
  return text;
}

async function tryModels(models, messages, opts = {}) {
  let lastErr;
  for (const model of models) {
    try {
      const text = await callGemini(model, messages, opts);
      return { text, model };
    } catch (err) {
      lastErr = err;
      const status = err.response && err.response.status;
      const code = err.code || status;
      const msg = (err.response && err.response.data && err.response.data.error && err.response.data.error.message) || err.message;
      console.warn(`[googleai] ${model} failed (code=${code}): ${String(msg).slice(0, 140)}`);
      // only skip to next on quota / rate / not-found errors
      if (![403, 404, 429, 500, 502, 503].includes(status) && code !== 429) break;
    }
  }
  throw lastErr || new Error('Google AI call failed');
}

async function chatCompletion(messages, opts = {}) {
  return tryModels(GOOGLE_TEXT_MODELS, messages, opts);
}

async function visionCompletion(messages, opts = {}) {
  return tryModels(GOOGLE_VISION_MODELS, messages, opts);
}

module.exports = {
  isConfigured,
  chatCompletion,
  visionCompletion,
  toJpegBase64,
  GOOGLE_TEXT_MODELS,
  GOOGLE_VISION_MODELS,
};
