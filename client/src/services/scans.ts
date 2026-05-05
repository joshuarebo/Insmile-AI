import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const scans = {
  getAll: async (patientId?: string) => {
    const url = patientId ? `${API_URL}/scans/patient/${patientId}` : `${API_URL}/scans`;
    const { data } = await axios.get(url);
    return data;
  },

  upload: async (patientId: string, file: File) => {
    const fd = new FormData();
    fd.append('scan', file);
    fd.append('patientId', patientId);
    const { data } = await axios.post(`${API_URL}/scans/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getImageUrl: async (scanId: string): Promise<string | null> => {
    try {
      const { data } = await axios.get(`${API_URL}/scans/${scanId}/image`);
      return data.url || null;
    } catch {
      return null;
    }
  },
};
