import { ApiResponse, ApiError, AuthResponse, User } from '@/types/common';

const API_BASE_URL = '/api';

class ApiClient {
  private static instance: ApiClient;
  private token: string | null = null;

  private constructor() {
    this.token = localStorage.getItem('token');
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          message: data.message || 'An error occurred',
          status: response.status,
          code: data.code,
        } as ApiError;
      }

      return data.data;
    } catch (error) {
      if (error instanceof Error) {
        throw {
          message: error.message,
          status: 500,
        } as ApiError;
      }
      throw error;
    }
  }

  public setToken(token: string): void {
    this.token = token;
    localStorage.setItem('token', token);
  }

  public clearToken(): void {
    this.token = null;
    localStorage.removeItem('token');
  }

  // Auth endpoints
  public async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  public async register(userData: Omit<User, 'id'>): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  public async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
  }

  // User endpoints
  public async getCurrentUser(): Promise<User> {
    return this.request<User>('/user/me');
  }

  public async updateUser(userData: Partial<User>): Promise<User> {
    return this.request<User>('/user/me', {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  }
}

export const api = ApiClient.getInstance(); 