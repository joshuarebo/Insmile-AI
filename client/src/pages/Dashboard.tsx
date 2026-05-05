import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import MedicalInformationOutlinedIcon from '@mui/icons-material/MedicalInformationOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { patients, scans } from '../services/api';

const SCAN_TYPE_LABEL: Record<string, string> = {
  xray: 'X-Ray',
  panoramic: 'Panoramic',
  intraoral: 'Intraoral',
  cbct: 'CBCT',
  unknown: 'Scan',
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) + ' · ' +
    d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

const quickActions = [
  {
    to: '/ai',
    title: 'AI workspace',
    desc: 'Upload a scan and get findings, bboxes, plan, chat.',
    icon: <AutoAwesomeIcon />,
    accent: 'linear-gradient(135deg,#2563eb,#0ea5e9)',
  },
  {
    to: '/patients/add',
    title: 'Add patient',
    desc: 'Register a new patient record.',
    icon: <PeopleAltOutlinedIcon />,
    accent: 'linear-gradient(135deg,#16a34a,#22d3ee)',
  },
  {
    to: '/scans',
    title: 'Browse scans',
    desc: 'Review previously uploaded imaging.',
    icon: <MedicalInformationOutlinedIcon />,
    accent: 'linear-gradient(135deg,#ea580c,#f59e0b)',
  },
];

const Dashboard = () => {
  const { data: patientData = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: patients.getAll,
    retry: 0,
  });
  const { data: scanData = [] } = useQuery({
    queryKey: ['scans'],
    queryFn: scans.getAll,
    retry: 0,
  });

  // Build patient name lookup for scan labels
  const patientMap = useMemo(() => {
    const map: Record<string, string> = {};
    patientData.forEach((p: any) => {
      map[p.id] = p.full_name || 'Unknown';
    });
    return map;
  }, [patientData]);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="overline" color="primary.main">
          Karibu
        </Typography>
        <Typography variant="h4" fontWeight={800}>
          Kenya-focused dental AI at your clinic
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
          Upload X-rays, get AI-highlighted findings with bounding boxes, generate SHA-aware
          treatment plans priced in KES, and chat with an assistant trained on Kenyan clinical
          context.
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
          <Button component={Link} to="/ai" variant="contained" size="large">
            Launch AI workspace
          </Button>
          <Button component={Link} to="/patients" variant="outlined" size="large">
            View patients
          </Button>
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
        {quickActions.map((q) => (
          <Card key={q.to} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardActionArea component={Link} to={q.to}>
              <CardContent>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    background: q.accent,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1.5,
                  }}
                >
                  {q.icon}
                </Box>
                <Typography variant="h6" fontWeight={700}>
                  {q.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {q.desc}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {/* Patients card */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Patients
              </Typography>
              <Chip size="small" label={`${patientData.length} total`} />
            </Stack>
            {patientData.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No patients yet.{' '}
                <Link to="/patients/add" style={{ color: 'inherit' }}>
                  Add one
                </Link>
                .
              </Typography>
            ) : (
              <Stack spacing={1}>
                {patientData.slice(0, 5).map((p: any) => (
                  <Box
                    key={p.id}
                    component={Link}
                    to={`/patients/${p.id}`}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textDecoration: 'none',
                      color: 'inherit',
                      p: 1,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {p.full_name}
                      </Typography>
                      {p.phone && (
                        <Typography variant="caption" color="text.secondary">
                          {p.phone}
                        </Typography>
                      )}
                    </Box>
                    {p.date_of_birth && (
                      <Typography variant="caption" color="text.secondary">
                        DOB: {formatDate(p.date_of_birth)}
                      </Typography>
                    )}
                  </Box>
                ))}
                {patientData.length > 5 && (
                  <Typography variant="caption" color="primary" component={Link} to="/patients" sx={{ textDecoration: 'none', mt: 0.5 }}>
                    View all {patientData.length} patients →
                  </Typography>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Recent scans card */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Recent scans
              </Typography>
              <Chip size="small" label={`${scanData.length} total`} />
            </Stack>
            {scanData.length === 0 ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <ChatBubbleOutlineIcon fontSize="small" color="disabled" />
                <Typography variant="body2" color="text.secondary">
                  No scans yet. Upload one from the AI workspace.
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={1}>
                {scanData.slice(0, 5).map((s: any) => {
                  const patientName = patientMap[s.patient_id] || 'Unassigned';
                  const scanLabel = SCAN_TYPE_LABEL[s.scan_type] || 'Scan';
                  return (
                    <Box
                      key={s.id}
                      component={Link}
                      to={s.patient_id ? `/patients/${s.patient_id}` : '/scans'}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        textDecoration: 'none',
                        color: 'inherit',
                        p: 1,
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {scanLabel} — {patientName}
                        </Typography>
                        {s.file_name && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.file_name}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
                        {formatDateTime(s.created_at)}
                      </Typography>
                    </Box>
                  );
                })}
                {scanData.length > 5 && (
                  <Typography variant="caption" color="primary" component={Link} to="/scans" sx={{ textDecoration: 'none', mt: 0.5 }}>
                    View all {scanData.length} scans →
                  </Typography>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard;
