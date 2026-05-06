const axios = require('axios');
const sharp = require('sharp');
const googleai = require('./googleai');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function parseList(env, fallback) {
  const raw = (process.env[env] || '').trim();
  if (!raw) return fallback;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

const TEXT_MODELS = parseList('OPENROUTER_TEXT_MODELS', [
  process.env.OPENROUTER_TEXT_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-120b:free',
  'google/gemma-3-27b-it:free',
  'z-ai/glm-4.5-air:free',
]);
const VISION_MODELS = parseList('OPENROUTER_VISION_MODELS', [
  process.env.OPENROUTER_VISION_MODEL || 'google/gemma-3-27b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'meta-llama/llama-4-maverick:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
]);

const TEXT_MODEL = TEXT_MODELS[0];
const VISION_MODEL = VISION_MODELS[0];

function apiKey() {
  return process.env.OPENROUTER_API_KEY;
}

function isConfigured() {
  return Boolean(apiKey());
}

async function callModel(model, messages, { temperature = 0.3, maxTokens = 2000 } = {}) {
  const { data } = await axios.post(
    OPENROUTER_URL,
    { model, messages, temperature, max_tokens: maxTokens },
    {
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://insmile.ai',
        'X-Title': 'Insmile AI — Kenya',
      },
      timeout: 120000,
    }
  );
  // OpenRouter sometimes returns 200 with an `error` body instead of an HTTP error
  if (data && data.error) {
    const err = new Error(data.error.message || 'OpenRouter error');
    err.code = data.error.code;
    throw err;
  }
  const choice = data && data.choices && data.choices[0];
  if (!choice) throw new Error('OpenRouter returned no choices');
  return choice.message.content || '';
}

function isRetryable(err) {
  const status = err.response && err.response.status;
  const upstream = err.response && err.response.data && err.response.data.error;
  const code = err.code || (upstream && upstream.code);
  return (
    status === 429 ||
    status === 502 ||
    status === 503 ||
    code === 429 ||
    (upstream && /rate[- ]?limit|temporarily|no endpoints/i.test(upstream.message || '')) ||
    /rate[- ]?limit|temporarily/i.test(err.message || '')
  );
}

async function callOpenRouter(modelOrList, messages, opts = {}) {
  if (!isConfigured()) {
    throw new Error('OPENROUTER_API_KEY not set. Add it to server/.env to enable AI.');
  }
  const models = Array.isArray(modelOrList) ? modelOrList.slice() : [modelOrList];
  // Stay within the requested pool — don't spill text into vision or vice versa.
  const allCandidates = models;

  let lastErr;
  for (let i = 0; i < allCandidates.length; i++) {
    const model = allCandidates[i];
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1500));
      try {
        const text = await callModel(model, messages, opts);
        if (i > 0 || attempt > 0) {
          console.log(`[openrouter] succeeded with ${model} (fallback #${i}, retry ${attempt})`);
        }
        return { text, model };
      } catch (err) {
        lastErr = err;
        const status = err.response && err.response.status;
        const upstream = err.response && err.response.data && err.response.data.error;
        const code = err.code || (upstream && upstream.code);
        console.warn(`[openrouter] ${model} attempt ${attempt} failed (status=${status || '-'}, code=${code || '-'}): ${(upstream && upstream.message) || err.message}`);
        if (!isRetryable(err)) {
          // Non-retryable on this model; still try the next candidate
          break;
        }
      }
    }
  }
  const upstream = lastErr && lastErr.response && lastErr.response.data && lastErr.response.data.error;
  const msg = (upstream && upstream.message) || (lastErr && lastErr.message) || 'OpenRouter call failed';
  const err = new Error(`All free models throttled. Last error: ${msg}`);
  err.status = lastErr && lastErr.response && lastErr.response.status;
  throw err;
}

