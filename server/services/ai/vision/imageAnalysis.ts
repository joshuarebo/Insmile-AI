import { BedrockDentalImageAnalyzer } from './bedrockImageAnalysis';
import * as tf from '@tensorflow/tfjs';
import sharp from 'sharp';
import path from 'path';

export interface DetectionResult {
  label: string;
  confidence: number;
  bbox?: [number, number, number, number]; // [x, y, width, height]
  severity: 'normal' | 'mild' | 'severe';
}

export interface AnalysisResult {
  findings: DetectionResult[];
  overall: string;
  confidence: number;
  processingTime: number;
}

// Use Bedrock for analysis when available, fallback to local models
export const analyzeXRay = async (imageBuffer: Buffer): Promise<AnalysisResult> => {
  try {
    const bedrockDentalImageAnalyzer = new BedrockDentalImageAnalyzer();
    return await bedrockDentalImageAnalyzer.analyzeImage(imageBuffer, 'xray');
  } catch (error) {
    console.error('Error in X-Ray analysis:', error);
    throw error;
  }
};

export const analyzePanoramic = async (imageBuffer: Buffer): Promise<AnalysisResult> => {
  try {
    const bedrockDentalImageAnalyzer = new BedrockDentalImageAnalyzer();
    return await bedrockDentalImageAnalyzer.analyzeImage(imageBuffer, 'panoramic');
  } catch (error) {
    console.error('Error in panoramic analysis:', error);
    throw error;
  }
};

export const analyzeIntraoral = async (imageBuffer: Buffer): Promise<AnalysisResult> => {
  try {
    const bedrockDentalImageAnalyzer = new BedrockDentalImageAnalyzer();
    return await bedrockDentalImageAnalyzer.analyzeImage(imageBuffer, 'intraoral');
  } catch (error) {
    console.error('Error in intraoral analysis:', error);
    throw error;
  }
};

export const markupImage = async (imageBuffer: Buffer, findings: DetectionResult[]): Promise<Buffer> => {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const { width = 0, height = 0 } = metadata;

    // Create an SVG overlay for annotations
    const svgBuffer = Buffer.from(`
      <svg width="${width}" height="${height}">
        ${findings.map((finding, index) => {
          if (finding.bbox) {
            const [x, y, w, h] = finding.bbox;
            return `
              <rect
                x="${x}" y="${y}" width="${w}" height="${h}"
                fill="none"
                stroke="${finding.severity === 'severe' ? 'red' : finding.severity === 'mild' ? 'yellow' : 'green'}"
                stroke-width="2"
              />
              <text
                x="${x}" y="${y-5}"
                font-family="Arial"
                font-size="12"
                fill="${finding.severity === 'severe' ? 'red' : finding.severity === 'mild' ? 'yellow' : 'green'}"
              >
                ${finding.label} (${Math.round(finding.confidence * 100)}%)
              </text>
            `;
          }
          return '';
        }).join('')}
      </svg>
    `);

    // Composite the original image with the SVG overlay
    const markedImage = await image
      .composite([
        {
          input: svgBuffer,
          top: 0,
          left: 0,
        },
      ])
      .toBuffer();

    return markedImage;
  } catch (error) {
    console.error('Error marking up image:', error);
    throw new Error('Failed to create annotated image');
  }
};

// Local model fallback class
export class DentalImageAnalyzer {
  private models: {
    cavity: tf.GraphModel | null;
    bone: tf.GraphModel | null;
    alignment: tf.GraphModel | null;
  } = {
    cavity: null,
    bone: null,
    alignment: null
  };

  private readonly MODEL_PATHS = {
    cavity: path.join(__dirname, '../../../../models/cavity_detection/model.json'),
    bone: path.join(__dirname, '../../../../models/bone_analysis/model.json'),
    alignment: path.join(__dirname, '../../../../models/teeth_alignment/model.json')
  };

