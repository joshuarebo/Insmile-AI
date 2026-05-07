const { supabaseAdmin } = require('../lib/supabase');

function computeAgreement(hfFindings, orFindings) {
  if (!hfFindings.length && !orFindings.length) return 1.0;
  if (!hfFindings.length || !orFindings.length) return 0.0;

  const hfLabels = new Set(hfFindings.map((f) => normalizeLabel(f.label)));
  const orLabels = new Set(orFindings.map((f) => normalizeLabel(f.label)));

  let matches = 0;
  for (const label of hfLabels) {
    if (orLabels.has(label)) matches++;
  }

  const precision = hfLabels.size > 0 ? matches / hfLabels.size : 0;
  const recall = orLabels.size > 0 ? matches / orLabels.size : 0;
  if (precision + recall === 0) return 0.0;
  return (2 * precision * recall) / (precision + recall);
}

function normalizeLabel(label) {
  return (label || '')
    .toLowerCase()
    .replace(/\b(mild|moderate|severe)\b/g, '')
    .replace(/\b(tooth|on)\b/g, '')
    .replace(/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function logComparison({ scanId, hfResult, orResult }) {
  try {
    const hfFindings = hfResult?.findings || [];
    const orFindings = orResult?.findings || [];
    const agreement = computeAgreement(hfFindings, orFindings);

    await supabaseAdmin.from('model_comparisons').insert({
      scan_id: scanId || null,
      hf_model: hfResult?.model || null,
      or_model: orResult?.model || null,
      hf_findings: hfFindings,
      or_findings: orFindings,
      hf_finding_count: hfFindings.length,
      or_finding_count: orFindings.length,
      agreement_score: agreement,
      hf_latency_ms: hfResult?._latencyMs || null,
      hf_confidence: hfResult?.confidence || null,
      or_confidence: orResult?.confidence || null,
    });

    console.log(`[shadow-log] Logged comparison: agreement=${agreement.toFixed(2)}, HF=${hfFindings.length} findings, OR=${orFindings.length} findings`);
  } catch (err) {
    console.warn(`[shadow-log] Failed to persist comparison: ${err.message}`);
  }
}

module.exports = { logComparison, computeAgreement };
