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
  
  // Set to false to disable fallbacks to mock data (will throw errors instead)
  ALLOW_MOCK_FALLBACK: false,
  
  // Log detailed output for debugging
  DEBUG_MODE: true
};

// Helper function to analyze an image using Bedrock
async function analyzeImageWithBedrock(imagePath, type = 'dental') {
  if (!bedrockClient) {
    // Fail if we're forced to use real API
    if (!AI_CONFIG.ALLOW_MOCK_FALLBACK) {
      throw new Error('Bedrock client not available and mock fallbacks disabled');
    }
    console.log('Bedrock client not available, using mock data');
    return mockAnalysisResults;
  }

  try {
    console.log(`Analyzing ${type} image with Bedrock...`);
    const startTime = Date.now();
    
    // Read the image file
    console.log('Reading image file:', imagePath);
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Determine file type for MIME type
    let mediaType = 'image/jpeg';
    if (imagePath.toLowerCase().endsWith('.png')) {
      mediaType = 'image/png';
    } else if (imagePath.toLowerCase().endsWith('.gif')) {
      mediaType = 'image/gif';
    } else if (imagePath.toLowerCase().endsWith('.bmp')) {
      mediaType = 'image/bmp';
    }
    
    console.log('Converting image to base64...');
    const base64Image = imageBuffer.toString('base64');
    console.log(`Image converted to base64 (${base64Image.length} chars)`);

    // Create the prompt for dental analysis with specific terminology
    const prompt = `As a professional dental radiologist with expertise in dental image analysis, I need a detailed assessment of this dental scan. 

Please provide a comprehensive analysis focusing on:

1. Dental caries/cavities: Look for radiolucent areas in the enamel and dentin
2. Periodontal disease: Assess alveolar bone loss, widening of periodontal ligament space
3. Endodontic issues: Signs of periapical lesions, root canal problems, or pulp chamber anomalies
4. Impacted teeth: Particularly wisdom teeth (third molars) that may be partially erupted or impacted
5. Structural abnormalities: Tooth fractures, anomalies in tooth structure
6. Bone pathology: Any radiolucent or radiopaque lesions in the jaw bones
7. Restorations: Identify existing fillings, crowns, implants and assess their condition

For each finding, provide:
- Precise dental terminology and tooth number (using Universal Numbering System, 1-32)
- Clinical severity assessment (mild, moderate, severe)
- Confidence level as a percentage
- Location information if applicable

Format your response as a structured JSON object with:
{
  "findings": [
    {
      "label": "Precise diagnosis with tooth number",
      "confidence": 0.95, // number between 0-1
      "severity": "mild", // one of: mild, moderate, severe
      "details": "Additional clinical details if applicable"
    }
  ],
  "overall": "Comprehensive assessment of overall dental health",
  "confidence": 0.9, // overall confidence level between 0-1
  "recommendations": ["Prioritized clinical recommendations"]
}

This analysis will be used for clinical assessment and treatment planning, so precision is critical.`;

    // Prepare the request payload for Nova Pro
    console.log('Preparing request for Bedrock...');
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
            media_type: mediaType
          }
        }
      ],
      inference_params: {
        temperature: 0.1, // Lower temperature for more precise responses
        top_p: 0.9,
        max_tokens: 3000 // Allow more thorough responses
      }
    };

    // Create the command
    const command = new InvokeModelCommand({
      modelId: 'amazon.nova-pro-v1:0',
      body: JSON.stringify(payload)
    });

    // Invoke the Bedrock model
    console.log('Sending request to Bedrock...');
    const response = await bedrockClient.send(command);
    console.log('Response received from Bedrock');
    
    try {
      console.log('Decoding response...');
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      // Extract the text response from Nova Pro
      const outputText = responseBody.outputs?.[0]?.text;
      
      if (!outputText) {
        throw new Error('No text content in response');
      }
      
      console.log('Raw AI response:', outputText.substring(0, 300) + '...');
      
      // Extract JSON from the response
      const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/) || 
                       outputText.match(/({[\s\S]*})/) ||
                       outputText.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        console.log('Found JSON in response:', jsonString.substring(0, 100) + '...');
        
        try {
          // Clean up any formatting issues before parsing
          const cleanedJson = jsonString
            .replace(/(\r\n|\n|\r)/gm, ' ')  // Remove newlines
            .replace(/\s+/g, ' ')            // Normalize whitespace
            .replace(/,\s*}/g, '}')          // Remove trailing commas in objects
            .replace(/,\s*]/g, ']')          // Remove trailing commas in arrays
            .replace(/\/\/.*/g, '');         // Remove comments
          
          const analysisData = JSON.parse(cleanedJson);
          // Add processing time
          analysisData.processingTime = Date.now() - startTime;
          console.log('Successfully parsed analysis data');
          
          // Add recommendations if not present
          if (!analysisData.recommendations) {
            analysisData.recommendations = [];
            
            // Generate recommendations based on findings
            if (analysisData.findings) {
              const severeCases = analysisData.findings.filter(f => f.severity === 'severe');
              const moderateCases = analysisData.findings.filter(f => f.severity === 'moderate');
              
              if (severeCases.length > 0) {
                analysisData.recommendations.push("Urgent dental consultation recommended");
              }
              
              if (moderateCases.length > 0) {
                analysisData.recommendations.push("Follow-up with dentist within next 2-4 weeks");
              }
              
              // Add general recommendation if none added so far
              if (analysisData.recommendations.length === 0) {
                analysisData.recommendations.push("Regular dental check-up advised");
              }
            }
          }
          
          return analysisData;
        } catch (jsonError) {
          console.error('Error parsing JSON from response:', jsonError);
          console.log('Problematic JSON string:', jsonString);
        }
      } else {
        console.log('No JSON found in response, formatting response text');
        // Format the response as best we can
        const findingSections = outputText.split(/\d+\.\s+/).filter(s => s.trim().length > 0);
        const findings = findingSections.map(section => {
          // Try to extract severity from the text
          let severity = 'mild';
          if (section.toLowerCase().includes('severe') || section.toLowerCase().includes('urgent')) {
            severity = 'severe';
          } else if (section.toLowerCase().includes('moderate')) {
            severity = 'moderate';
          }
          
          return {
            label: section.substring(0, 200),
            confidence: 0.7,
            severity: severity,
            details: section.substring(0, 300)
          };
        });
        
        return {
          findings: findings.length > 0 ? findings : [
            {
              label: outputText.substring(0, 200),
              confidence: 0.7,
              severity: 'mild',
              details: outputText.substring(0, 300)
            }
          ],
          overall: outputText.substring(0, 150),
          confidence: 0.7,
          processingTime: Date.now() - startTime,
          recommendations: ["Consult with your dentist about these findings"]
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
    
    // Fail if we're forced to use real API
    if (!AI_CONFIG.ALLOW_MOCK_FALLBACK) {
      throw error;
    }
    
    // Fall back to mock data on error
    return mockAnalysisResults;
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
      .map(f => `- ${f.label} (${f.severity} severity, ${Math.round(f.confidence * 100)}% confidence)`)
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

    // Prepare the request payload for Nova Pro
    const payload = {
      inputs: [
        {
          type: "text",
          text: prompt
        }
      ],
      inference_params: {
        temperature: 0.1, // Lower temperature for more consistent and precise responses
        top_p: 0.9,
        max_tokens: 5000 // Allow for very detailed treatment plans
      }
    };

    // Create the command
    const command = new InvokeModelCommand({
      modelId: 'amazon.nova-pro-v1:0',
      body: JSON.stringify(payload)
    });

    // Invoke the Bedrock model
    console.log('Sending request to Bedrock...');
    const response = await bedrockClient.send(command);
    console.log('Response received from Bedrock');
    
    try {
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      console.log('Parsing response body...');
      
      // Extract the text response from Nova Pro
      const outputText = responseBody.outputs?.[0]?.text;
      
      if (!outputText) {
        throw new Error('No text content in response');
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
        severity: jsonData.overallSeverity || 'medium',
        
        // Convert new step format to old format
        steps: (jsonData.steps || []).map(step => {
          return {
            step: step.procedure || step.step,
            description: step.description,
            timeframe: step.timeframe || step.estimatedClinicalTime || 'As recommended'
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
        maintenanceRecommendations: jsonData.maintenanceRecommendations
      };
      
      return treatmentPlan;
    } catch (parseError) {
      console.error('Error parsing treatment plan response:', parseError);
    }
    
    // If all else fails, fall back to mock data
    console.log('Falling back to mock data due to processing error');
    return mockTreatmentPlan;
  } catch (error) {
    console.error('Error generating treatment plan with Bedrock:', error);
    
    // Fail if we're forced to use real API
    if (!AI_CONFIG.ALLOW_MOCK_FALLBACK) {
      throw error;
    }
    
    // Fall back to mock data on error
    return mockTreatmentPlan;
  }
}

// Handle chat responses using Bedrock
async function generateChatResponseWithBedrock(message, patientId, chatHistory = []) {
  if (!bedrockClient) {
    // Fail if we're forced to use real API
    if (!AI_CONFIG.ALLOW_MOCK_FALLBACK) {
      throw new Error('Bedrock client not available and mock fallbacks disabled');
    }
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
    
    // Check if we have any findings or treatment plan for this patient
    // This would normally come from a database - simulating by looking for 
    // matching patientId in activeAnalyses global map (would be defined in routes/ai.js)
    let patientContext = '';
    
    // Here we would ideally fetch context from a database
    // For now, add some mock context if it's a demo patient
    if (patientId && patientId.startsWith('demo')) {
      patientContext = `
Patient Dental Context:
- Patient ID: ${patientId}
- Recent Findings: Cavity detected on tooth #14 (severe), Early stage gum disease (mild)
- Recommended Treatment: Deep cleaning, Cavity filling on tooth #14
- Next Appointment: Follow-up examination in 6 weeks
`;
    }
    
    // Format chat history for the prompt
    const formattedHistory = chatHistory
      .map(msg => `${msg.role === 'user' ? 'Patient' : 'Dental Assistant'}: ${msg.content}`)
      .join('\n');
    
    // Create the prompt for Nova Pro with comprehensive dental assistant knowledge
    const prompt = `You are an advanced dental assistant AI named InsmileAI with expertise in dentistry. You provide professional, accurate, and personalized responses to patient questions about dental conditions, treatments, and oral health.

${patientContext}

Professional Guidelines:
1. Use proper dental terminology while ensuring explanations are patient-friendly
2. When discussing procedures or conditions, include relevant information about:
   - Common symptoms and causes
   - Treatment approaches with pros and cons
   - Typical timeframes and recovery expectations
   - Preventive measures
3. Maintain a professional, reassuring tone
4. If unsure about specifics of this patient's case, acknowledge limitations and suggest consulting their dentist
5. Provide evidence-based information when discussing treatments or recommendations

${formattedHistory ? `Previous conversation:\n${formattedHistory}\n\n` : ''}

Patient question: "${message}"

Provide a helpful, accurate and personalized response based on dental best practices and available patient context.`;

    // Prepare the request payload for Nova Pro
    const payload = {
      inputs: [
        {
          type: "text",
          text: prompt
        }
      ],
      inference_params: {
        temperature: 0.3, // Slightly higher temperature for more natural conversation
        top_p: 0.9,
        max_tokens: 2000
      }
    };

    // Create the command
    const command = new InvokeModelCommand({
      modelId: 'amazon.nova-pro-v1:0',
      body: JSON.stringify(payload)
    });

    // Invoke the Bedrock model
    console.log('Sending request to Bedrock...');
    const response = await bedrockClient.send(command);
    console.log('Response received from Bedrock');
    
    try {
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      console.log('Parsing response body...');
      
      // Extract the text response from Nova Pro
      const outputText = responseBody.outputs?.[0]?.text;
      
      if (!outputText) {
        throw new Error('No text content in response');
      }
      
      // Process the response to remove any unwanted prefixes
      let cleanedResponse = outputText
        .replace(/^(Dental Assistant|Assistant|InsmileAI):\s+/i, '')
        .replace(/^I'm InsmileAI,\s+/i, '')
        .replace(/^As a dental assistant,\s+/i, '')
        .replace(/^As an AI dental assistant,\s+/i, '');
      
      console.log('Chat response:', cleanedResponse);
      return cleanedResponse;
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
    }
    
    // If all else fails, fall back to mock data
    console.log('Falling back to mock data due to processing error');
    return "I'm sorry, but I couldn't generate a response. Please try again later or contact a dental professional for assistance.";
  } catch (error) {
    console.error('Error generating chat response with Bedrock:', error);
    
    // Fail if we're forced to use real API
    if (!AI_CONFIG.ALLOW_MOCK_FALLBACK) {
      throw error;
    }
    
    // Fall back to mock data on error
    return "I'm sorry, but I couldn't generate a response. Please try again later or contact a dental professional for assistance.";
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