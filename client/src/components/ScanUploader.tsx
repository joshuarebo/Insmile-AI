import React, { useState } from 'react';
import axios from 'axios';
import { 
  Button, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  CircularProgress, 
  Alert,
  Paper,
  Grid
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { aiService } from '../services/ai';

interface ScanUploaderProps {
  patientId: string;
  onScanUploaded?: (scanId: string) => void;
}

export const ScanUploader: React.FC<ScanUploaderProps> = ({ patientId, onScanUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState<boolean>(true);

  // Check if API is available when component mounts
  React.useEffect(() => {
    const checkApiAvailability = async () => {
      try {
        await axios.get('http://localhost:3001/api/health', { timeout: 2000 });
        setApiAvailable(true);
      } catch (err) {
        console.log('API not available, using demo mode');
        setApiAvailable(false);
      }
    };
    
    checkApiAvailability();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if we're in demo mode (patientId starts with "demo") or API is unavailable
      if (patientId.startsWith('demo') || !apiAvailable) {
        // Simulate an upload in demo mode
        console.log('Using demo mode for scan upload');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate upload time
        
        const demoScanId = `demo-scan-${Date.now()}`;
        setSuccess('Demo scan uploaded successfully!');
        
        if (onScanUploaded) {
          onScanUploaded(demoScanId);
        }
      } else {
        // Use the real API for upload
        console.log('Uploading scan to real API');
        const formData = new FormData();
        formData.append('scan', file);
        formData.append('patientId', patientId);
        formData.append('scanType', 'dental');
        
        const response = await axios.post('http://localhost:3001/api/ai/upload-scan', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        if (response.data && response.data.success) {
          setSuccess('Scan uploaded successfully!');
          
          if (onScanUploaded && response.data.scanId) {
            onScanUploaded(response.data.scanId);
          }
        } else {
          throw new Error(response.data.message || 'Upload failed');
        }
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload scan');
      
      // Fall back to demo mode on API failure
      if (!patientId.startsWith('demo') && apiAvailable) {
        setError('API error. Falling back to demo mode...');
        setTimeout(() => {
          const demoScanId = `demo-scan-${Date.now()}`;
          setSuccess('Demo scan loaded as fallback');
          
          if (onScanUploaded) {
            onScanUploaded(demoScanId);
          }
        }, 1500);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDemoScan = () => {
    setUploading(true);
    setError(null);
    setSuccess(null);
    
    // Simulate loading
    setTimeout(() => {
      setUploading(false);
      setSuccess('Demo scan loaded!');
      
      if (onScanUploaded) {
        const demoScanId = `demo-scan-${Date.now()}`;
        onScanUploaded(demoScanId);
      }
    }, 1000);
  };

  return (
    <Card>
      <CardContent>
        {!apiAvailable && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            API server is not available. Operating in demo mode.
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box 
              sx={{ 
                border: '2px dashed #ccc',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
              component="label"
            >
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={uploading}
              />
              <CloudUploadIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {file ? file.name : 'Select Dental Scan'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click to browse or drag and drop
              </Typography>
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth
                onClick={handleUpload}
                disabled={!file || uploading}
                startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : undefined}
              >
                {uploading ? 'Uploading...' : 'Upload Scan'}
              </Button>
              
              <Button 
                variant="outlined"
                color="secondary"
                fullWidth
                onClick={handleDemoScan}
                disabled={uploading}
              >
                Use Demo Scan
              </Button>
            </Box>
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Paper elevation={2} sx={{ p: 2, height: '100%', minHeight: 200 }}>
              <Typography variant="h6" gutterBottom>
                Preview
              </Typography>
              {preview ? (
                <Box 
                  component="img"
                  src={preview}
                  alt="Scan preview"
                  sx={{ 
                    width: '100%',
                    height: 'auto',
                    maxHeight: 300,
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <Box 
                  sx={{ 
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No image selected
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}; 