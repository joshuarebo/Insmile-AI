import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

interface ChatContext {
  patientId?: string;
  patientHistory?: any;
  currentTreatmentPlan?: any;
  previousMessages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export class BedrockChatService {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
    this.modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
  }

  async generateResponse(userMessage: string, context: ChatContext = {}): Promise<string> {
    try {
      // Prepare the prompt with context
      const prompt = this.buildPrompt(userMessage, context);

      // Prepare the request payload
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        top_p: 0.9,
        stop_sequences: ['\n\nHuman:', '\n\nAssistant:']
      };

      // Invoke the model
      const command = new InvokeModelCommand({
        modelId: this.modelId,
        body: JSON.stringify(payload)
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Extract and return the response
      return responseBody.content[0].text;
    } catch (error) {
      console.error('Error generating chat response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  private buildPrompt(userMessage: string, context: ChatContext): string {
    const systemPrompt = `You are an AI dental assistant with expertise in dental care and treatment planning. 
Your role is to provide helpful, accurate, and professional responses to dental-related questions and concerns.
Always maintain a professional tone and prioritize patient safety and well-being in your responses.
If you're unsure about any information, be honest about your limitations and recommend consulting with a dental professional.`;

    let contextPrompt = '';

    // Add patient history context if available
    if (context.patientHistory) {
      contextPrompt += `\nPatient History:\n${JSON.stringify(context.patientHistory, null, 2)}`;
    }

    // Add current treatment plan context if available
    if (context.currentTreatmentPlan) {
      contextPrompt += `\nCurrent Treatment Plan:\n${JSON.stringify(context.currentTreatmentPlan, null, 2)}`;
    }

    // Add previous messages context if available
    if (context.previousMessages && context.previousMessages.length > 0) {
      contextPrompt += '\nPrevious Conversation:\n';
      context.previousMessages.forEach(msg => {
        contextPrompt += `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}\n`;
      });
    }

    // Combine all prompts
    return `${systemPrompt}\n${contextPrompt}\n\nHuman: ${userMessage}\n\nAssistant:`;
  }
} 