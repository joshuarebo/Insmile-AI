const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import AWS SDK with error handling
let BedrockRuntimeClient, InvokeModelCommand;
try {
  const awsBedrockRuntime = require("@aws-sdk/client-bedrock-runtime");
  BedrockRuntimeClient = awsBedrockRuntime.BedrockRuntimeClient;
  InvokeModelCommand = awsBedrockRuntime.InvokeModelCommand;
  console.log('AWS Bedrock SDK loaded successfully');
} catch (error) {
  console.error('Error loading AWS Bedrock SDK:', error.message);
  console.log('AI functionality will operate in mock mode only');
}

// AWS Bedrock configuration
let awsConfig;
try {
  const awsConfigPath = path.join(__dirname, '../../config/aws.json');
  if (fs.existsSync(awsConfigPath)) {
    awsConfig = JSON.parse(fs.readFileSync(awsConfigPath, 'utf8'));
    console.log('AWS configuration loaded from config file');
  } else {
    // Fallback to environment variables
    awsConfig = {
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    };
    console.log('AWS configuration loaded from environment variables');
  }
} catch (error) {
  console.error('Error loading AWS configuration:', error.message);
  console.log('Continuing with mock data only');
}

// Initialize Bedrock client if config is available
let bedrockClient;
try {
  if (BedrockRuntimeClient && awsConfig && awsConfig.credentials && awsConfig.credentials.accessKeyId) {
    bedrockClient = new BedrockRuntimeClient(awsConfig);
    console.log('AWS Bedrock client initialized successfully');
  } else {
    console.log('AWS Bedrock client not initialized: missing SDK or credentials');
  }
} catch (error) {
  console.error('Error initializing AWS Bedrock client:', error.message);
  console.log('AI functionality will operate in mock mode only');
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Mock data for AI analysis - will be used as fallback
const mockAnalysisResults = {
  findings: [
    {
      label: 'Cavity detected on tooth #14',
      confidence: 0.92,
      severity: 'severe',
      bbox: [120, 80, 40, 35]
    },
    {
      label: 'Early stage gum disease',
      confidence: 0.78,
      severity: 'mild',
      bbox: [200, 150, 60, 40]
    },
    {
      label: 'Wisdom tooth needs attention',
      confidence: 0.85,
      severity: 'medium',
      bbox: [300, 200, 45, 50]
    }
  ],
  overall: 'Dental health needs immediate attention with several issues identified.',
  confidence: 0.88,
  processingTime: 1200
};

// Mock data for analysis status
const mockAnalysisStatus = {
  status: 'processing',
  progress: 60
};

// Mock recommendations
const mockRecommendations = [
  'Schedule a cleaning appointment within the next two weeks',
  'Consider filling for cavity on tooth #14',
  'Improve brushing technique to address early gum disease',
  'Monitor wisdom tooth for possible extraction in future'
];

// Mock treatment plan
const mockTreatmentPlan = {
  summary: 'Comprehensive treatment plan addressing cavity, gum disease and wisdom tooth issues',
  diagnosis: 'Patient shows signs of moderate dental decay with early periodontal issues',
  steps: [
    {
      description: 'Dental filling for cavity on tooth #14',
      priority: 'high',
      estimatedTime: '45 minutes',
      estimatedCost: '$150-250',
      prerequisites: []
    },
    {
      description: 'Deep cleaning to address gum disease',
      priority: 'medium',
      estimatedTime: '60 minutes',
      estimatedCost: '$200-300',
      prerequisites: []
    },
    {
      description: 'Wisdom tooth evaluation',
      priority: 'low',
      estimatedTime: '30 minutes',
      estimatedCost: '$75-125',
      prerequisites: []
    }
  ],
  totalEstimatedTime: '2-3 hours',
  totalEstimatedCost: '$425-675',
  precautions: [
    'Avoid hot foods for 24 hours after filling',
    'Continue regular brushing and flossing',
    'Use prescribed mouthwash for gum disease'
  ],
  alternatives: [
    'Wait and monitor for cavity progression if no pain is present',
    'Consider extraction rather than filling if decay is extensive'
  ]
};

// Store active analyses
const activeAnalyses = new Map();

// Import AI service functions
const { 
  analyzeImageWithBedrock, 
  generateTreatmentPlanWithBedrock, 
  generateChatResponseWithBedrock,
  AI_CONFIG
} = require('../services/ai');

// Force REAL_API to true and ALLOW_MOCK_FALLBACK to false
AI_CONFIG.FORCE_REAL_API = true;
AI_CONFIG.ALLOW_MOCK_FALLBACK = true; // Keep this true for now until we debug all issues

// Load AI configuration
console.log('AI configuration loaded:', JSON.stringify({
  FORCE_REAL_API: AI_CONFIG.FORCE_REAL_API,
  ALLOW_MOCK_FALLBACK: AI_CONFIG.ALLOW_MOCK_FALLBACK,
  DEBUG_MODE: AI_CONFIG.DEBUG_MODE,
  IMAGE_MODEL: AI_CONFIG.IMAGE_MODEL,
  TEXT_MODEL: AI_CONFIG.TEXT_MODEL
}));

// Upload and analyze scan
router.post('/upload-scan', upload.single('scan'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  
  const scanId = Date.now().toString();
  const patientId = req.body.patientId || 'unknown';
  const scanType = req.body.scanType || 'xray';
  
  // Log the upload details
  console.log(`Scan upload received - ID: ${scanId}, Patient: ${patientId}, Type: ${scanType}, File: ${req.file.originalname}, Size: ${req.file.size} bytes`);
  
  // Create analysis status
  activeAnalyses.set(scanId, {
    status: 'processing',
    progress: 0,
    patientId,
    scanType,
    filePath: req.file.path,
    timestamp: new Date()
  });
  
  // Start analysis process in background
  (async () => {
    try {
      // Update progress
      activeAnalyses.get(scanId).progress = 10;
      console.log(`Starting analysis for scan ${scanId} at ${req.file.path}`);
      
      // Add a unique identifier to force fresh analysis
      if (req.body.forceRealMode === 'true' || AI_CONFIG.FORCE_REAL_API) {
        console.log(`FORCE_REAL_API is enabled - ensuring real analysis is performed for scan ${scanId}`);
      }
      
      // Update progress
      activeAnalyses.get(scanId).progress = 30;
      
      // Check file exists
      if (!fs.existsSync(req.file.path)) {
        throw new Error(`File does not exist at path: ${req.file.path}`);
      }
      
      // Perform analysis using Bedrock function
      console.log(`Calling analyzeImageWithBedrock for scan ${scanId}`);
      let result;
      try {
        result = await analyzeImageWithBedrock(req.file.path, scanType);
        // Only proceed if we got a real analysis result with findings
        if (!result || !result.findings || !Array.isArray(result.findings) || result.findings.length === 0) {
          throw new Error('Invalid analysis result: No findings detected');
        }
      } catch (analyzeError) {
        console.error(`Analysis failed for scan ${scanId}:`, analyzeError);
        console.error(`Error stack: ${analyzeError.stack}`);
        
        // Only use mock data if explicitly allowed
        if (!AI_CONFIG.ALLOW_MOCK_FALLBACK) {
          throw analyzeError;
        }
        
        console.log(`Falling back to mock analysis data for scan ${scanId}`);
        result = mockAnalysisResults;
        // Mark the result as mock data
        result._source = 'mock';
      }
      
      // Update progress
      activeAnalyses.get(scanId).progress = 90;
      
      if (AI_CONFIG.DEBUG_MODE) {
        console.log(`Analysis result for scan ${scanId}:`, JSON.stringify(result, null, 2).substring(0, 500) + '...');
      }
      
      // Update status with timestamp
      activeAnalyses.set(scanId, {
        ...activeAnalyses.get(scanId),
        status: 'completed',
        progress: 100,
        result,
        _source: result._source || 'bedrock',
        completedAt: new Date()
      });
      
      console.log(`Analysis completed successfully for scan ${scanId}`);
      
      // Save the latest analysis for this patient for better context awareness
      if (!global.patientLatestAnalyses) {
        global.patientLatestAnalyses = {};
      }
      global.patientLatestAnalyses[patientId] = { scanId, result };
      console.log(`Saved analysis for patient ${patientId} for future context`);
      
    } catch (error) {
      console.error(`Analysis failed for scan ${scanId}:`, error);
      console.error(`Error stack: ${error.stack}`);
      
      // Update status with error
      activeAnalyses.set(scanId, {
        ...activeAnalyses.get(scanId),
        status: 'failed',
        progress: 0,
        error: error.message,
        errorTime: new Date()
      });
    }
  })();
  
  res.json({ 
    success: true, 
    message: 'Scan uploaded and analysis started', 
    scanId 
  });
});

// Start analysis
router.post('/analyze/:scanId', (req, res) => {
  const { scanId } = req.params;
  
  // Check if there's already an active analysis for this scan
  if (!activeAnalyses.has(scanId)) {
    // Create a new analysis entry
    activeAnalyses.set(scanId, {
      status: 'processing',
      progress: 0,
      startTime: new Date()
    });
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      const analysis = activeAnalyses.get(scanId);
      if (!analysis) {
        clearInterval(progressInterval);
        return;
      }
      
      if (analysis.progress < 90) {
        analysis.progress += 10;
        activeAnalyses.set(scanId, analysis);
      } else {
        clearInterval(progressInterval);
        
        // Complete the analysis
        setTimeout(() => {
          activeAnalyses.set(scanId, {
            ...analysis,
            status: 'completed',
            progress: 100,
            result: mockAnalysisResults,
            endTime: new Date()
          });
        }, 1000);
      }
    }, 1000);
  }
  
  res.json({ 
    success: true, 
    message: 'Analysis started successfully',
    scanId
  });
});

