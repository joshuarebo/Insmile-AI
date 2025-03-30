const fs = require('fs');
const path = require('path');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

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

// Initialize Bedrock client
let bedrockClient;
try {
  if (awsConfig && awsConfig.credentials && awsConfig.credentials.accessKeyId) {
    bedrockClient = new BedrockRuntimeClient(awsConfig);
    console.log('AWS Bedrock client initialized successfully');
  } else {
    console.log('AWS Bedrock client not initialized: missing credentials');
  }
} catch (error) {
  console.error('Error initializing AWS Bedrock client:', error.message);
  console.log('AI functionality will operate in mock mode only');
}

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

// Mock treatment plan
const mockTreatmentPlan = {
  patientId: 'demo',
  overview: 'Treatment plan for multiple dental issues including cavities and early gum disease.',
  steps: [
    {
      step: 'Deep Cleaning',
      description: 'Professional cleaning to address gum disease and remove plaque buildup.',
      timeframe: '1-2 weeks'
    },
    {
      step: 'Cavity Filling',
      description: 'Treat cavity on tooth #14 with composite filling.',
      timeframe: '2-3 weeks'
    },
    {
      step: 'Follow-up Examination',
      description: 'Check healing progress and assess gum health.',
      timeframe: '6 weeks'
    }
  ],
  precautions: [
    'Avoid hard foods for 24 hours after filling',
    'Use prescribed mouthwash for gum disease'
  ],
  alternatives: [
    'Porcelain inlay instead of composite filling (higher cost)',
    'Surgical intervention for gum disease if non-surgical approach fails'
  ],
  estimatedDuration: '2-3 months',
  estimatedCost: '$800-1200',
  severity: 'medium'
};

// Configuration for AI behavior
const AI_CONFIG = {
  // Set to true to force real API calls even if demo IDs are used
  FORCE_REAL_API: true,
  
  // Set to true to allow fallbacks to mock data if API fails
  ALLOW_MOCK_FALLBACK: true,
  
  // Log detailed output for debugging
  DEBUG_MODE: true,
  
  // Specify the model providers to use
  IMAGE_MODEL: 'NOVA_PRO',
  TEXT_MODEL: 'DEEPSEEK'
};

