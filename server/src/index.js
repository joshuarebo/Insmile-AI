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
const PORT = process.env.PORT || 3001;

app.use((req, res, next) => {
  req.setTimeout(1800000);
  res.setTimeout(1800000);
  next();
});

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
    provider: AI_CONFIG.PROVIDER,
    providers: providers(),
    models: {
      text: AI_CONFIG.TEXT_MODEL,
      vision: AI_CONFIG.VISION_MODEL,
      fallback_text: AI_CONFIG.FALLBACK_TEXT_MODEL,
      fallback_vision: AI_CONFIG.FALLBACK_VISION_MODEL,
    },
    aiAvailable: isConfigured(),
    realTimeAvailable: isConfigured(),
    region: 'Kenya',
    database: 'supabase',
  });
});

app.listen(PORT, () => {
  console.log(`Insmile AI server running on port ${PORT}`);
  console.log(`AI provider: OpenRouter`);
  console.log(`  text model:   ${AI_CONFIG.TEXT_MODEL}`);
  console.log(`  vision model: ${AI_CONFIG.VISION_MODEL}`);
  console.log(`Database: Supabase`);
  if (!isConfigured()) {
    console.warn('OPENROUTER_API_KEY is not set — AI endpoints will fail until it is configured.');
  }
  if (!process.env.SUPABASE_URL) {
    console.warn('SUPABASE_URL is not set — database operations will fail.');
  }
});
