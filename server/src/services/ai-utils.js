const sharp = require('sharp');

function extractJson(text) {
  if (!text) return null;
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*(?:Thought|Reasoning|Analysis)\s*:.*?\n/gim, '')
    .trim();

  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch {}
  }

  const first = cleaned.indexOf('{');
  if (first === -1) return null;
  const last = cleaned.lastIndexOf('}');
  if (last <= first) return null;

  const slice = cleaned.slice(first, last + 1);
  try { return JSON.parse(slice); } catch {}

  for (let end = last; end > first; end--) {
    if (cleaned[end] !== '}') continue;
    try { return JSON.parse(cleaned.slice(first, end + 1)); } catch {}
  }

  try {
    const fixed = slice
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/'/g, '"');
    return JSON.parse(fixed);
  } catch {}

  return null;
}

function normalizeBbox(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return null;
  let nums = bbox.map((n) => Number(n) || 0);

  if (nums.every(n => n === 0)) return null;
  if (nums[0] === 0 && nums[1] === 0 && nums[2] === 1 && nums[3] === 1) return null;

  const maxVal = Math.max(...nums.map(Math.abs));
  if (maxVal > 1) {
    const scale = maxVal > 1024 ? maxVal : 1024;
    nums = nums.map((n) => n / scale);
  }

  nums = nums.map((n) => Math.max(0, Math.min(1, n)));

  const [x, y, w, h] = nums;
  if (w < 0.02 || h < 0.02) return null;
  if (w > 0.8 && h > 0.8) return null;

  return [Math.min(x, 1 - w), Math.min(y, 1 - h), w, h];
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
        bbox_norm: bbox,
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

async function toBase64(imageInput, { maxSize = 1536, quality = 92 } = {}) {
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
    .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();
  return optimized.toString('base64');
}

module.exports = { extractJson, normalizeBbox, finalizeAnalysis, toBase64 };
