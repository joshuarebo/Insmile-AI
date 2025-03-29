import { useState } from 'react';

interface DetectionResult {
  label: string;
  confidence: number;
  severity: 'normal' | 'mild' | 'severe';
}

interface AnalysisResult {
  findings: DetectionResult[];
  overall: string;
  confidence: number;
  processingTime: number;
}

type AnalysisType = 'xray' | 'panoramic' | 'intraoral';

export const useDentalImageAnalysis = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyzeImage = async (imageFile: File, type: AnalysisType) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('type', type);

      const response = await fetch('/api/analyze-dental-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    analyzeImage,
    isLoading,
    error,
    result,
  };
}; 