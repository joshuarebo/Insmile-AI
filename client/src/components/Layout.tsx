import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import MedicalInformationOutlinedIcon from '@mui/icons-material/MedicalInformationOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useAuth } from '../contexts/AuthContext';
import { getHealth, HealthStatus } from '../services/ai';

const navItems = [
  { to: '/', label: 'Dashboard', icon: <HomeOutlinedIcon fontSize="small" /> },
  { to: '/patients', label: 'Patients', icon: <PeopleOutlineIcon fontSize="small" /> },
  { to: '/scans', label: 'Scans', icon: <MedicalInformationOutlinedIcon fontSize="small" /> },
  { to: '/ai', label: 'AI workspace', icon: <AutoAwesomeIcon fontSize="small" />, highlight: true },
];

const Layout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const check = async () => setHealth(await getHealth());
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/signin');
  };

  const aiReady = health?.aiAvailable;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: 64, gap: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mr: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg,#0284c7,#38bdf8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                }}
              >
                In
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} lineHeight={1}>
                  Insmile AI
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Kenya dental assistant
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={0.5} sx={{ flex: 1, flexWrap: 'wrap' }}>
              {navItems.map((item) => {
                const active = isActive(item.to);
                return (
                  <Button
                    key={item.to}
                    component={Link}
                    to={item.to}
                    startIcon={item.icon}
                    size="small"
                    variant={active ? 'contained' : 'text'}
                    color={item.highlight ? 'primary' : 'inherit'}
                    sx={{
                      textTransform: 'none',
                      fontWeight: active ? 600 : 500,
                      color: active ? undefined : 'text.primary',
                      borderRadius: 2,
                      px: 1.5,
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Tooltip title={aiReady ? 'OpenRouter connected' : 'AI not configured'}>
                <Chip
                  size="small"
                  label={aiReady ? 'AI ready' : 'AI offline'}
                  color={aiReady ? 'success' : 'default'}
                  variant={aiReady ? 'filled' : 'outlined'}
                />
              </Tooltip>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                {(profile?.full_name || 'U').slice(0, 1).toUpperCase()}
              </Avatar>
              <Tooltip title="Logout">
                <IconButton onClick={handleLogout}>
                  <LogoutOutlinedIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Outlet />
      </Container>

      <Box component="footer" sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} Insmile AI · Built for Kenyan dental clinics
        </Typography>
      </Box>
    </Box>
  );
};

export default Layout;
