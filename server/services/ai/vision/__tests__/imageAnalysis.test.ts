import { analyzeXRay, analyzePanoramic, analyzeIntraoral, markupImage } from '../imageAnalysis';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Mock DentalImageAnalyzer class
jest.mock('../imageAnalysis', () => {
  const originalModule = jest.requireActual('../imageAnalysis');
  
  class MockDentalImageAnalyzer {
    async loadModels() {
      // Do nothing
    }

    async analyzeImage(imageBuffer: Buffer) {
      return {
        findings: [
          {
            label: 'Cavity',
            confidence: 0.85,
            severity: 'severe' as const,
            bbox: [100, 100, 50, 50] as [number, number, number, number]
          }
        ],
        overall: 'Found cavity in upper right molar with severe decay.',
        confidence: 0.85,
        processingTime: 100
      };
    }
  }

  return {
    ...originalModule,
    DentalImageAnalyzer: MockDentalImageAnalyzer
  };
});

// Mock AWS Bedrock client
jest.mock('@aws-sdk/client-bedrock-runtime', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-bedrock-runtime');

  return {
    BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockImplementation((command) => {
        if (command instanceof originalModule.InvokeModelCommand) {
          const { body } = command.input;
          const parsedBody = JSON.parse(body);
          const imageData = parsedBody.messages[0].content[1].source.data;

          // Validate image data
          if (!imageData) {
            throw new Error('Invalid image data: No image data provided');
          }

          // Check if the data is valid base64
          try {
            const imageBuffer = Buffer.from(imageData, 'base64');
            if (imageBuffer.length < 100) {
              throw new Error('Invalid image data: Image too small');
            }
          } catch (error) {
            throw new Error('Invalid image data: Invalid base64 data');
          }

          // Return a mock response that matches Nova Pro's format
          return Promise.resolve({
            body: Buffer.from(JSON.stringify({
              content: [
                {
                  text: 'Analysis completed. Found a cavity in tooth #14 with 90% confidence.'
                }
              ]
            }))
          });
        }
        throw new Error('Invalid command type');
      })
    })),
    InvokeModelCommand: originalModule.InvokeModelCommand
  };
});

describe('Dental Image Analysis', () => {
  const testImagePath = path.resolve(process.cwd(), 'test-data', 'dataset', 'folder 1', 'OPGs', '10.png');

  beforeAll(async () => {
    // Ensure test image exists
    if (!fs.existsSync(testImagePath)) {
      console.error('Test image path:', testImagePath);
      throw new Error('Test image not found. Please check the dataset path.');
    }
  });

  describe('X-Ray Analysis', () => {
    it('should analyze x-ray images successfully', async () => {
      const imageBuffer = await fs.promises.readFile(testImagePath);
      console.log('X-Ray test image buffer size:', imageBuffer.length, 'bytes');
      const result = await analyzeXRay(imageBuffer);
      expect(result).toBeDefined();
      expect(result.findings).toBeInstanceOf(Array);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0]).toHaveProperty('label');
      expect(result.findings[0]).toHaveProperty('confidence');
      expect(result.findings[0]).toHaveProperty('severity');
    });

    it('should handle invalid x-ray images', async () => {
      const invalidImageBuffer = Buffer.from('invalid data');
      await expect(analyzeXRay(invalidImageBuffer)).rejects.toThrow('Invalid image data');
    });
  });

  describe('Panoramic Analysis', () => {
    it('should analyze panoramic images successfully', async () => {
      const imageBuffer = await fs.promises.readFile(testImagePath);
      console.log('Panoramic test image buffer size:', imageBuffer.length, 'bytes');
      const result = await analyzePanoramic(imageBuffer);
      expect(result).toBeDefined();
      expect(result.findings).toBeInstanceOf(Array);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0]).toHaveProperty('label');
      expect(result.findings[0]).toHaveProperty('confidence');
      expect(result.findings[0]).toHaveProperty('severity');
    });

    it('should handle invalid panoramic images', async () => {
      const invalidImageBuffer = Buffer.from('invalid data');
      await expect(analyzePanoramic(invalidImageBuffer)).rejects.toThrow('Invalid image data');
    });
  });

  describe('Intraoral Analysis', () => {
    it('should analyze intraoral images successfully', async () => {
      const imageBuffer = await fs.promises.readFile(testImagePath);
      console.log('Intraoral test image buffer size:', imageBuffer.length, 'bytes');
      const result = await analyzeIntraoral(imageBuffer);
      expect(result).toBeDefined();
      expect(result.findings).toBeInstanceOf(Array);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0]).toHaveProperty('label');
      expect(result.findings[0]).toHaveProperty('confidence');
      expect(result.findings[0]).toHaveProperty('severity');
    });

    it('should handle invalid intraoral images', async () => {
      const invalidImageBuffer = Buffer.from('invalid data');
      await expect(analyzeIntraoral(invalidImageBuffer)).rejects.toThrow('Invalid image data');
    });
  });

  describe('Image Markup', () => {
    it('should mark up images with findings', async () => {
      const imageBuffer = await fs.promises.readFile(testImagePath);
      const findings = [
        {
          label: 'Cavity',
          confidence: 0.85,
          severity: 'severe' as const,
          bbox: [10, 10, 20, 20] as [number, number, number, number]
        }
      ];

      const markedImage = await markupImage(imageBuffer, findings);
      expect(markedImage).toBeInstanceOf(Buffer);
    });
  });
}); 