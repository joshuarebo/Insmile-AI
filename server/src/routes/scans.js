const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const store = require('../store');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, suffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new Error('Only .jpg, .jpeg, .png, .webp allowed'));
  },
});

router.get('/', (req, res) => {
  res.json(store.listScans());
});

router.get('/patient/:patientId', (req, res) => {
  res.json(store.listScans(req.params.patientId));
});

router.get('/:id', (req, res) => {
  const scan = store.getScan(req.params.id);
  if (!scan) return res.status(404).json({ message: 'Scan not found' });
  res.json(scan);
});

router.get('/:id/image', (req, res) => {
  const scan = store.getScan(req.params.id);
  if (scan && scan.filePath && fs.existsSync(scan.filePath)) {
    return res.sendFile(path.resolve(scan.filePath));
  }
  // legacy fallback: look in uploads for filename containing the id
  try {
    const files = fs.readdirSync(uploadDir);
    const match = files.find((f) => f.includes(req.params.id));
    if (match) return res.sendFile(path.join(uploadDir, match));
  } catch (_) {}
  res.status(404).json({ message: 'Scan image not found' });
});

router.post('/upload', upload.single('scan'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const { patientId, scanType } = req.body;
  const scan = store.createScan({
    patientId: patientId || null,
    scanType: scanType || 'xray',
    fileName: req.file.originalname,
    filePath: req.file.path,
    size: req.file.size,
    status: 'uploaded',
  });
  res.status(201).json(scan);
});

router.delete('/:id', (req, res) => {
  const scan = store.getScan(req.params.id);
  if (!scan) return res.status(404).json({ message: 'Scan not found' });
  if (scan.filePath && fs.existsSync(scan.filePath)) {
    try {
      fs.unlinkSync(scan.filePath);
    } catch (_) {}
  }
  store.deleteScan(req.params.id);
  res.json({ message: 'Scan deleted' });
});

module.exports = router;
