import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Patient, Scan } from '@/types/schema';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import PatientManagement from '../components/PatientManagement';
import DentalScanUpload from '../components/DentalScanUpload';
import TreatmentPlan from '../components/TreatmentPlan';

const PatientDetails: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  const { data: patient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch patient details');
      }
      return response.json();
    },
    enabled: !!patientId,
  });

  const { data: scans, isLoading: isLoadingScans } = useQuery({
    queryKey: ['scans', patientId],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/scans`);
      if (!response.ok) {
        throw new Error('Failed to fetch patient scans');
      }
      return response.json();
    },
    enabled: !!patientId,
  });

  if (isLoadingPatient || isLoadingScans) {
    return <div>Loading...</div>;
  }

  if (!patient) {
    return <div>Patient not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{patient.name}</h1>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">DOB:</span> {formatDate(patient.dateOfBirth)}
              </div>
              <div>
                <span className="font-medium">Gender:</span> {patient.gender}
              </div>
              <div>
                <span className="font-medium">Phone:</span> {patient.phone}
              </div>
              <div>
                <span className="font-medium">Email:</span> {patient.email}
              </div>
            </div>
          </div>
          <Button variant="outline">Edit Patient</Button>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Scans</h2>
          {scans && scans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scans.map((scan) => (
                <div key={scan.id} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{scan.fileName}</h3>
                  <div className="text-sm text-gray-600">
                    <p>Status: {scan.status}</p>
                    <p>Date: {formatDate(scan.createdAt)}</p>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No scans found for this patient.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">Dental Scans</h2>
          <DentalScanUpload patientId={patientId!} />
          
          {scans && scans.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Previous Scans</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scans.map((scan) => (
                  <div
                    key={scan.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors
                      ${selectedScanId === scan.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                    onClick={() => setSelectedScanId(scan.id)}
                  >
                    <img
                      src={scan.imageUrl}
                      alt={scan.fileName}
                      className="w-full h-48 object-cover rounded mb-2"
                    />
                    <p className="text-sm font-medium">{scan.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(scan.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          {selectedScanId ? (
            <TreatmentPlan patientId={patientId!} scanId={selectedScanId} />
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
              <p>Select a scan to view or generate a treatment plan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDetails; 