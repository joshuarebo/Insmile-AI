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
      severity: 'mild',
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

// Helper function to analyze an image using Bedrock
async function analyzeImageWithBedrock(imagePath, type = 'dental') {
  if (!bedrockClient) {
    console.log('Bedrock client not available, using mock data');
    return mockAnalysisResults;
  }

  try {
    console.log(`Analyzing ${type} image with Bedrock Nova Pro...`);
    const startTime = Date.now();
    
    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Create the prompt for dental analysis
    const prompt = `Please analyze this ${type} dental image in high detail and provide:
1. A detailed list of findings, including any abnormalities like cavities, gum disease, or misalignments
2. For each finding, include a confidence level and severity (normal, mild, severe)
3. An overall assessment of dental health
4. Format your response as a structured JSON object with the following keys:
   - findings: array of objects with "label", "confidence" (0-1 decimal), "severity" (normal, mild, severe)
   - overall: string description of overall dental health
   - confidence: number indicating overall confidence (0-1)`;

    // Prepare the request payload for Nova Pro
    const payload = {
      inputs: [
        {
          type: "text",
          text: prompt
        },
        {
          type: "image",
          format: "base64",
          source: {
            data: base64Image,
            media_type: "image/jpeg"
          }
        }
      ],
      inference_params: {
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 2000
      }
    };

    // Invoke the Bedrock model
    const command = new InvokeModelCommand({
      modelId: 'amazon.nova-pro',
      body: JSON.stringify(payload)
    });

    console.log('Sending request to Bedrock...');
    const response = await bedrockClient.send(command);
    console.log('Response received from Bedrock');
    
    try {
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      console.log('Parsing response body...');
      
      // Extract JSON from the response
      const outputText = responseBody.outputs[0].text;
      const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/) || 
                     outputText.match(/({[\s\S]*})/) ||
                     outputText.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        console.log('Found JSON in response:', jsonString.substring(0, 100) + '...');
        
        try {
          const analysisData = JSON.parse(jsonString);
          // Add processing time
          analysisData.processingTime = Date.now() - startTime;
          console.log('Successfully parsed analysis data');
          return analysisData;
        } catch (jsonError) {
          console.error('Error parsing JSON from response:', jsonError);
        }
      } else {
        console.log('No JSON found in response, using response text');
        // Format the response as best we can
        return {
          overall: outputText.substring(0, 200),
          findings: [
            {
              label: 'AI analysis results (unstructured)',
              confidence: 0.7,
              severity: 'mild'
            }
          ],
          confidence: 0.7,
          processingTime: Date.now() - startTime
        };
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
    }
    
    // If all else fails, fall back to mock data
    console.log('Falling back to mock data due to processing error');
    return mockAnalysisResults;
  } catch (error) {
    console.error('Error analyzing image with Bedrock:', error);
    // Fall back to mock data on error
    return mockAnalysisResults;
  }
}

