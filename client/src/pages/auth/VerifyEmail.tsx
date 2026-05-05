import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
} from '@mui/material';
import { MarkEmailRead } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const VerifyEmail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp, resendOtp } = useAuth();
  const email = (location.state as { email?: string })?.email || '';
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: verifyError } = await verifyOtp(email, token);
    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    const { error: resendError } = await resendOtp(email);
    if (resendError) {
      setError(resendError.message);
    } else {
      setSuccess('Verification code resent. Check your email.');
    }
  };

  if (!email) {
    navigate('/auth/signup');
    return null;
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', px: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420, border: 'none', boxShadow: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'primary.50', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <MarkEmailRead sx={{ color: 'primary.main', fontSize: 28 }} />
            </Box>
            <Typography variant="h5" fontWeight={700}>Check your email</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              We sent a verification code to <strong>{email}</strong>
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <form onSubmit={handleVerify}>
            <Stack spacing={2.5}>
              <TextField
                label="Verification Code"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                fullWidth
                size="small"
                placeholder="Enter 6-digit code"
                inputProps={{ maxLength: 6, style: { letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.2rem' } }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading || token.length < 6}
              >
                {loading ? 'Verifying…' : 'Verify Email'}
              </Button>
            </Stack>
          </form>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Didn&apos;t receive the code?{' '}
              <Button variant="text" size="small" onClick={handleResend} sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}>
                Resend
              </Button>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VerifyEmail;
