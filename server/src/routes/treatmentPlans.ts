import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// In-memory storage (replace with database in production)
const treatmentPlans: any[] = [];

// Get treatment plan for a patient and scan
router.get('/:patientId/:scanId', (req, res) => {
  const plan = treatmentPlans.find(
    p => p.patientId === req.params.patientId && p.scanId === req.params.scanId
  );
  if (!plan) return res.status(404).json({ error: 'Treatment plan not found' });
  res.json(plan);
});

// Generate treatment plan
router.post('/generate', (req, res) => {
  const plan = {
    id: uuidv4(),
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  treatmentPlans.push(plan);
  res.status(201).json(plan);
});

// Update treatment plan status
router.put('/:id/status', (req, res) => {
  const index = treatmentPlans.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Treatment plan not found' });
  
  treatmentPlans[index] = {
    ...treatmentPlans[index],
    status: req.body.status,
    updatedAt: new Date().toISOString()
  };
  res.json(treatmentPlans[index]);
});

export default router; 