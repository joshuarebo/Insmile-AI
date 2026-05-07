const axios = require('axios');
const { extractJson, finalizeAnalysis, toBase64 } = require('./ai-utils');

const HF_ENDPOINT_URL = process.env.HF_ENDPOINT_URL;
const HF_API_TOKEN = process.env.HF_API_TOKEN;
const HF_MODEL_ID = process.env.HF_MODEL_ID || 'joshuarebo/insmile-dental-vision-lora';
const HF_TIMEOUT = parseInt(process.env.HF_TIMEOUT || '180000');
const HF_PROVIDER_MODE = process.env.HF_PROVIDER_MODE || 'disabled';

function isConfigured() {
  return Boolean(HF_ENDPOINT_URL && HF_API_TOKEN);
}

function isEnabled() {
  return HF_PROVIDER_MODE !== 'disabled' && isConfigured();
}

function getMode() {
  return HF_PROVIDER_MODE;
}

const SYSTEM_PROMPT = `You are an expert dental radiologist AI. Analyze the dental X-ray and return a JSON object with your findings.

Output format:
{"findings": [{"label": "specific finding", "tooth": "FDI number", "severity": "mild|moderate|severe", "confidence": 0.0-1.0, "bbox_norm": [x, y, w, h]}], "overall": "summary", "confidence": 0.0-1.0, "recommendations": ["action"], "image_quality": "good|fair|poor"}

Rules: bbox_norm values are 0.0-1.0 (normalized). Use FDI tooth numbering. Return JSON ONLY.`;

const USER_PROMPT = 'Analyze this dental radiograph. Identify all visible pathology using FDI tooth numbering. Return ONLY the JSON object.';

async function callEndpoint(payload) {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data } = await axios.post(HF_ENDPOINT_URL, payload, {
        headers: {
          Authorization: `Bearer ${HF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: HF_TIMEOUT,
      });
      return data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 503 || status === 429) {
        const wait = attempt === 0 ? 15000 : 30000;
        console.warn(`[huggingface] Endpoint loading (attempt ${attempt + 1}/${maxRetries}), waiting ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw new Error('HuggingFace endpoint unavailable after retries (cold start timeout)');
}

async function analyzeScan(imageInput) {
  if (!isConfigured()) {
    throw new Error('HuggingFace not configured (HF_ENDPOINT_URL or HF_API_TOKEN missing)');
  }

  const b64 = await toBase64(imageInput, { maxSize: 448, quality: 90 });

  const payload = {
    inputs: {
      image: b64,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image', image: `data:image/jpeg;base64,${b64}` },
            { type: 'text', text: USER_PROMPT },
          ],
        },
      ],
    },
    parameters: {
      max_new_tokens: 1500,
      temperature: 0.1,
    },
  };

  const startTime = Date.now();
  const response = await callEndpoint(payload);
  const latencyMs = Date.now() - startTime;

  const text = typeof response === 'string' ? response
    : response?.generated_text || response?.[0]?.generated_text || JSON.stringify(response);

  const parsed = extractJson(text);
  if (parsed && Array.isArray(parsed.findings)) {
    const result = finalizeAnalysis(parsed, HF_MODEL_ID, 'huggingface');
    result._latencyMs = latencyMs;
    return result;
  }

  console.warn(`[huggingface] Unparseable response (${text?.length || 0} chars): ${text?.slice(0, 200)}`);
  throw new Error('HuggingFace model returned unparseable response');
}

async function getStatus() {
  if (!isConfigured()) return { status: 'not_configured' };
  try {
    await axios.get(HF_ENDPOINT_URL, {
      headers: { Authorization: `Bearer ${HF_API_TOKEN}` },
      timeout: 10000,
    });
    return { status: 'ready', model: HF_MODEL_ID };
  } catch (err) {
    const status = err.response?.status;
    if (status === 503) return { status: 'loading', model: HF_MODEL_ID };
    return { status: 'error', error: err.message };
  }
}

module.exports = {
  isConfigured,
  isEnabled,
  getMode,
  analyzeScan,
  getStatus,
  HF_MODEL_ID,
};
