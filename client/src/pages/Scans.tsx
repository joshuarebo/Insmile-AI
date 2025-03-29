import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { scans } from '../services/scans';
import AIAnalysis from '../components/AIAnalysis';

const Scans: React.FC = () => {
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading: isLoadingPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3001/api/patients');
      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }
      return response.json();
    },
  });

  const { data: scansList = [], isLoading: isLoadingScans } = useQuery({
    queryKey: ['scans', selectedPatientId],
    queryFn: () => selectedPatientId ? scans.getAll(selectedPatientId) : [],
    enabled: !!selectedPatientId,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => scans.upload(selectedPatientId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans', selectedPatientId] });
      setUploadError(null);
    },
    onError: (error: any) => {
      setUploadError(error.message || 'Failed to upload scan');
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          setUploadError('File size must be less than 10MB');
          return;
        }
        uploadMutation.mutate(file);
      }
    },
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.dicom']
    }
  });

  if (isLoadingPatients) {
    return <div className="text-center py-4">Loading patients...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dental Scans</h1>

      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Patient
        </label>
        <select
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select a patient</option>
          {Array.isArray(patients) && patients.map((patient: any) => (
            <option key={patient._id} value={patient._id}>
              {patient.name}
            </option>
          ))}
        </select>
      </div>

      {selectedPatientId && (
        <div className="mb-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p className="text-blue-500">Drop the scan here...</p>
            ) : (
              <p className="text-gray-600">Drag and drop a scan here, or click to select</p>
            )}
          </div>
          {uploadError && (
            <p className="mt-2 text-sm text-red-600">{uploadError}</p>
          )}
          {uploadMutation.isPending && (
            <p className="mt-2 text-sm text-blue-600">Uploading scan...</p>
          )}
        </div>
      )}

      {isLoadingScans ? (
        <div className="text-center py-4">Loading scans...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.isArray(scansList) && scansList.map((scan: any) => (
            <div
              key={scan._id}
              className="bg-white shadow rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedScanId(scan._id)}
            >
              <div className="aspect-w-16 aspect-h-9 mb-4">
                <img
                  src={`http://localhost:3001/api/scans/${scan._id}/image`}
                  alt="Dental scan"
                  className="object-cover rounded-lg"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {new Date(scan.createdAt).toLocaleDateString()}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  scan.status === 'analyzed' ? 'bg-green-100 text-green-800' :
                  scan.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {scan.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedScanId && (
        <div className="mt-8">
          <AIAnalysis scanId={selectedScanId} />
        </div>
      )}
    </div>
  );
};

export default Scans; 