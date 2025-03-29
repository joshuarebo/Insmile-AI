import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { DetectionResult } from "../vision/imageAnalysis";

interface TreatmentStep {
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  estimatedCost: string;
  prerequisites: string[];
}

interface TreatmentPlan {
  summary: string;
  diagnosis: string;
  steps: TreatmentStep[];
  totalEstimatedTime: string;
  totalEstimatedCost: string;
  precautions: string[];
  alternatives: string[];
}

export class TreatmentPlanner {
  private bedrock: BedrockRuntimeClient;
  private readonly MODEL_ID = "anthropic.claude-v2";

  constructor() {
    this.bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
  }

  private async generateText(prompt: string): Promise<string> {
    try {
      const command = new InvokeModelCommand({
        modelId: this.MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
          max_tokens_to_sample: 2000,
          temperature: 0.7,
          top_p: 0.9,
        })
      });

      const response = await this.bedrock.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.completion;
    } catch (error) {
      console.error('Error generating text:', error);
      throw new Error('Failed to generate treatment plan text');
    }
  }

  private async generatePrompt(findings: DetectionResult[], patientHistory: any): string {
    const findingsText = findings
      .map(f => `- ${f.label} (${f.severity} severity, ${Math.round(f.confidence * 100)}% confidence)`)
      .join('\n');

    const historyText = `
Patient History:
- Age: ${patientHistory.age}
- Previous Conditions: ${patientHistory.previousConditions || 'None'}
- Allergies: ${patientHistory.allergies || 'None'}
- Last Treatment: ${patientHistory.lastTreatment || 'N/A'}
`;

    return `
As a dental professional, generate a comprehensive treatment plan based on the following findings and patient history:

Findings:
${findingsText}

${historyText}

Generate a detailed treatment plan including:
1. Summary of diagnosis
2. Step-by-step treatment procedures
3. Priority levels for each step
4. Estimated time and cost for each procedure
5. Prerequisites for each step
6. Overall precautions
7. Alternative treatment options

Format the response as a structured JSON object with the following keys:
- summary
- diagnosis
- steps (array of objects with description, priority, estimatedTime, estimatedCost, prerequisites)
- totalEstimatedTime
- totalEstimatedCost
- precautions
- alternatives
`;
  }

  public async generateTreatmentPlan(
    findings: DetectionResult[],
    patientHistory: any
  ): Promise<TreatmentPlan> {
    try {
      const prompt = await this.generatePrompt(findings, patientHistory);
      const response = await this.generateText(prompt);
      
      // Parse and validate the response
      const plan = JSON.parse(response);
      
      // Ensure all required fields are present
      const requiredFields = [
        'summary',
        'diagnosis',
        'steps',
        'totalEstimatedTime',
        'totalEstimatedCost',
        'precautions',
        'alternatives'
      ];

      for (const field of requiredFields) {
        if (!plan[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate steps structure
      if (!Array.isArray(plan.steps)) {
        throw new Error('Steps must be an array');
      }

      plan.steps.forEach((step: TreatmentStep, index: number) => {
        const requiredStepFields = [
          'description',
          'priority',
          'estimatedTime',
          'estimatedCost',
          'prerequisites'
        ];

        for (const field of requiredStepFields) {
          if (!step[field]) {
            throw new Error(`Missing required field in step ${index}: ${field}`);
          }
        }
      });

      return plan as TreatmentPlan;
    } catch (error) {
      console.error('Error generating treatment plan:', error);
      throw new Error('Failed to generate treatment plan');
    }
  }

  public async estimateCost(plan: TreatmentPlan): Promise<number> {
    try {
      // Extract numerical values from cost strings and sum them
      const costs = plan.steps.map(step => {
        const match = step.estimatedCost.match(/\$?([\d,]+)/);
        return match ? parseFloat(match[1].replace(',', '')) : 0;
      });

      return costs.reduce((a, b) => a + b, 0);
    } catch (error) {
      console.error('Error estimating cost:', error);
      throw new Error('Failed to estimate treatment cost');
    }
  }

  public async estimateDuration(plan: TreatmentPlan): Promise<string> {
    try {
      // Convert all durations to minutes and sum them
      const durations = plan.steps.map(step => {
        const match = step.estimatedTime.match(/(\d+)\s*(min|hour|day|week)/i);
        if (!match) return 0;

        const [_, value, unit] = match;
        const minutes = parseInt(value) * {
          min: 1,
          hour: 60,
          day: 1440,
          week: 10080
        }[unit.toLowerCase() as 'min' | 'hour' | 'day' | 'week'];

        return minutes;
      });

      const totalMinutes = durations.reduce((a, b) => a + b, 0);

      // Convert back to a human-readable format
      if (totalMinutes < 60) {
        return `${totalMinutes} minutes`;
      } else if (totalMinutes < 1440) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${hours} hour${hours > 1 ? 's' : ''}${mins ? ` ${mins} minutes` : ''}`;
      } else {
        const days = Math.floor(totalMinutes / 1440);
        return `${days} day${days > 1 ? 's' : ''}`;
      }
    } catch (error) {
      console.error('Error estimating duration:', error);
      throw new Error('Failed to estimate treatment duration');
    }
  }
}

export const treatmentPlanner = new TreatmentPlanner(); 