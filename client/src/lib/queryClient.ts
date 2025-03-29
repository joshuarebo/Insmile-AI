import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export async function apiRequest<T = any>(
  method: HttpMethod,
  endpoint: string,
  data?: any,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "An error occurred");
  }

  return response.json();
}
