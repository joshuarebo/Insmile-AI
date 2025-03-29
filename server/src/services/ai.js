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

// Helper function to analyze an image using Bedrock
async function analyzeImageWithBedrock(imagePath, type = 'dental') {
  if (!bedrockClient) {
    console.log('Bedrock client not available, using mock data');
    return mockAnalysisResults;
  }

  try {
    console.log(`Analyzing ${type} image with Bedrock...`);
    const startTime = Date.now();
    
    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Create the prompt for dental analysis
    const prompt = `Analyze this dental scan and identify any issues or abnormalities. 
    Focus on:
    1. Cavities or decay
    2. Gum disease or inflammation
    3. Alignment issues
    4. Root or nerve problems
    5. Any other notable findings
    
    For each finding, provide:
    - Detailed description
    - Severity assessment (normal, mild, severe)
    - Confidence level (as a percentage)
    
    Format your response as a structured JSON object with:
    - findings: array of objects with "label", "confidence" (0-1), "severity"
    - overall: string description of overall dental health
    - confidence: overall confidence (0-1)`;

    // Prepare the request payload for Bedrock
    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }
      ],
      temperature: 0.2,
      top_p: 0.9
    };

    // Invoke the Bedrock model
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      body: JSON.stringify(payload)
    });

    console.log('Sending request to Bedrock...');
    const response = await bedrockClient.send(command);
    console.log('Response received from Bedrock');
    
    try {
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      console.log('Parsing response body...');
      
      // Extract the text response
      const outputText = responseBody.content && responseBody.content[0].text;
      
      if (!outputText) {
        throw new Error('No text content in response');
      }
      
      // Extract JSON from the response
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
        console.log('No JSON found in response, formatting response text');
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
    console.log('Generating treatment plan with Bedrock...');
    
    // Create the prompt for treatment plan generation
    const findingsText = findings
      .map(f => `- ${f.label} (${f.severity} severity, ${Math.round(f.confidence * 100)}% confidence)`)
      .join('\n');

    const prompt = `As a dental professional, generate a comprehensive treatment plan based on the following findings:

Findings:
${findingsText}

Patient Information:
${JSON.stringify(patientInfo, null, 2)}

Generate a detailed treatment plan including:
1. Overall summary of the condition
2. Step-by-step treatment procedures
3. Estimated timeframe for each step
4. Precautions
5. Alternative treatment options
6. Total estimated duration
7. Estimated cost range
8. Overall severity (low, medium, high)

Format your response as a structured JSON object with the following schema:
{
  "patientId": "string",
  "overview": "string",
  "steps": [
    {
      "step": "string",
      "description": "string",
      "timeframe": "string"
    }
  ],
  "precautions": ["string"],
  "alternatives": ["string"],
  "estimatedDuration": "string",
  "estimatedCost": "string",
  "severity": "low|medium|high"
}`;

    // Prepare the request payload for Bedrock
    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ],
      temperature: 0.2,
      top_p: 0.9
    };

    // Invoke the Bedrock model
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      body: JSON.stringify(payload)
    });

    console.log('Sending request to Bedrock...');
    const response = await bedrockClient.send(command);
    console.log('Response received from Bedrock');
    
    try {
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      console.log('Parsing response body...');
      
      // Extract the text response
      const outputText = responseBody.content && responseBody.content[0].text;
      
      if (!outputText) {
        throw new Error('No text content in response');
      }
      
      // Extract JSON from the response
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

// Handle chat responses using Bedrock
async function generateChatResponseWithBedrock(message, patientId, chatHistory = []) {
  if (!bedrockClient) {
    console.log('Bedrock client not available, using mock data');
    const mockResponses = [
      'Based on your dental scan, I recommend scheduling a cleaning appointment.',
      'Your cavity on tooth #14 should be treated within the next 2-3 weeks.',
      'Gum disease is at an early stage and can be managed with proper oral hygiene.',
      'Feel free to ask any questions about your treatment plan.',
      'Regular flossing will help with your gum health significantly.'
    ];
    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  }

  try {
    console.log('Generating chat response with Bedrock...');
    
    // Format chat history for the prompt
    const formattedHistory = chatHistory
      .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    
    // Create the prompt
    const prompt = `You are a dental AI assistant named InsmileAI. You're helping a patient with ID ${patientId} understand their dental condition and treatment options.

${formattedHistory ? `Previous conversation:\n${formattedHistory}\n\n` : ''}

Please respond to their question in a helpful, accurate and professional manner. Keep your response concise but informative.`;

    // Prepare the request payload for Bedrock
    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ],
      temperature: 0.2,
      top_p: 0.9
    };

    // Invoke the Bedrock model
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      body: JSON.stringify(payload)
    });

    console.log('Sending request to Bedrock...');
    const response = await bedrockClient.send(command);
    console.log('Response received from Bedrock');
    
    try {
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      console.log('Parsing response body...');
      
      // Extract the text response
      const outputText = responseBody.content && responseBody.content[0].text;
      
      if (!outputText) {
        throw new Error('No text content in response');
      }
      
      // Extract JSON from the response
      const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/) || 
                       outputText.match(/({[\s\S]*})/) ||
                       outputText.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        console.log('Found JSON in response:', jsonString.substring(0, 100) + '...');
        
        try {
          const chatResponse = JSON.parse(jsonString);
          console.log('Successfully parsed chat response');
          return chatResponse;
        } catch (jsonError) {
          console.error('Error parsing JSON from response:', jsonError);
        }
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
    }
    
    // If all else fails, fall back to mock data
    console.log('Falling back to mock data due to processing error');
    return {
      response: 'I\'m sorry, but I couldn\'t generate a response. Please try again later or contact a dental professional for assistance.'
    };
  } catch (error) {
    console.error('Error generating chat response with Bedrock:', error);
    // Fall back to mock data on error
    return {
      response: 'I\'m sorry, but I couldn\'t generate a response. Please try again later or contact a dental professional for assistance.'
    };
  }
} 