import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { AIResults } from "@/lib/apiTypes";
import { motion } from "framer-motion";

export default function AIAnalysisDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AIResults | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      toast({
        title: "File selected",
        description: `${selectedFile.name} ready for analysis`,
      });
    }
  };

  const runDemoAnalysis = () => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    setProgress(0);
    setResults(null);

    // Simulate analysis progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Simulate AI results
            setResults({
              findings: [
                {
                  type: "cavity",
                  location: "upper molars",
                  teeth: ["16", "17"],
                  priority: "high",
                  confidence: 98,
                  description: "2 cavities detected in upper molars (teeth #16, #17)",
                },
                {
                  type: "enamel_wear",
                  location: "lower incisors",
                  priority: "medium",
                  confidence: 85,
                  description: "Moderate wear detected on lower incisors",
                },
                {
                  type: "restoration",
                  location: "tooth #30",
                  priority: "low",
                  confidence: 99,
                  description: "Existing filling on tooth #30 in good condition",
                },
              ],
              recommendations: [
                {
                  procedure: "filling",
                  teeth: ["16", "17"],
                  urgency: "high",
                  notes: "Composite fillings recommended for both cavities",
                },
                {
                  procedure: "fluoride_treatment",
                  urgency: "medium",
                  notes: "To address enamel wear on lower incisors",
                },
                {
                  procedure: "monitoring",
                  teeth: ["30"],
                  urgency: "low",
                  notes: "Continue monitoring existing restoration on follow-up visits",
                },
              ],
              overallHealth: "fair",
              summary: "Patient requires attention for cavities in upper molars and enamel wear on lower incisors. Existing restoration is in good condition.",
            });
            setIsAnalyzing(false);
          }, 500);
        }
        return newProgress;
      });
    }, 300);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-neutral-200">
        <h2 className="text-lg font-semibold text-neutral-800">AI Analysis Demo</h2>
        <p className="text-sm text-neutral-500 mt-1">Upload a scan for AI-powered diagnosis</p>
      </div>

      <div className="p-6">
        <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-primary-50 text-primary-500">
            <i className="fas fa-cloud-upload-alt text-2xl"></i>
          </div>
          <h3 className="text-neutral-800 font-medium mb-2">Upload CBCT or X-ray</h3>
          <p className="text-sm text-neutral-500 mb-4">Drag and drop files or click to browse</p>
          <p className="text-xs text-neutral-400 mb-6">Supported formats: JPEG, PNG, DICOM</p>
          
          <label htmlFor="file-upload">
            <Button variant="default" className="cursor-pointer">
              Select Files
            </Button>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,.dcm"
              onChange={handleFileChange}
            />
          </label>
          
          {file && (
            <p className="mt-4 text-sm text-primary-600">
              <i className="fas fa-file-image mr-2"></i> {file.name}
            </p>
          )}
        </div>

        {isAnalyzing && (
          <div className="relative mt-6 px-4 py-3 rounded-lg bg-neutral-100">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700">Analyzing scan...</span>
              <span className="text-sm font-medium text-neutral-700">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="mt-6">
          <Button
            onClick={runDemoAnalysis}
            className="w-full py-6 bg-accent-500 hover:bg-accent-600"
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <span className="flex items-center">
                <i className="fas fa-spinner fa-spin mr-2"></i> Analyzing...
              </span>
            ) : (
              "Run Demo Analysis"
            )}
          </Button>
        </div>

        {/* Analysis Results */}
        {results && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6 border border-neutral-200 rounded-lg overflow-hidden"
          >
            <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
              <h3 className="font-medium text-neutral-800">AI Analysis Results</h3>
            </div>
            <div className="p-4">
              <div className="flex flex-col space-y-4">
                {results.findings.map((finding, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center 
                      ${finding.priority === 'high' ? 'bg-error bg-opacity-20 text-error' : 
                        finding.priority === 'medium' ? 'bg-warning bg-opacity-20 text-warning' : 
                        'bg-success bg-opacity-20 text-success'}`}>
                      <i className={`fas ${finding.priority === 'high' ? 'fa-exclamation-circle' : 
                                          finding.priority === 'medium' ? 'fa-exclamation-triangle' : 
                                          'fa-check-circle'} text-xs`}></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-800">
                        {finding.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </p>
                      <p className="text-xs text-neutral-500">{finding.description}</p>
                      <div className="mt-1 flex items-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full 
                          ${finding.priority === 'high' ? 'bg-error bg-opacity-10 text-error' : 
                            finding.priority === 'medium' ? 'bg-warning bg-opacity-10 text-warning' : 
                            'bg-neutral-200 text-neutral-700'}`}>
                          {finding.priority.charAt(0).toUpperCase() + finding.priority.slice(1)} Priority
                        </span>
                        <span className="ml-2 text-xs text-neutral-400">{finding.confidence}% confidence</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-200">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-medium text-neutral-800">Token Usage</p>
                  <span className="text-xs bg-primary-100 text-primary-600 px-2 py-1 rounded-full">102,458 tokens</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" size="sm" className="h-9">
                    Generate Report
                  </Button>
                  <Button size="sm" className="h-9">
                    Create Treatment Plan
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
