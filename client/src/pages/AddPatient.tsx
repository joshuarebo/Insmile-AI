import React from 'react';
import PatientForm from '../components/PatientForm';

const AddPatient: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Add New Patient</h1>
      <div className="max-w-2xl mx-auto">
        <PatientForm />
      </div>
    </div>
  );
};

export default AddPatient; 