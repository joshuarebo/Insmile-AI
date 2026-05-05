import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { patients } from '../services/api';
import { Alert } from '@mui/material';

interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
}

const Patients = () => {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: patientList = [], isError } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      try {
        return await patients.getAll();
      } catch (error: any) {
        setApiError(error.message || 'Failed to fetch patients');
        throw error;
      }
    },
    retry: 1,
  });

  const displayPatients = patientList as Patient[];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
        <button
          onClick={() => navigate('/patients/add')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Patient
        </button>
      </div>

      {apiError && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          {apiError}
        </Alert>
      )}

      {/* Patient List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {displayPatients.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {displayPatients.map((patient) => (
              <li key={patient.id}>
                <Link
                  to={`/patients/${patient.id}`}
                  className="block hover:bg-gray-50"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-600 truncate">
                          {patient.full_name}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {patient.email}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <p className="text-sm text-gray-500">{patient.phone}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No patients found. Click "Add Patient" to create one.
          </div>
        )}
      </div>
    </div>
  );
};

export default Patients; 