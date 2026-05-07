const express = require('express');
const multer = require('multer');
const path = require('path');

const ai = require('../services/ai');
const huggingface = require('../services/huggingface');
const { supabaseAdmin } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// In-memory analysis state (for tracking ongoing background analyses)
if (!global.activeAnalyses) global.activeAnalyses = new Map();
const activeAnalyses = global.activeAnalyses;

function setAnalysis(scanId, data) {
  activeAnalyses.set(scanId, { ...(activeAnalyses.get(scanId) || {}), ...data });
}

function isUsableAnalysis(result) {
  if (!result || !Array.isArray(result.findings)) return false;
  if (result.provider === 'fallback') return false;
  if (/unable to parse|please retry/i.test(result.overall || '')) return false;
  if (result.findings.length === 0) return false;
  return true;
}

async function persistAnalysis(scanId, companyId, patientId, result, model) {
  if (!isUsableAnalysis(result)) return;
  try {
    await supabaseAdmin.from('analyses').upsert({
      scan_id: scanId,
      company_id: companyId,
      patient_id: patientId,
      status: 'completed',
      findings: result.findings,
      summary: result.overall || null,
      model_used: model || result.model || null,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'scan_id' });
  } catch (err) {
    console.warn('Failed to persist analysis:', err.message);
  }
}

async function loadAnalysis(scanId) {
  try {
    const { data } = await supabaseAdmin
      .from('analyses')
      .select('*')
      .eq('scan_id', scanId)
      .eq('status', 'completed')
      .single();

    if (!data) return null;
    const result = { findings: data.findings, overall: data.summary, model: data.model_used };
    if (!isUsableAnalysis(result)) return null;
    return result;
  } catch (_) {
    return null;
  }
}

