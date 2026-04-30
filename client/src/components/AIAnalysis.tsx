import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import { AnalysisResult, Finding, pollForAnalysis, getAnalysis } from '../services/ai';
import { ScanViewer } from './ScanViewer';

interface Props {
  scanId: string;
  patientId: string;
  onAnalysisReady?: (result: AnalysisResult) => void;
}

const SEV_COLOR: Record<string, string> = {
  severe: '#dc2626',
  moderate: '#ea580c',
  mild: '#16a34a',
};

const AIAnalysis: React.FC<Props> = ({ scanId, patientId, onAnalysisReady }) => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const cancelled = useRef(false);
  const notified = useRef(false);

  const runAnalysis = useCallback(
    async (opts: { forceFresh?: boolean } = {}) => {
      cancelled.current = false;
      setSelected(null);
      setError(null);
      setLoading(true);
      setProgress(0);
      setResult(null);
      notified.current = false;

      if (!scanId) {
        setLoading(false);
        return;
      }

      try {
        if (!opts.forceFresh) {
          const existing = await getAnalysis(scanId);
          const hasFindings = existing && Array.isArray(existing.findings) && existing.findings.length > 0;
          if (existing && hasFindings && !cancelled.current) {
            setResult(existing);
            setLoading(false);
            return;
          }
          // Cached result is empty/unusable — fall through to fresh poll.
        }
        const res = await pollForAnalysis(scanId, (p) => {
          if (!cancelled.current) setProgress(p);
        });
        if (!cancelled.current) {
          setResult(res);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled.current) {
          const upstream = err?.response?.data;
          const msg =
            upstream?.message ||
            upstream?.error ||
            err?.message ||
            'Analysis failed';
          setError(msg);
          setLoading(false);
        }
      }
    },
    [scanId]
  );

  useEffect(() => {
    runAnalysis();
    return () => {
      cancelled.current = true;
    };
  }, [runAnalysis, attempt]);

  const handleRetry = () => setAttempt((n) => n + 1);

  useEffect(() => {
    if (result && !notified.current && onAnalysisReady) {
      notified.current = true;
      onAnalysisReady(result);
    }
  }, [result, onAnalysisReady]);

  const findings = useMemo(() => result?.findings || [], [result]);
  const recommendations = useMemo(() => result?.recommendations || [], [result]);

  const severityCounts = useMemo(() => {
    const base = { severe: 0, moderate: 0, mild: 0 } as Record<string, number>;
    findings.forEach((f) => {
      base[f.severity] = (base[f.severity] || 0) + 1;
    });
    return base;
  }, [findings]);

  if (loading) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Analyzing scan with vision AI…</Typography>
          </Stack>
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={Math.min(progress || 15, 95)} />
            <Typography variant="caption" color="text.secondary">
              Trying free vision models in rotation. Usually 15–45 seconds.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const rateLimited = /rate[- ]?limit|temporarily|429/i.test(error);
    return (
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Alert
            severity={rateLimited ? 'warning' : 'error'}
            action={
              <Button color="inherit" size="small" onClick={handleRetry} startIcon={<ReplayIcon />}>
                Retry
              </Button>
            }
          >
            {rateLimited
              ? 'All free AI models are temporarily rate-limited upstream. Wait ~30 seconds and retry — the rotation will pick the next available one.'
              : error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const jsonParseFailed =
    findings.length === 0 &&
    /unable to parse|please retry/i.test(result.overall || '');

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2 }}>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Scan analysis
          </Typography>
          <ScanViewer
            scanId={scanId}
            findings={findings}
            selectedIndex={selected}
            onSelectFinding={setSelected}
          />
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Findings
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip size="small" label={`${severityCounts.severe || 0} severe`} sx={{ bgcolor: SEV_COLOR.severe, color: 'white' }} />
            <Chip size="small" label={`${severityCounts.moderate || 0} moderate`} sx={{ bgcolor: SEV_COLOR.moderate, color: 'white' }} />
            <Chip size="small" label={`${severityCounts.mild || 0} mild`} sx={{ bgcolor: SEV_COLOR.mild, color: 'white' }} />
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {result.overall || 'Analysis complete.'}
          </Typography>

          {jsonParseFailed && (
            <Alert
              severity="warning"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={handleRetry} startIcon={<ReplayIcon />}>
                  Retry
                </Button>
              }
            >
              The vision model returned an unreadable response. Click Retry — the server will try the next model in the rotation.
            </Alert>
          )}

          {!jsonParseFailed && findings.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No specific findings were detected. The scan looks unremarkable, or the image
              may need to be clearer for accurate analysis.
            </Alert>
          )}

          <List dense disablePadding>
            {findings.map((f: Finding, i: number) => (
              <ListItemButton
                key={i}
                selected={selected === i}
                onClick={() => setSelected(selected === i ? null : i)}
                sx={{
                  borderLeft: '4px solid',
                  borderColor: SEV_COLOR[f.severity] || 'divider',
                  mb: 0.75,
                  borderRadius: 1,
                  bgcolor: selected === i ? 'action.selected' : 'transparent',
                }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" fontWeight={600}>
                        {f.tooth ? `#${f.tooth} — ` : ''}
                        {f.label}
                      </Typography>
                      <Chip
                        size="small"
                        label={f.severity}
                        sx={{ bgcolor: SEV_COLOR[f.severity], color: 'white', height: 18, fontSize: 10 }}
                      />
                    </Stack>
                  }
                  secondary={`Confidence ${Math.round((f.confidence || 0) * 100)}%`}
                />
              </ListItemButton>
            ))}
          </List>

          {recommendations.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                AI recommendations
              </Typography>
              <Box component="ul" sx={{ pl: 3, m: 0 }}>
                {recommendations.map((r, i) => (
                  <li key={i}>
                    <Typography variant="body2">{r}</Typography>
                  </li>
                ))}
              </Box>
            </Box>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            {result.provider || 'openrouter'} · {result.model || 'vision model'}
            {result.image_quality ? ` · image quality: ${result.image_quality}` : ''}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AIAnalysis;
