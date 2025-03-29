import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// In-memory storage (replace with database in production)
const patients: any[] = [];

// Get all patients
router.get('/', (req, res) => {
  res.json(patients);
});

// Get single patient
router.get('/:id', (req, res) => {
  const patient = patients.find(p => p.id === req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json(patient);
});

// Create patient
router.post('/', (req, res) => {
  const patient = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  patients.push(patient);
  res.status(201).json(patient);
});

// Update patient
router.put('/:id', (req, res) => {
  const index = patients.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Patient not found' });
  
  patients[index] = {
    ...patients[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  res.json(patients[index]);
});

// Delete patient
router.delete('/:id', (req, res) => {
  const index = patients.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Patient not found' });
  
  patients.splice(index, 1);
  res.status(204).send();
});

export default router; 