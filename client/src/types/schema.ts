import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string(),
  fullName: z.string(),
  clinicName: z.string(),
  role: z.enum(['admin', 'user']),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export interface User {
  id: string;
  email: string;
  fullName: string;
  clinicName: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  lastVisit: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Scan {
  id: string;
  patientId: string;
  fileName: string;
  fileUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface Analysis {
  id: string;
  scanId: string;
  patientId: string;
  diagnosis: string;
  recommendations: string[];
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  scanId: string;
  diagnosis: string;
  treatmentSteps: string[];
  estimatedCost: number;
  duration: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface AuthResponse {
  user: User;
  token: string;
} 