import { analyzeDentalImage } from '../analyzeDentalImage';
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

describe('analyzeDentalImage', () => {
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
  });

  it('should analyze a dental image successfully', async () => {
    // Mock successful response
    const mockAnalysis = {
      findings: [
        {
          type: 'cavity',
          confidence: 0.95,
          location: {
            x: 100,
            y: 150,
            width: 50,
            height: 30
          },
          description: 'Small cavity detected in upper molar'
        }
      ],
      summary: 'Overall dental health is good with one minor issue detected.',
      recommendations: [
        'Schedule a filling for the cavity',
        'Continue regular brushing and flossing'
      ],
      severity: 'low'
    };

    const mockResponse = {
      body: Buffer.from(JSON.stringify({
        content: [
          {
            text: JSON.stringify(mockAnalysis)
          }
        ]
      }))
    };

    mockBedrockClient.send.mockResolvedValueOnce(mockResponse);

    // Test data
    const imageBuffer = Buffer.from('test-image-data');

    // Call the method
    const result = await analyzeDentalImage(imageBuffer);

    // Verify response
    expect(result).toEqual(mockAnalysis);

    // Verify Bedrock client was called correctly
    expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);
    const command = mockBedrockClient.send.mock.calls[0][0];
    expect(command.constructor.name).toBe('InvokeModelCommand');
    
    const commandInput = JSON.parse(command.input.body);
    expect(commandInput).toMatchObject({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      temperature: 0.7,
      top_p: 0.9
    });
  });

  it('should handle errors gracefully', async () => {
    // Mock error response
    mockBedrockClient.send.mockRejectedValueOnce(new Error('API Error'));

    // Test data
    const imageBuffer = Buffer.from('test-image-data');

    // Call the method and expect error
    await expect(analyzeDentalImage(imageBuffer)).rejects.toThrow('Failed to analyze dental image');
  });

  it('should validate response format', async () => {
    // Mock invalid response format
    const mockResponse = {
      body: Buffer.from(JSON.stringify({
        content: [
          {
            text: JSON.stringify({
              findings: [],
              // Missing required fields
              recommendations: []
            })
          }
        ]
      }))
    };

    mockBedrockClient.send.mockResolvedValueOnce(mockResponse);

    // Test data
    const imageBuffer = Buffer.from('test-image-data');

    // Call the method and expect error
    await expect(analyzeDentalImage(imageBuffer)).rejects.toThrow('Failed to analyze dental image');
  });

  it('should handle image conversion correctly', async () => {
    // Mock successful response
    const mockResponse = {
      body: Buffer.from(JSON.stringify({
        content: [
          {
            text: JSON.stringify({
              findings: [],
              summary: 'Test summary',
              recommendations: [],
              severity: 'low'
            })
          }
        ]
      }))
    };

    mockBedrockClient.send.mockResolvedValueOnce(mockResponse);

    // Test data
    const imageBuffer = Buffer.from('test-image-data');

    // Call the method
    await analyzeDentalImage(imageBuffer);

    // Verify the image was converted to base64
    const command = mockBedrockClient.send.mock.calls[0][0];
    const commandInput = JSON.parse(command.input.body);
    const imageContent = commandInput.messages[0].content[1];

    expect(imageContent.type).toBe('image');
    expect(imageContent.source.type).toBe('base64');
    expect(imageContent.source.media_type).toBe('image/jpeg');
    expect(imageContent.source.data).toBe('dGVzdC1pbWFnZS1kYXRh'); // base64 of 'test-image-data'
  });
}); 