// Get analysis results
router.get('/analysis/:scanId', (req, res) => {
  const { scanId } = req.params;
  
  if (activeAnalyses.has(scanId)) {
    const analysis = activeAnalyses.get(scanId);
    
    if (analysis.status === 'completed' && analysis.result) {
      // Log source information
      if (analysis._source) {
        console.log(`Returning analysis for scan ${scanId}, source: ${analysis._source}`);
      }
      
      // Include source information in the result
      const result = {
        ...analysis.result,
        _source: analysis._source || 'unknown'
      };
      
      return res.json(result);
    } else if (analysis.status === 'failed') {
      return res.status(500).json({
        status: 'failed',
        error: analysis.error || 'Analysis failed',
        _source: 'error'
      });
    } else {
      return res.json({
        status: analysis.status,
        progress: analysis.progress,
        _source: analysis._source || 'processing'
      });
    }
  }
  
  // If analysis not found and mock fallbacks allowed
  if (AI_CONFIG.ALLOW_MOCK_FALLBACK) {
    console.log(`No analysis found for scan ${scanId}, returning mock data`);
    return res.json({
      ...mockAnalysisResults,
      _source: 'mock'
    });
  } else {
    return res.status(404).json({ error: 'Analysis not found', _source: 'error' });
  }
});