function extractJson(text) {
  if (!text) return null;
  // Strip common chain-of-thought / reasoning wrappers
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*(?:Thought|Reasoning|Analysis)\s*:.*?\n/gim, '')
    .trim();

  // 1) Try fenced code block
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch {}
  }

  // 2) Scan forward for the first '{' and try every matching '}' from longest to shortest
  const first = cleaned.indexOf('{');
  if (first === -1) return null;
  const last = cleaned.lastIndexOf('}');
  if (last <= first) return null;

  // Try the widest slice first, then progressively narrow from the right
  const slice = cleaned.slice(first, last + 1);
  try { return JSON.parse(slice); } catch {}

  // 3) Progressive right-to-left truncation — handles trailing noise after JSON
  for (let end = last; end > first; end--) {
    if (cleaned[end] !== '}') continue;
    try { return JSON.parse(cleaned.slice(first, end + 1)); } catch {}
  }

  // 4) Try to fix common issues (trailing commas, single quotes)
  try {
    const fixed = slice
      .replace(/,\s*([}\]])/g, '$1')        // trailing commas
      .replace(/'/g, '"');                   // single → double quotes
    return JSON.parse(fixed);
  } catch {}

  return null;
}

async function toBase64(imageInput) {
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
    .resize(1536, 1536, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toBuffer();
  return optimized.toString('base64');
}

const VISION_SYSTEM_PROMPT = `You are an expert dental radiologist AI performing diagnostic analysis of dental X-rays (periapical, bitewing, panoramic/OPG, and CBCT slices) and intraoral photographs for a dental clinic in Kenya. You have deep training in oral radiology and pathology.

## WHAT TO LOOK FOR

Systematically evaluate the image for these pathologies:

**Caries (decay)**
- Interproximal caries: dark shadows at contact points between teeth
- Occlusal caries: radiolucency on biting surfaces
- Cervical/root caries: radiolucency at or below the CEJ
- Recurrent caries: radiolucency around existing restorations
- Grade: incipient (enamel only) → moderate (into dentin) → severe (near/into pulp)

**Periodontal disease**
- Horizontal bone loss: uniform reduction in alveolar bone height
- Vertical/angular bone loss: localized defects on one side of a tooth
- Furcation involvement: radiolucency in the furcation area of molars
- Widened PDL space: early sign of inflammation or trauma

**Periapical pathology**
- Periapical radiolucency: dark area at root apex (abscess, granuloma, or cyst)
- Periapical condensing osteitis: radiopaque area at apex (chronic low-grade infection)

**Restorations & prosthetics**
- Overhanging restorations
- Open margins
- Fractured restorations
- Ill-fitting crowns or bridges

**Other**
- Impacted teeth (especially third molars)
- Root fractures
- Root resorption (internal or external)
- Calculus deposits (radiopaque along root surfaces)
- Supernumerary teeth
- Dental fluorosis patterns (common in Kenya's Rift Valley)
- Tooth erosion or attrition

## FDI TOOTH NUMBERING (use this system)
- Upper right: 11-18 (central incisor to third molar)
- Upper left: 21-28
- Lower left: 31-38
- Lower right: 41-48
- For panoramic X-rays: the patient's right side appears on the LEFT of the image

## BOUNDING BOX INSTRUCTIONS
- bbox_norm = [x, y, width, height] as DECIMALS between 0.0 and 1.0
- x,y = top-left corner of the box relative to image dimensions
- width,height = size of the box relative to image dimensions
- Example: a finding on a lower-right molar might be [0.6, 0.7, 0.12, 0.15]
- The box should tightly surround the pathology, not the entire tooth
- NEVER use [0,0,1,1]. NEVER use pixel values. ALL values must be 0.0-1.0.
- If you cannot locate a finding precisely, use your best estimate

## OUTPUT FORMAT — STRICT JSON ONLY

{
  "findings": [
    {
      "label": "specific clinical finding (e.g. 'Mesial caries on 36 extending into dentin')",
      "tooth": "FDI number as string (e.g. '36') or null if not identifiable",
      "severity": "mild" | "moderate" | "severe",
      "confidence": 0.0-1.0,
      "bbox_norm": [x, y, w, h]
    }
  ],
  "overall": "concise clinical summary in 1-2 sentences",
  "confidence": 0.0-1.0,
  "recommendations": ["specific actionable recommendation", ...],
  "image_quality": "good" | "fair" | "poor"
}

## RULES
- Report 1-6 findings maximum, ordered by clinical severity (most severe first)
- Be SPECIFIC in labels: "Mesial caries on 36 into dentin" NOT "Cavity detected"
- Severity grading: mild = enamel/early, moderate = dentin involvement, severe = pulp/periapical/advanced
- Confidence: 0.9+ only for very clear pathology; use 0.5-0.7 for subtle findings
- If the image is not a dental scan, return empty findings with appropriate overall message
- Do NOT hallucinate findings. If unsure, lower the confidence score rather than omitting
- Respond with RAW JSON ONLY. No markdown fencing, no preamble, no explanation, no trailing text.`;

const VISION_USER_PROMPT = `Analyze this dental radiograph/image. Identify all visible pathology using FDI tooth numbering. For each finding, provide a precise bounding box around the specific area of concern.

Important: Return ONLY the JSON object as specified. No other text.`;

async function analyzeScan(imageInput) {
  const b64 = await toBase64(imageInput);
  const dataUrl = `data:image/jpeg;base64,${b64}`;

  const messages = [
    { role: 'system', content: VISION_SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: VISION_USER_PROMPT },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    },
  ];

  // Try each OpenRouter vision model. Accept first parseable {findings: [...]}
  let lastRaw = '';
  let lastModel = VISION_MODELS[0];
  let lastErr;
  for (const model of VISION_MODELS) {
    try {
      const { text } = await callOpenRouter([model], messages, { temperature: 0.15, maxTokens: 3500 });
      lastRaw = text;
      lastModel = model;
      const parsed = extractJson(text);
      if (parsed && Array.isArray(parsed.findings)) {
        return finalizeAnalysis(parsed, model, 'openrouter');
      }

      // Two-pass fallback: if model returned prose instead of JSON, ask a text model to extract
      if (text && text.length > 50) {
        console.warn(`[vision] ${model} returned prose, attempting JSON extraction via text model`);
        const extractResult = await extractFindingsFromProse(text, dataUrl);
        if (extractResult) return extractResult;
      }

      console.warn(`[vision] ${model} returned unparseable response, trying next model`);
    } catch (err) {
      lastErr = err;
      console.warn(`[vision] ${model} failed: ${err.message}`);
    }
  }

  // Fallback: Google AI Studio (Gemini)
  if (googleai.isConfigured()) {
    console.warn('[provider] OpenRouter vision exhausted, falling back to Google AI Studio');
    try {
      const { text, model } = await googleai.visionCompletion(messages, { temperature: 0.15, maxTokens: 3500 });
      lastRaw = text;
      lastModel = model;
      const parsed = extractJson(text);
      if (parsed && Array.isArray(parsed.findings)) {
        return finalizeAnalysis(parsed, model, 'google-ai-studio');
      }
      console.warn('[vision] Google AI returned unparseable response');
    } catch (err) {
      lastErr = err;
      console.warn(`[vision] Google AI failed: ${err.message}`);
    }
  }

  if (lastErr && !lastRaw) throw lastErr;
  return {
    findings: [],
    overall: 'Unable to parse analysis. Please retry.',
    confidence: 0.0,
    recommendations: [],
    image_quality: 'unknown',
    _raw: lastRaw.slice(0, 2000),
    model: lastModel,
    provider: 'fallback',
  };
}