async function getScanImageBuffer(scanId, companyId) {
  const { data: scan } = await supabaseAdmin
    .from('scans')
    .select('file_path')
    .eq('id', scanId)
    .eq('company_id', companyId)
    .single();

  if (!scan) return null;

  const { data, error } = await supabaseAdmin.storage
    .from('scans')
    .download(scan.file_path);

  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ---------- Health / config (public) ----------
router.get('/health', async (_req, res) => {
  const hfStatus = await huggingface.getStatus();
  res.json({
    status: 'ok',
    provider: ai.AI_CONFIG.PROVIDER,
    providers: ai.providers(),
    models: {
      text: ai.AI_CONFIG.TEXT_MODEL,
      vision: ai.AI_CONFIG.VISION_MODEL,
      fallback_text: ai.AI_CONFIG.FALLBACK_TEXT_MODEL,
      fallback_vision: ai.AI_CONFIG.FALLBACK_VISION_MODEL,
      huggingface: ai.AI_CONFIG.HF_MODEL,
    },
    hfMode: ai.AI_CONFIG.HF_MODE,
    hfStatus,
    aiAvailable: ai.isConfigured(),
    realTimeAvailable: ai.isConfigured(),
    timestamp: new Date().toISOString(),
  });
});

router.get('/test', async (_req, res) => {
  if (!ai.isConfigured()) {
    return res.json({ testPassed: false, error: 'OPENROUTER_API_KEY not configured' });
  }
  try {
    const r = await ai.chatResponse([{ role: 'user', content: 'Reply with the single word: ready.' }]);
    res.json({ testPassed: true, sample: r.message.slice(0, 120), model: r.model });
  } catch (err) {
    res.status(200).json({ testPassed: false, error: err.message });
  }
});

// ---------- Upload + analyze ----------
router.post('/upload-scan', requireAuth, upload.single('scan'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const patientId = req.body.patientId;
  const scanType = req.body.scanType || 'unknown';

  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
    const storagePath = `${req.companyId}/${patientId || 'unassigned'}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('scans')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: scan, error: dbError } = await supabaseAdmin
      .from('scans')
      .insert({
        company_id: req.companyId,
        patient_id: patientId || null,
        file_path: storagePath,
        file_name: req.file.originalname,
        scan_type: scanType,
        uploaded_by: req.user.id,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Create pending analysis record
    await supabaseAdmin.from('analyses').insert({
      scan_id: scan.id,
      company_id: req.companyId,
      patient_id: patientId || null,
      status: 'processing',
    });

    setAnalysis(scan.id, {
      status: 'processing',
      progress: 10,
      companyId: req.companyId,
      patientId,
    });

    res.json({ success: true, scanId: scan.id, message: 'Scan uploaded; analysis started' });

    // Background analysis
    (async () => {
      try {
        setAnalysis(scan.id, { progress: 30 });
        const imageBuffer = req.file.buffer;
        const result = await ai.analyzeScan(imageBuffer);

        if (!isUsableAnalysis(result)) {
          setAnalysis(scan.id, {
            status: 'failed',
            progress: 0,
            error: 'Vision model returned unparseable output. Please retry.',
          });
          await supabaseAdmin.from('analyses').update({ status: 'failed', error_message: 'Unparseable output' }).eq('scan_id', scan.id);
          return;
        }

        setAnalysis(scan.id, { status: 'completed', progress: 100, result });
        await persistAnalysis(scan.id, req.companyId, patientId, result);
      } catch (err) {
        console.error('Analysis failed:', err.message);
        setAnalysis(scan.id, { status: 'failed', progress: 0, error: err.message });
        await supabaseAdmin.from('analyses').update({ status: 'failed', error_message: err.message }).eq('scan_id', scan.id);
      }
    })();
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload scan' });
  }
});

// Analyze a previously uploaded scan
router.post('/analyze/:scanId', requireAuth, async (req, res) => {
  const { scanId } = req.params;

  // Check in-memory
  const cached = activeAnalyses.get(scanId);
  if (cached && cached.status === 'completed' && cached.result) {
    return res.json(cached.result);
  }

  // Check DB
  const disk = await loadAnalysis(scanId);
  if (disk) return res.json(disk);

  // Run analysis
  try {
    const imageBuffer = await getScanImageBuffer(scanId, req.companyId);
    if (!imageBuffer) return res.status(404).json({ error: 'Scan file not found' });

    setAnalysis(scanId, { status: 'processing', progress: 30 });
    const result = await ai.analyzeScan(imageBuffer);
    setAnalysis(scanId, { status: 'completed', progress: 100, result });

    // Get patient_id from scan record
    const { data: scanRecord } = await supabaseAdmin.from('scans').select('patient_id').eq('id', scanId).single();
    await persistAnalysis(scanId, req.companyId, scanRecord?.patient_id, result);

    res.json(result);
  } catch (err) {
    setAnalysis(scanId, { status: 'failed', error: err.message });
    res.status(500).json({ error: 'Analysis failed', message: err.message });
  }
});

router.get('/analysis/:scanId', requireAuth, async (req, res) => {
  const { scanId } = req.params;

  // Check in-memory
  const mem = activeAnalyses.get(scanId);
  if (mem && mem.status === 'completed' && mem.result) {
    return res.json({ ...mem.result, scanId });
  }

  // Check DB
  const db = await loadAnalysis(scanId);
  if (db) return res.json({ ...db, scanId });

  // If scan exists, start background analysis
  const imageBuffer = await getScanImageBuffer(scanId, req.companyId).catch(() => null);
  if (imageBuffer) {
    setAnalysis(scanId, { status: 'processing', progress: 15 });

    // Start background analysis
    (async () => {
      try {
        const result = await ai.analyzeScan(imageBuffer);
        if (isUsableAnalysis(result)) {
          setAnalysis(scanId, { status: 'completed', progress: 100, result });
          const { data: scanRecord } = await supabaseAdmin.from('scans').select('patient_id').eq('id', scanId).single();
          await persistAnalysis(scanId, req.companyId, scanRecord?.patient_id, result);
        } else {
          setAnalysis(scanId, { status: 'failed', error: 'Unparseable output' });
        }
      } catch (err) {
        setAnalysis(scanId, { status: 'failed', error: err.message });
      }
    })();

    return res.status(202).json({ scanId, status: 'processing', progress: 15 });
  }

  return res.status(404).json({ error: 'Analysis not found', scanId });
});

function statusHandler(req, res) {
  const { scanId } = req.params;
  const mem = activeAnalyses.get(scanId);
  if (mem) {
    return res.json({
      scanId,
      status: mem.status,
      progress: mem.progress || 0,
      error: mem.error,
    });
  }
  // Check DB asynchronously
  loadAnalysis(scanId).then(data => {
    if (data) return res.json({ scanId, status: 'completed', progress: 100 });
    res.status(404).json({ scanId, status: 'not_found' });
  });
}

router.get('/analysis/:scanId/status', requireAuth, statusHandler);
router.get('/analysis/status/:scanId', requireAuth, statusHandler);

// ---------- Treatment plan ----------
router.post('/treatment-plan', requireAuth, async (req, res) => {
  try {
    const { patientId, scanId, pricingMode } = req.body;
    let analysis = null;

    if (scanId) {
      const mem = activeAnalyses.get(scanId);
      if (mem && mem.status === 'completed') analysis = mem.result;
      if (!analysis) analysis = await loadAnalysis(scanId);
    }

    if (!analysis && patientId) {
      // Get latest analysis for patient
      const { data } = await supabaseAdmin
        .from('analyses')
        .select('findings, summary, model_used')
        .eq('patient_id', patientId)
        .eq('company_id', req.companyId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data) analysis = { findings: data.findings, overall: data.summary };
    }

    if (!analysis || !Array.isArray(analysis.findings) || analysis.findings.length === 0) {
      return res.status(400).json({ error: 'No analysis findings available for this patient.' });
    }

    // Get patient data for context
    let patient = null;
    if (patientId) {
      const { data } = await supabaseAdmin
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .eq('company_id', req.companyId)
        .single();
      patient = data;
    }

    const plan = await ai.generateTreatmentPlan(analysis.findings, {
      ...(patient || {}),
      pricingMode: pricingMode || 'private_mid',
    });

    // Persist treatment plan
    await supabaseAdmin.from('treatment_plans').insert({
      patient_id: patientId || null,
      company_id: req.companyId,
      scan_id: scanId || null,
      steps: plan.steps || [],
      pricing_mode: pricingMode || 'private_mid',
      total_kes: plan.estimatedTotal || null,
      sha_covered: plan.shaCoverage || false,
      created_by: req.user.id,
    });

    res.json(plan);
  } catch (err) {
    console.error('Treatment plan error:', err.message);
    const rate = /rate[- ]?limit|temporarily|429/i.test(err.message || '');
    res.status(rate ? 503 : 500).json({
      error: 'Failed to generate treatment plan',
      message: rate
        ? 'The free AI model is temporarily rate-limited. Please wait a minute and click Retry.'
        : err.message,
    });
  }
});

// ---------- Chat ----------
router.post('/chat', requireAuth, async (req, res) => {
  const { message, patientId, chatHistory } = req.body;
  if (!message) return res.status(400).json({ success: false, message: 'No message provided' });

  // Build patient context
  const ctxParts = [];
  if (patientId) {
    // Get latest analysis
    const { data: analysisData } = await supabaseAdmin
      .from('analyses')
      .select('findings')
      .eq('patient_id', patientId)
      .eq('company_id', req.companyId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (analysisData && Array.isArray(analysisData.findings) && analysisData.findings.length) {
      ctxParts.push(
        'Recent dental findings:\n' +
        analysisData.findings.map((f) => `- ${f.label} (${f.severity})`).join('\n')
      );
    }

    // Get latest treatment plan
    const { data: planData } = await supabaseAdmin
      .from('treatment_plans')
      .select('steps')
      .eq('patient_id', patientId)
      .eq('company_id', req.companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (planData && Array.isArray(planData.steps) && planData.steps.length) {
      ctxParts.push(
        'Active treatment plan steps:\n' +
        planData.steps.map((s) => `- ${s.step}: ${s.description}`).join('\n')
      );
    }
  }

  const history = Array.isArray(chatHistory)
    ? chatHistory.map((m) => ({ role: m.role, content: m.content }))
    : [];
  const messages = [...history.slice(-10), { role: 'user', content: message }];

  try {
    const { message: reply, model } = await ai.chatResponse(messages, {
      patientContext: ctxParts.join('\n\n') || null,
    });
    res.json({ success: true, message: reply, source: 'openrouter', model });
  } catch (err) {
    console.error('Chat error:', err.message);
    const rate = /rate[- ]?limit|temporarily|429/i.test(err.message || '');
    res.status(rate ? 503 : 500).json({
      success: false,
      message: rate
        ? 'The free AI model is temporarily rate-limited. Please wait a minute and try again.'
        : err.message,
      source: 'error',
    });
  }
});

module.exports = router;
