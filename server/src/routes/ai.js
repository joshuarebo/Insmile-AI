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

// Helper function to analyze an image using Bedrock
// async function analyzeImageWithBedrock(imagePath, type = 'dental') {
//   ...
// }

// Upload and analyze scan
router.post('/upload-scan', upload.single('scan'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  
  const scanId = Date.now().toString();
  const patientId = req.body.patientId || 'unknown';
  const scanType = req.body.scanType || 'xray';
  
  // Create analysis status
  activeAnalyses.set(scanId, {
    status: 'processing',
    progress: 0,
    patientId,
    scanType,
    filePath: req.file.path
  });
  
  // Start analysis process in background
  (async () => {
    try {
      // Update progress
      activeAnalyses.get(scanId).progress = 30;
      
      // Add a unique identifier to force fresh analysis
      if (req.body.forceRealMode === 'true' || AI_CONFIG.FORCE_REAL_API) {
        console.log('FORCE_REAL_API is enabled - ensuring real analysis is performed');
      }
      
      // Perform analysis using Bedrock function
      const result = await analyzeImageWithBedrock(req.file.path, scanType);
      
      if (AI_CONFIG.DEBUG_MODE) {
        console.log('Analysis result:', JSON.stringify(result, null, 2).substring(0, 500) + '...');
      }
      
      // Update status
      activeAnalyses.set(scanId, {
        ...activeAnalyses.get(scanId),
        status: 'completed',
        progress: 100,
        result
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      activeAnalyses.set(scanId, {
        ...activeAnalyses.get(scanId),
        status: 'failed',
        error: error.message
      });
    }
  })();
  
  res.json({ 
    success: true, 
    message: 'Scan uploaded and analysis started', 
    scanId,
    usingRealApi: AI_CONFIG.FORCE_REAL_API
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

// Get analysis result
router.get('/analysis/:scanId', (req, res) => {
  const { scanId } = req.params;
  
  // Check if this is an active analysis
  if (activeAnalyses.has(scanId)) {
    const analysis = activeAnalyses.get(scanId);
    
    if (analysis.status === 'completed' && analysis.result) {
      return res.json(analysis.result);
    } else if (analysis.status === 'failed') {
      return res.status(500).json({ error: analysis.error || 'Analysis failed' });
    } else {
      return res.status(202).json({ 
        message: 'Analysis in progress', 
        status: analysis.status,
        progress: analysis.progress
      });
    }
  }
  
  // Fallback to mock data
  res.json(mockAnalysisResults);
});

// Get analysis status
router.get('/analysis/:scanId/status', (req, res) => {
  const { scanId } = req.params;
  
  // Check if this is an active analysis
  if (activeAnalyses.has(scanId)) {
    const analysis = activeAnalyses.get(scanId);
    return res.json({ 
      status: analysis.status, 
      progress: analysis.progress 
    });
  }
  
  // Fallback to mock data
  res.json(mockAnalysisStatus);
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

// Generate treatment plan
router.post('/treatment-plan', async (req, res) => {
  const { scanId, patientId } = req.body;
  
  // Get patient info (in a real app, this would come from a database)
  const patientInfo = {
    id: patientId,
    age: 35,
    gender: 'female',
    medicalHistory: 'No significant dental history'
  };
  
  // Log if we're forcing real API calls
  if (AI_CONFIG.FORCE_REAL_API) {
    console.log('FORCE_REAL_API is enabled for treatment plan generation');
  }
  
  // Check if we have analysis results for this scan
  if (activeAnalyses.has(scanId) && 
      activeAnalyses.get(scanId).status === 'completed' && 
      activeAnalyses.get(scanId).result) {
    
    const analysis = activeAnalyses.get(scanId);
    try {
      // Generate treatment plan based on findings
      const treatmentPlan = await generateTreatmentPlanWithBedrock(
        analysis.result.findings, 
        patientInfo
      );
      
      if (AI_CONFIG.DEBUG_MODE) {
        console.log('Treatment plan result:', JSON.stringify(treatmentPlan, null, 2).substring(0, 500) + '...');
      }
      
      return res.json({
        ...treatmentPlan,
        _source: 'real_api'
      });
    } catch (error) {
      console.error('Error generating treatment plan:', error);
      
      // If fallbacks are disabled, send the error to the client
      if (!AI_CONFIG.ALLOW_MOCK_FALLBACK) {
        return res.status(500).json({ 
          error: 'Failed to generate treatment plan', 
          message: error.message,
          _source: 'error'
        });
      }
    }
  }
  
  // Fallback to mock data only if allowed
  if (AI_CONFIG.ALLOW_MOCK_FALLBACK) {
    console.log('Falling back to mock treatment plan data');
    return res.json({
      ...mockTreatmentPlan,
      _source: 'mock'
    });
  } else {
    return res.status(404).json({ 
      error: 'No analysis found for this scan and mock fallbacks disabled',
      _source: 'error'
    });
  }
});

// Chat endpoint with Bedrock
router.post('/chat', async (req, res) => {
  const { patientId, message, chatHistory } = req.body;
  
  if (!message) {
    return res.status(400).json({ 
      error: 'No message provided',
      _source: 'error'
    });
  }
  
  // Log if we're forcing real API calls
  if (AI_CONFIG.FORCE_REAL_API) {
    console.log('FORCE_REAL_API is enabled for chat responses');
  }
  
  try {
    const response = await generateChatResponseWithBedrock(message, patientId, chatHistory);
    
    if (AI_CONFIG.DEBUG_MODE && typeof response === 'string') {
      console.log('Chat response:', response.substring(0, 100) + '...');
    }
    
    if (typeof response === 'string') {
      return res.json({ 
        message: response,
        _source: 'real_api'
      });
    } else if (response.response) {
      return res.json({ 
        message: response.response,
        _source: 'real_api' 
      });
    } else {
      return res.json({ 
        message: response,
        _source: 'real_api' 
      });
    }
  } catch (error) {
    console.error('Error processing chat message:', error);
    
    // If fallbacks are disabled, send the error to the client
    if (!AI_CONFIG.ALLOW_MOCK_FALLBACK) {
      return res.status(500).json({ 
        error: 'Failed to generate chat response', 
        message: error.message,
        _source: 'error'
      });
    }
    
    // Fallback to predefined response
    const mockResponses = [
      'Based on your dental scan, I recommend scheduling a cleaning appointment.',
      'Your cavity on tooth #14 should be treated within the next 2-3 weeks.',
      'Gum disease is at an early stage and can be managed with proper oral hygiene.',
      'Feel free to ask any questions about your treatment plan.',
      'Regular flossing will help with your gum health significantly.'
    ];
    
    return res.json({ 
      message: mockResponses[Math.floor(Math.random() * mockResponses.length)],
      _source: 'mock'
    });
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
    
    // Create the prompt
    const prompt = `Generate a comprehensive dental report based on the following analysis results:
${JSON.stringify(analysis.result, null, 2)}

The report should include:
1. A summary of findings with severity levels
2. Clear, actionable recommendations
3. A suggested treatment plan with priorities
4. An overall dental health score (0-100)

Format it as a clean text report with clear sections.`;

    // Prepare the request payload for Nova Pro
    const payload = {
      inputs: [
        {
          type: "text",
          text: prompt
        }
      ],
      inference_params: {
        temperature: 0.4,
        top_p: 0.9,
        max_tokens: 1000
      }
    };

    // Invoke the Bedrock model
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      body: JSON.stringify(payload)
    });

    console.log('Sending request to Bedrock...');
    const response = await bedrockClient.send(command);
    console.log('Response received from Bedrock');
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const report = responseBody.outputs[0].text;
    
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
  const placeholderPath = path.join(__dirname, '../../public/placeholder-scan.jpg');
  if (fs.existsSync(placeholderPath)) {
    return res.sendFile(placeholderPath);
  }
  
  // If all else fails, return a redirect to a demo dental scan
  res.redirect('https://www.shutterstock.com/image-illustration/dental-xray-scan-teeth-3d-260nw-1925303613.jpg');
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

/* Test endpoint to check if Bedrock is available with detailed test */
router.get('/debug-test', async (req, res) => {
  try {
    // Check if bedrock client is initialized
    if (!bedrockClient) {
      return res.json({
        bedrockInitialized: false,
        testPassed: false,
        error: 'Bedrock client not initialized'
      });
    }
    
    console.log('Testing Bedrock connection with Amazon Nova Pro...');
    
    // Use Nova Pro format - NOT Claude messages format
    const payload = {
      modelId: 'amazon.nova-pro-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputs: [
          {
            type: "text",
            text: "Respond with 'API_TEST_SUCCESS' if you can read this message. This is a connectivity test for a dental AI application."
          }
        ],
        inference_params: {
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 20
        }
      })
    };
    
    console.log('Sending test payload to Bedrock:', JSON.stringify(payload).substring(0, 200));
    
    const command = new InvokeModelCommand(payload);
    const response = await bedrockClient.send(command);
    
    // Parse the response
    const responseBody = Buffer.from(response.body).toString('utf8');
    const parsedResponse = JSON.parse(responseBody);
    
    console.log('Bedrock test response:', JSON.stringify(parsedResponse).substring(0, 200));
    
    // Check for expected response in Nova Pro format
    const outputText = parsedResponse.outputs?.[0]?.text || '';
    const testPassed = outputText.includes('API_TEST_SUCCESS') || 
                      outputText.includes('connectivity test') ||
                      outputText.toLowerCase().includes('dental');
    
    return res.json({
      bedrockInitialized: true,
      testPassed,
      response: parsedResponse,
      outputText
    });
  } catch (error) {
    console.error('Error testing Bedrock:', error);
    return res.json({
      bedrockInitialized: !!bedrockClient,
      testPassed: false,
      error: error.message,
      details: error.toString()
    });
  }
});

module.exports = router; 