async function extractFindingsFromProse(proseText, dataUrl) {
  const extractPrompt = `A dental AI analyzed an X-ray and produced the following description. Convert it into the exact JSON format specified below. Use FDI tooth numbering.

DESCRIPTION FROM VISION MODEL:
${proseText.slice(0, 2000)}

OUTPUT FORMAT (strict JSON, no other text):
{
  "findings": [{"label": "specific finding", "tooth": "FDI number or null", "severity": "mild|moderate|severe", "confidence": 0.0-1.0, "bbox_norm": [x, y, w, h]}],
  "overall": "1-2 sentence summary",
  "confidence": 0.0-1.0,
  "recommendations": ["action item"],
  "image_quality": "good|fair|poor"
}

For bbox_norm: estimate approximate positions based on standard dental X-ray anatomy. Values must be 0.0-1.0. JSON ONLY.`;

  try {
    const { text, model } = await callOpenRouter(TEXT_MODELS, [
      { role: 'system', content: 'You convert dental analysis descriptions into structured JSON. Output ONLY valid JSON.' },
      { role: 'user', content: extractPrompt },
    ], { temperature: 0.1, maxTokens: 2500 });

    const parsed = extractJson(text);
    if (parsed && Array.isArray(parsed.findings) && parsed.findings.length > 0) {
      return finalizeAnalysis(parsed, model, 'openrouter-extract');
    }
  } catch (err) {
    console.warn(`[extract] JSON extraction failed: ${err.message}`);
  }
  return null;
}

