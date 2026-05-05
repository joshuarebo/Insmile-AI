import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Tabs, Tab, Box, Typography, Button, Card, CardContent, CircularProgress, Alert, Stack } from '@mui/material';
import { ScanUploader } from '../components/ScanUploader';
import AIAnalysis from '../components/AIAnalysis';
import ChatAssistant from '../components/ChatAssistant';
import { TreatmentPlan } from '../components/TreatmentPlan';
import { API_BASE_URL } from '../services/ai';
import { ScanThumbnail } from '../components/ScanThumbnail';

interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  sha_number: string;
  nhif_number: string;
  insurance_provider: string;
  insurance_member_number: string;
  preferred_language: string;
  national_id: string;
  allergies: string[];
  medical_history: string;
  medications: string[];
  notes: string;
}

interface Scan {
  id: string;
  patient_id: string;
  created_at: string;
  file_name?: string;
  scan_type?: string;
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
        const response = await axios.get(`${API_BASE_URL}/patients/${id}`);
        setPatient(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch patient details');
      }
    };

    const fetchScans = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/scans/patient/${id}`);
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
    axios.get(`${API_BASE_URL}/scans/patient/${id}`)
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
        <Typography variant="h4">{patient.full_name}</Typography>
        <Stack direction="row" spacing={1}>
          <Button component={Link} to={`/patients/${id}/edit`} variant="contained" size="small">
            Edit Patient
          </Button>
          <Button component={Link} to="/patients" variant="outlined" size="small">
            Back to Patients
          </Button>
        </Stack>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Patient Information</Typography>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr 1fr' }} gap={2}>
            <div>
              <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
              <Typography>{patient.phone || '—'}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="text.secondary">Email</Typography>
              <Typography>{patient.email || '—'}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="text.secondary">Date of Birth</Typography>
              <Typography>{patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : '—'}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="text.secondary">Gender</Typography>
              <Typography sx={{ textTransform: 'capitalize' }}>{patient.gender || '—'}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="text.secondary">Language</Typography>
              <Typography>{patient.preferred_language === 'sw' ? 'Kiswahili' : 'English'}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="text.secondary">National ID</Typography>
              <Typography>{patient.national_id || '—'}</Typography>
            </div>
          </Box>

          {(patient.sha_number || patient.nhif_number || patient.insurance_provider) && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Insurance</Typography>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
                {patient.sha_number && (
                  <div>
                    <Typography variant="subtitle2" color="text.secondary">SHA Number</Typography>
                    <Typography>{patient.sha_number}</Typography>
                  </div>
                )}
                {patient.nhif_number && (
                  <div>
                    <Typography variant="subtitle2" color="text.secondary">NHIF Number</Typography>
                    <Typography>{patient.nhif_number}</Typography>
                  </div>
                )}
                {patient.insurance_provider && (
                  <div>
                    <Typography variant="subtitle2" color="text.secondary">Provider</Typography>
                    <Typography>{patient.insurance_provider}</Typography>
                  </div>
                )}
                {patient.insurance_member_number && (
                  <div>
                    <Typography variant="subtitle2" color="text.secondary">Member Number</Typography>
                    <Typography>{patient.insurance_member_number}</Typography>
                  </div>
                )}
              </Box>
            </Box>
          )}

          {(patient.allergies?.length > 0 || patient.medications?.length > 0) && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Medical</Typography>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
                {patient.allergies?.length > 0 && (
                  <div>
                    <Typography variant="subtitle2" color="text.secondary">Allergies</Typography>
                    <Typography>{patient.allergies.join(', ')}</Typography>
                  </div>
                )}
                {patient.medications?.length > 0 && (
                  <div>
                    <Typography variant="subtitle2" color="text.secondary">Medications</Typography>
                    <Typography>{patient.medications.join(', ')}</Typography>
                  </div>
                )}
              </Box>
            </Box>
          )}
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
                  key={scan.id}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    border: selectedScanId === scan.id ? '2px solid #1976d2' : undefined,
                    minHeight: 220,
                  }}
                  onClick={() => handleScanSelect(scan.id)}
                >
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {scan.created_at ? new Date(scan.created_at).toLocaleDateString() : 'Unknown date'}
                      </Typography>
                      {scan.scan_type && scan.scan_type !== 'unknown' && (
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                          {scan.scan_type}
                        </Typography>
                      )}
                    </Stack>
                    <Box sx={{ mt: 2, textAlign: 'center', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ScanThumbnail scanId={scan.id} maxHeight={120} />
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      fullWidth
                      sx={{ mt: 2 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScanSelect(scan.id);
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
            <AIAnalysis scanId={selectedScanId} patientId={id!} />
          ) : (
            <Alert severity="info">
              Please select a scan first to view AI analysis.
            </Alert>
          )}
        </Box>

        {/* Treatment Plan Tab */}
        <Box sx={{ py: 3 }} hidden={activeTab !== 2}>
          {selectedScanId ? (
            <TreatmentPlan patientId={id!} scanId={selectedScanId} />
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