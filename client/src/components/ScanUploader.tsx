import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
  Alert,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { uploadScan } from '../services/ai';

interface Props {
  patientId: string;
  onScanUploaded: (scanId: string) => void;
}

export const ScanUploader: React.FC<Props> = ({ patientId, onScanUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    setError(null);
    const selected = accepted[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (e) => setPreview((e.target?.result as string) || null);
    reader.readAsDataURL(selected);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    multiple: false,
    maxSize: 15 * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const resp = await uploadScan(file, patientId, 'xray');
      if (!resp.scanId) throw new Error('Upload failed');
      onScanUploaded(resp.scanId);
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Make sure the server is running.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'divider',
              bgcolor: isDragActive ? 'primary.50' : 'background.default',
              borderRadius: 3,
              minHeight: 260,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6">
              {file ? file.name : 'Drop a dental scan here'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              JPG, PNG, or WEBP · up to 15 MB
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              X-ray, panoramic, or intraoral photo
            </Typography>
          </Box>

          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              minHeight: 260,
              bgcolor: '#0b1220',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {preview ? (
              <img
                src={preview}
                alt="preview"
                style={{ maxWidth: '100%', maxHeight: 260, display: 'block' }}
              />
            ) : (
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Preview appears here
              </Typography>
            )}
          </Box>
        </Box>

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button
            variant="contained"
            disabled={!file || uploading}
            onClick={handleUpload}
            startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {uploading ? 'Uploading & analyzing…' : 'Upload & analyze'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ScanUploader;
