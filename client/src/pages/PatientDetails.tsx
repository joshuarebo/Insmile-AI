import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Tabs, Tab, Box, Typography, Button, Card, CardContent, CircularProgress, Alert } from '@mui/material';
import { ScanUploader } from '../components/ScanUploader';
import AIAnalysis from '../components/AIAnalysis';
import { ChatAssistant } from '../components/ChatAssistant';
import { TreatmentPlan } from '../components/TreatmentPlan';

interface Patient {
  _id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

interface Scan {
  _id: string;
  id: string;
  patientId: string;
  createdAt: string;
  filename: string;
}

const PatientDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [showAnalysisComponent, setShowAnalysisComponent] = useState(false);

  // Fetch patient details
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/api/patients/${id}`);
        setPatient(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch patient details');
      }
    };

    const fetchScans = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/api/scans/patient/${id}`);
        setScans(response.data);
      } catch (err: any) {
        console.error('Error fetching scans:', err);
        // Don't set error here so the page can still load
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPatient();
      fetchScans();
    }
  }, [id]);

  // When a scan is uploaded, refresh the scans list
  const handleScanUploaded = (scanId: string) => {
    setSelectedScanId(scanId);
    setShowAnalysisComponent(true);
    
    // Refresh the scan list
    axios.get(`http://localhost:3001/api/scans/patient/${id}`)
      .then(response => {
        setScans(response.data);
        setActiveTab(1); // Switch to the Analysis tab
      })
      .catch(err => {
        console.error('Error refreshing scans:', err);
      });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleScanSelect = (scanId: string) => {
    setSelectedScanId(scanId);
    setShowAnalysisComponent(true);
    setActiveTab(1); // Switch to the Analysis tab
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error}
        <Button component={Link} to="/patients" sx={{ ml: 2 }}>
          Back to Patients
        </Button>
      </Alert>
    );
  }

  if (!patient) {
    return (
      <Alert severity="warning">
        Patient not found
        <Button component={Link} to="/patients" sx={{ ml: 2 }}>
          Back to Patients
        </Button>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">{patient.name}</Typography>
        <Button component={Link} to="/patients" variant="outlined">
          Back to Patients
        </Button>
      </Box>
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Patient Information</Typography>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
            <div>
              <Typography variant="subtitle2" color="text.secondary">Email</Typography>
              <Typography>{patient.email}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
              <Typography>{patient.phone}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="text.secondary">Date of Birth</Typography>
              <Typography>{new Date(patient.dateOfBirth).toLocaleDateString()}</Typography>
            </div>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="patient tabs">
            <Tab label="Dental Scans" />
            <Tab label="AI Analysis" disabled={!selectedScanId && !showAnalysisComponent} />
            <Tab label="Treatment Plan" disabled={!selectedScanId} />
            <Tab label="Chat Assistant" />
          </Tabs>
        </Box>

        {/* Scans Tab */}
        <Box sx={{ py: 3 }} hidden={activeTab !== 0}>
          <Typography variant="h6" gutterBottom>
            Upload New Scan
          </Typography>
          <ScanUploader patientId={id!} onScanUploaded={handleScanUploaded} />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Available Scans
          </Typography>
          
          {scans.length === 0 ? (
            <Alert severity="info">No scans available for this patient yet.</Alert>
          ) : (
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }} gap={2}>
              {scans.map(scan => (
                <Card 
                  key={scan._id || scan.id} 
                  variant="outlined" 
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedScanId === (scan._id || scan.id) ? '2px solid #1976d2' : undefined
                  }}
                  onClick={() => handleScanSelect(scan._id || scan.id)}
                >
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(scan.createdAt).toLocaleString()}
                    </Typography>
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <img 
                        src={`http://localhost:3001/api/scans/${scan._id || scan.id}/image`}
                        alt="Dental scan" 
                        style={{ maxHeight: 150, maxWidth: '100%', objectFit: 'contain' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-scan.jpg';
                        }}
                      />
                    </Box>
                    <Button 
                      variant="contained" 
                      size="small" 
                      fullWidth 
                      sx={{ mt: 2 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScanSelect(scan._id || scan.id);
                      }}
                    >
                      Analyze
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>

        {/* Analysis Tab */}
        <Box sx={{ py: 3 }} hidden={activeTab !== 1}>
          {selectedScanId ? (
            <AIAnalysis scanId={selectedScanId} patientId={id} />
          ) : (
            <Alert severity="info">
              Please select a scan first to view AI analysis.
            </Alert>
          )}
        </Box>

        {/* Treatment Plan Tab */}
        <Box sx={{ py: 3 }} hidden={activeTab !== 2}>
          {selectedScanId ? (
            <TreatmentPlan patientId={id!} />
          ) : (
            <Alert severity="info">
              Please select a scan first to view treatment plan.
            </Alert>
          )}
        </Box>

        {/* Chat Assistant Tab */}
        <Box sx={{ py: 3 }} hidden={activeTab !== 3}>
          <ChatAssistant patientId={id!} />
        </Box>
      </Box>
    </div>
  );
};

export default PatientDetails; 