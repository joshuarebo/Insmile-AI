const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');

// Initialize global trackers for patient data to enhance context awareness
global.activeAnalyses = new Map(); // Will store scan analyses
global.patientTreatmentPlans = {}; // Will store treatment plans by patient ID
global.patientChatContexts = {}; // Will store chat context by patient ID

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const patientsRouter = require('./routes/patients');
const scansRouter = require('./routes/scans');
const aiRouter = require('./routes/ai');
const { AI_CONFIG } = require('./services/ai');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/insmile', { 
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

app.use('/', indexRouter);
app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/scans', scansRouter);
app.use('/api/ai', aiRouter);

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date(),
    apiVersion: '1.0.0',
    aiConfig: {
      forceRealApi: AI_CONFIG.FORCE_REAL_API,
      allowMockFallback: AI_CONFIG.ALLOW_MOCK_FALLBACK,
      debugMode: AI_CONFIG.DEBUG_MODE
    }
  });
});

module.exports = app; 