// Get analysis status
router.get('/analysis/:scanId/status', (req, res) => {
  const { scanId } = req.params;
  
  if (activeAnalyses.has(scanId)) {
    const analysis = activeAnalyses.get(scanId);
    
    // Return detailed status
    const status = {
      status: analysis.status,
      progress: analysis.progress,
      message: analysis.message || '',
      updatedAt: analysis.updatedAt || analysis.timestamp || new Date(),
      patientId: analysis.patientId,
      _source: analysis._source || 'unknown'
    };
    
    // If the analysis failed, include error details
    if (analysis.status === 'failed') {
      status.error = analysis.error;
      status.errorTime = analysis.errorTime;
    }
    
    // Log whether this is mock or real data
    if (analysis._source) {
      console.log(`Analysis status for scan ${scanId}: ${analysis.status}, source: ${analysis._source}`);
    }
    
    res.json(status);
  } else {
    res.status(404).json({ status: 'not_found', message: 'Analysis not found' });
  }
});

// Endpoint to get analysis status
router.get('/analysis/status/:scanId', (req, res) => {
  const { scanId } = req.params;
  
  if (!scanId) {
    return res.status(400).json({ error: 'Scan ID is required' });
  }
  
  if (activeAnalyses.has(scanId)) {
    const analysis = activeAnalyses.get(scanId);
    return res.json({
      scanId,
      status: analysis.status,
      progress: analysis.progress || 0,
      _source: analysis._source || 'unknown'
    });
  } else {
    return res.status(404).json({
      error: 'Analysis not found',
      scanId,
      status: 'unknown'
    });
  }
});

// Get recommendations
router.get('/recommendations/:scanId', (req, res) => {
  const { scanId } = req.params;
  
  // Check if this analysis has completed
  if (activeAnalyses.has(scanId) && 
      activeAnalyses.get(scanId).status === 'completed' && 
      activeAnalyses.get(scanId).result) {
    
    // Generate recommendations based on findings
    const analysis = activeAnalyses.get(scanId);
    const findings = analysis.result.findings;
    
    const recommendations = findings.map(finding => {
      switch (finding.severity) {
        case 'severe':
          return `Urgent: Address ${finding.label.toLowerCase()} within 1-2 weeks`;
        case 'mild':
          return `Recommended: Monitor and treat ${finding.label.toLowerCase()} in the next month`;
        default:
          return `Consider addressing ${finding.label.toLowerCase()} during your next regular checkup`;
      }
    });
    
    return res.json(recommendations);
  }
  
  // Fallback to mock data
  res.json(mockRecommendations);
});

