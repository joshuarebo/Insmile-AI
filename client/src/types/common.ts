export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'dentist';
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

export type ApiError = {
  message: string;
  status: number;
  code?: string;
}; 