import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { analyzeDentalImage } from '../services/ai/analyzeDentalImage';

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/dicom'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// In-memory storage for MVP (replace with database later)
const scans: any[] = [];

// Get all scans for a patient
router.get('/patient/:patientId', (req, res) => {
  const patientScans = scans.filter(
    s => s.patientId === req.params.patientId && s.userId === req.user?.userId
  );
  res.json(patientScans);
});

// Get a single scan
router.get('/:id', (req, res) => {
  const scan = scans.find(s => s.id === req.params.id && s.userId === req.user?.userId);
  if (!scan) {
    return res.status(404).json({ error: 'Scan not found' });
  }
  res.json(scan);
});

// Upload and analyze a new scan
router.post('/upload', upload.single('scan'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { patientId, scanType } = req.body;

    // Create scan record
    const scan = {
      id: uuidv4(),
      userId: req.user?.userId,
      patientId,
      scanType,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadDate: new Date(),
      status: 'processing'
    };

    scans.push(scan);

    // Process the scan asynchronously
    processScan(scan.id, req.file.buffer).catch(error => {
      console.error('Error processing scan:', error);
      const scanIndex = scans.findIndex(s => s.id === scan.id);
      if (scanIndex !== -1) {
        scans[scanIndex].status = 'failed';
        scans[scanIndex].error = error.message;
      }
    });

    res.status(201).json(scan);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload scan' });
  }
});

// Delete a scan
router.delete('/:id', (req, res) => {
  const scanIndex = scans.findIndex(
    s => s.id === req.params.id && s.userId === req.user?.userId
  );

  if (scanIndex === -1) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  scans.splice(scanIndex, 1);
  res.json({ message: 'Scan deleted successfully' });
});

// Helper function to process scan
async function processScan(scanId: string, imageBuffer: Buffer) {
  try {
    const scanIndex = scans.findIndex(s => s.id === scanId);
    if (scanIndex === -1) return;

    // Update scan status
    scans[scanIndex].status = 'processing';

    // Analyze the image
    const analysis = await analyzeDentalImage(imageBuffer);

    // Update scan with analysis results
    scans[scanIndex].status = 'completed';
    scans[scanIndex].analysis = analysis;
    scans[scanIndex].completedAt = new Date();
  } catch (error) {
    console.error('Error processing scan:', error);
    throw error;
  }
}

export default router; 