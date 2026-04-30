import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { scans } from '../services/api';
import AIAnalysis from '../components/AIAnalysis';

const ScanDetails = () => {
  const { id } = useParams<{ id: string }>();

  const { data: scan, isLoading } = useQuery({
    queryKey: ['scan', id],
    queryFn: () => scans.getById(id!),
    enabled: !!id,
  });

  if (isLoading) return <Typography color="text.secondary">Loading scan…</Typography>;
  if (!scan) return <Alert severity="warning">Scan not found.</Alert>;

  return (
    <Box>
      <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {scan.fileName || 'Dental scan'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Patient: {scan.patientId || 'unassigned'} · Uploaded{' '}
                {new Date(scan.createdAt).toLocaleString()}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
      <AIAnalysis scanId={scan.id} patientId={scan.patientId || 'unknown'} />
    </Box>
  );
};

export default ScanDetails;