// Analyze image using Amazon Bedrock
async function analyzeImageWithBedrock(imagePath, scanType) {
  console.log(`=== STARTING IMAGE ANALYSIS WITH BEDROCK ===`);
  console.log(`Analyzing image: ${imagePath}`);
  console.log(`Scan type: ${scanType || 'unspecified'}`);
  console.log(`AI_CONFIG settings: FORCE_REAL_API=${AI_CONFIG.FORCE_REAL_API}, ALLOW_MOCK_FALLBACK=${AI_CONFIG.ALLOW_MOCK_FALLBACK}`);
  
  if (!bedrockClient) {
    console.error('CRITICAL ERROR: Bedrock client not available. Check AWS credentials and connection.');
    throw new Error('Bedrock client not available');
  }

  try {
    // Read the image file
    console.log(`Reading image file from path: ${imagePath}`);
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Convert to base64
    const base64Image = imageBuffer.toString('base64');
    
    // Get file extension
    const fileExtension = path.extname(imagePath).toLowerCase().replace('.', '');
    const mediaType = fileExtension === 'png' ? 'png' : 
                     fileExtension === 'gif' ? 'gif' : 'jpeg';
    
    console.log(`Image details - Media type: ${mediaType}, Size: ${imageBuffer.length} bytes`);
    
    // Use Nova Pro for image analysis
    console.log('Using Nova Pro for image analysis...');
    const modelId = 'amazon.nova-pro-v1:0';
    
    // Nova Pro payload structure for image analysis
    const payload = {
      schemaVersion: "messages-v1",
      messages: [
        {
          role: "user",
          content: [
            {
              image: {
                format: mediaType,
                source: {
                  bytes: base64Image
                }
              }
            },
            {
              text: `Analyze this dental ${scanType || ""} scan carefully. Identify any dental issues, conditions, or abnormalities.
              
              Your analysis should include:
              1. A detailed list of findings with confidence scores (high, medium, low)
              2. Severity assessment for each finding
              3. Potential treatment options
              4. Overall assessment
              
              Format the response as a JSON with this structure:
              {
                "findings": [
                  {
                    "label": "finding name and location",
                    "confidence": "high/medium/low",
                    "severity": "severe/moderate/mild/normal",
                    "description": "brief description"
                  }
                ],
                "overall": "overall assessment summary",
                "recommendations": ["recommendation 1", "recommendation 2"]
              }`
            }
          ]
        }
      ],
      inferenceConfig: {
        maxTokens: 1500,
        temperature: 0.1,
        topK: 50
      }
    };
    
    // Print the payload for debugging
    console.log(`=== PAYLOAD STRUCTURE (without image data) ===`);
    console.log(JSON.stringify({
      schemaVersion: "messages-v1",
      messages: [
        {
          role: "user",
          content: [
            {
              image: {
                format: "jpeg",
                source: {
                  bytes: "[IMAGE DATA]"
                }
              }
            },
            {
              text: "Dental scan analysis prompt (truncated)..."
            }
          ]
        }
      ],
      inferenceConfig: {
        maxTokens: 1500,
        temperature: 0.1,
        topK: 50
      }
    }, null, 2));
    
    console.log(`=== SENDING REQUEST TO ${modelId} ===`);
    
    // Use InvokeModel
    const command = new InvokeModelCommand({
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload)
    });
    
    console.log(`Request command prepared, sending to AWS Bedrock...`);
    
    // Send the request
    const response = await bedrockClient.send(command);
    
    // Parse response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('=== RECEIVED RESPONSE FROM MODEL ===');
    console.log('Response structure:', JSON.stringify(responseBody).substring(0, 300) + '...');
    
    // Parse Nova Pro response format
    let responseText;
    console.log('Parsing response format...');

    // Handle Nova Pro response format (messages-v1 schema)
    if (responseBody.output && responseBody.output.message) {
      console.log('Detected Nova Pro messages-v1 format');
      if (responseBody.output.message.content && responseBody.output.message.content.length > 0) {
        responseText = responseBody.output.message.content[0].text;
      }
    }
    // Handle standard Nova Pro text format
    else if (responseBody.text) {
      console.log('Detected Nova Pro text format');
      responseText = responseBody.text;
    }
    // Handle legacy formats (fallback)
    else if (responseBody.results && responseBody.results.length > 0) {
      console.log('Detected results array format');
      responseText = responseBody.results[0].outputText || responseBody.results[0].text;
      if (!responseText && responseBody.results[0].textImageUnderstandingResults) {
        responseText = responseBody.results[0].textImageUnderstandingResults.text;
      }
    }
    else if (responseBody.generations && responseBody.generations.length > 0) {
      console.log('Detected generations format');
      responseText = responseBody.generations[0].text;
    }
    else if (responseBody.content && responseBody.content.length > 0) {
      console.log('Detected content array format');
      responseText = responseBody.content[0].text;
    } else {
      console.error('=== ERROR: UNEXPECTED RESPONSE FORMAT ===');
      console.error(JSON.stringify(responseBody, null, 2));
      throw new Error('Unexpected response format from model');
    }
    
    if (!responseText) {
      console.error('=== ERROR: NO TEXT CONTENT IN RESPONSE ===');
      console.error(JSON.stringify(responseBody, null, 2));
      throw new Error('No text content in model response');
    }
    
    console.log('Response text (truncated):', responseText.substring(0, 300) + '...');
    
    // Find and extract JSON portion of the response
    console.log('Extracting JSON from response...');
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                     responseText.match(/```\n([\s\S]*?)\n```/) ||
                     responseText.match(/({[\s\S]*})/) ||
                     responseText.match(/{[\s\S]*?}/);
                     
    if (!jsonMatch) {
      console.error('=== ERROR: COULD NOT EXTRACT JSON FROM RESPONSE ===');
      console.error(responseText);
      throw new Error('Could not extract JSON from response');
    }
    
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    console.log('Extracted JSON (truncated):', jsonStr.substring(0, 300) + '...');
    
    // Clean up any formatting issues before parsing
    console.log('Cleaning and parsing JSON...');
    const cleanedJson = jsonStr
      .replace(/(\r\n|\n|\r)/gm, ' ')  // Remove newlines
      .replace(/\s+/g, ' ')            // Normalize whitespace
      .replace(/,\s*}/g, '}')          // Remove trailing commas in objects
      .replace(/,\s*]/g, ']')          // Remove trailing commas in arrays
      .replace(/\/\/.*/g, '')          // Remove comments
      .replace(/\\"/g, '"')            // Fix escaped quotes
      .replace(/"\s*:\s*"/g, '":"')    // Normalize key-value spacing
      .replace(/"\s*:\s*\[/g, '":[')   // Normalize array spacing
      .replace(/"\s*:\s*{/g, '":{');   // Normalize object spacing
    
    const analysisResult = JSON.parse(cleanedJson);
    
    // Validate the response has the expected format
    if (!analysisResult.findings || !Array.isArray(analysisResult.findings)) {
      console.error('=== ERROR: INVALID ANALYSIS RESPONSE FORMAT ===');
      console.error(JSON.stringify(analysisResult, null, 2));
      throw new Error('Invalid analysis response format: missing findings array');
    }
    
    // Convert text-based confidence to numeric values for frontend compatibility
    analysisResult.findings.forEach(finding => {
      if (typeof finding.confidence === 'string') {
        // Convert text confidence to numeric value
        switch (finding.confidence.toLowerCase()) {
          case 'high':
            finding.confidence = 0.9;
            break;
          case 'medium':
            finding.confidence = 0.7;
            break;
          case 'low':
            finding.confidence = 0.5;
            break;
          default:
            finding.confidence = 0.75; // Default value if unknown
        }
      }
    });
    
    console.log(`=== ANALYSIS SUCCESSFUL ===`);
    console.log(`Found ${analysisResult.findings.length} findings`);
    
    // Add source information to indicate this is real data
    analysisResult._source = 'real';
    return analysisResult;
    
  } catch (error) {
    console.error('=== ERROR ANALYZING IMAGE WITH BEDROCK ===');
    console.error('Error:', error.message);
    console.error('Error name:', error.name);
    console.error('Error stack:', error.stack);
    
    if (error.$metadata) {
      console.error('AWS error metadata:', JSON.stringify({
        requestId: error.$metadata.requestId,
        httpStatusCode: error.$metadata.httpStatusCode,
        cfId: error.$metadata.cfId,
        attempts: error.$metadata.attempts,
        totalRetryDelay: error.$metadata.totalRetryDelay
      }));
    }
    
    if (AI_CONFIG.ALLOW_MOCK_FALLBACK) {
      console.log('Falling back to mock data due to API error');
      const mockWithSource = { ...mockAnalysisResults, _source: 'mock' };
      return mockWithSource;
    }
    
    // If fallback is disabled, throw the error
    throw new Error(`Image analysis failed: ${error.message}`);
  }
}

// Helper function to generate treatment plan using Bedrock
async function generateTreatmentPlanWithBedrock(findings, patientInfo) {
  if (!bedrockClient) {
    // Fail if we're forced to use real API
    if (!AI_CONFIG.ALLOW_MOCK_FALLBACK) {
      throw new Error('Bedrock client not available and mock fallbacks disabled');
    }
    console.log('Bedrock client not available, using mock data');
    return mockTreatmentPlan;
  }

  try {
    console.log('Generating treatment plan with Bedrock...');
    
    // Create the prompt for treatment plan generation with specific terminology
    const findingsText = findings
      .map(f => `- ${f.label} (${typeof f.confidence === 'number' ? Math.round(f.confidence * 100) + '%' : f.confidence} confidence)`)
      .join('\n');

    const prompt = `As a specialized dental professional, create a comprehensive treatment plan based on the following patient findings and information.

CLINICAL FINDINGS:
${findingsText}

PATIENT INFORMATION:
${JSON.stringify(patientInfo, null, 2)}

Please provide a professionally detailed dental treatment plan that includes:

1. Comprehensive diagnosis with specific dental terminology
2. Step-by-step treatment procedures with proper sequencing and priority levels:
   - Urgent/immediate care needs
   - Primary restorative procedures
   - Secondary/follow-up procedures
   - Preventive measures

3. For each treatment step, provide:
   - Detailed clinical procedure description using proper dental terminology (e.g., "Composite resin restoration Class II on tooth #14" rather than just "filling")
   - Clinical time estimates per procedure
   - Recovery expectations
   - Specific materials and techniques recommended

4. Include appropriate precautions, post-procedure care instructions, and potential complications specific to the procedures

5. List specific alternative treatment options with evidence-based comparisons:
   - E.g., amalgam vs. composite resin vs. ceramic inlay for restorations
   - Implant vs. bridge vs. partial denture for tooth replacement

6. Provide evidence-based prognosis:
   - Short-term expectations
   - Long-term success rates for recommended procedures
   
7. Realistic cost estimate ranges, broken down by procedure

Format your response as a valid JSON object with:
{
  "patientId": "${patientInfo.id || 'unknown'}",
  "diagnosisAndOverview": "Detailed diagnosis overview with proper dental terminology",
  "overallSeverity": "low|moderate|severe",
  "steps": [
    {
      "procedure": "Specific procedure name with tooth number",
      "description": "Detailed clinical description of the procedure",
      "priority": "urgent|high|medium|low",
      "timeframe": "When this should be done",
      "estimatedClinicalTime": "Procedure duration estimate",
      "estimatedCost": "Cost range for this specific procedure",
      "materials": ["Specific materials to be used"],
      "postCare": ["Specific aftercare instructions"]
    }
  ],
  "precautions": ["List of specific precautions"],
  "alternatives": [
    {
      "procedure": "Alternative procedure name",
      "description": "Description of alternative",
      "pros": ["Benefits"],
      "cons": ["Drawbacks"],
      "costComparison": "Cost difference"
    }
  ],
  "totalEstimatedDuration": "Total treatment timespan",
  "totalEstimatedCost": "Total cost range",
  "maintenanceRecommendations": ["Long-term maintenance recommendations"],
  "followUpSchedule": "Recommended follow-up timeline"
}

Ensure each procedure references specific teeth using standard dental numbering systems and uses precise dental terminology.`;

    // For treatment plan generation, use Nova Pro
    console.log('Using Nova Pro for treatment plan generation...');
    const modelId = 'amazon.nova-pro-v1:0';

    // Nova Pro payload structure
    const payload = {
      schemaVersion: "messages-v1",
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
        maxTokens: 2000,
        temperature: 0.1,
        topK: 50
      }
    };

    console.log(`Sending request to ${modelId} for treatment plan generation...`);
    
    // Use InvokeModel
    const command = new InvokeModelCommand({
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload)
    });
    
    // Send the request
    const response = await bedrockClient.send(command);
    
    console.log('Response received from model');
    
    try {
      // Parse response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      // Extract the text response from Nova Pro response format
      let outputText;
      // Handle Nova Pro response format (messages-v1 schema)
      if (responseBody.output && responseBody.output.message) {
        console.log('Detected Nova Pro messages-v1 format');
        if (responseBody.output.message.content && responseBody.output.message.content.length > 0) {
          outputText = responseBody.output.message.content[0].text;
        }
      }
      // Handle standard Nova Pro text format
      else if (responseBody.text) {
        console.log('Detected Nova Pro text format');
        outputText = responseBody.text;
      }
      // Handle alternative formats (fallback)
      else if (responseBody.generation) {
        console.log('Detected generation format');
        outputText = responseBody.generation;
      }
      else if (responseBody.response) {
        console.log('Detected response format');
        outputText = responseBody.response;
      }
      else if (responseBody.content) {
        console.log('Detected content format');
        outputText = responseBody.content;
      }
      // Handle message format
      else if (responseBody.message && responseBody.message.content) {
        console.log('Detected message format');
        outputText = responseBody.message.content;
      }
      // Handle legacy formats (fallback)
      else if (responseBody.outputText) {
        console.log('Detected outputText format');
        outputText = responseBody.outputText;
      }
      else if (responseBody.results && responseBody.results.length > 0) {
        console.log('Detected results format');
        outputText = responseBody.results[0].outputText || responseBody.results[0].text;
      } 
      else {
        console.error('Unexpected treatment plan response format:', JSON.stringify(responseBody));
        throw new Error('Invalid response format from model for treatment plan');
      }
      
      console.log('Raw treatment plan response:', outputText.substring(0, 300) + '...');
      
      // Extract JSON from the response using different regex patterns
      let jsonData;
      const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/) || 
                       outputText.match(/```\n([\s\S]*?)\n```/) ||
                       outputText.match(/({[\s\S]*})/) ||
                       outputText.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        console.log('Found JSON in response:', jsonString.substring(0, 150) + '...');
        
        try {
          // Clean up any formatting issues before parsing
          const cleanedJson = jsonString
            .replace(/(\r\n|\n|\r)/gm, ' ')  // Remove newlines
            .replace(/\s+/g, ' ')            // Normalize whitespace
            .replace(/,\s*}/g, '}')          // Remove trailing commas in objects
            .replace(/,\s*]/g, ']')          // Remove trailing commas in arrays
            .replace(/\/\/.*/g, '')          // Remove comments
            .replace(/\\"/g, '"')            // Fix escaped quotes
            .replace(/"\s*:\s*"/g, '":"')    // Normalize key-value spacing
            .replace(/"\s*:\s*\[/g, '":[')   // Normalize array spacing
            .replace(/"\s*:\s*{/g, '":{');   // Normalize object spacing
          
          jsonData = JSON.parse(cleanedJson);
          console.log('Successfully parsed treatment plan data');
        } catch (jsonError) {
          console.error('Error parsing cleaned JSON:', jsonError);
          // Try a more aggressive approach - extract just the data structure
          try {
            const dataOnly = outputText.replace(/.*?({[\s\S]*}).*?/g, '$1');
            jsonData = JSON.parse(dataOnly);
            console.log('Successfully parsed treatment plan data with aggressive extraction');
          } catch (secondError) {
            console.error('Failed aggressive JSON extraction:', secondError);
            
            // One more attempt with even more aggressive cleaning
            try {
              const extremeCleaning = jsonString
                .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
                .replace(/,(\s*[\]}])/g, '$1'); // Remove trailing commas
              
              jsonData = JSON.parse(extremeCleaning);
              console.log('Successfully parsed treatment plan with extreme cleaning');
            } catch (thirdError) {
              console.error('Failed extreme JSON extraction:', thirdError);
              throw new Error('Could not parse treatment plan data');
            }
          }
        }
      } else {
        console.log('No JSON found in response, using raw text');
        
        // Create a structured object from the raw text
        const sections = outputText.split(/\n\s*\n/).filter(s => s.trim().length > 0);
        
        // Extract main diagnosis from the first substantial paragraph
        const diagnosisSection = sections.find(s => 
          s.toLowerCase().includes('diagnos') || 
          s.toLowerCase().includes('assessment') ||
          s.toLowerCase().includes('overview')
        ) || sections[0] || 'Treatment plan based on findings';
        
        // Look for sections that might contain treatment steps
        const treatmentSection = sections.find(s => 
          s.toLowerCase().includes('treatment') || 
          s.toLowerCase().includes('procedure') ||
          s.toLowerCase().includes('steps')
        ) || sections[1] || '';
        
        // Extract potential treatment steps
        const stepMatches = treatmentSection.match(/\d+\.\s+([^\n]+)/g) || [];
        const steps = stepMatches.map(step => {
          return {
            procedure: step.substring(0, 100),
            description: step,
            priority: step.toLowerCase().includes('urgent') ? 'urgent' : 
                     step.toLowerCase().includes('immediate') ? 'high' : 'medium',
            timeframe: "As recommended by dentist",
            estimatedClinicalTime: "To be determined",
            estimatedCost: "Consult with dentist"
          };
        });
        
        // If no steps were found, create a generic step
        if (steps.length === 0) {
          steps.push({
            procedure: "Dental consultation",
            description: "Review findings with dental professional",
            priority: "high",
            timeframe: "As soon as possible",
            estimatedClinicalTime: "30-60 minutes",
            estimatedCost: "Varies by provider"
          });
        }
        
        jsonData = {
          patientId: patientInfo.id || 'unknown',
          diagnosisAndOverview: diagnosisSection,
          overallSeverity: 
            outputText.toLowerCase().includes('severe') ? 'severe' :
            outputText.toLowerCase().includes('moderate') ? 'moderate' : 'low',
          steps: steps,
          precautions: ["Follow dentist recommendations"],
          alternatives: [{
            procedure: "Alternative treatments",
            description: "Consult with your dentist for alternatives",
            pros: ["May offer different benefits"],
            cons: ["May have different drawbacks"],
            costComparison: "Varies"
          }],
          totalEstimatedDuration: sections.find(s => s.toLowerCase().includes('time') || s.toLowerCase().includes('duration')) || "Varies based on treatment",
          totalEstimatedCost: sections.find(s => s.toLowerCase().includes('cost')) || "Consult with your dentist",
          maintenanceRecommendations: ["Regular dental check-ups", "Proper oral hygiene"],
          followUpSchedule: "As recommended by your dentist"
        };
      }
      
      // Map from new format to the format expected by the client
      // This ensures backward compatibility
      const treatmentPlan = {
        patientId: jsonData.patientId || patientInfo.id || 'unknown',
        overview: jsonData.diagnosisAndOverview || jsonData.overview || 'Treatment plan based on findings',
        severity: jsonData.overallSeverity || jsonData.severity || 'medium',
        
        // Convert new step format to old format
        steps: (jsonData.steps || []).map(step => {
          // Ensure step has a severity property if not present
          if (!step.severity) {
            if (step.priority === 'urgent' || step.priority === 'high') {
              step.severity = 'severe';
            } else if (step.priority === 'medium') {
              step.severity = 'moderate';
            } else {
              step.severity = 'mild';
            }
          }

          return {
            step: step.procedure || step.step,
            description: step.description,
            timeframe: step.timeframe || step.estimatedClinicalTime || 'As recommended',
            severity: step.severity || 'medium'
          };
        }),
        
        precautions: jsonData.precautions || ['Follow dentist recommendations'],
        
        // Convert new alternatives format to old format if needed
        alternatives: Array.isArray(jsonData.alternatives) 
          ? jsonData.alternatives.map(alt => alt.description || alt) 
          : jsonData.alternatives || ['Consult with your dentist for alternatives'],
        
        estimatedDuration: jsonData.totalEstimatedDuration || 'Varies based on treatment',
        estimatedCost: jsonData.totalEstimatedCost || 'Consult with your dentist',
        
        // Add additional fields that weren't in the old format
        followUpSchedule: jsonData.followUpSchedule,
        maintenanceRecommendations: jsonData.maintenanceRecommendations,
        
        // Add source information to indicate this is real data
        _source: 'real'
      };
      
      return treatmentPlan;
    } catch (parseError) {
      console.error('Error parsing treatment plan response:', parseError);
    }
    
    // If all else fails, fall back to mock data
    console.log('Falling back to mock data due to processing error');
    const mockWithSource = { ...mockTreatmentPlan, _source: 'mock' };
    return mockWithSource;
  } catch (error) {
    console.error('Error generating treatment plan with Bedrock:', error);
    
    // Fail if we're forced to use real API
    if (!AI_CONFIG.ALLOW_MOCK_FALLBACK) {
      throw error;
    }
    
    // Fall back to mock data on error
    const mockWithSource = { ...mockTreatmentPlan, _source: 'mock' };
    return mockWithSource;
  }
}

