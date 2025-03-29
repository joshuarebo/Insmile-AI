import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
  clinicName: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

interface SignupData {
  email: string;
  password: string;
  name: string;
  clinicName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data);
      }
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
    } catch (error) {
      throw new Error('Invalid credentials');
    }
  };

  const signup = async (data: SignupData) => {
    try {
      const response = await axios.post('/api/auth/signup', data);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
    } catch (error) {
      throw new Error('Failed to create account');
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
      localStorage.removeItem('token');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await axios.post('/api/auth/forgot-password', { email });
    } catch (error) {
      throw new Error('Failed to send reset email');
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      await axios.post('/api/auth/reset-password', { token, password });
    } catch (error) {
      throw new Error('Failed to reset password');
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 