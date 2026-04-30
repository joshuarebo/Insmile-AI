const express = require('express');
const store = require('../store');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(store.listPatients());
});

router.get('/:id', (req, res) => {
  const patient = store.getPatient(req.params.id);
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  res.json(patient);
});

router.post('/', (req, res) => {
  const { name, email, phone, dateOfBirth, gender, medicalHistory, notes } = req.body;
  if (!name) return res.status(400).json({ message: 'name is required' });
  const patient = store.createPatient({
    name,
    email,
    phone,
    dateOfBirth,
    gender,
    medicalHistory,
    notes,
  });
  res.status(201).json(patient);
});

router.put('/:id', (req, res) => {
  const updated = store.updatePatient(req.params.id, req.body);
  if (!updated) return res.status(404).json({ message: 'Patient not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const ok = store.deletePatient(req.params.id);
  if (!ok) return res.status(404).json({ message: 'Patient not found' });
  res.json({ message: 'Patient deleted' });
});

module.exports = router;
