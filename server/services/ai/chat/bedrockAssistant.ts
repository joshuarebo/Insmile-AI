import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getSecret } from '../../awsSecrets';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatContext {
  userId: string;
  patientId?: string;
  treatmentPlanId?: string;
  sessionId: string;
  messages: ChatMessage[];
}

export interface ChatResponse {
  message: string;
  intent?: string;
  slots?: Record<string, string>;
  followUpQuestions?: string[];
}

export class BedrockChatAssistant {
  private client: BedrockRuntimeClient;
  private initialized = false;

  constructor(client?: BedrockRuntimeClient) {
    if (client) {
      this.client = client;
      this.initialized = true;
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
      console.log('Bedrock client initialized for chat assistant');
    } catch (error) {
      console.error('Error initializing Bedrock client for chat:', error);
      throw new Error('Failed to initialize AWS Bedrock for chat assistant');
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeClient();
    }
  }

  private formatPrompt(message: string, context: ChatContext): string {
    let contextInfo = '';
    
    if (context.patientId) {
      contextInfo += `\nPatient ID: ${context.patientId}`;
    }
    if (context.treatmentPlanId) {
      contextInfo += `\nTreatment Plan ID: ${context.treatmentPlanId}`;
    }

    const chatHistory = context.messages
      .slice(-10) // Keep last 10 messages for context
      .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    return `You are InsmileAI, a dental assistant chatbot. You help patients and dental professionals understand treatment plans, procedures, and provide general dental information.

Session information:${contextInfo}

Remember:
1. Be accurate and informative about dental procedures
2. Explain complex terms in simple language
3. Don't provide specific medical advice that would require a dentist's examination
4. When asked about costs or timelines, provide general ranges and note that actual costs vary

Previous conversation:
${chatHistory}

Current message: ${message}

Please respond as a helpful dental assistant and identify any intents in the message such as appointment scheduling, treatment explanation, or cost inquiries.`;
  }

  private parseResponse(responseBody: any): ChatResponse {
    try {
      if (!responseBody?.content?.[0]?.text) {
        throw new Error('Invalid response format');
      }

      const text = responseBody.content[0].text;
      
      // Extract potential follow-up questions (if any are suggested in the response)
      const followUpQuestions = text.match(/(?:Suggested questions:|Follow-up:)\s*((?:\d\.\s*[^\n]+\n*)+)/i);
      const questions = followUpQuestions 
        ? followUpQuestions[1].split('\n')
            .map((q: string) => q.replace(/^\d\.\s*/, '').trim())
            .filter((q: string) => q.length > 0)
        : undefined;

      // Try to identify intent from the response
      const intentMatch = text.match(/Intent:\s*([^\n]+)/i);
      const intent = intentMatch ? intentMatch[1].trim() : undefined;

      // Extract any identified slots/entities
      const slotsMatch = text.match(/Slots:\s*({[^}]+})/i);
      const slots = slotsMatch ? JSON.parse(slotsMatch[1]) : undefined;

      // Clean the message by removing metadata
      let message = text
        .replace(/Intent:.*?\n/i, '')
        .replace(/Slots:.*?\n/i, '')
        .replace(/(?:Suggested questions:|Follow-up:)[\s\S]*$/, '')
        .trim();

      return {
        message,
        intent,
        slots,
        followUpQuestions: questions
      };
    } catch (error) {
      console.error('Error parsing response:', error);
      return {
        message: 'I apologize, but I encountered an error processing your request. Please try again.',
      };
    }
  }

  public async processMessage(
    message: string,
    context: ChatContext
  ): Promise<ChatResponse> {
    try {
      await this.ensureInitialized();
      
      const prompt = this.formatPrompt(message, context);
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
        throw new Error('Failed to parse response from Bedrock');
      }

      return this.parseResponse(responseData);
    } catch (error) {
      console.error('Error processing message:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to initialize')) {
          throw new Error('Failed to initialize AWS Bedrock for chat assistant');
        }
        if (error.message.includes('Invalid response')) {
          throw new Error('Invalid response from Bedrock');
        }
        if (error.message.includes('parse response') || error.message.includes('Failed to parse')) {
          throw new Error('Failed to parse response from Bedrock');
        }
      }
      
      throw new Error('Failed to process chat message');
    }
  }
}

export const bedrockChatAssistant = new BedrockChatAssistant(); 