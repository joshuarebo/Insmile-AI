import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

interface DetectionResult {
  type: string;
  confidence: number;
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  description: string;
}

interface AnalysisResult {
  findings: DetectionResult[];
  summary: string;
  recommendations: string[];
  severity: 'low' | 'medium' | 'high';
}

export async function analyzeDentalImage(imageBuffer: Buffer): Promise<AnalysisResult> {
  try {
    // Initialize Bedrock client
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });

    // Convert image buffer to base64
    const base64Image = imageBuffer.toString('base64');

    // Prepare the prompt
    const prompt = `Analyze this dental image and provide:
1. A detailed list of findings, including any abnormalities, conditions, or areas of concern
2. A summary of the overall dental health status
3. Specific recommendations for treatment or follow-up
4. An assessment of the severity level (low, medium, or high)

Please format your response as a JSON object with the following structure:
{
  "findings": [
    {
      "type": "string",
      "confidence": number,
      "location": {
        "x": number,
        "y": number,
        "width": number,
        "height": number
      },
      "description": "string"
    }
  ],
  "summary": "string",
  "recommendations": ["string"],
  "severity": "low" | "medium" | "high"
}`;

    // Prepare the request payload
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
      temperature: 0.7,
      top_p: 0.9
    };

    // Invoke the model
    const command = new InvokeModelCommand({
      modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
      body: JSON.stringify(payload)
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Parse and validate the response
    const analysis = JSON.parse(responseBody.content[0].text) as AnalysisResult;

    // Validate the response structure
    if (!analysis.findings || !analysis.summary || !analysis.recommendations || !analysis.severity) {
      throw new Error('Invalid analysis response format');
    }

    return analysis;
  } catch (error) {
    console.error('Error analyzing dental image:', error);
    throw new Error('Failed to analyze dental image');
  }
} 