import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import axios from 'axios';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import AddPatient from './pages/AddPatient';
import Scans from './pages/Scans';
import ScanDetails from './pages/ScanDetails';
import AIDashboard from './pages/AIDashboard';

// Components
import Layout from './components/Layout';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';

const queryClient = new QueryClient();

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isLoggedIn') === 'true';
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);

  useEffect(() => {
    // Check if the API is available
    const checkApi = async () => {
      try {
        // Set a short timeout to prevent long waiting if server is down
        await axios.get('http://localhost:3001/api/health', { timeout: 2000 });
        setApiAvailable(true);
      } catch (error) {
        console.warn('API not available, enabling demo mode:', error);
        setApiAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkApi();
  }, []);

  // Force login in demo mode
  useEffect(() => {
    if (!apiAvailable) {
      localStorage.setItem('isLoggedIn', 'true');
    }
  }, [apiAvailable]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Show warning if API is not available
  if (!apiAvailable) {
    return (
      <QueryClientProvider client={queryClient}>
        <Router>
          <Box p={3}>
            <Alert 
              severity="warning" 
              sx={{ mb: 3 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => window.location.reload()}
                >
                  Retry Connection
                </Button>
              }
            >
              Server connection not available. Running in demo mode with mock data.
            </Alert>
            <Routes>
              <Route path="/login" element={<Navigate to="/ai" />} />
              <Route path="/" element={<Navigate to="/ai" />} />
              <Route path="/ai" element={<AIDashboard />} />
              <Route path="*" element={
                <Box p={4} textAlign="center">
                  <Typography variant="h4" gutterBottom>Page Not Found</Typography>
                  <Typography variant="body1" paragraph>
                    The page you're looking for doesn't exist or has been moved.
                  </Typography>
                  <Button variant="contained" component="a" href="/ai">
                    Go to AI Dashboard
                  </Button>
                </Box>
              } />
            </Routes>
          </Box>
        </Router>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
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
            <Route path="*" element={
              <Box p={4} textAlign="center">
                <Typography variant="h4" gutterBottom>Page Not Found</Typography>
                <Typography variant="body1" paragraph>
                  The page you're looking for doesn't exist or has been moved.
                </Typography>
                <Button variant="contained" component="a" href="/">
                  Go to Dashboard
                </Button>
              </Box>
            } />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
