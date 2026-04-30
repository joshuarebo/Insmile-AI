import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fillDemo = () => {
    setEmail('demo@insmile.co.ke');
    setPassword('insmile');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!email || !password) {
      setError('Enter your email and password to continue.');
      setLoading(false);
      return;
    }
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem(
      'user',
      JSON.stringify({ email, name: email.split('@')[0] })
    );
    navigate('/ai');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(1000px 600px at 20% 10%, #dbeafe 0%, transparent 60%), radial-gradient(800px 500px at 90% 80%, #e0f2fe 0%, transparent 60%)',
        px: 2,
      }}
    >
      <Card variant="outlined" sx={{ maxWidth: 440, width: '100%', borderRadius: 4, boxShadow: '0 20px 60px -30px rgba(37,99,235,0.35)' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2,
                background: 'linear-gradient(135deg,#2563eb,#0ea5e9)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              IA
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Insmile AI
              </Typography>
              <Typography variant="caption" color="text.secondary">
                AI-assisted dental workflows for Kenyan clinics
              </Typography>
            </Box>
          </Stack>

          <Typography variant="h5" fontWeight={700} sx={{ mt: 2 }}>
            Sign in
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Use any email — this is the demo environment.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                autoFocus
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
              />
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
              <Divider>or</Divider>
              <Button onClick={fillDemo} variant="outlined">
                Use demo credentials
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
