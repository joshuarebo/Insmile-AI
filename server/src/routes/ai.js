const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ai = require('../services/ai');
const store = require('../store');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads');
const analysisDir = path.join(__dirname, '../../data/analysis');
const plansDir = path.join(__dirname, '../../data/treatment-plans');
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(analysisDir, { recursive: true });
fs.mkdirSync(plansDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, suffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

// Shared in-memory analysis state
if (!global.activeAnalyses) global.activeAnalyses = new Map();
if (!global.patientLatestAnalyses) global.patientLatestAnalyses = {};
if (!global.patientTreatmentPlans) global.patientTreatmentPlans = {};
const activeAnalyses = global.activeAnalyses;

function setAnalysis(scanId, data) {
  activeAnalyses.set(scanId, { ...(activeAnalyses.get(scanId) || {}), ...data });
}

function startAnalysisInBackground(scanId, filePath, patientId) {
  if (!filePath || !fs.existsSync(filePath)) return false;
  const current = activeAnalyses.get(scanId);
  if (current && (current.status === 'processing' || current.status === 'completed')) return true;
  setAnalysis(scanId, { status: 'processing', progress: 15, filePath, patientId });
  (async () => {
    try {
      setAnalysis(scanId, { progress: 40 });
      const imageBuffer = fs.readFileSync(filePath);
      const result = await ai.analyzeScan(imageBuffer);
      if (!isUsableAnalysis(result)) {
        setAnalysis(scanId, {
          status: 'failed',
          progress: 0,
          error: 'Vision model returned unparseable output. Please retry — the next run will try a different model.',
        });
        store.updateScan(scanId, { status: 'failed' });
        return;
      }
      setAnalysis(scanId, { status: 'completed', progress: 100, result });
      persistAnalysis(scanId, result);
      const pid = patientId || 'unknown';
      global.patientLatestAnalyses[pid] = { scanId, result };
      store.updateScan(scanId, { status: 'analyzed' });
    } catch (err) {
      console.error(`Background analysis failed for ${scanId}:`, err.message);
      setAnalysis(scanId, { status: 'failed', progress: 0, error: err.message });
    }
  })();
  return true;
}

function isUsableAnalysis(result) {
  if (!result || !Array.isArray(result.findings)) return false;
  if (result.provider === 'fallback') return false;
  if (/unable to parse|please retry/i.test(result.overall || '')) return false;
  if (result.findings.length === 0) return false;
  return true;
}

function persistAnalysis(scanId, result) {
  // Never persist an empty / fallback / unparseable result — it would poison future polls.
  if (!isUsableAnalysis(result)) {
    console.warn(`[analysis] not persisting unusable result for ${scanId}`);
    return;
  }
  try {
    fs.writeFileSync(path.join(analysisDir, `${scanId}.json`), JSON.stringify(result, null, 2));
  } catch (err) {
    console.warn('Failed to persist analysis:', err.message);
  }
}

function loadAnalysis(scanId) {
  try {
    const p = path.join(analysisDir, `${scanId}.json`);
    if (!fs.existsSync(p)) return null;
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!isUsableAnalysis(parsed)) {
      // stale/poisoned — remove so we'll retry
      try { fs.unlinkSync(p); } catch (_) {}
      return null;
    }
    return parsed;
  } catch (_) {}
  return null;
}

// ---------- Health / config ----------
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    provider: ai.AI_CONFIG.PROVIDER,
    providers: ai.providers(),
    models: {
      text: ai.AI_CONFIG.TEXT_MODEL,
      vision: ai.AI_CONFIG.VISION_MODEL,
      fallback_text: ai.AI_CONFIG.FALLBACK_TEXT_MODEL,
      fallback_vision: ai.AI_CONFIG.FALLBACK_VISION_MODEL,
    },
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
router.post('/upload-scan', upload.single('scan'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const patientId = req.body.patientId || 'unknown';
  const scanType = req.body.scanType || 'xray';

  const scan = store.createScan({
    patientId,
    scanType,
    fileName: req.file.originalname,
    filePath: req.file.path,
    size: req.file.size,
    status: 'analyzing',
  });

  setAnalysis(scan.id, {
    status: 'processing',
    progress: 10,
    patientId,
    filePath: req.file.path,
    startedAt: new Date().toISOString(),
  });

  res.json({ success: true, scanId: scan.id, message: 'Scan uploaded; analysis started' });

  // background analysis
  (async () => {
    try {
      setAnalysis(scan.id, { progress: 30 });
      const imageBuffer = fs.readFileSync(req.file.path);
      const result = await ai.analyzeScan(imageBuffer);
      if (!isUsableAnalysis(result)) {
        setAnalysis(scan.id, {
          status: 'failed',
          progress: 0,
          error: 'Vision model returned unparseable output. Please retry — the next run will try a different model.',
        });
        store.updateScan(scan.id, { status: 'failed' });
        return;
      }
      setAnalysis(scan.id, {
        status: 'completed',
        progress: 100,
        result,
        completedAt: new Date().toISOString(),
      });
      persistAnalysis(scan.id, result);
      store.updateScan(scan.id, { status: 'analyzed' });
      global.patientLatestAnalyses[patientId] = { scanId: scan.id, result };
    } catch (err) {
      console.error('Analysis failed:', err.message);
      setAnalysis(scan.id, {
        status: 'failed',
        progress: 0,
        error: err.message,
      });
      store.updateScan(scan.id, { status: 'failed' });
    }
  })();
});