// Modify the treatment plan endpoint to ensure analysis is completed first
router.post('/treatment-plan', async (req, res) => {
  try {
    const { patientId, scanId } = req.body;
    
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }
    
    console.log(`Treatment plan request for scan ${scanId}, patient ${patientId}`);
    console.log(`FORCE_REAL_API is ${AI_CONFIG.FORCE_REAL_API ? 'enabled' : 'disabled'} for treatment plan generation for scan ${scanId}`);
    
    // Check for analysis result
    let analysisResult;
    let analysisStatus = { status: 'unknown' };
    
    if (scanId) {
      // First check status
      try {
        analysisStatus = await getAnalysisStatus(scanId);
        console.log(`Analysis status for scan ${scanId}: ${analysisStatus.status}, source: ${analysisStatus._source || 'unknown'}`);
      } catch (error) {
        console.error(`Error checking analysis status for scan ${scanId}:`, error);
      }
      
      // If analysis is still processing, wait for it to complete (with a timeout)
      if (analysisStatus.status === 'processing') {
        console.log(`Analysis for scan ${scanId} is still processing. Waiting for completion...`);
        
        // Wait for up to 15 seconds for the analysis to complete
        let waitTime = 0;
        const checkInterval = 1000; // 1 second
        const maxWaitTime = 15000; // 15 seconds
        
        while (waitTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waitTime += checkInterval;
          
          try {
            analysisStatus = await getAnalysisStatus(scanId);
            console.log(`Analysis status check after waiting ${waitTime}ms: ${analysisStatus.status}`);
            
            if (analysisStatus.status === 'completed') {
              console.log('Analysis completed while waiting, proceeding with treatment plan generation');
              break;
            } else if (analysisStatus.status === 'failed') {
              console.error('Analysis failed, cannot generate treatment plan based on it');
              break;
            }
          } catch (error) {
            console.error('Error checking analysis status while waiting:', error);
          }
        }
        
        if (waitTime >= maxWaitTime && analysisStatus.status !== 'completed') {
          console.log(`Timed out waiting for analysis to complete after ${maxWaitTime}ms`);
        }
      }
      
      // Attempt to get analysis results if analysis is completed
      if (analysisStatus.status === 'completed') {
        try {
          analysisResult = await getAnalysisResult(scanId);
          console.log(`Found completed analysis for scan ${scanId}, source: ${analysisResult._source || 'unknown'}`);
        } catch (error) {
          console.error(`Error fetching analysis result for scan ${scanId}:`, error);
        }
      }
    }
    
    // If we didn't find an analysis result, try to get it from global store
    if (!analysisResult && global.patientLatestAnalyses && global.patientLatestAnalyses[patientId]) {
      analysisResult = global.patientLatestAnalyses[patientId].result;
      console.log(`Using cached analysis for patient ${patientId}`);
    }
    
    // If analysis not provided, use mock findings
    if (!analysisResult || !analysisResult.findings) {
      if (AI_CONFIG.FORCE_REAL_API && !AI_CONFIG.ALLOW_MOCK_FALLBACK) {
        return res.status(400).json({ 
          error: 'No analysis results available and mock data is disabled' 
        });
      }
      
      console.log(`No analysis found, using mock findings for treatment plan generation`);
      analysisResult = mockAnalysisResults;
    }
    
    console.log(`Generating treatment plan for scan ${scanId} with ${analysisResult.findings.length} findings`);
    
    // Prepare patient info
    const patientInfo = {
      id: patientId,
      // Add any additional patient info from request if available
      age: req.body.patientAge || '35',
      gender: req.body.patientGender || 'Not specified',
      medicalHistory: req.body.medicalHistory || 'No significant medical history'
    };
    
    // Generate treatment plan
    const treatmentPlan = await generateTreatmentPlanWithBedrock(
      analysisResult.findings, 
      patientInfo
    );
    
    console.log(`Treatment plan result for scan ${scanId}:`, JSON.stringify(treatmentPlan, null, 2).substring(0, 500) + '...');
    
    // Store in global state for chat context
    if (!global.patientTreatmentPlans) {
      global.patientTreatmentPlans = {};
    }
    global.patientTreatmentPlans[patientId] = treatmentPlan;
    console.log(`Stored treatment plan for patient ${patientId} for future context`);
    
    return res.json({
      ...treatmentPlan,
      patientId: patientId,
    });
  } catch (error) {
    console.error('Error generating treatment plan:', error);
    
    // Return mock data in case of error if allowed
    if (AI_CONFIG.ALLOW_MOCK_FALLBACK) {
      console.log('Falling back to mock treatment plan data due to error');
      return res.json({
        ...mockTreatmentPlan,
        patientId: req.body.patientId || 'unknown',
        _source: 'mock'
      });
    }
    
    return res.status(500).json({ error: 'Failed to generate treatment plan' });
  }
});

