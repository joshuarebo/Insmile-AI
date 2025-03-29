import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patients } from '../services/api';
import { Card, CardContent, Typography, TextField, Button, Box, Alert, Stack } from '@mui/material';

interface PatientFormData {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

const initialFormData: PatientFormData = {
  name: '',
  email: '',
  phone: '',
  dateOfBirth: '',
};

const PatientForm: React.FC = () => {
  const [formData, setFormData] = useState<PatientFormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createPatientMutation = useMutation({
    mutationFn: patients.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigate(`/patients/${data._id}`);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create patient');
      console.error('Error creating patient:', err);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }
    
    try {
      // Fallback option if API fails
      if (process.env.NODE_ENV === 'development') {
        try {
          await createPatientMutation.mutateAsync(formData);
        } catch (e) {
          // Create mock patient and navigate
          console.log('Using mock patient creation');
          const mockId = 'mock' + Date.now();
          navigate(`/patients/${mockId}`);
        }
      } else {
        await createPatientMutation.mutateAsync(formData);
      }
    } catch (err: any) {
      // Error is handled in mutation onError
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Add New Patient
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={3}>
            <TextField
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              required
            />
            
            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              required
            />
            
            <TextField
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              fullWidth
            />
            
            <TextField
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            
            <Button 
              type="submit" 
              variant="contained" 
              fullWidth
              disabled={createPatientMutation.isPending}
            >
              {createPatientMutation.isPending ? 'Creating...' : 'Create Patient'}
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PatientForm; 