function normalizeBbox(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return null;
  let nums = bbox.map((n) => Number(n) || 0);

  // If all zeros or [0,0,1,1] (lazy output), reject
  if (nums.every(n => n === 0)) return null;
  if (nums[0] === 0 && nums[1] === 0 && nums[2] === 1 && nums[3] === 1) return null;

  // If any value > 1, treat as pixel coordinates (likely 1024x1024 after resize)
  const maxVal = Math.max(...nums.map(Math.abs));
  if (maxVal > 1) {
    const scale = maxVal > 1024 ? maxVal : 1024;
    nums = nums.map((n) => n / scale);
  }

  // Clamp to valid range
  nums = nums.map((n) => Math.max(0, Math.min(1, n)));

  // Sanity: width/height should be reasonable (not too tiny, not too large)
  const [x, y, w, h] = nums;
  if (w < 0.02 || h < 0.02) return null; // too tiny to be meaningful
  if (w > 0.8 && h > 0.8) return null; // covers entire image — useless

  // Ensure box doesn't extend beyond image
  return [
    Math.min(x, 1 - w),
    Math.min(y, 1 - h),
    w,
    h,
  ];
}

function finalizeAnalysis(parsed, usedModel, providerUsed) {
  parsed.findings = parsed.findings
    .filter((f) => f && f.label)
    .map((f) => {
      const bbox = normalizeBbox(f.bbox_norm);
      const sev = ['mild', 'moderate', 'severe'].includes(f.severity) ? f.severity : 'moderate';
      const conf = typeof f.confidence === 'number' ? Math.min(1, Math.max(0, f.confidence)) : 0.7;
      return {
        label: String(f.label).slice(0, 120),
        tooth: f.tooth ? String(f.tooth).replace(/[^0-9]/g, '').slice(0, 2) || null : null,
        severity: sev,
        confidence: conf,
        bbox_norm: bbox, // null if bbox was invalid — frontend handles gracefully
      };
    })
    .slice(0, 8);

  return {
    findings: parsed.findings,
    overall: parsed.overall || 'Analysis complete.',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 8) : [],
    image_quality: parsed.image_quality || 'fair',
    model: usedModel,
    provider: providerUsed || 'openrouter',
  };
}

const KENYA_CLINICAL_CONTEXT = `You are Insmile, a dental AI assistant helping a dentist in Kenya. Tailor recommendations to Kenyan patients:
- Price procedures in Kenyan Shillings (KES), giving realistic ranges for (a) public/county hospital, (b) mid-tier private clinic, (c) premium private clinic in Nairobi/Mombasa.
- Reference SHA (Social Health Authority, successor to NHIF) coverage where applicable. Note that SHA currently covers limited emergency dental care, extractions and some basic restorations at accredited facilities; cosmetic and advanced restorative work is typically out-of-pocket.
- Recommend referral pathways consistent with Kenya's tiered health system: Level 2 (dispensary) → Level 3 (health centre) → Level 4 (sub-county hospital) → Level 5 (county referral) → Level 6 (KNH / MTRH / national referral).
- Be aware of common conditions: dental fluorosis in Rift Valley and parts of Eastern Kenya (high water fluoride), early childhood caries due to sugary diets, periodontal disease, and ANUG in immunocompromised patients.
- Prefer atraumatic restorative treatment (ART) where advanced equipment is unavailable.
- Use simple English (and brief Kiswahili phrases where helpful) that a patient can understand.`;