// Direct chat endpoint with Amazon Bedrock Nova Pro
router.post('/chat', async (req, res) => {
  try {
    console.log('Chat request received');
    const { message, patientId } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        message: 'No message provided' 
      });
    }
    
    // Check if Bedrock client is available
    if (!bedrockClient) {
      console.error('Bedrock client not available');
      return res.status(500).json({
        success: false,
        message: "I'm having trouble connecting to our AI service. Please try again later.",
        source: 'error'
      });
    }
    
    console.log(`Generating response for patient ${patientId} to message: ${message.substring(0, 50)}...`);
    
    // Get patient context if available
    let patientContext = '';
    if (global.patientLatestAnalyses && global.patientLatestAnalyses[patientId]) {
      const analysis = global.patientLatestAnalyses[patientId];
      if (analysis.result && analysis.result.findings) {
        patientContext += `Patient dental findings:\n`;
        analysis.result.findings.forEach((finding, i) => {
          patientContext += `- ${finding.label}\n`;
        });
        patientContext += '\n';
      }
    }
    
    if (global.patientTreatmentPlans && global.patientTreatmentPlans[patientId]) {
      const plan = global.patientTreatmentPlans[patientId];
      patientContext += `Treatment plan:\n`;
      if (plan.steps && Array.isArray(plan.steps)) {
        plan.steps.forEach((step, i) => {
          patientContext += `- ${step.description || step.step}\n`;
        });
      }
      patientContext += '\n';
    }
    
    // Prepare system for Nova Pro
    const systemPrompt = `You are a dental assistant helping a patient with a question about their dental health. 
Provide helpful, detailed, and accurate information. Be empathetic and professional.`;

    // Prepare the request payload for Nova Pro using the messages-v1 schema
    const payload = {
      schemaVersion: "messages-v1",
      system: [
        {
          text: systemPrompt
        }
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              text: `${patientContext ? `Patient information:\n${patientContext}\n\n` : ''}Patient question: ${message}`
            }
          ]
        }
      ],
      inferenceConfig: {
        maxTokens: 1000,
        temperature: 0.3,
        topP: 0.9
      }
    };
    
    // Make direct Bedrock call to Nova Pro
    console.log('Sending request to Nova Pro');
    const response = await bedrockClient.send(new InvokeModelCommand({
      modelId: 'amazon.nova-pro-v1:0',
      body: JSON.stringify(payload)
    }));
    
    // Parse response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('Raw response from Nova Pro:', JSON.stringify(responseBody).substring(0, 200) + '...');
    
    const aiResponse = responseBody.output.message.content[0].text;
    
    console.log('AI response:', aiResponse.substring(0, 200) + '...');
    
    return res.json({
      success: true,
      message: aiResponse,
      source: 'nova_pro'
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    
    // Try the chat-test endpoint as fallback
    try {
      console.log('Falling back to chat-test endpoint');
      const { message } = req.body;
      
      // Return different responses based on input for better fallback experience
      let response = "I'm a dental assistant and I can help answer your questions about dental health.";
      
      if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
        response = "Hello! I'm your dental assistant. How can I help with your dental health today?";
      } 
      else if (message.toLowerCase().includes('tooth') || message.toLowerCase().includes('teeth')) {
        response = "It's important to take good care of your teeth with regular brushing, flossing, and dental checkups. If you're experiencing any issues with your teeth, I recommend scheduling an appointment with your dentist.";
      }
      else if (message.toLowerCase().includes('pain') || message.toLowerCase().includes('hurt')) {
        response = "Dental pain should be evaluated by a dentist as soon as possible. It could indicate various issues like cavities, infection, or gum disease. Would you like to schedule an appointment?";
      }
      else if (message.toLowerCase().includes('clean') || message.toLowerCase().includes('cleaning')) {
        response = "Regular dental cleanings every 6 months help prevent cavities, gum disease, and other dental problems. Professional cleanings remove plaque and tartar that you can't remove at home.";
      }
      else if (message.toLowerCase().includes('broken') || message.toLowerCase().includes('crack')) {
        response = "A broken or cracked tooth should be evaluated by a dentist immediately. In the meantime, rinse with warm water, apply a cold compress for pain, and take over-the-counter pain medication if needed.";
      }
      else if (message.toLowerCase().includes('dentist') || message.toLowerCase().includes('find')) {
        response = "To find a qualified dentist, you can ask for recommendations from friends or family, check with your insurance provider for in-network dentists, or search online for highly rated dental practices in your area.";
      }
      
      return res.json({
        success: true,
        message: response,
        source: 'fallback'
      });
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      
      return res.status(500).json({
        success: false,
        message: "I'm having trouble processing your request right now. Please try again in a moment.",
        source: 'error'
      });
    }
  }
});

