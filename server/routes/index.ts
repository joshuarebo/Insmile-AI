import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, requireRole, requireClinic } from '../middleware/auth';
import { db } from '../services/database';
import { fileUpload } from '../services/fileUpload';
import { reportGenerator } from '../services/reportGenerator';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Auth routes
router.post('/auth/register', async (req, res) => {
  try {
    const existingUser = await db.findUserByEmail(req.body.email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await db.createUser(req.body);
    const token = db.generateToken(user);

    res.status(201).json({ user, token });
  } catch (error) {
    res.status(400).json({ message: 'Registration failed', error });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.validateUser(username, password);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = db.generateToken(user);
    res.json({ user, token });
  } catch (error) {
    res.status(400).json({ message: 'Login failed', error });
  }
});

// Patient routes
router.get('/patients', authenticateToken, requireClinic, async (req, res) => {
  try {
    const filters = {
      clinicId: req.user.clinicId,
      ...req.query
    };
    const patients = await db.findPatients(filters);
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch patients', error });
  }
});

router.post('/patients', authenticateToken, requireClinic, async (req, res) => {
  try {
    const patient = await db.createPatient({
      ...req.body,
      clinicId: req.user.clinicId
    });
    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create patient', error });
  }
});

// Scan routes
router.post('/scans/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { url, metadata } = await fileUpload.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const scan = await db.createScan({
      patientId: req.body.patientId,
      uploadedBy: req.user.id,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileUrl: url,
      metadata
    });

    res.status(201).json(scan);
  } catch (error) {
    res.status(400).json({ message: 'Failed to upload scan', error });
  }
});

router.get('/scans', authenticateToken, requireClinic, async (req, res) => {
  try {
    const filters = {
      clinicId: req.user.clinicId,
      ...req.query
    };
    const scans = await db.findScans(filters);
    res.json(scans);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch scans', error });
  }
});

// Treatment Plan routes
router.post('/treatment-plans', authenticateToken, requireClinic, async (req, res) => {
  try {
    const plan = await db.createTreatmentPlan({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json(plan);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create treatment plan', error });
  }
});

router.get('/treatment-plans', authenticateToken, requireClinic, async (req, res) => {
  try {
    const filters = {
      clinicId: req.user.clinicId,
      ...req.query
    };
    const plans = await db.findTreatmentPlans(filters);
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch treatment plans', error });
  }
});

// Report routes
router.get('/reports/treatment-plan/:id', authenticateToken, async (req, res) => {
  try {
    const pdfBuffer = await reportGenerator.generateTreatmentPlanReport(
      parseInt(req.params.id)
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=treatment-plan.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate report', error });
  }
});

router.get('/reports/patient/:id', authenticateToken, async (req, res) => {
  try {
    const pdfBuffer = await reportGenerator.generatePatientReport(
      parseInt(req.params.id)
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=patient-report.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate report', error });
  }
});

export default router; 