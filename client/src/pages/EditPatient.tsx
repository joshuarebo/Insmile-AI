import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patients } from '../services/api';
import {
  Card, CardContent, Typography, TextField, Button, Box, Alert, Stack,
  MenuItem, Select, FormControl, InputLabel, CircularProgress, Divider,
} from '@mui/material';

interface PatientFormData {
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  national_id: string;
  sha_number: string;
  nhif_number: string;
  insurance_provider: string;
  insurance_member_number: string;
  preferred_language: string;
  allergies: string;
  medical_history: string;
  medications: string;
  notes: string;
}

const EditPatient: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<PatientFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    patients.getById(id).then((data: any) => {
      setFormData({
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        date_of_birth: data.date_of_birth || '',
        gender: data.gender || '',
        national_id: data.national_id || '',
        sha_number: data.sha_number || '',
        nhif_number: data.nhif_number || '',
        insurance_provider: data.insurance_provider || '',
        insurance_member_number: data.insurance_member_number || '',
        preferred_language: data.preferred_language || 'en',
        allergies: (data.allergies || []).join(', '),
        medical_history: data.medical_history || '',
        medications: (data.medications || []).join(', '),
        notes: data.notes || '',
      });
      setLoading(false);
    }).catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
  }, [id]);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!formData || !id) throw new Error('Missing data');
      const payload: Record<string, unknown> = {
        ...formData,
        allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        medications: formData.medications ? formData.medications.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      return patients.update(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigate(`/patients/${id}`);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update patient');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : prev);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData?.full_name) {
      setError('Patient name is required');
      return;
    }
    updateMutation.mutate();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!formData) {
    return <Alert severity="error">Patient not found</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Edit Patient</Typography>
        <Button component={Link} to={`/patients/${id}`} variant="outlined">Cancel</Button>
      </Stack>

      <Card>
        <CardContent sx={{ p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <Typography variant="subtitle2" color="text.secondary">Personal Information</Typography>

              <TextField label="Full Name" name="full_name" value={formData.full_name} onChange={handleChange} fullWidth required size="small" />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Phone" name="phone" value={formData.phone} onChange={handleChange} fullWidth size="small" placeholder="+254..." />
                <TextField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} fullWidth size="small" />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Date of Birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth size="small" />
                <FormControl fullWidth size="small">
                  <InputLabel>Gender</InputLabel>
                  <Select value={formData.gender} label="Gender" onChange={(e) => setFormData(prev => prev ? { ...prev, gender: e.target.value } : prev)}>
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <TextField label="National ID / Passport" name="national_id" value={formData.national_id} onChange={handleChange} fullWidth size="small" />

              <Divider />
              <Typography variant="subtitle2" color="text.secondary">Insurance Details (all optional)</Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="SHA Number" name="sha_number" value={formData.sha_number} onChange={handleChange} fullWidth size="small" helperText="Social Health Authority" />
                <TextField label="NHIF Number (legacy)" name="nhif_number" value={formData.nhif_number} onChange={handleChange} fullWidth size="small" helperText="Old NHIF card number" />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Private Insurance Provider" name="insurance_provider" value={formData.insurance_provider} onChange={handleChange} fullWidth size="small" placeholder="e.g., Jubilee, AAR, Britam, Madison, CIC" />
                <TextField label="Member / Policy Number" name="insurance_member_number" value={formData.insurance_member_number} onChange={handleChange} fullWidth size="small" />
              </Stack>

              <Divider />
              <Typography variant="subtitle2" color="text.secondary">Medical Information</Typography>

              <TextField label="Allergies" name="allergies" value={formData.allergies} onChange={handleChange} fullWidth size="small" placeholder="Comma-separated: Penicillin, Latex" helperText="Separate with commas" />
              <TextField label="Current Medications" name="medications" value={formData.medications} onChange={handleChange} fullWidth size="small" placeholder="Comma-separated" helperText="Separate with commas" />
              <TextField label="Medical History" name="medical_history" value={formData.medical_history} onChange={handleChange} fullWidth size="small" multiline rows={3} />

              <Divider />

              <FormControl fullWidth size="small">
                <InputLabel>Preferred Language</InputLabel>
                <Select value={formData.preferred_language} label="Preferred Language" onChange={(e) => setFormData(prev => prev ? { ...prev, preferred_language: e.target.value } : prev)}>
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="sw">Kiswahili</MenuItem>
                </Select>
              </FormControl>

              <TextField label="Notes" name="notes" value={formData.notes} onChange={handleChange} fullWidth size="small" multiline rows={2} />

              <Button type="submit" variant="contained" size="large" fullWidth disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EditPatient;