// Generate chat response using Amazon Bedrock
async function generateChatResponseWithBedrock(userMessage, patientId, chatHistory = []) {
  console.log(`Generating chat response for patient ${patientId}`);
  
  if (!bedrockClient) {
    throw new Error('Bedrock client not available');
  }

  try {
    // Build patient context
    let patientContext = '';
    
    // Get analysis context
    if (global.patientLatestAnalyses && global.patientLatestAnalyses[patientId]) {
      const analysis = global.patientLatestAnalyses[patientId];
      if (analysis.result && analysis.result.findings) {
        patientContext += `PATIENT FINDINGS:\n`;
        analysis.result.findings.forEach((finding, i) => {
          patientContext += `- ${finding.label}\n`;
        });
        patientContext += '\n';
      }
    }
    
    // Get treatment plan context
    if (global.patientTreatmentPlans && global.patientTreatmentPlans[patientId]) {
      const plan = global.patientTreatmentPlans[patientId];
      patientContext += `TREATMENT PLAN:\n`;
      if (plan.steps && Array.isArray(plan.steps)) {
        plan.steps.forEach((step, i) => {
          patientContext += `- ${step.description || step.step}\n`;
        });
      }
      patientContext += '\n';
    }
    
    // Prepare the prompt with context
    const systemMessage = "You are a dental assistant responding to a patient question. " + 
      "Be helpful, accurate, and professional. Provide information that is factually correct " +
      "and appropriate for dental health inquiries.";

    // Format message with context
    const fullMessage = `${systemMessage}\n\n${patientContext ? `Patient information:\n${patientContext}\n\n` : ''}${userMessage}`;
    
    // Use DeepSeek-R1 for chat
    console.log('Using DeepSeek-R1 for chat response generation...');
    const modelId = 'deepseek.deepseek-r1-v1:0';

    // DeepSeek payload structure
    const payload = {
      prompt: fullMessage,
      max_tokens: 1000,
      temperature: 0.3,
      top_p: 0.9
    };

    console.log(`Sending request to ${modelId} for chat response`);

    // Use InvokeModel
    const command = new InvokeModelCommand({
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload)
    });
    const response = await bedrockClient.send(command);
    
    // Parse response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    let responseText;

    // Handle DeepSeek response format
    if (responseBody.content) {
      console.log('Detected DeepSeek content format');
      responseText = responseBody.content;
    }
    // Handle message format
    else if (responseBody.message && responseBody.message.content) {
      console.log('Detected message format');
      responseText = responseBody.message.content;
    }
    // Handle response format with choices
    else if (responseBody.choices && responseBody.choices.length > 0) {
      console.log('Detected choices format');
      const choice = responseBody.choices[0];
      if (choice.message && choice.message.content) {
        responseText = choice.message.content;
      } else if (choice.text) {
        responseText = choice.text;
      }
    } 
    // Legacy formats (fallback)
    else if (responseBody.outputText) {
      console.log('Detected outputText format');
      responseText = responseBody.outputText;
    }
    else if (responseBody.results && responseBody.results.length > 0) {
      console.log('Detected results format');
      responseText = responseBody.results[0].outputText || responseBody.results[0].text;
    } 
    else if (responseBody.generations && responseBody.generations.length > 0) {
      console.log('Detected generations format');
      responseText = responseBody.generations[0].text;
    } 
    else if (responseBody.content && Array.isArray(responseBody.content) && responseBody.content.length > 0) {
      console.log('Detected content array format');
      responseText = responseBody.content[0].text;
    } 
    else if (responseBody.type === 'message' && responseBody.content) {
      console.log('Detected message type format');
      responseText = responseBody.content;
    } 
    else if (responseBody.completion) {
      console.log('Detected completion format');
      responseText = responseBody.completion;
    } 
    else {
      console.error('Unexpected chat response format:', JSON.stringify(responseBody));
      throw new Error('Invalid response format from model for chat');
    }
    
    console.log("Model response:", responseText.substring(0, 200) + "...");
    
    return responseText;
  } catch (error) {
    console.error('Error in generateChatResponseWithBedrock:', error);
    throw error;
  }
}

// Export the AI service functions
module.exports = {
  bedrockClient,
  analyzeImageWithBedrock,
  generateTreatmentPlanWithBedrock,
  generateChatResponseWithBedrock,
  AI_CONFIG
}; 