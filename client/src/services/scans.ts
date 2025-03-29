import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export const scans = {
  getAll: async (patientId: string) => {
    try {
      const response = await axios.get(`${API_URL}/scans/patient/${patientId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch scans');
    }
  },

  upload: async (patientId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('scan', file);
      const response = await axios.post(`${API_URL}/scans/upload/${patientId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to upload scan');
    }
  },

  getImage: async (scanId: string) => {
    try {
      const response = await axios.get(`${API_URL}/scans/${scanId}/image`, {
        responseType: 'blob',
      });
      return URL.createObjectURL(response.data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch scan image');
    }
  }
};

export {}; 