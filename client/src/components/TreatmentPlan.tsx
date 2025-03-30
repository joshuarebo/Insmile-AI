import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Card, CardContent, Paper, Typography, Box, 
  List, ListItem, ListItemText, Chip, CircularProgress, Alert, Button
} from '@mui/material';
import { ai } from '../services/ai';

// Interface for treatment step
interface TreatmentStep {
  step: string;
  description: string;
  timeframe: string;
  severity?: 'severe' | 'moderate' | 'mild';
}

// Interface for the complete treatment plan
interface ITreatmentPlan {
  patientId: string;
  overview: string;
  steps: TreatmentStep[];
  precautions?: string[];
  alternatives?: string[];
  estimatedDuration: string;
  estimatedCost: string;
  severity: 'low' | 'medium' | 'high';
  _source: string;
}

// Mock data for demo mode
const MOCK_TREATMENT_PLAN: ITreatmentPlan = {
  patientId: 'demo',
  overview: 'Treatment plan for multiple dental issues including cavities and early gum disease.',
  steps: [
    {
      step: 'Deep Cleaning',
      description: 'Professional cleaning to address gum disease and remove plaque buildup.',
      timeframe: '1-2 weeks'
    },
    {
      step: 'Cavity Filling',
      description: 'Treat cavity on tooth #14 with composite filling.',
      timeframe: '2-3 weeks'
    },
    {
      step: 'Follow-up Examination',
      description: 'Check healing progress and assess gum health.',
      timeframe: '6 weeks'
    }
  ],
  precautions: [
    'Avoid hard foods for 24 hours after filling',
    'Use prescribed mouthwash for gum disease'
  ],
  alternatives: [
    'Porcelain inlay instead of composite filling (higher cost)',
    'Surgical intervention for gum disease if non-surgical approach fails'
  ],
  estimatedDuration: '2-3 months',
  estimatedCost: '$800-1200',
  severity: 'medium',
  _source: 'mock'
};

interface TreatmentPlanProps {
  patientId: string;
  scanId?: string;
}

