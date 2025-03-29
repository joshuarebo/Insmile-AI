import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { BedrockChatAssistant } from '../bedrockAssistant';
import { getSecret } from '../../../awsSecrets';

// Mock AWS Bedrock client
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  })),
  InvokeModelCommand: jest.fn()
}));

// Mock AWS Secrets
jest.mock('../../../awsSecrets', () => ({
  getSecret: jest.fn().mockResolvedValue({
    AWS_ACCESS_KEY: 'test-access-key',
    AWS_SECRET_KEY: 'test-secret-key'
  })
}));

describe('BedrockChatAssistant', () => {
  const mockContext = {
    userId: 'user123',
    sessionId: 'session123',
    messages: [
      {
        role: 'user' as const,
        content: 'What is a root canal?',
        timestamp: new Date()
      },
      {
        role: 'assistant' as const,
        content: 'A root canal is a dental procedure that removes infected pulp from inside a tooth.',
        timestamp: new Date()
      }
    ]
  };

  const mockValidResponse = {
    body: Buffer.from(JSON.stringify({
      content: [{
        text: `Intent: treatment_explanation
Slots: {"procedure": "teeth_cleaning"}
A professional teeth cleaning is a routine dental procedure where the dentist or hygienist removes plaque and tartar from your teeth.
Suggested questions:
1. How often should I get my teeth cleaned?
2. What happens during a cleaning?
3. Does teeth cleaning hurt?`
      }]
    }))
  };

  let mockClient: BedrockRuntimeClient;
  let assistant: BedrockChatAssistant;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = new BedrockRuntimeClient({});
    (mockClient.send as jest.Mock).mockResolvedValue(mockValidResponse);
    assistant = new BedrockChatAssistant(mockClient);
  });

  describe('processMessage', () => {
    it('should process a message and return a valid response', async () => {
      const response = await assistant.processMessage(
        'What is teeth cleaning?',
        mockContext
      );

      expect(response).toEqual({
        message: 'A professional teeth cleaning is a routine dental procedure where the dentist or hygienist removes plaque and tartar from your teeth.',
        intent: 'treatment_explanation',
        slots: { procedure: 'teeth_cleaning' },
        followUpQuestions: [
          'How often should I get my teeth cleaned?',
          'What happens during a cleaning?',
          'Does teeth cleaning hurt?'
        ]
      });

      expect(InvokeModelCommand).toHaveBeenCalledWith(expect.objectContaining({
        modelId: 'amazon.nova-pro-v1:0',
        contentType: 'application/json',
        accept: 'application/json'
      }));
    });

    it('should handle context with patient and treatment plan IDs', async () => {
      const contextWithIds = {
        ...mockContext,
        patientId: 'patient123',
        treatmentPlanId: 'plan123'
      };

      await assistant.processMessage('What is teeth cleaning?', contextWithIds);

      const commandCall = (InvokeModelCommand as jest.Mock).mock.calls[0][0];
      const promptBody = JSON.parse(commandCall.body);
      
      expect(promptBody.messages[0].content).toContain('Patient ID: patient123');
      expect(promptBody.messages[0].content).toContain('Treatment Plan ID: plan123');
    });

    it('should handle invalid response format', async () => {
      (mockClient.send as jest.Mock).mockResolvedValueOnce({
        body: Buffer.from('Invalid JSON')
      });

      await expect(
        assistant.processMessage('What is teeth cleaning?', mockContext)
      ).rejects.toThrow('Failed to parse response from Bedrock');
    });

    it('should handle missing response body', async () => {
      (mockClient.send as jest.Mock).mockResolvedValueOnce({});

      await expect(
        assistant.processMessage('What is teeth cleaning?', mockContext)
      ).rejects.toThrow('Invalid response from Bedrock');
    });
  });

  describe('error handling', () => {
    it('should handle AWS client initialization failure', async () => {
      const newAssistant = new BedrockChatAssistant();
      (getSecret as jest.Mock).mockRejectedValueOnce(new Error('Secret not found'));

      await expect(
        newAssistant.processMessage('Hello', mockContext)
      ).rejects.toThrow('Failed to initialize AWS Bedrock for chat assistant');
    });

    it('should handle AWS API errors', async () => {
      (mockClient.send as jest.Mock).mockRejectedValueOnce(new Error('AWS API Error'));

      await expect(
        assistant.processMessage('Hello', mockContext)
      ).rejects.toThrow('Failed to process chat message');
    });

    it('should handle response without content', async () => {
      (mockClient.send as jest.Mock).mockResolvedValueOnce({
        body: Buffer.from(JSON.stringify({}))
      });

      const response = await assistant.processMessage('Hello', mockContext);
      
      expect(response).toEqual({
        message: 'I apologize, but I encountered an error processing your request. Please try again.',
      });
    });
  });
}); 