import { useQuery } from '@tanstack/react-query';
import { patients, scans } from '../services/api';
import { Card, CardContent, Typography, Button, Grid, Alert } from '@mui/material';
import { useState } from 'react';

interface Scan {
  id: string;
  patientId: string;
  createdAt: string;
}

interface Patient {
  id: string;
  name: string;
  email: string;
}

// Mock data for demonstration when API fails
const MOCK_PATIENTS = [
  { id: 'mock1', name: 'John Doe', email: 'john@example.com' },
  { id: 'mock2', name: 'Jane Smith', email: 'jane@example.com' },
  { id: 'mock3', name: 'Sam Wilson', email: 'sam@example.com' },
];

const MOCK_SCANS = [
  { id: 'scan1', patientId: 'mock1', createdAt: new Date().toISOString() },
  { id: 'scan2', patientId: 'mock2', createdAt: new Date().toISOString() },
  { id: 'scan3', patientId: 'mock1', createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString() },
];

const Dashboard = () => {
  const [apiStatus, setApiStatus] = useState<{ message: string; bedrockAvailable: boolean } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: patientData = [], isError: isPatientError } = useQuery({
    queryKey: ['patients'],
    queryFn: patients.getAll,
    retry: 1,
  });

  const { data: scanData = [], isError: isScanError } = useQuery({
    queryKey: ['scans'],
    queryFn: scans.getAll,
    retry: 1,
  });

  // Use mock data if API fails
  const displayPatients = isPatientError ? MOCK_PATIENTS : patientData as Patient[];
  const displayScans = isScanError ? MOCK_SCANS : scanData as Scan[];

  const checkAiService = async () => {
    setApiError(null);
    try {
      const response = await fetch('http://localhost:3001/api/ai/test');
      const data = await response.json();
      setApiStatus(data);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const stats = [
    {
      name: 'Total Patients',
      value: displayPatients.length,
    },
    {
      name: 'Total Scans',
      value: displayScans.length,
    },
    {
      name: 'Recent Scans',
      value: displayScans.filter((scan) => {
        const scanDate = new Date(scan.createdAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return scanDate >= thirtyDaysAgo;
      }).length,
    },
  ];

  return (
    <div>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard {(isPatientError || isScanError) && "(Demo Mode)"}
      </Typography>
      
      {/* Add AI Service Status Check */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" component="div" gutterBottom>
            AI Service Status
          </Typography>
          
          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Error connecting to AI service: {apiError}
            </Alert>
          )}
          
          {apiStatus && (
            <Alert 
              severity={apiStatus.bedrockAvailable ? "success" : "warning"} 
              sx={{ mb: 2 }}
            >
              {apiStatus.message} (Bedrock Available: {apiStatus.bedrockAvailable ? 'Yes' : 'No'})
            </Alert>
          )}
          
          <Button 
            variant="contained" 
            onClick={checkAiService}
          >
            Check AI Service
          </Button>
        </CardContent>
      </Card>
      
      <Grid container spacing={3}>
        {/* Stats */}
        {stats.map((stat, index) => (
          <Grid key={index} sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {stat.name}
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {stat.value}
                </dd>
              </div>
            </div>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg mt-6">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h2>
          <div className="flow-root">
            {displayScans.length > 0 ? (
              <ul className="-my-5 divide-y divide-gray-200">
                {displayScans
                  .slice(0, 5)
                  .map((scan) => (
                    <li key={scan.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            Scan uploaded for patient #{scan.patientId}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(scan.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 