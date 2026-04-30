const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const DEMO_SECRET = process.env.JWT_SECRET || 'insmile-demo-secret';

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }
  const token = jwt.sign(
    { email, role: 'dentist' },
    DEMO_SECRET,
    { expiresIn: '7d' }
  );
  res.json({
    token,
    user: { id: email, email, role: 'dentist', name: email.split('@')[0] },
  });
});

router.post('/signup', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }
  const token = jwt.sign({ email, role: 'dentist' }, DEMO_SECRET, { expiresIn: '7d' });
  res.status(201).json({
    token,
    user: { id: email, email, role: 'dentist', name: email.split('@')[0] },
  });
});

router.get('/me', (req, res) => {
  const auth = req.header('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Please authenticate' });
  try {
    const decoded = jwt.verify(token, DEMO_SECRET);
    res.json({ user: { id: decoded.email, email: decoded.email, role: decoded.role || 'dentist' } });
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
