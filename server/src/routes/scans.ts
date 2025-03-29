import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// In-memory storage (replace with database in production)
const scans: any[] = [];

// Get all scans for a patient
router.get('/:patientId', (req, res) => {
  const patientScans = scans.filter(s => s.patientId === req.params.patientId);
  res.json(patientScans);
});

// Create scan
router.post('/', (req, res) => {
  const scan = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  scans.push(scan);
  res.status(201).json(scan);
});

// Get single scan
router.get('/:patientId/:id', (req, res) => {
  const scan = scans.find(s => s.id === req.params.id && s.patientId === req.params.patientId);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  res.json(scan);
});

// Delete scan
router.delete('/:patientId/:id', (req, res) => {
  const index = scans.findIndex(s => s.id === req.params.id && s.patientId === req.params.patientId);
  if (index === -1) return res.status(404).json({ error: 'Scan not found' });
  
  scans.splice(index, 1);
  res.status(204).send();
});

export default router; 