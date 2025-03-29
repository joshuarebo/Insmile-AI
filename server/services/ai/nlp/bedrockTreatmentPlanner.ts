import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getSecret } from '../../awsSecrets';
import { DetectionResult } from '../vision/imageAnalysis';

export interface TreatmentStep {
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  estimatedCost: string;
  prerequisites: string[];
}

export interface TreatmentPlan {
  summary: string;
  diagnosis: string;
  steps: TreatmentStep[];
  totalEstimatedTime: string;
  totalEstimatedCost: string;
  precautions: string[];
  alternatives: string[];
}

export class BedrockTreatmentPlanner {
  private client: BedrockRuntimeClient;
  private initialized = false;

  constructor(client?: BedrockRuntimeClient) {
    if (client) {
      this.client = client;
      this.initialized = true;
    } else {
      this.initializeClient();
    }
  }

  private async initializeClient() {
    try {
      const secrets = await getSecret('InsmileAI/APIKeys');
      
      this.client = new BedrockRuntimeClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: secrets.AWS_ACCESS_KEY,
          secretAccessKey: secrets.AWS_SECRET_KEY
        }
      });
      
      this.initialized = true;
      console.log('Bedrock client initialized for treatment planner');
    } catch (error) {
      console.error('Error initializing Bedrock client:', error);
      throw new Error('Failed to initialize AWS Bedrock for treatment planning');
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeClient();
    }
  }

  private generatePrompt(findings: DetectionResult[], patientHistory: any): string {
    const findingsText = findings
      .map(f => `- ${f.label} (${f.severity} severity, ${Math.round(f.confidence * 100)}% confidence)`)
      .join('\n');

    const historyText = `
Patient History:
- Age: ${patientHistory.age || 'N/A'}
- Gender: ${patientHistory.gender || 'N/A'}
- Previous Conditions: ${patientHistory.previousConditions || 'None'}
- Allergies: ${patientHistory.allergies || 'None'}
- Last Treatment: ${patientHistory.lastTreatment || 'N/A'}
- Medical Notes: ${patientHistory.medicalNotes || 'None'}`;

    return `You are a dental treatment planning AI. Generate a detailed treatment plan based on:
Findings:
${findingsText}
${historyText}

Respond with a JSON object containing:
{
  "summary": "Brief treatment approach",
  "diagnosis": "Detailed diagnosis",
  "steps": [
    {
      "description": "Treatment step",
      "priority": "high|medium|low",
      "estimatedTime": "Time estimate",
      "estimatedCost": "Cost estimate",
      "prerequisites": ["Prerequisites"]
    }
  ],
  "totalEstimatedTime": "Total time",
  "totalEstimatedCost": "Total cost",
  "precautions": ["Precautions"],
  "alternatives": ["Alternatives"]
}

Be specific with time and cost estimates. Use ranges when appropriate.`;
  }

  public async generateTreatmentPlan(
    findings: DetectionResult[],
    patientHistory: any
  ): Promise<TreatmentPlan> {
    try {
      await this.ensureInitialized();
      
      const prompt = this.generatePrompt(findings, patientHistory);
      const command = new InvokeModelCommand({
        modelId: 'amazon.nova-pro-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      const response = await this.client.send(command);
      
      if (!response || !response.body) {
        throw new Error('Invalid response from Bedrock');
      }

      let responseData;
      try {
        const responseText = response.body.toString();
        responseData = JSON.parse(responseText);
      } catch (error) {
        throw new Error('Failed to extract JSON from response');
      }
      
      if (!responseData.content?.[0]?.text) {
        throw new Error('Failed to extract JSON from response');
      }

      const plan = responseData.content[0].text;
      this.validateTreatmentPlan(plan);
      
      return plan as TreatmentPlan;
    } catch (error) {
      console.error('Error generating treatment plan:', error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to initialize')) {
          throw new Error('Failed to initialize AWS Bedrock for treatment planning');
        }
        if (error.message.includes('extract JSON') || error.message.includes('Invalid response')) {
          throw new Error('Failed to extract JSON from response');
        }
      }
      throw new Error('Failed to generate treatment plan');
    }
  }

  private validateTreatmentPlan(plan: any) {
    const requiredFields = [
      'summary', 'diagnosis', 'steps', 'totalEstimatedTime',
      'totalEstimatedCost', 'precautions', 'alternatives'
    ];

    const missingFields = requiredFields.filter(field => !plan[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (!Array.isArray(plan.steps)) {
      throw new Error('Steps must be an array');
    }

    const requiredStepFields = [
      'description', 'priority', 'estimatedTime',
      'estimatedCost', 'prerequisites'
    ];

    plan.steps.forEach((step: any, index: number) => {
      const missingStepFields = requiredStepFields.filter(field => !step[field]);
      if (missingStepFields.length > 0) {
        throw new Error(`Missing required fields in step ${index}: ${missingStepFields.join(', ')}`);
      }

      if (!['high', 'medium', 'low'].includes(step.priority)) {
        step.priority = 'medium';
      }

      if (!Array.isArray(step.prerequisites)) {
        step.prerequisites = [];
      }
    });

    if (!Array.isArray(plan.precautions)) plan.precautions = [];
    if (!Array.isArray(plan.alternatives)) plan.alternatives = [];
  }

  public extractCostEstimate(plan: TreatmentPlan): {min: number, max: number, currency: string} {
    try {
      const costString = plan.totalEstimatedCost;
      const rangeMatch = costString.match(/\$?\s*([\d,]+)(?:\s*-\s*\$?\s*([\d,]+))?/);
      
      if (rangeMatch) {
        const minCost = parseInt(rangeMatch[1].replace(/,/g, ''));
        const maxCost = rangeMatch[2] 
          ? parseInt(rangeMatch[2].replace(/,/g, '')) 
          : minCost;
          
        return {
          min: minCost,
          max: maxCost,
          currency: costString.includes('$') ? 'USD' : 'Unknown'
        };
      }
      
      const stepCosts = plan.steps.map(step => {
        const match = step.estimatedCost.match(/\$?\s*([\d,]+)/);
        return match ? parseInt(match[1].replace(/,/g, '')) : 0;
      });
      
      const totalCost = stepCosts.reduce((sum, cost) => sum + cost, 0);
      
      return {
        min: totalCost,
        max: totalCost * 1.2,
        currency: 'USD'
      };
    } catch (error) {
      console.error('Error extracting cost estimate:', error);
      return { min: 0, max: 0, currency: 'USD' };
    }
  }
}

export const bedrockTreatmentPlanner = new BedrockTreatmentPlanner(); 