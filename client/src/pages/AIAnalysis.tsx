import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type AnalysisType = 'xray' | 'panoramic' | 'intraoral';
type DetectionResult = {
  label: string;
  confidence: number;
  severity: 'normal' | 'mild' | 'severe';
};

type AnalysisResult = {
  findings: DetectionResult[];
  overall: string;
  confidence: number;
  processingTime: number;
};

export default function AIAnalysis() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('xray');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('type', analysisType);

    try {
      const response = await fetch('/api/analyze-dental-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setResult(data);
      toast({
        title: "Analysis Complete",
        description: "Your dental image has been successfully analyzed.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to analyze the image. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'text-destructive';
      case 'mild': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">AI Dental Analysis</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Image</CardTitle>
            <CardDescription>
              Select a dental image for AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="analysis-type">Analysis Type</Label>
              <Select
                value={analysisType}
                onValueChange={(value: AnalysisType) => setAnalysisType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xray">X-ray</SelectItem>
                  <SelectItem value="panoramic">Panoramic</SelectItem>
                  <SelectItem value="intraoral">Intraoral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-upload">Image</Label>
              <div className="flex items-center space-x-4">
                <Button
                  variant="secondary"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  Choose File
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedFile?.name || 'No file selected'}
                </span>
              </div>
              <input
                id="image-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleAnalyze}
              disabled={!selectedFile || isLoading}
            >
              {isLoading ? "Analyzing..." : "Analyze Image"}
            </Button>
          </CardContent>
        </Card>

        {(isLoading || result) && (
          <Card>
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Analyzing image...</p>
                  <Progress value={30} className="w-full" />
                </div>
              ) : result && (
                <div className="space-y-4">
                  <p className="text-sm">{result.overall}</p>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Confidence Score</h4>
                    <Progress 
                      value={result.confidence * 100} 
                      className="w-full"
                    />
                    <p className="text-sm text-muted-foreground">
                      {(result.confidence * 100).toFixed(1)}% confidence
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Findings</h4>
                    <div className="space-y-2">
                      {result.findings.map((finding, index) => (
                        <div 
                          key={index}
                          className="flex justify-between items-center p-2 rounded-lg border"
                        >
                          <span>{finding.label}</span>
                          <span className={getSeverityColor(finding.severity)}>
                            {finding.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Analysis completed in {(result.processingTime / 1000).toFixed(2)} seconds
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