  private readonly LABELS = {
    cavity: ['healthy', 'cavity', 'deep_cavity'],
    bone: ['normal', 'mild_loss', 'severe_loss'],
    alignment: ['aligned', 'mild_misalignment', 'severe_misalignment']
  };

  constructor() {
    this.loadModels();
  }

  private async loadModels() {
    try {
      await tf.ready();
      this.models = {
        cavity: await tf.loadGraphModel(`file://${this.MODEL_PATHS.cavity}`),
        bone: await tf.loadGraphModel(`file://${this.MODEL_PATHS.bone}`),
        alignment: await tf.loadGraphModel(`file://${this.MODEL_PATHS.alignment}`)
      };
      console.log('All models loaded successfully');
    } catch (error) {
      console.error('Error loading models:', error);
      throw new Error('Failed to load AI models');
    }
  }

  private async preprocessImage(imageBuffer: Buffer): Promise<tf.Tensor4D> {
    // Resize image to 224x224 (standard input size for many models)
    const processedBuffer = await sharp(imageBuffer)
      .resize(224, 224)
      .greyscale()
      .normalize()
      .toBuffer();

    // Convert to tensor and normalize to [-1, 1]
    const imageData = new Float32Array(processedBuffer);
    const tensor = tf.tensor4d(imageData, [1, 224, 224, 1]);
    const normalized = tensor.div(tf.scalar(127.5)).sub(tf.scalar(1));
    return normalized;
  }

  private async detectFeatures(image: tf.Tensor4D, model: tf.GraphModel | null): Promise<tf.Tensor> {
    if (!model) {
      throw new Error('Model not loaded');
    }
    return model.predict(image) as tf.Tensor;
  }

  private getSeverity(confidence: number, threshold: { mild: number; severe: number }): 'normal' | 'mild' | 'severe' {
    if (confidence >= threshold.severe) return 'severe';
    if (confidence >= threshold.mild) return 'mild';
    return 'normal';
  }

  public async analyzeImage(imageBuffer: Buffer): Promise<{
    findings: DetectionResult[];
    confidence: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    const findings: DetectionResult[] = [];

    try {
      const processedImage = await this.preprocessImage(imageBuffer);

      // Run detection for each model
      const [cavityResults, boneResults, alignmentResults] = await Promise.all([
        this.detectFeatures(processedImage, this.models.cavity),
        this.detectFeatures(processedImage, this.models.bone),
        this.detectFeatures(processedImage, this.models.alignment)
      ]);

      // Process cavity detection results
      const cavityPredictions = await cavityResults.array();
      if (cavityPredictions[0][1] > 0.3) { // Cavity threshold
        findings.push({
          label: 'Cavity Detected',
          confidence: cavityPredictions[0][1],
          severity: this.getSeverity(cavityPredictions[0][1], { mild: 0.3, severe: 0.7 })
        });
      }

      // Process bone loss results
      const bonePredictions = await boneResults.array();
      if (bonePredictions[0][1] > 0.25) { // Bone loss threshold
        findings.push({
          label: 'Bone Loss Detected',
          confidence: bonePredictions[0][1],
          severity: this.getSeverity(bonePredictions[0][1], { mild: 0.25, severe: 0.6 })
        });
      }

      // Process alignment results
      const alignmentPredictions = await alignmentResults.array();
      if (alignmentPredictions[0][1] > 0.35) { // Misalignment threshold
        findings.push({
          label: 'Teeth Misalignment',
          confidence: alignmentPredictions[0][1],
          severity: this.getSeverity(alignmentPredictions[0][1], { mild: 0.35, severe: 0.75 })
        });
      }

      // Calculate overall confidence
      const overallConfidence = findings.reduce((acc, finding) => acc + finding.confidence, 0) / findings.length;

      // Cleanup
      tf.dispose([processedImage, cavityResults, boneResults, alignmentResults]);

      return {
        findings,
        confidence: overallConfidence || 0,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new Error('Failed to analyze dental image');
    }
  }
}