// Analyze a previously uploaded scan (synchronous)
router.post('/analyze/:scanId', async (req, res) => {
  const { scanId } = req.params;
  const cached = activeAnalyses.get(scanId);
  if (cached && cached.status === 'completed' && cached.result) {
    return res.json(cached.result);
  }
  const disk = loadAnalysis(scanId);
  if (disk) return res.json(disk);

  const scan = store.getScan(scanId);
  const filePath = (scan && scan.filePath) || (cached && cached.filePath);
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Scan file not found' });
  }

  try {
    setAnalysis(scanId, { status: 'processing', progress: 30 });
    const imageBuffer = fs.readFileSync(filePath);
    const result = await ai.analyzeScan(imageBuffer);
    setAnalysis(scanId, { status: 'completed', progress: 100, result });
    persistAnalysis(scanId, result);
    const patientId = (scan && scan.patientId) || (cached && cached.patientId) || 'unknown';
    global.patientLatestAnalyses[patientId] = { scanId, result };
    res.json(result);
  } catch (err) {
    setAnalysis(scanId, { status: 'failed', error: err.message });
    res.status(500).json({ error: 'Analysis failed', message: err.message });
  }
});

router.get('/analysis/:scanId', (req, res) => {
  const { scanId } = req.params;
  const mem = activeAnalyses.get(scanId);
  if (mem && mem.status === 'completed' && mem.result) {
    return res.json({ ...mem.result, scanId });
  }
  const disk = loadAnalysis(scanId);
  if (disk) return res.json({ ...disk, scanId });
  const scan = store.getScan(scanId);
  if (scan && scan.filePath) {
    startAnalysisInBackground(scanId, scan.filePath, scan.patientId);
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
  if (loadAnalysis(scanId)) {
    return res.json({ scanId, status: 'completed', progress: 100 });
  }
  const scan = store.getScan(scanId);
  if (scan && scan.filePath) {
    startAnalysisInBackground(scanId, scan.filePath, scan.patientId);
    return res.json({ scanId, status: 'processing', progress: 15 });
  }
  res.status(404).json({ scanId, status: 'not_found' });
}

router.get('/analysis/:scanId/status', statusHandler);
router.get('/analysis/status/:scanId', statusHandler);

// ---------- Treatment plan ----------
router.post('/treatment-plan', async (req, res) => {
  try {
    const { patientId, scanId, pricingMode } = req.body;
    let analysis = null;
    if (scanId) {
      const mem = activeAnalyses.get(scanId);
      if (mem && mem.status === 'completed') analysis = mem.result;
      if (!analysis) analysis = loadAnalysis(scanId);
    }
    if (!analysis && patientId && global.patientLatestAnalyses[patientId]) {
      analysis = global.patientLatestAnalyses[patientId].result;
    }
    if (!analysis || !Array.isArray(analysis.findings)) {
      return res.status(400).json({ error: 'No analysis findings available for this patient.' });
    }

    const patient = patientId ? store.getPatient(patientId) : null;
    const plan = await ai.generateTreatmentPlan(analysis.findings, {
      ...(patient || {}),
      pricingMode: pricingMode || 'private_mid',
    });

    plan.patientId = patientId || null;
    plan.scanId = scanId || null;

    if (patientId) global.patientTreatmentPlans[patientId] = plan;
    try {
      fs.writeFileSync(
        path.join(plansDir, `${patientId || 'anonymous'}-${Date.now()}.json`),
        JSON.stringify(plan, null, 2)
      );
    } catch (_) {}
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
router.post('/chat', async (req, res) => {
  const { message, patientId, chatHistory } = req.body;
  if (!message) return res.status(400).json({ success: false, message: 'No message provided' });

  // Build patient context from latest analysis + plan
  const ctxParts = [];
  if (patientId && global.patientLatestAnalyses[patientId]) {
    const a = global.patientLatestAnalyses[patientId].result;
    if (a && Array.isArray(a.findings) && a.findings.length) {
      ctxParts.push(
        'Recent dental findings:\n' +
          a.findings.map((f) => `- ${f.label} (${f.severity})`).join('\n')
      );
    }
  }
  if (patientId && global.patientTreatmentPlans[patientId]) {
    const plan = global.patientTreatmentPlans[patientId];
    if (plan.steps && plan.steps.length) {
      ctxParts.push(
        'Active treatment plan steps:\n' +
          plan.steps.map((s) => `- ${s.step}: ${s.description}`).join('\n')
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

// ---------- Scan image passthrough (legacy path) ----------
router.get('/scan/:scanId', (req, res) => {
  const scan = store.getScan(req.params.scanId);
  if (scan && scan.filePath && fs.existsSync(scan.filePath)) {
    return res.sendFile(path.resolve(scan.filePath));
  }
  res.status(404).json({ error: 'Scan not found' });
});

module.exports = router;