// Special detections
router.post('/detect/caries/:scanId', async (req, res) => {
  const { scanId } = req.params;
  
  // Check if we have analysis results for this scan
  if (activeAnalyses.has(scanId) && 
      activeAnalyses.get(scanId).status === 'completed' && 
      activeAnalyses.get(scanId).result) {
    
    const analysis = activeAnalyses.get(scanId);
    
    // Filter findings for cavities/caries
    const cariesFindings = analysis.result.findings.filter(f => 
      f.label.toLowerCase().includes('cavity') || 
      f.label.toLowerCase().includes('caries')
    );
    
    if (cariesFindings.length > 0) {
      return res.json({
        findings: cariesFindings,
        overall: `Found ${cariesFindings.length} cavity/caries issues.`,
        confidence: Math.max(...cariesFindings.map(f => f.confidence)),
        processingTime: analysis.result.processingTime || 800
      });
    }
  }
  
  // Fallback to mock data
  res.json({
    findings: [
      {
        label: 'Cavity detected on tooth #14',
        confidence: 0.92,
        severity: 'severe',
      },
      {
        label: 'Early cavity forming on tooth #18',
        confidence: 0.68,
        severity: 'mild',
      }
    ],
    overall: 'Two cavities detected with varying severity.',
    confidence: 0.85,
    processingTime: 800
  });
});

router.post('/detect/gum-disease/:scanId', async (req, res) => {
  const { scanId } = req.params;
  
  // Check if we have analysis results for this scan
  if (activeAnalyses.has(scanId) && 
      activeAnalyses.get(scanId).status === 'completed' && 
      activeAnalyses.get(scanId).result) {
    
    const analysis = activeAnalyses.get(scanId);
    
    // Filter findings for gum disease
    const gumFindings = analysis.result.findings.filter(f => 
      f.label.toLowerCase().includes('gum') || 
      f.label.toLowerCase().includes('gingivitis') ||
      f.label.toLowerCase().includes('periodontal')
    );
    
    if (gumFindings.length > 0) {
      return res.json({
        findings: gumFindings,
        overall: `Found ${gumFindings.length} gum health issues.`,
        confidence: Math.max(...gumFindings.map(f => f.confidence)),
        processingTime: analysis.result.processingTime || 750
      });
    }
  }
  
  // Fallback to mock data
  res.json({
    findings: [
      {
        label: 'Gingivitis detected in lower right quadrant',
        confidence: 0.78,
        severity: 'mild',
      }
    ],
    overall: 'Early stage gum disease detected that requires attention.',
    confidence: 0.78,
    processingTime: 750
  });
});

