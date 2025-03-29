const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Scan = require('../models/Scan');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/scans';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  },
});

// Get all scans
router.get('/', auth, async (req, res) => {
  try {
    const scans = await Scan.find({ createdBy: req.user._id })
      .populate('patientId', 'name email')
      .sort({ createdAt: -1 });
    res.json(scans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching scans' });
  }
});

// Get scan by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const scan = await Scan.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    }).populate('patientId', 'name email');

    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' });
    }

    res.json(scan);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching scan' });
  }
});

// Upload scan
router.post('/upload', auth, upload.single('scan'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const scan = new Scan({
      patientId: req.body.patientId,
      filename: req.file.originalname,
      path: req.file.path,
      createdBy: req.user._id,
    });

    await scan.save();
    res.status(201).json(scan);
  } catch (error) {
    res.status(500).json({ message: 'Error uploading scan' });
  }
});

// Analyze scan
router.post('/:id/analyze', auth, async (req, res) => {
  try {
    const scan = await Scan.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' });
    }

    // Mock analysis results
    const analysis = {
      findings: [
        'Potential cavity detected in upper right molar',
        'Minor gum inflammation observed',
      ],
      recommendations: [
        'Schedule follow-up appointment for cavity treatment',
        'Improve oral hygiene routine',
      ],
      confidence: 0.85,
    };

    scan.analysis = analysis;
    await scan.save();

    res.json(scan);
  } catch (error) {
    res.status(500).json({ message: 'Error analyzing scan' });
  }
});

// Delete scan
router.delete('/:id', auth, async (req, res) => {
  try {
    const scan = await Scan.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' });
    }

    // Delete file from storage
    if (fs.existsSync(scan.path)) {
      fs.unlinkSync(scan.path);
    }

    await scan.deleteOne();
    res.json({ message: 'Scan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting scan' });
  }
});

module.exports = router; 