async function chatResponse(messages, { patientContext } = {}) {
  const systemParts = [KENYA_CLINICAL_CONTEXT];
  if (patientContext) systemParts.push(`Patient context:\n${patientContext}`);
  systemParts.push('Keep responses concise, empathetic, and actionable. Use bullet points when listing.');

  const formatted = [
    { role: 'system', content: systemParts.join('\n\n') },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const { text, model } = await callOpenRouter(TEXT_MODELS, formatted, { temperature: 0.5, maxTokens: 1200 });
    return { message: text.trim(), provider: 'openrouter', model };
  } catch (err) {
    if (!googleai.isConfigured()) throw err;
    console.warn('[provider] OpenRouter exhausted, falling back to Google AI Studio');
    const { text, model } = await googleai.chatCompletion(formatted, { temperature: 0.5, maxTokens: 1200 });
    return { message: text.trim(), provider: 'google-ai-studio', model };
  }
}

const TREATMENT_PLAN_PROMPT = `You are creating a dental treatment plan for a patient in Kenya, based on the dental findings provided.

Return STRICT JSON ONLY with this schema:
{
  "overview": "1-3 sentence summary",
  "urgency": "routine" | "soon" | "urgent",
  "steps": [
    {
      "step": "short procedure name (e.g. 'Composite filling on 36')",
      "description": "what happens in this visit",
      "timeframe": "e.g. 'Within 1 week'",
      "visits": 1,
      "sha_covered": true | false,
      "cost_kes": { "public": "500-1500", "private_mid": "2500-5000", "private_premium": "6000-12000" }
    }
  ],
  "precautions": ["short item", ...],
  "alternatives": ["short item", ...],
  "home_care": ["short item in simple English", ...],
  "referral": "e.g. 'Refer to Level 4 sub-county hospital for extraction' or null",
  "total_cost_kes": { "public": "range", "private_mid": "range", "private_premium": "range" },
  "estimated_duration": "overall treatment timeline (e.g. '4-6 weeks')"
}

Guidelines:
- Prices must be realistic KES ranges for Kenya in 2026.
- Mark sha_covered=true only for procedures typically covered by SHA (basic extractions, emergency care, some restorations at accredited public facilities).
- Suggest referral only when needed.
- Output JSON ONLY. No markdown, no commentary.`;

async function generateTreatmentPlan(findings, patient = {}) {
  const findingsText = (findings || [])
    .map((f) => `- ${f.label} (severity: ${f.severity || 'moderate'}${f.tooth ? `, tooth ${f.tooth}` : ''})`)
    .join('\n') || '- No specific findings; preventive plan.';

  const patientLines = [];
  if (patient.name) patientLines.push(`Name: ${patient.name}`);
  if (patient.age) patientLines.push(`Age: ${patient.age}`);
  if (patient.gender) patientLines.push(`Gender: ${patient.gender}`);
  if (patient.medicalHistory) patientLines.push(`Medical history: ${patient.medicalHistory}`);
  if (patient.pricingMode) patientLines.push(`Patient pricing preference: ${patient.pricingMode}`);

  const user = `FINDINGS:\n${findingsText}\n\nPATIENT:\n${patientLines.join('\n') || '- not specified'}\n\nGenerate the treatment plan JSON as specified.`;

  const messages = [
    { role: 'system', content: KENYA_CLINICAL_CONTEXT + '\n\n' + TREATMENT_PLAN_PROMPT },
    { role: 'user', content: user },
  ];

  let raw;
  let usedModel;
  let providerUsed = 'openrouter';
  try {
    const r = await callOpenRouter(TEXT_MODELS, messages, { temperature: 0.35, maxTokens: 2500 });
    raw = r.text;
    usedModel = r.model;
  } catch (err) {
    if (!googleai.isConfigured()) throw err;
    console.warn('[provider] OpenRouter exhausted on treatment plan, falling back to Google AI Studio');
    const r = await googleai.chatCompletion(messages, { temperature: 0.35, maxTokens: 2500 });
    raw = r.text;
    usedModel = r.model;
    providerUsed = 'google-ai-studio';
  }
  const parsed = extractJson(raw);
  if (!parsed) {
    return {
      overview: 'Unable to parse treatment plan. Please retry.',
      steps: [],
      _raw: raw.slice(0, 2000),
      provider: providerUsed,
      model: usedModel,
    };
  }
  parsed.provider = providerUsed;
  parsed.model = usedModel;
  parsed.generatedAt = new Date().toISOString();
  return parsed;
}

module.exports = {
  isConfigured,
  analyzeScan,
  chatResponse,
  generateTreatmentPlan,
  TEXT_MODEL,
  VISION_MODEL,
};