// Helper function to generate treatment plan using Bedrock
async function generateTreatmentPlanWithBedrock(findings, patientInfo) {
  if (!bedrockClient) {
    console.log('Bedrock client not available, using mock data');
    return mockTreatmentPlan;
  }

  try {
    console.log('Generating treatment plan with Bedrock Nova Pro...');
    
    // Create the prompt for treatment plan generation
    const findingsText = findings
      .map(f => `- ${f.label} (${f.severity} severity, ${Math.round(f.confidence * 100)}% confidence)`)
      .join('\n');

    const prompt = `As a dental professional, generate a comprehensive treatment plan based on the following findings and patient information:

Findings:
${findingsText}

Patient Information:
${JSON.stringify(patientInfo, null, 2)}

Generate a detailed treatment plan including:
1. Summary of diagnosis
2. Step-by-step treatment procedures with priority levels (high, medium, low)
3. Estimated time and cost for each procedure
4. Prerequisites for each step
5. Overall precautions
6. Alternative treatment options

Format your response as a structured JSON object with the following keys:
- summary: string
- diagnosis: string
- steps: array of objects with description, priority, estimatedTime, estimatedCost, prerequisites
- totalEstimatedTime: string
- totalEstimatedCost: string 
- precautions: array of strings
- alternatives: array of strings`;

    // Prepare the request payload for Nova Pro
    const payload = {
      inputs: [
        {
          type: "text",
          text: prompt
        }
      ],
      inference_params: {
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 4000
      }
    };

    // Invoke the Bedrock model
    const command = new InvokeModelCommand({
      modelId: 'amazon.nova-pro',
      body: JSON.stringify(payload)
    });

    console.log('Sending request to Bedrock...');
    const response = await bedrockClient.send(command);
    console.log('Response received from Bedrock');
    
    try {
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      console.log('Parsing response body...');
      
      // Extract JSON from the response
      const outputText = responseBody.outputs[0].text;
      const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/) || 
                     outputText.match(/({[\s\S]*})/) ||
                     outputText.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        console.log('Found JSON in response:', jsonString.substring(0, 100) + '...');
        
        try {
          const treatmentPlan = JSON.parse(jsonString);
          console.log('Successfully parsed treatment plan data');
          return treatmentPlan;
        } catch (jsonError) {
          console.error('Error parsing JSON from response:', jsonError);
        }
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
    }
    
    // If all else fails, fall back to mock data
    console.log('Falling back to mock data due to processing error');
    return mockTreatmentPlan;
  } catch (error) {
    console.error('Error generating treatment plan with Bedrock:', error);
    // Fall back to mock data on error
    return mockTreatmentPlan;
  }
}

// Test endpoint
router.get('/test', (req, res) => {
  const isBedrockAvailable = !!bedrockClient;
  res.json({ 
    message: 'AI API is working!', 
    bedrockAvailable: isBedrockAvailable 
  });
});

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
      
      // Perform analysis
      const result = await analyzeImageWithBedrock(req.file.path, scanType);
      
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
      return res.json(treatmentPlan);
    } catch (error) {
      console.error('Error generating treatment plan:', error);
    }
  }
  
  // Fallback to mock data
  res.json(mockTreatmentPlan);
});

// Chat endpoint
router.post('/chat', async (req, res) => {
  const { patientId, message } = req.body;
  
  if (!bedrockClient || !message) {
    // Fallback to mock responses
    const responses = [
      'Based on your dental scan, I recommend scheduling a cleaning appointment.',
      'Your cavity on tooth #14 should be treated within the next 2-3 weeks.',
      'Gum disease is at an early stage and can be managed with proper oral hygiene.',
      'Feel free to ask any questions about your treatment plan.',
      'Regular flossing will help with your gum health significantly.'
    ];
    
    return res.json({ 
      message: responses[Math.floor(Math.random() * responses.length)]
    });
  }
  
  try {
    console.log('Processing chat message with Bedrock Nova Pro...');
    
    // Create the prompt
    const prompt = `You are a dental AI assistant named InsmileAI. You're helping a patient with ID ${patientId} understand their dental condition and treatment options.

Please respond to their question in a helpful, accurate and professional manner. Keep your response concise but informative.

Patient question: "${message}"`;

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
      modelId: 'amazon.nova-pro',
      body: JSON.stringify(payload)
    });

    console.log('Sending request to Bedrock...');
    const response = await bedrockClient.send(command);
    console.log('Response received from Bedrock');
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const aiResponse = responseBody.outputs[0].text;
    
    res.json({ message: aiResponse });
  } catch (error) {
    console.error('Error processing chat message:', error);
    
    // Fallback to predefined response
    res.json({ 
      message: "I'm sorry, I'm having trouble processing your request right now. Please try again later."
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
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 2000
      }
    };

    // Invoke the Bedrock model
    const command = new InvokeModelCommand({
      modelId: 'amazon.nova-pro',
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

module.exports = router; 