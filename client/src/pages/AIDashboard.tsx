import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Tab, Tabs, Button, Alert, Chip } from '@mui/material';
import { ScanUploader } from '../components/ScanUploader';
import AIAnalysis from '../components/AIAnalysis';
import { TreatmentPlan } from '../components/TreatmentPlan';
import { ChatAssistant } from '../components/ChatAssistant';
import axios from 'axios';
import { ai } from '../services/ai';

/**
 * AIDashboard - A standalone page to test all AI features
 * No patient selection needed, works with demo mode by default
 */
const AIDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [realTimeAvailable, setRealTimeAvailable] = useState<boolean | null>(null);
  
  // Fixed demo patient ID for all components
  const demoPatientId = 'demo-patient-123';

  useEffect(() => {
    // Check API availability
    const checkApiAvailability = async () => {
      try {
        const available = await axios.get('http://localhost:3001/api/health', { timeout: 2000 })
          .then(() => true)
          .catch(() => false);
        
        setApiAvailable(available);
        
        // If API is available, check if real-time analysis is available
        if (available) {
          const realTime = await ai.isRealTimeAvailable();
          setRealTimeAvailable(realTime);
          console.log(`Real-time analysis ${realTime ? 'is' : 'is not'} available`);
        } else {
          setRealTimeAvailable(false);
        }
      } catch (err) {
        console.log('Error checking API availability:', err);
        setApiAvailable(false);
        setRealTimeAvailable(false);
      }
    };
    
    checkApiAvailability();

    // Set up periodic API check every 30 seconds
    const intervalId = setInterval(checkApiAvailability, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    
    // If user switches to Analysis or Treatment tab and no scan is selected,
    // automatically generate a demo scan
    if ((newValue === 1 || newValue === 2) && !currentScanId) {
      handleDemoScan();
    }
  };

  const handleScanUploaded = (scanId: string) => {
    setCurrentScanId(scanId);
    // Automatically switch to Analysis tab after upload
    setActiveTab(1);
  };

  // Force demo mode for scan upload
  const handleDemoScan = () => {
    const demoScanId = 'demo-scan-' + Date.now();
    setCurrentScanId(demoScanId);
    setActiveTab(1);
  };

  return (
    <Box p={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dental AI Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Chip 
            label={apiAvailable === null ? 'Checking connection...' : 
                  apiAvailable ? 'API connected' : 'API unavailable'}
            color={apiAvailable === null ? 'default' : 
                  apiAvailable ? 'success' : 'error'}
            variant="outlined"
          />
          
          {apiAvailable && (
            <Chip 
              label={realTimeAvailable === null ? 'Checking Bedrock...' : 
                    realTimeAvailable ? 'Real-time mode' : 'Demo mode'}
              color={realTimeAvailable === null ? 'default' : 
                    realTimeAvailable ? 'success' : 'warning'}
              variant="outlined"
            />
          )}
        </Box>
      </Box>
      
      <Alert severity={apiAvailable ? (realTimeAvailable ? 'success' : 'warning') : 'error'} sx={{ mb: 3 }}>
        {!apiAvailable 
          ? 'Server connection not available. Running in demo mode with mock data.'
          : realTimeAvailable 
            ? 'Connected to Bedrock AI services. Uploads and analysis will be processed in real-time.'
            : <>
                Running in demo mode. To enable real-time processing:
                <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
                  <li>Edit <code>server/config/aws.json</code></li>
                  <li>Add your AWS access key and secret key</li>
                  <li>Restart the server</li>
                </ol>
              </>
        }
      </Alert>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Upload Scan" />
          <Tab label="AI Analysis" />
          <Tab label="Treatment Plan" />
          <Tab label="Chat Assistant" />
        </Tabs>
      </Box>
      
      {/* Upload Scan Tab */}
      <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
        <Typography variant="h6" gutterBottom>
          Upload a dental scan for AI analysis
        </Typography>
        <ScanUploader patientId={demoPatientId} onScanUploaded={handleScanUploaded} />
        
        <Box textAlign="center" mt={4}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Don't have a scan to upload? Use our demo scan:
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleDemoScan}
          >
            Use Demo Scan
          </Button>
        </Box>
      </Box>
      
      {/* AI Analysis Tab */}
      <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
        {currentScanId ? (
          <AIAnalysis scanId={currentScanId} patientId={demoPatientId} />
        ) : (
          <Card>
            <CardContent>
              <Alert severity="warning">
                Please upload or select a scan first to view AI analysis.
              </Alert>
            </CardContent>
          </Card>
        )}
      </Box>
      
      {/* Treatment Plan Tab */}
      <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
        {currentScanId ? (
          <TreatmentPlan patientId={demoPatientId} scanId={currentScanId} />
        ) : (
          <Card>
            <CardContent>
              <Alert severity="warning">
                Please upload or select a scan first to generate a treatment plan.
              </Alert>
            </CardContent>
          </Card>
        )}
      </Box>
      
      {/* Chat Assistant Tab */}
      <Box sx={{ display: activeTab === 3 ? 'block' : 'none' }}>
        <ChatAssistant patientId={demoPatientId} />
      </Box>
    </Box>
  );
};

export default AIDashboard; 