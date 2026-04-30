import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import { generateTreatmentPlan, TreatmentPlan as TP } from '../services/ai';

interface Props {
  patientId: string;
  scanId?: string;
}

type PricingMode = 'public' | 'private_mid' | 'private_premium';

const PRICING_LABEL: Record<PricingMode, string> = {
  public: 'Public hospital (SHA)',
  private_mid: 'Mid-tier private clinic',
  private_premium: 'Premium private (Nairobi/Mombasa)',
};

const urgencyColor: Record<string, string> = {
  urgent: '#dc2626',
  soon: '#ea580c',
  routine: '#16a34a',
};

export const TreatmentPlan: React.FC<Props> = ({ patientId, scanId }) => {
  const [plan, setPlan] = useState<TP | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingMode>('private_mid');

  const fetchPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateTreatmentPlan(patientId, scanId, pricing);
      setPlan(result);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Unable to generate treatment plan. Run a scan analysis first.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, scanId, pricing]);

  if (loading) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Composing treatment plan for Kenya…</Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button onClick={fetchPlan} startIcon={<ReplayIcon />} variant="outlined">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!plan) return null;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <MedicalServicesOutlinedIcon color="primary" />
              <Typography variant="h6">Treatment plan</Typography>
              {plan.urgency && (
                <Chip
                  size="small"
                  label={plan.urgency.toUpperCase()}
                  sx={{ bgcolor: urgencyColor[plan.urgency] || '#64748b', color: 'white' }}
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 640 }}>
              {plan.overview}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              select
              label="Pricing mode"
              value={pricing}
              onChange={(e) => setPricing(e.target.value as PricingMode)}
              sx={{ minWidth: 240 }}
            >
              {(Object.keys(PRICING_LABEL) as PricingMode[]).map((k) => (
                <MenuItem key={k} value={k}>
                  {PRICING_LABEL[k]}
                </MenuItem>
              ))}
            </TextField>
            <Button onClick={fetchPlan} startIcon={<ReplayIcon />} variant="text">
              Regenerate
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Steps
        </Typography>
        <Stack spacing={1.5}>
          {plan.steps?.map((step, i) => {
            const price = step.cost_kes?.[pricing] || '—';
            return (
              <Box
                key={i}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderLeft: '4px solid',
                  borderLeftColor: step.sha_covered ? '#16a34a' : 'primary.main',
                  borderRadius: 2,
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                  <Box>
                    <Typography variant="subtitle2">
                      {i + 1}. {step.step}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {step.description}
                    </Typography>
                  </Box>
                  <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={0.5}>
                    <Chip size="small" label={step.timeframe} />
                    <Typography variant="body2" fontWeight={600}>
                      KES {price}
                    </Typography>
                    {step.sha_covered && (
                      <Chip size="small" color="success" label="SHA covered" />
                    )}
                    {step.visits ? (
                      <Typography variant="caption" color="text.secondary">
                        {step.visits} visit{step.visits > 1 ? 's' : ''}
                      </Typography>
                    ) : null}
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Stack>

        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'primary.50',
            border: '1px solid',
            borderColor: 'primary.100',
            borderRadius: 2,
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="space-between">
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total ({PRICING_LABEL[pricing]})
              </Typography>
              <Typography variant="h6" color="primary.main">
                KES {plan.total_cost_kes?.[pricing] || '—'}
              </Typography>
            </Box>
            {plan.estimated_duration && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {plan.estimated_duration}
                </Typography>
              </Box>
            )}
            {plan.referral && (
              <Box sx={{ maxWidth: 340 }}>
                <Typography variant="caption" color="text.secondary">
                  Referral
                </Typography>
                <Typography variant="body2">{plan.referral}</Typography>
              </Box>
            )}
          </Stack>
        </Box>

        {plan.home_care && plan.home_care.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Home care
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0 }}>
              {plan.home_care.map((h, i) => (
                <li key={i}>
                  <Typography variant="body2">{h}</Typography>
                </li>
              ))}
            </Box>
          </Box>
        )}

        {plan.precautions && plan.precautions.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Precautions
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0 }}>
              {plan.precautions.map((p, i) => (
                <li key={i}>
                  <Typography variant="body2">{p}</Typography>
                </li>
              ))}
            </Box>
          </Box>
        )}

        {plan.alternatives && plan.alternatives.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Alternatives
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0 }}>
              {plan.alternatives.map((a, i) => (
                <li key={i}>
                  <Typography variant="body2">{a}</Typography>
                </li>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TreatmentPlan;
