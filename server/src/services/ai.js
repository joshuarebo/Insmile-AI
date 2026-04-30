const openrouter = require('./openrouter');
const googleai = require('./googleai');

const AI_CONFIG = {
  PROVIDER: 'openrouter+google-ai-studio',
  TEXT_MODEL: openrouter.TEXT_MODEL,
  VISION_MODEL: openrouter.VISION_MODEL,
  FALLBACK_TEXT_MODEL: googleai.GOOGLE_TEXT_MODELS[0],
  FALLBACK_VISION_MODEL: googleai.GOOGLE_VISION_MODELS[0],
};

function isConfigured() {
  return openrouter.isConfigured() || googleai.isConfigured();
}

function providers() {
  return {
    openrouter: openrouter.isConfigured(),
    googleAiStudio: googleai.isConfigured(),
  };
}

module.exports = {
  AI_CONFIG,
  isConfigured,
  providers,
  analyzeScan: openrouter.analyzeScan,
  chatResponse: openrouter.chatResponse,
  generateTreatmentPlan: openrouter.generateTreatmentPlan,
};
