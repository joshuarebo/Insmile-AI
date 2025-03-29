import { bedrockDentalImageAnalyzer } from './bedrockImageAnalysis';
import fs from 'fs';
import path from 'path';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Mock the AWS Bedrock client
jest.mock("@aws-sdk/client-bedrock-runtime", () => ({
  BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      body: Buffer.from(JSON.stringify({
        content: [{
          text: "Analysis completed. Found a cavity in tooth #14 with 90% confidence."
        }]
      }))
    })
  })),
  InvokeModelCommand: jest.fn()
}));

describe('BedrockDentalImageAnalyzer', () => {
  // Test image paths - update to use server/test/images
  const TEST_IMAGES_DIR = path.join(__dirname, '../../../test/images');
  
  // Helper function to load test image
  const loadTestImage = (filename: string): Buffer => {
    const imagePath = path.join(TEST_IMAGES_DIR, filename);
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Test image not found: ${imagePath}. Please run 'npm run test:setup' first.`);
    }
    return fs.readFileSync(imagePath);
  };

  // Test X-ray analysis
  test('should analyze X-ray image', async () => {
    try {
      const imageBuffer = loadTestImage('xray.jpg');
      const result = await bedrockDentalImageAnalyzer.analyzeImage(imageBuffer, 'xray');
      
      // Verify result structure
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('processingTime');
      
      // Verify findings array
      expect(Array.isArray(result.findings)).toBe(true);
      if (result.findings.length > 0) {
        expect(result.findings[0]).toHaveProperty('label');
        expect(result.findings[0]).toHaveProperty('confidence');
        expect(result.findings[0]).toHaveProperty('severity');
      }
      
      console.log('X-ray Analysis Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('X-ray analysis test failed:', error);
      throw error;
    }
  });

  // Test panoramic analysis
  test('should analyze panoramic image', async () => {
    try {
      const imageBuffer = loadTestImage('panoramic.jpg');
      const result = await bedrockDentalImageAnalyzer.analyzeImage(imageBuffer, 'panoramic');
      
      // Verify result structure
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('processingTime');
      
      console.log('Panoramic Analysis Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Panoramic analysis test failed:', error);
      throw error;
    }
  }, 10000);

  // Test intraoral analysis
  test('should analyze intraoral image', async () => {
    try {
      const imageBuffer = loadTestImage('intraoral.jpg');
      const result = await bedrockDentalImageAnalyzer.analyzeImage(imageBuffer, 'intraoral');
      
      // Verify result structure
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('processingTime');
      
      console.log('Intraoral Analysis Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Intraoral analysis test failed:', error);
      throw error;
    }
  });
}); 