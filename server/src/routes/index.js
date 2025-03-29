const express = require('express');
const router = express.Router();
const { AI_CONFIG } = require('../services/ai');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({ 
    message: 'Insmile AI API Server', 
    version: '1.0.0',
    status: 'running' 
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    message: 'Dental AI API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date(),
    aiConfig: {
      forceRealApi: AI_CONFIG.FORCE_REAL_API,
      allowMockFallback: AI_CONFIG.ALLOW_MOCK_FALLBACK,
      debugMode: AI_CONFIG.DEBUG_MODE
    }
  });
});

module.exports = router; 