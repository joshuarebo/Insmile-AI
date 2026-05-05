import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patients } from '../services/api';
import {
  Card, CardContent, Typography, TextField, Button, Box, Alert, Stack,
  MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';

interface PatientFormData {
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  sha_number: string;
  nhif_number: string;
  insurance_provider: string;
  insurance_member_number: string;
  preferred_language: string;
}

const initialFormData: PatientFormData = {
  full_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  gender: '',
  sha_number: '',
  nhif_number: '',
  insurance_provider: '',
  insurance_member_number: '',
  preferred_language: 'en',
};

const PatientForm: React.FC = () => {
  const [formData, setFormData] = useState<PatientFormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createPatientMutation = useMutation({
    mutationFn: () => patients.create({ ...formData }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigate(`/patients/${data.id}`);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create patient');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.full_name) {
      setError('Patient name is required');
      return;
    }

    createPatientMutation.mutate();
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Register New Patient
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
              Personal Information
            </Typography>

            <TextField
              label="Full Name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              fullWidth
              required
              size="small"
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                fullWidth
                size="small"
                placeholder="+254..."
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                fullWidth
                size="small"
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Date of Birth"
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
              />
              <FormControl fullWidth size="small">
                <InputLabel>Gender</InputLabel>
                <Select
                  value={formData.gender}
                  label="Gender"
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
              Insurance Details (all optional — fill whichever applies)
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="SHA Number"
                name="sha_number"
                value={formData.sha_number}
                onChange={handleChange}
                fullWidth
                size="small"
                helperText="Social Health Authority number"
              />
              <TextField
                label="NHIF Number (legacy)"
                name="nhif_number"
                value={formData.nhif_number}
                onChange={handleChange}
                fullWidth
                size="small"
                helperText="Old NHIF card — still accepted by some providers"
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Private Insurance Provider"
                name="insurance_provider"
                value={formData.insurance_provider}
                onChange={handleChange}
                fullWidth
                size="small"
                placeholder="e.g., Jubilee, AAR, Britam, Madison, CIC, GA"
                helperText="For patients with private cover"
              />
              <TextField
                label="Member / Policy Number"
                name="insurance_member_number"
                value={formData.insurance_member_number}
                onChange={handleChange}
                fullWidth
                size="small"
              />
            </Stack>

            <FormControl fullWidth size="small">
              <InputLabel>Preferred Language</InputLabel>
              <Select
                value={formData.preferred_language}
                label="Preferred Language"
                onChange={(e) => setFormData(prev => ({ ...prev, preferred_language: e.target.value }))}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="sw">Kiswahili</MenuItem>
              </Select>
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={createPatientMutation.isPending}
              sx={{ mt: 1 }}
            >
              {createPatientMutation.isPending ? 'Creating…' : 'Register Patient'}
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PatientForm;
