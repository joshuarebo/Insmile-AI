import { LexRuntimeV2Client, RecognizeTextCommand } from "@aws-sdk/client-lex-runtime-v2";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { db } from "../../database";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatContext {
  userId: number;
  patientId?: number;
  treatmentPlanId?: number;
  sessionId: string;
  messages: ChatMessage[];
}

interface ChatResponse {
  message: string;
  intent?: string;
  slots?: Record<string, string>;
  followUpQuestions?: string[];
}

export class ChatAssistant {
  private lex: LexRuntimeV2Client;
  private bedrock: BedrockRuntimeClient;
  private readonly BOT_ID = process.env.LEX_BOT_ID!;
  private readonly BOT_ALIAS_ID = process.env.LEX_BOT_ALIAS_ID!;
  private readonly LOCALE_ID = "en_US";

  constructor() {
    this.lex = new LexRuntimeV2Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    this.bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
  }

  private async processWithLex(text: string, sessionId: string): Promise<ChatResponse> {
    try {
      const command = new RecognizeTextCommand({
        botId: this.BOT_ID,
        botAliasId: this.BOT_ALIAS_ID,
        localeId: this.LOCALE_ID,
        sessionId,
        text
      });

      const response = await this.lex.send(command);
      
      return {
        message: response.messages?.[0]?.content || '',
        intent: response.interpretations?.[0]?.intent?.name,
        slots: response.interpretations?.[0]?.intent?.slots
      };
    } catch (error) {
      console.error('Error processing with Lex:', error);
      throw new Error('Failed to process chat message');
    }
  }

  private async processWithBedrock(
    message: string,
    context: ChatContext
  ): Promise<ChatResponse> {
    try {
      // Get relevant patient and treatment information
      let contextInfo = '';
      if (context.patientId) {
        const patient = await db.findPatients({ id: context.patientId });
        if (patient && patient[0]) {
          contextInfo += `\nPatient Information:\n${JSON.stringify(patient[0], null, 2)}`;
        }
      }

      if (context.treatmentPlanId) {
        const plan = await db.findTreatmentPlans({ id: context.treatmentPlanId });
        if (plan && plan[0]) {
          contextInfo += `\nTreatment Plan:\n${JSON.stringify(plan[0], null, 2)}`;
        }
      }

      // Create conversation history
      const conversationHistory = context.messages
        .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      const prompt = `
You are a dental assistant AI helping patients understand their treatment plans and procedures.
Use the following context to provide accurate and helpful responses:

${contextInfo}

Previous conversation:
${conversationHistory}
`;

      const command = new InvokeModelCommand({
        modelId: process.env.BEDROCK_MODEL_ID!,
        input: {
          prompt
        }
      });

      const response = await this.bedrock.send(command);
      
      if (response.body) {
        const body = await response.body.json();
        return {
          message: body.result || '',
          intent: body.intent,
          slots: body.slots
        };
      }

      return { message: '' };
    } catch (error) {
      console.error('Error processing with Bedrock:', error);
      throw new Error('Failed to process chat message');
    }
  }
} 