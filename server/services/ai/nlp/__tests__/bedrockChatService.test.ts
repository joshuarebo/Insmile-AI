import { BedrockChatService } from '../bedrockChatService';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Mock the AWS SDK
jest.mock('@aws-sdk/client-bedrock-runtime', () => {
  const mockCommand = jest.fn().mockImplementation((params) => ({
    input: params,
    constructor: { name: 'InvokeModelCommand' }
  }));
  mockCommand.prototype = { constructor: { name: 'InvokeModelCommand' } };

  return {
    BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
      send: jest.fn()
    })),
    InvokeModelCommand: mockCommand
  };
});

describe('BedrockChatService', () => {
  let chatService: BedrockChatService;
  let mockBedrockClient: jest.Mocked<BedrockRuntimeClient>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock Bedrock client
    mockBedrockClient = {
      send: jest.fn(),
      config: {
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key'
        }
      }
    } as any;

    // Mock the BedrockRuntimeClient constructor
    (BedrockRuntimeClient as jest.Mock).mockImplementation(() => mockBedrockClient);

    // Create chat service instance
    chatService = new BedrockChatService();
  });

  describe('generateResponse', () => {
    it('should generate a response successfully', async () => {
      // Mock successful response
      const mockResponse = {
        body: Buffer.from(JSON.stringify({
          content: [
            {
              text: 'This is a test response from the AI assistant.'
            }
          ]
        }))
      };

      mockBedrockClient.send.mockResolvedValueOnce(mockResponse);

      // Test data
      const userMessage = 'What are the common causes of tooth decay?';
      const context = {
        patientId: 'test-patient-id',
        patientHistory: {
          age: 30,
          lastVisit: '2024-01-01'
        }
      };

      // Call the method
      const response = await chatService.generateResponse(userMessage, context);

      // Verify response
      expect(response).toBe('This is a test response from the AI assistant.');

      // Verify Bedrock client was called correctly
      expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);
      const command = mockBedrockClient.send.mock.calls[0][0];
      expect(command.constructor.name).toBe('InvokeModelCommand');
      
      const commandInput = JSON.parse(command.input.body);
      expect(commandInput).toMatchObject({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.9
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock error response
      mockBedrockClient.send.mockRejectedValueOnce(new Error('API Error'));

      // Test data
      const userMessage = 'What are the common causes of tooth decay?';

      // Call the method and expect error
      await expect(chatService.generateResponse(userMessage)).rejects.toThrow('Failed to generate AI response');
    });

    it('should include context in the prompt', async () => {
      // Mock successful response
      const mockResponse = {
        body: Buffer.from(JSON.stringify({
          content: [
            {
              text: 'This is a test response from the AI assistant.'
            }
          ]
        }))
      };

      mockBedrockClient.send.mockResolvedValueOnce(mockResponse);

      // Test data with context
      const userMessage = 'What are the common causes of tooth decay?';
      const context = {
        patientId: 'test-patient-id',
        patientHistory: {
          age: 30,
          lastVisit: '2024-01-01'
        },
        currentTreatmentPlan: {
          status: 'active',
          procedures: ['cleaning', 'filling']
        },
        previousMessages: [
          {
            role: 'user' as const,
            content: 'I have a toothache.'
          },
          {
            role: 'assistant' as const,
            content: 'I understand you have a toothache. Could you tell me more about the pain?'
          }
        ]
      };

      // Call the method
      await chatService.generateResponse(userMessage, context);

      // Verify the prompt includes context
      const command = mockBedrockClient.send.mock.calls[0][0];
      const commandInput = JSON.parse(command.input.body);
      const prompt = commandInput.messages[0].content;

      expect(prompt).toContain('Patient History');
      expect(prompt).toContain('Current Treatment Plan');
      expect(prompt).toContain('Previous Conversation');
    });
  });
}); 