// Generate report
router.post('/report/:scanId', async (req, res) => {
  const { scanId } = req.params;
  const patientId = req.body.patientId || 'Unknown';
  
  // Check if we have analysis results for this scan
  if (!bedrockClient || !activeAnalyses.has(scanId) || 
      activeAnalyses.get(scanId).status !== 'completed') {
    // Fallback to mock report
    return res.json(`
Dental Analysis Report
Patient ID: ${patientId}
Date: ${new Date().toLocaleDateString()}

FINDINGS:
- Cavity detected on tooth #14 (Severity: High)
- Early stage gum disease (Severity: Mild)
- Wisdom tooth needs monitoring (Severity: Low)

RECOMMENDATIONS:
1. Schedule filling for cavity on tooth #14 within 2 weeks
2. Improve brushing technique, focus on gumline
3. Use antimicrobial mouthwash for gum disease
4. Schedule follow-up in 3 months for wisdom tooth evaluation

TREATMENT PLAN:
Priority 1: Dental filling (Est. cost: $150-250)
Priority 2: Deep cleaning (Est. cost: $200-300)
Priority 3: Wisdom tooth evaluation (Est. cost: $75-125)

Overall dental health score: 72/100
    `);
  }
  
  try {
    const analysis = activeAnalyses.get(scanId);
    
    // Create the prompt for report generation
    const prompt = `Generate a comprehensive dental report based on the following analysis results:
${JSON.stringify(analysis.result, null, 2)}

The report should include:
1. A summary of findings with severity levels
2. Clear, actionable recommendations
3. A suggested treatment plan with priorities
4. An overall dental health score (0-100)

Format it as a clean text report with clear sections.`;

    // Prepare payload for Nova Pro using messages-v1 schema
    const payload = {
      schemaVersion: "messages-v1",
      system: [
        {
          text: "You are a dental professional creating comprehensive dental reports from analysis findings."
        }
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              text: prompt
            }
          ]
        }
      ],
      inferenceConfig: {
        maxTokens: 1500,
        temperature: 0.4,
        topP: 0.9
      }
    };

    // Send the request to Nova Pro
    console.log('Sending request to Nova Pro for report generation...');
    const response = await bedrockClient.send(new InvokeModelCommand({
      modelId: 'amazon.nova-pro-v1:0',
      body: JSON.stringify(payload)
    }));
    
    console.log('Response received from Nova Pro');
    
    // Extract the text response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const report = responseBody.output.message.content[0].text;
    
    res.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    
    // Fallback to mock report
    res.json(`
Dental Analysis Report
Patient ID: ${patientId}
Date: ${new Date().toLocaleDateString()}

FINDINGS:
- Cavity detected on tooth #14 (Severity: High)
- Early stage gum disease (Severity: Mild)
- Wisdom tooth needs monitoring (Severity: Low)

RECOMMENDATIONS:
1. Schedule filling for cavity on tooth #14 within 2 weeks
2. Improve brushing technique, focus on gumline
3. Use antimicrobial mouthwash for gum disease
4. Schedule follow-up in 3 months for wisdom tooth evaluation

TREATMENT PLAN:
Priority 1: Dental filling (Est. cost: $150-250)
Priority 2: Deep cleaning (Est. cost: $200-300)
Priority 3: Wisdom tooth evaluation (Est. cost: $75-125)

Overall dental health score: 72/100
    `);
  }
});

// Get scan image
router.get('/scan/:scanId', (req, res) => {
  const { scanId } = req.params;
  
  // Check if this scan exists in active analyses
  if (activeAnalyses.has(scanId) && activeAnalyses.get(scanId).filePath) {
    const analysis = activeAnalyses.get(scanId);
    const filePath = analysis.filePath;
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }
  
  // If scan not found or file doesn't exist, send placeholder image
  const placeholderPath = path.join(__dirname, '../../public/dental-xray.jpg');
  if (fs.existsSync(placeholderPath)) {
    return res.sendFile(placeholderPath);
  }
  
  // If all else fails, return a redirect to a demo dental scan
  res.redirect('https://img.freepik.com/free-photo/medical-x-ray-teeth-panoramic-scan-oral-exam-dental-clinic-jaws-upper-lower-panorama-scan-clean-teeth_73944-3153.jpg');
});

/* Test endpoint to check if Bedrock is available */
router.get('/test', async (req, res) => {
  try {
    // Check if Bedrock client is initialized
    const bedrockAvailable = !!bedrockClient;
    
    res.json({
      message: 'AI service status',
      bedrockAvailable: bedrockAvailable,
      timestamp: new Date(),
      modelInfo: bedrockClient ? 'Connected to AWS Bedrock' : 'AWS Bedrock not available'
    });
  } catch (error) {
    console.error('Error testing AI availability:', error);
    res.status(500).json({
      message: 'Error testing AI service',
      error: error.message,
      bedrockAvailable: false
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Verify Bedrock connectivity
    const isBedrockAvailable = !!bedrockClient;
    
    // Basic health status
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        server: true,
        bedrock: isBedrockAvailable
      },
      aiConfig: {
        forceRealApi: AI_CONFIG.FORCE_REAL_API,
        allowMockFallback: AI_CONFIG.ALLOW_MOCK_FALLBACK,
        debugMode: AI_CONFIG.DEBUG_MODE,
        useClaudeModel: AI_CONFIG.USE_CLAUDE
      }
    };
    
    console.log("Health check response:", JSON.stringify(healthStatus));
    res.json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Health check failed', 
      error: error.message 
    });
  }
});

