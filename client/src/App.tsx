import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import VerifyEmail from './pages/auth/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import AddPatient from './pages/AddPatient';
import Scans from './pages/Scans';
import ScanDetails from './pages/ScanDetails';
import AIDashboard from './pages/AIDashboard';

import Layout from './components/Layout';
import { ThemeProviderWrapper } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './components/common/NotificationSystem';
import { Box, CircularProgress, Typography } from '@mui/material';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 1 },
  },
});

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return user ? <>{children}</> : <Navigate to="/auth/signin" />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return user ? <Navigate to="/" /> : <>{children}</>;
};

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading Insmile AI…
        </Typography>
      </Box>
    );
  }

  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/auth/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
      <Route path="/auth/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
      <Route path="/auth/verify" element={<VerifyEmail />} />

      {/* Protected routes */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="patients/add" element={<AddPatient />} />
        <Route path="patients/:id" element={<PatientDetails />} />
        <Route path="scans" element={<Scans />} />
        <Route path="scans/:id" element={<ScanDetails />} />
        <Route path="ai" element={<AIDashboard />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProviderWrapper>
        <NotificationProvider>
          <AuthProvider>
            <Router>
              <AppRoutes />
            </Router>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProviderWrapper>
    </QueryClientProvider>
  );
}

export default App;
