import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import AddPatient from './pages/AddPatient';
import Scans from './pages/Scans';
import ScanDetails from './pages/ScanDetails';
import AIDashboard from './pages/AIDashboard';

import Layout from './components/Layout';
import { ThemeProviderWrapper } from './contexts/ThemeContext';
import { NotificationProvider } from './components/common/NotificationSystem';
import { getHealth, HealthStatus } from './services/ai';
import { Box, Typography, Button, CircularProgress } from '@mui/material';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 1 },
  },
});

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isLoggedIn') === 'true';
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const h = await getHealth();
      if (mounted) {
        setHealth(h);
        setLoading(false);
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  if (loading) {
    return (
      <ThemeProviderWrapper>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Connecting to Insmile AI…
          </Typography>
        </Box>
      </ThemeProviderWrapper>
    );
  }

  const serverUp = Boolean(health);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProviderWrapper>
        <NotificationProvider>
          <Router>
            {serverUp ? (
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <Layout health={health} />
                    </PrivateRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="patients" element={<Patients />} />
                  <Route path="patients/add" element={<AddPatient />} />
                  <Route path="patients/:id" element={<PatientDetails />} />
                  <Route path="scans" element={<Scans />} />
                  <Route path="scans/:id" element={<ScanDetails />} />
                  <Route path="ai" element={<AIDashboard />} />
                  <Route
                    path="*"
                    element={
                      <Box p={4} textAlign="center">
                        <Typography variant="h5" gutterBottom>
                          Page not found
                        </Typography>
                        <Button variant="contained" href="/">
                          Go home
                        </Button>
                      </Box>
                    }
                  />
                </Route>
              </Routes>
            ) : (
              <Box
                sx={{
                  minHeight: '100vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 3,
                }}
              >
                <Box
                  sx={{
                    maxWidth: 520,
                    p: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h5" gutterBottom>
                    Server not reachable
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Make sure the Insmile AI backend is running at{' '}
                    <code>http://localhost:3001</code>.
                    <br />
                    From the repo root: <code>npm run start:server</code>.
                  </Typography>
                  <Button variant="contained" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </Box>
              </Box>
            )}
          </Router>
        </NotificationProvider>
      </ThemeProviderWrapper>
    </QueryClientProvider>
  );
}

export default App;
