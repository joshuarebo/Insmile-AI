import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ScanUploader from '../components/ScanUploader';
import AIAnalysis from '../components/AIAnalysis';
import { TreatmentPlan } from '../components/TreatmentPlan';
import ChatAssistant from '../components/ChatAssistant';
import { getHealth, HealthStatus } from '../services/ai';

const DEMO_PATIENT = 'demo-patient';

const AIDashboard: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [scanId, setScanId] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    const check = async () => setHealth(await getHealth());
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  const handleUploaded = (id: string) => {
    setScanId(id);
    setTab(1);
  };

  const aiReady = health && health.aiAvailable;

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AutoAwesomeIcon color="primary" />
            <Typography variant="h5" fontWeight={700}>
              Dental AI workspace
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Upload a scan, review AI findings, generate a Kenya-priced treatment plan, and chat with the assistant.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip
            label={health ? (aiReady ? 'AI ready' : 'AI offline') : 'checking…'}
            color={health ? (aiReady ? 'success' : 'error') : 'default'}
            variant="outlined"
          />
          {health?.models?.vision && (
            <Chip size="small" variant="outlined" label={`vision: ${health.models.vision.split('/').pop()}`} />
          )}
          {health?.models?.text && (
            <Chip size="small" variant="outlined" label={`text: ${health.models.text.split('/').pop()}`} />
          )}
        </Stack>
      </Stack>

      {!aiReady && health && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The server is up but OpenRouter is not configured. Add{' '}
          <code>OPENROUTER_API_KEY</code> to <code>server/.env</code> and restart.
        </Alert>
      )}

      <Card variant="outlined" sx={{ borderRadius: 3, mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="1 · Upload" />
          <Tab label="2 · Analysis" disabled={!scanId} />
          <Tab label="3 · Treatment plan" disabled={!scanId} />
          <Tab label="4 · Chat" />
        </Tabs>
      </Card>

      {tab === 0 && (
        <ScanUploader patientId={DEMO_PATIENT} onScanUploaded={handleUploaded} />
      )}
      {tab === 1 && scanId && (
        <AIAnalysis scanId={scanId} patientId={DEMO_PATIENT} />
      )}
      {tab === 2 && scanId && (
        <TreatmentPlan patientId={DEMO_PATIENT} scanId={scanId} />
      )}
      {tab === 3 && <ChatAssistant patientId={DEMO_PATIENT} />}
    </Box>
  );
};

export default AIDashboard;
