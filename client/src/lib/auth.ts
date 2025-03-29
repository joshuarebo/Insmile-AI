import { useAuth } from "@/context/AuthContext";

export const useRequireAuth = () => {
  const { user, isLoading } = useAuth();
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isDentist: user?.role === "dentist",
    isPatient: user?.role === "patient",
  };
};

export const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatTime = (date: Date | string | undefined): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const getRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - dateObj.getTime()) / 1000 / 60 / 60);
  
  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  } else if (diffInHours < 48) {
    return 'Yesterday';
  } else {
    return formatDate(dateObj);
  }
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = `${API_URL}${url}`;
  
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
  };

  const options: RequestInit = {
    method,
    headers,
    credentials: "include",
    body: data ? JSON.stringify(data) : undefined,
  };

  const res = await fetch(fullUrl, options);

  if (!res.ok) {
    let errorMessage;
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorData.message || res.statusText;
    } catch {
      errorMessage = res.statusText;
    }
    throw new Error(errorMessage);
  }

  return res;
}
