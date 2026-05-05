import axios from 'axios';
import { getToken, waitForToken } from '../lib/tokenManager';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  let token = getToken();
  if (!token) {
    token = await waitForToken();
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const patients = {
  getAll: async () => {
    const response = await api.get('/patients');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/patients/${id}`);
    return response.data;
  },
  create: async (data: { full_name: string; email?: string; phone?: string; date_of_birth?: string; [key: string]: unknown }) => {
    const response = await api.post('/patients', data);
    return response.data;
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/patients/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    await api.delete(`/patients/${id}`);
  },
};

export const scans = {
  getAll: async () => {
    const response = await api.get('/scans');
    return response.data;
  },
  getByPatient: async (patientId: string) => {
    const response = await api.get(`/scans/patient/${patientId}`);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/scans/${id}`);
    return response.data;
  },
  upload: async (patientId: string, file: File, scanType = 'xray') => {
    const formData = new FormData();
    formData.append('scan', file);
    formData.append('patientId', patientId);
    formData.append('scanType', scanType);
    const response = await api.post('/scans/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  delete: async (id: string) => {
    await api.delete(`/scans/${id}`);
  },
};

export const team = {
  getAll: async () => {
    const response = await api.get('/auth/team');
    return response.data;
  },
  invite: async (email: string, role: string) => {
    const response = await api.post('/auth/invite', { email, role });
    return response.data;
  },
};