export const TreatmentPlan: React.FC<TreatmentPlanProps> = ({ patientId, scanId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ITreatmentPlan | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [planRequested, setPlanRequested] = useState(false);

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
        setPlan(MOCK_TREATMENT_PLAN);
        setLoading(false);
      }
    };
    
    checkApiAvailability();
  }, []);

  useEffect(() => {
    // Reset state when new scan ID is provided
    if (scanId) {
      setPlan(null);
      setPlanRequested(false);
      setError(null);
    }
    
    // Don't fetch if API is already known to be unavailable
    if (!apiAvailable) return;

    // Only use demo mode for pure demo scanIds or patientIds
    const isDemoScan = scanId && scanId.startsWith('demo-scan-');
    const isDemoPatient = patientId && patientId.startsWith('demo') && !scanId;
    
    if (isDemoScan || isDemoPatient) {
      console.log('Using demo mode for treatment plan');
      setDemoMode(true);
      setPlan(MOCK_TREATMENT_PLAN);
      setLoading(false);
      return;
    }
    
    // For non-demo mode with no scanId, don't fetch anything
    if (!scanId && !isDemoPatient) {
      setLoading(false);
      return;
    }
    
    const fetchTreatmentPlan = async () => {
      setLoading(true);
      setError(null);
      setPlanRequested(true);
      
      try {
        console.log(`Requesting treatment plan for patient ${patientId}${scanId ? ` and scan ${scanId}` : ''}`);
        
        // Check if real-time analysis is available 
        const isRealTimeAvailable = await ai.isRealTimeAvailable();
        
        if (!isRealTimeAvailable) {
          console.log('Real-time Bedrock analysis unavailable, using demo mode');
          setDemoMode(true);
          setPlan(MOCK_TREATMENT_PLAN);
          setLoading(false);
          return;
        }
        
        // If we have a scanId, first check if the analysis is completed
        if (scanId) {
          // Check analysis status and wait for completion if needed
          let analysisStatus;
          let attempts = 0;
          const maxAttempts = 10; // Try checking 10 times
          
          while (attempts < maxAttempts) {
            try {
              analysisStatus = await ai.getAnalysisStatus(scanId);
              console.log(`Analysis status for scan ${scanId}: ${analysisStatus.status}`);
              
              if (analysisStatus.status === 'completed') {
                console.log('Analysis is completed, can proceed with treatment plan');
                break;
              } else if (analysisStatus.status === 'failed') {
                throw new Error('Analysis failed, cannot generate treatment plan');
              }
              
              // If still processing, wait a bit and check again
              if (analysisStatus.status === 'processing') {
                console.log('Analysis still processing, waiting...');
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                attempts++;
              } else {
                // Unknown status, move on
                break;
              }
            } catch (error) {
              console.error('Error checking analysis status:', error);
              break;
            }
          }
          
          if (attempts >= maxAttempts) {
            console.log('Timed out waiting for analysis to complete');
          }
        }
        
        // Request treatment plan from API - pass scanId if available
        const response = await ai.getTreatmentPlan(patientId, scanId);
        
        if (response) {
          console.log('Treatment plan received:', response);
          setPlan(response);
        } else {
          throw new Error('No treatment plan data received');
        }
      } catch (err: any) {
        console.error('Error fetching treatment plan:', err);
        setError('Failed to fetch treatment plan. Switching to demo mode...');
        
        // Fall back to demo mode on error
        setTimeout(() => {
          setDemoMode(true);
          setPlan(MOCK_TREATMENT_PLAN);
          setError(null);
        }, 1500);
      } finally {
        setLoading(false);
      }
    };
    
    if (patientId && !planRequested) {
      fetchTreatmentPlan();
    }
  }, [patientId, apiAvailable, planRequested, scanId]);

  // When a new scan is processed, request a new treatment plan
  useEffect(() => {
    if (scanId && !demoMode && apiAvailable) {
      console.log('New scan detected, requesting updated treatment plan');
      setPlanRequested(false); // Reset to trigger a new plan request
    }
  }, [scanId, demoMode, apiAvailable]);
  
  // Helper function to get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return '#d32f2f'; // red
      case 'medium':
        return '#ed6c02'; // orange
      case 'low':
        return '#2e7d32'; // green
      default:
        return '#1976d2'; // blue (default)
    }
  };

  const handleRegeneratePlan = async () => {
    // If in demo mode or API unavailable, just simulate regeneration
    if (demoMode || !apiAvailable) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        // Make a small change to the mock plan to simulate regeneration
        const updatedPlan = {
          ...MOCK_TREATMENT_PLAN,
          overview: MOCK_TREATMENT_PLAN.overview + ' Updated with additional considerations.'
        };
        setPlan(updatedPlan);
      }, 2000);
      return;
    }
    
    // Otherwise attempt to regenerate through API
    setLoading(true);
    try {
      const response = await ai.getTreatmentPlan(patientId);
      if (response) {
        setPlan(response);
      } else {
        throw new Error('No treatment plan data received');
      }
    } catch (err) {
      console.error('Error regenerating treatment plan:', err);
      setError('Failed to regenerate plan. Using previous version.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" height="200px" flexDirection="column">
            <CircularProgress size={60} thickness={4} sx={{ mb: 2 }} />
            <Typography>Generating treatment plan...</Typography>
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

  if (!plan) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            No treatment plan is available yet.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Treatment Plan {demoMode ? "(Demo Mode)" : 
            (plan._source === 'mock' ? "(Mock Data)" : "")}
        </Typography>

        {plan._source === 'mock' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Using mock treatment plan data instead of real-time generation. This is demo data and not based on the uploaded scan.
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            AI-Generated Treatment Plan {demoMode && "(Demo Mode)"}
          </Typography>
          
          <Button 
            variant="outlined" 
            size="small"
            onClick={handleRegeneratePlan}
            disabled={loading}
          >
            Regenerate Plan
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          <Typography variant="subtitle1">Overall Severity:</Typography>
          <Chip 
            label={(plan.severity || 'medium').toUpperCase()} 
            sx={{ 
              bgcolor: getSeverityColor(plan.severity || 'medium'),
              color: 'white',
              fontWeight: 'bold'
            }} 
          />
        </Box>
        
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Typography variant="body1" gutterBottom sx={{ fontStyle: 'italic' }}>
            "{plan.overview}"
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">Estimated Duration:</Typography>
              <Typography variant="body1">{plan.estimatedDuration}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Estimated Cost:</Typography>
              <Typography variant="body1">{plan.estimatedCost}</Typography>
            </Box>
          </Box>
        </Paper>
        
        <Typography variant="h6" gutterBottom>Treatment Steps</Typography>
        <List disablePadding>
          {plan.steps?.map((step: TreatmentStep, index: number) => (
            <ListItem 
              key={index} 
              sx={{ 
                p: 0, 
                mb: 2
              }}
              disableGutters
            >
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 2, 
                  width: '100%',
                  borderLeft: '4px solid',
                  borderColor: step.severity ? getSeverityColor(step.severity) : 'primary.main'
                }}
              >
                <Typography variant="subtitle1" gutterBottom>
                  {index + 1}. {step.step}
                  {step.severity && (
                    <Chip 
                      label={step.severity.toUpperCase()} 
                      size="small"
                      sx={{ 
                        ml: 1,
                        bgcolor: getSeverityColor(step.severity),
                        color: 'white',
                        fontSize: '0.7rem',
                        height: 20
                      }} 
                    />
                  )}
                </Typography>
                <Typography variant="body2" paragraph>
                  {step.description}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Timeframe: {step.timeframe}
                </Typography>
              </Paper>
            </ListItem>
          ))}
        </List>
        
        {plan.precautions && plan.precautions.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>Precautions</Typography>
            <Paper elevation={1} sx={{ p: 2 }}>
              <List dense disablePadding>
                {plan.precautions.map((precaution, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemText 
                      primary={precaution} 
                      primaryTypographyProps={{ 
                        variant: 'body2',
                        component: 'div'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        )}
        
        {plan.alternatives && plan.alternatives.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>Alternative Treatments</Typography>
            <Paper elevation={1} sx={{ p: 2 }}>
              <List dense disablePadding>
                {plan.alternatives.map((alternative, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemText 
                      primary={alternative} 
                      primaryTypographyProps={{ 
                        variant: 'body2',
                        component: 'div'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}; 