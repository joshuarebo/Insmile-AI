const openrouter = require('./openrouter');
const googleai = require('./googleai');
const huggingface = require('./huggingface');
const { logComparison } = require('./shadow-log');

const AI_CONFIG = {
  PROVIDER: 'openrouter+google-ai-studio+huggingface',
  TEXT_MODEL: openrouter.TEXT_MODEL,
  VISION_MODEL: openrouter.VISION_MODEL,
  FALLBACK_TEXT_MODEL: googleai.GOOGLE_TEXT_MODELS[0],
  FALLBACK_VISION_MODEL: googleai.GOOGLE_VISION_MODELS[0],
  HF_MODEL: huggingface.HF_MODEL_ID,
  HF_MODE: huggingface.getMode(),
};

function isConfigured() {
  return openrouter.isConfigured() || googleai.isConfigured() || huggingface.isConfigured();
}

function providers() {
  return {
    openrouter: openrouter.isConfigured(),
    googleAiStudio: googleai.isConfigured(),
    huggingface: huggingface.isEnabled(),
    hfMode: huggingface.getMode(),
  };
}

async function analyzeScan(imageInput) {
  const mode = huggingface.getMode();

  if (mode === 'primary' && huggingface.isConfigured()) {
    try {
      return await huggingface.analyzeScan(imageInput);
    } catch (err) {
      console.warn(`[ai] HF primary failed (${err.message}), falling back to OpenRouter`);
    }
  }

  // Primary path: OpenRouter (which already falls back to Google internally)
  const orPromise = openrouter.analyzeScan(imageInput);

  if (mode === 'shadow' && huggingface.isConfigured()) {
    // Fire HF in background for comparison — don't block user response
    const hfPromise = huggingface.analyzeScan(imageInput);
    orPromise.then((orResult) => {
      hfPromise.then((hfResult) => {
        console.log(`[shadow] HF: ${hfResult.findings?.length || 0} findings (${hfResult._latencyMs}ms) | OR: ${orResult.findings?.length || 0} findings`);
        logComparison({ hfResult, orResult });
      }).catch((err) => {
        console.warn(`[shadow] HF failed: ${err.message}`);
      });
    }).catch(() => {});
  }

  const result = await orPromise;

  if (mode === 'secondary' && huggingface.isConfigured()) {
    // Only use HF if OpenRouter failed (returned fallback/empty)
    if (!result || result.provider === 'fallback' || result.findings?.length === 0) {
      try {
        console.log('[ai] OpenRouter produced no results, trying HF as secondary');
        return await huggingface.analyzeScan(imageInput);
      } catch (err) {
        console.warn(`[ai] HF secondary also failed: ${err.message}`);
      }
    }
  }

  return result;
}

module.exports = {
  AI_CONFIG,
  isConfigured,
  providers,
  analyzeScan,
  chatResponse: openrouter.chatResponse,
  generateTreatmentPlan: openrouter.generateTreatmentPlan,
};
