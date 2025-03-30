import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  signup: async (email: string, password: string, role: string) => {
    const response = await api.post('/auth/signup', { email, password, role });
    return response.data;
  },
};

export const patients = {
  getAll: async () => {
    const response = await api.get('/patients');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/patients/${id}`);
    return response.data;
  },
  create: async (data: { name: string; email: string; phone: string; dateOfBirth: string }) => {
    const response = await api.post('/patients', data);
    return response.data;
  },
  update: async (id: string, data: Partial<{ name: string; email: string; phone: string; dateOfBirth: string }>) => {
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
  getById: async (id: string) => {
    const response = await api.get(`/scans/${id}`);
    return response.data;
  },
  upload: async (patientId: string, file: File) => {
    const formData = new FormData();
    formData.append('scan', file);
    formData.append('patientId', patientId);
    const response = await api.post('/scans/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  analyze: async (id: string) => {
    const response = await api.post(`/scans/${id}/analyze`);
    return response.data;
  },
  delete: async (id: string) => {
    await api.delete(`/scans/${id}`);
  },
}; 