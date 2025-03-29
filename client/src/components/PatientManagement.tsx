import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
}

const PatientManagement: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const queryClient = useQueryClient();

  const { data: patients, isLoading } = useQuery<Patient[]>('patients', async () => {
    const response = await fetch('/api/patients');
    if (!response.ok) throw new Error('Failed to fetch patients');
    return response.json();
  });

  const createMutation = useMutation(
    async (newPatient: Omit<Patient, 'id'>) => {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient),
      });
      if (!response.ok) throw new Error('Failed to create patient');
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('patients');
        setIsModalOpen(false);
      },
    }
  );

  const updateMutation = useMutation(
    async (patient: Patient) => {
      const response = await fetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient),
      });
      if (!response.ok) throw new Error('Failed to update patient');
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('patients');
        setIsModalOpen(false);
        setEditingPatient(null);
      },
    }
  );

  const deleteMutation = useMutation(
    async (id: string) => {
      const response = await fetch(`/api/patients/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete patient');
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('patients');
      },
    }
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Patient Management</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Patient
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {patients?.map((patient) => (
          <div key={patient.id} className="border rounded-lg p-4 shadow">
            <h2 className="text-xl font-semibold mb-2">{patient.name}</h2>
            <p>DOB: {format(new Date(patient.dateOfBirth), 'PPP')}</p>
            <p>Gender: {patient.gender}</p>
            <p>Phone: {patient.phone}</p>
            <p>Email: {patient.email}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setEditingPatient(patient);
                  setIsModalOpen(true);
                }}
                className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
              >
                Edit
              </button>
              <button
                onClick={() => deleteMutation.mutate(patient.id)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingPatient ? 'Edit Patient' : 'Add New Patient'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const patientData = {
                  name: formData.get('name') as string,
                  dateOfBirth: formData.get('dateOfBirth') as string,
                  gender: formData.get('gender') as string,
                  phone: formData.get('phone') as string,
                  email: formData.get('email') as string,
                  address: formData.get('address') as string,
                };

                if (editingPatient) {
                  updateMutation.mutate({ ...patientData, id: editingPatient.id });
                } else {
                  createMutation.mutate(patientData);
                }
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingPatient?.name}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    defaultValue={editingPatient?.dateOfBirth}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <select
                    name="gender"
                    defaultValue={editingPatient?.gender}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={editingPatient?.phone}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingPatient?.email}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    name="address"
                    defaultValue={editingPatient?.address}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPatient(null);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  {editingPatient ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientManagement; 