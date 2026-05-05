require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const scanRoutes = require('./routes/scans');
const aiRoutes = require('./routes/ai');

const { AI_CONFIG, isConfigured, providers } = require('./services/ai');

global.activeAnalyses = global.activeAnalyses || new Map();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    aiAvailable: isConfigured(),
  });
});

module.exports = app;
