import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { scans } from '../services/scans';
import { patients as patientsApi } from '../services/api';
import AIAnalysis from '../components/AIAnalysis';
import { ScanThumbnail } from '../components/ScanThumbnail';

const Scans: React.FC = () => {
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: patientsApi.getAll,
    retry: 0,
  });

  const { data: scansList = [], isLoading: loadingScans } = useQuery({
    queryKey: ['scans', selectedPatientId],
    queryFn: () => (selectedPatientId ? scans.getAll(selectedPatientId) : Promise.resolve([])),
    enabled: !!selectedPatientId,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => scans.upload(selectedPatientId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scans', selectedPatientId] });
      setUploadError(null);
    },
    onError: (err: any) => setUploadError(err?.message || 'Upload failed'),
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      if (!selectedPatientId) {
        setUploadError('Select a patient first');
        return;
      }
      const f = files[0];
      if (!f) return;
      if (f.size > 15 * 1024 * 1024) {
        setUploadError('File must be under 15 MB');
        return;
      }
      uploadMutation.mutate(f);
    },
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: false,
  });

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
        Scans
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload dental scans and review AI analysis.
      </Typography>

      <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
            <TextField
              select
              label="Patient"
              fullWidth
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                setSelectedScanId(null);
              }}
              sx={{ maxWidth: { md: 320 } }}
            >
              <MenuItem value="">Select a patient</MenuItem>
              {patients.map((p: any) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.full_name || p.id}
                </MenuItem>
              ))}
            </TextField>

            <Box
              {...getRootProps()}
              sx={{
                flex: 1,
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'divider',
                bgcolor: isDragActive ? 'primary.50' : 'background.default',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                minHeight: 96,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <input {...getInputProps()} />
              <Typography variant="body2" color="text.secondary">
                {uploadMutation.isPending
                  ? 'Uploading…'
                  : isDragActive
                  ? 'Drop the scan here'
                  : 'Drag & drop a scan or click to browse'}
              </Typography>
            </Box>
          </Stack>
          {uploadError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {uploadError}
            </Alert>
          )}
        </CardContent>
      </Card>

      {selectedPatientId && (
        <>
          {loadingScans ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={16} />
              <Typography variant="body2">Loading scans…</Typography>
            </Stack>
          ) : scansList.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No scans for this patient yet.
            </Typography>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                gap: 2,
              }}
            >
              {scansList.map((scan: any) => {
                const isSelected = selectedScanId === scan.id;
                return (
                  <Card
                    key={scan.id}
                    variant="outlined"
                    onClick={() => setSelectedScanId(scan.id)}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 3,
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      transition: 'all 120ms',
                      '&:hover': { borderColor: 'primary.light' },
                    }}
                  >
                    <Box sx={{ height: 160, overflow: 'hidden', bgcolor: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ScanThumbnail scanId={scan.id} maxHeight={160} />
                    </Box>
                    <CardContent sx={{ pt: 1.5, pb: '12px !important' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          {scan.created_at ? new Date(scan.created_at).toLocaleDateString() + ' ' + new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </Typography>
                        {scan.scan_type && scan.scan_type !== 'unknown' && (
                          <Chip size="small" label={scan.scan_type} variant="outlined" />
                        )}
                      </Stack>
                      {scan.file_name && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {scan.file_name}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}

          {selectedScanId && (
            <Box sx={{ mt: 3 }}>
              <AIAnalysis scanId={selectedScanId} patientId={selectedPatientId} />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default Scans;
