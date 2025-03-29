import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Card, CardContent, Typography, Button, CircularProgress,
  Box, Alert, Paper
} from '@mui/material';
import { ScanViewer } from './ScanViewer';
import { ai } from '../services/ai';

// Mock data for demonstration
const MOCK_ANALYSIS = {
  findings: [
    {
      label: 'Cavity detected on tooth #14',
      confidence: 0.92,
      severity: 'severe',
    },
    {
      label: 'Early stage gum disease',
      confidence: 0.78,
      severity: 'mild',
    }
  ],
  overall: 'Dental health needs attention with several issues identified.',
  confidence: 0.88,
  processingTime: 1200
};

interface AIAnalysisProps {
  patientId?: string;
  scanId?: string;
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ patientId, scanId }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [analysisRequested, setAnalysisRequested] = useState(false);

  // Check API availability when component mounts
  useEffect(() => {
    const checkApiAvailability = async () => {
      try {
        await axios.get('http://localhost:3001/api/health', { timeout: 2000 });
        setApiAvailable(true);
      } catch (err) {
        console.log('API not available, using demo mode');
        setApiAvailable(false);
        setDemoMode(true);
      }
    };
    
    checkApiAvailability();
  }, []);

  // When scanId or patientId changes, fetch the analysis
  useEffect(() => {
    // Always use demo mode if API is unavailable
    if (!apiAvailable) {
      setDemoMode(true);
      setAnalysis(MOCK_ANALYSIS);
      return;
    }
    
    // If there's no scanId, generate a demo one if in demoPatientId context
    if (!scanId && patientId && patientId.startsWith('demo')) {
      const demoScanId = 'demo-scan-' + Date.now();
      console.log(`No scan ID provided, using generated demo scan ID: ${demoScanId}`);
      setDemoMode(true);
      setAnalysis(MOCK_ANALYSIS);
      return;
    }
    
    if (!scanId) return;

    // Automatically use demo mode if:
    // 1. The scan ID starts with "demo"
    // 2. The patient ID starts with "demo"
    if (scanId.startsWith('demo-scan-') || (patientId && patientId.startsWith('demo'))) {
      setDemoMode(true);
      setAnalysis(MOCK_ANALYSIS);
      return;
    }

    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      setAnalysisRequested(true);
      
      try {
        console.log(`Requesting AI analysis for scan ${scanId}`);
        
        // First check if real-time analysis is available through Bedrock
        const isRealTimeAvailable = await ai.isRealTimeAvailable();
        
        if (!isRealTimeAvailable) {
          console.log('Real-time Bedrock analysis unavailable, using demo mode');
          setDemoMode(true);
          setAnalysis(MOCK_ANALYSIS);
          setLoading(false);
          return;
        }
        
        // First trigger analysis if needed
        try {
          await ai.analyzeImage(scanId, patientId || 'unknown');
        } catch (err) {
          console.log('Analysis may already be in progress:', err);
        }
        
        // Poll for results
        let attempts = 0;
        const maxAttempts = 15; // Increase to allow more time
        const pollDelay = 3000; // 3 seconds
        
        const pollForResults = async () => {
          try {
            console.log(`Polling for analysis results (attempt ${attempts + 1}/${maxAttempts})...`);
            
            // First check status to see if analysis is complete
            const status = await ai.getAnalysisStatus(scanId);
            console.log(`Analysis status: ${status.status}, progress: ${status.progress}%`);
            
            if (status.status === 'completed') {
              const response = await ai.getAnalysis(scanId);
              
              if (response && (response.findings || response.overall)) {
                console.log('Analysis results received:', response);
                setAnalysis(response);
                setLoading(false);
                return true;
              }
            }
            
            return false;
          } catch (err) {
            console.log('Error polling for results:', err);
            return false;
          }
        };
        
        // First attempt
        if (await pollForResults()) return;
        
        // Set up polling interval
        const pollingInterval = setInterval(async () => {
          attempts++;
          
          if (await pollForResults()) {
            clearInterval(pollingInterval);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollingInterval);
            throw new Error('Analysis timed out. Switching to demo mode...');
          }
        }, pollDelay);
        
        // Cleanup
        return () => clearInterval(pollingInterval);
      } catch (err: any) {
        console.error('Error fetching analysis:', err);
        setError('Failed to fetch analysis. Switching to demo mode...');
        
        // Fall back to demo mode on error
        setTimeout(() => {
          setDemoMode(true);
          setAnalysis(MOCK_ANALYSIS);
          setError(null);
          setLoading(false);
        }, 1500);
      }
    };
    
    fetchAnalysis();
  }, [scanId, patientId, apiAvailable]);

  // If we're not in demo mode and no analysis has been requested yet, request one
  useEffect(() => {
    if (!demoMode && !analysisRequested && scanId && !analysis && apiAvailable) {
      console.log('Automatically requesting analysis for scan:', scanId);
      ai.analyzeImage(scanId, patientId || 'unknown')
        .then(() => setAnalysisRequested(true))
        .catch(err => console.error('Failed to auto-request analysis:', err));
    }
  }, [demoMode, analysisRequested, scanId, patientId, analysis, apiAvailable]);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" minHeight="200px" flexDirection="column">
            <CircularProgress size={60} thickness={4} sx={{ mb: 2 }} />
            <Typography>Analyzing dental scan with AI...</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This may take up to 30 seconds
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            No analysis available. The scan may still be processing.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          AI Dental Analysis {demoMode && "(Demo Mode)"}
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          {scanId && (
            <Box sx={{ flex: 1 }}>
              <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Dental Scan</Typography>
                <ScanViewer 
                  scanId={scanId} 
                  findings={analysis.findings}
                  highlightFindings={true}
                />
              </Paper>
            </Box>
          )}
          
          <Box sx={{ flex: scanId ? 1 : 2 }}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Analysis Results</Typography>
              <Typography variant="body1" paragraph>
                <strong>Overall Assessment:</strong> {analysis.overall}
              </Typography>
              
              <Typography variant="subtitle1">Findings:</Typography>
              {analysis.findings && analysis.findings.map((finding: any, index: number) => (
                <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>{finding.label}</strong> 
                    {' '}<span style={{ 
                      color: finding.severity === 'severe' ? 'red' : 
                             finding.severity === 'mild' ? 'orange' : 'green' 
                    }}>
                      ({finding.severity})
                    </span>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Confidence: {Math.round(finding.confidence * 100)}%
                  </Typography>
                </Box>
              ))}
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Analysis completed in {analysis.processingTime ? 
                  `${(analysis.processingTime / 1000).toFixed(1)} seconds` : 
                  'processing time not available'}
              </Typography>
            </Paper>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AIAnalysis; 