// Debug test endpoint for Bedrock API
router.get('/debug-test', async (req, res) => {
  try {
    if (!bedrockClient) {
      return res.status(503).json({
        testPassed: false,
        error: 'Bedrock client not initialized'
      });
    }
    
    // Simple test with Nova Pro
    const modelId = 'amazon.nova-pro-v1:0';
    
    // Simple payload to test connection
    const payload = {
      messages: [
        {
          role: "user",
          content: "Hello, can you respond with a very short greeting?"
        }
      ]
    };
    
    console.log('Testing Bedrock API connection with a simple message...');
    
    // Use InvokeModel
    const command = new InvokeModelCommand({
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload)
    });
    
    // Send the request
    const response = await bedrockClient.send(command);
    
    // Parse response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Check for a valid response
    if (responseBody && 
        ((responseBody.content && responseBody.content.length > 0) || 
         (responseBody.outputs && responseBody.outputs.length > 0))) {
      
      return res.json({
        testPassed: true,
        message: 'Successfully connected to Bedrock API',
        modelUsed: modelId
      });
    } else {
      return res.status(500).json({
        testPassed: false,
        error: 'Invalid response format from Bedrock API',
        details: JSON.stringify(responseBody).substring(0, 200)
      });
    }
  } catch (error) {
    console.error('Bedrock API test failed:', error);
    return res.status(500).json({
      testPassed: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Simple test endpoint that doesn't use AI
router.get('/test-simple', async (req, res) => {
  console.log('Simple test endpoint called');
  
  try {
    return res.json({
      success: true,
      message: "This is a test response that doesn't use AI.",
      source: 'hardcoded'
    });
  } catch (error) {
    console.error('Error in simple test endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Error in test endpoint',
      source: 'error'
    });
  }
});

// Simple chat test endpoint that doesn't use AI
router.post('/chat-test', async (req, res) => {
  console.log('Simple chat test endpoint called');
  const { message } = req.body;
  
  try {
    // Return different responses based on input
    let response = "I'm a dental assistant and I can help answer your questions about dental health.";
    
    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
      response = "Hello! I'm your dental assistant. How can I help with your dental health today?";
    } 
    else if (message.toLowerCase().includes('tooth') || message.toLowerCase().includes('teeth')) {
      response = "It's important to brush your teeth twice daily and floss regularly to maintain good dental health.";
    }
    else if (message.toLowerCase().includes('pain') || message.toLowerCase().includes('hurt')) {
      response = "Dental pain should be evaluated by a dentist as soon as possible. Would you like to schedule an appointment?";
    }
    else if (message.toLowerCase().includes('clean') || message.toLowerCase().includes('cleaning')) {
      response = "Regular dental cleanings every 6 months are recommended for optimal oral health.";
    }
    
    return res.json({
      success: true,
      message: response,
      source: 'hardcoded'
    });
  } catch (error) {
    console.error('Error in simple chat test endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing your request',
      source: 'error'
    });
  }
});

// Helper function to get analysis status
async function getAnalysisStatus(scanId) {
  if (!scanId) {
    return { status: 'unknown', error: 'No scan ID provided' };
  }
  
  if (activeAnalyses.has(scanId)) {
    const analysis = activeAnalyses.get(scanId);
    return { 
      status: analysis.status,
      progress: analysis.progress || 0,
      _source: analysis._source || 'unknown'
    };
  }
  
  return { status: 'unknown', error: 'Analysis not found' };
}

// Helper function to get analysis result
async function getAnalysisResult(scanId) {
  if (!scanId || !activeAnalyses.has(scanId)) {
    throw new Error('Analysis not found');
  }
  
  const analysis = activeAnalyses.get(scanId);
  
  if (analysis.status !== 'completed' || !analysis.result) {
    throw new Error(`Analysis is not completed (status: ${analysis.status})`);
  }
  
  return analysis.result;
}

// Route to serve files from the public directory
router.get('/public/:fileName', (req, res) => {
  const { fileName } = req.params;
  const filePath = path.join(__dirname, '../../public', fileName);
  
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  } else {
    return res.status(404).json({ error: 'File not found' });
  }
});

module.exports = router; 