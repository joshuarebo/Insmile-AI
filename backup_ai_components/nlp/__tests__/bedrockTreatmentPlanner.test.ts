import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { BedrockTreatmentPlanner } from '../bedrockTreatmentPlanner';
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

describe('BedrockTreatmentPlanner', () => {
  const mockFindings = [
    {
      label: 'Cavity',
      confidence: 0.95,
      severity: 'severe' as const,
      bbox: [100, 100, 50, 50] as [number, number, number, number]
    },
    {
      label: 'Gingivitis',
      confidence: 0.85,
      severity: 'mild' as const,
      bbox: [200, 200, 30, 30] as [number, number, number, number]
    }
  ];

  const mockPatientHistory = {
    age: 35,
    gender: 'Female',
    previousConditions: 'None',
    allergies: 'None',
    lastTreatment: 'Regular cleaning 6 months ago',
    medicalNotes: 'Good oral hygiene'
  };

  const mockValidResponse = {
    body: Buffer.from(JSON.stringify({
      content: [{
        text: {
          summary: "Comprehensive dental treatment plan",
          diagnosis: "Severe cavity in upper right molar and mild gingivitis",
          steps: [
            {
              description: "Root canal treatment",
              priority: "high",
              estimatedTime: "2-3 hours",
              estimatedCost: "$800-1200",
              prerequisites: ["X-ray confirmation"]
            },
            {
              description: "Gingivitis treatment",
              priority: "medium",
              estimatedTime: "1 hour",
              estimatedCost: "$200-300",
              prerequisites: ["Root canal completion"]
            }
          ],
          totalEstimatedTime: "3-4 hours",
          totalEstimatedCost: "$1000-1500",
          precautions: ["Avoid hard foods", "Regular brushing"],
          alternatives: ["Extraction", "Watchful waiting"]
        }
      }]
    }))
  };

  let mockClient: BedrockRuntimeClient;
  let planner: BedrockTreatmentPlanner;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = new BedrockRuntimeClient({});
    (mockClient.send as jest.Mock).mockResolvedValue(mockValidResponse);
    planner = new BedrockTreatmentPlanner(mockClient);
  });

  describe('generateTreatmentPlan', () => {
    it('should generate a valid treatment plan', async () => {
      const plan = await planner.generateTreatmentPlan(mockFindings, mockPatientHistory);

      expect(plan).toBeDefined();
      expect(plan.summary).toBe("Comprehensive dental treatment plan");
      expect(plan.diagnosis).toBe("Severe cavity in upper right molar and mild gingivitis");
      expect(plan.steps).toHaveLength(2);
      expect(plan.steps[0].priority).toBe("high");
      expect(plan.steps[1].priority).toBe("medium");
      expect(plan.totalEstimatedCost).toBe("$1000-1500");
      expect(plan.precautions).toContain("Avoid hard foods");
      expect(plan.alternatives).toContain("Extraction");
    });

    it('should handle missing patient history fields', async () => {
      const incompleteHistory = {
        age: 35
        // Missing other fields
      };

      const plan = await planner.generateTreatmentPlan(mockFindings, incompleteHistory);

      expect(plan).toBeDefined();
      expect(plan.steps).toBeDefined();
    });

    it('should handle empty findings array', async () => {
      const plan = await planner.generateTreatmentPlan([], mockPatientHistory);

      expect(plan).toBeDefined();
      expect(plan.steps).toBeDefined();
    });

    it('should handle invalid response format', async () => {
      (mockClient.send as jest.Mock).mockResolvedValueOnce({
        body: Buffer.from('Invalid JSON response')
      });

      await expect(
        planner.generateTreatmentPlan(mockFindings, mockPatientHistory)
      ).rejects.toThrow('Failed to extract JSON from response');
    });
  });

  describe('extractCostEstimate', () => {
    it('should extract cost range from total cost', () => {
      const plan = {
        totalEstimatedCost: "$1000-1500",
        steps: []
      } as any;

      const estimate = planner.extractCostEstimate(plan);

      expect(estimate).toEqual({
        min: 1000,
        max: 1500,
        currency: 'USD'
      });
    });

    it('should calculate cost from individual steps when total is not available', () => {
      const plan = {
        totalEstimatedCost: "Total cost",
        steps: [
          { estimatedCost: "$500" },
          { estimatedCost: "$300" }
        ]
      } as any;

      const estimate = planner.extractCostEstimate(plan);

      expect(estimate).toEqual({
        min: 800,
        max: 960, // 800 * 1.2
        currency: 'USD'
      });
    });

    it('should handle invalid cost formats', () => {
      const plan = {
        totalEstimatedCost: "Invalid cost",
        steps: []
      } as any;

      const estimate = planner.extractCostEstimate(plan);

      expect(estimate).toEqual({
        min: 0,
        max: 0,
        currency: 'USD'
      });
    });
  });

  describe('error handling', () => {
    it('should handle AWS client initialization failure', async () => {
      // Create a new planner without a mock client to test initialization
      const newPlanner = new BedrockTreatmentPlanner();
      (getSecret as jest.Mock).mockRejectedValueOnce(new Error('Secret not found'));

      await expect(
        newPlanner.generateTreatmentPlan(mockFindings, mockPatientHistory)
      ).rejects.toThrow('Failed to initialize AWS Bedrock for treatment planning');
    });

    it('should handle AWS API errors', async () => {
      (mockClient.send as jest.Mock).mockRejectedValueOnce(new Error('AWS API Error'));

      await expect(
        planner.generateTreatmentPlan(mockFindings, mockPatientHistory)
      ).rejects.toThrow('Failed to generate treatment plan');
    });
  });
}); 