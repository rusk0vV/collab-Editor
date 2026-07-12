import { useAuth } from '@clerk/clerk-react';

const API_BASE = 'http://localhost:4000';

export interface User {
  clerk_id: string;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  owner_id: string;
  content: { ops: any[] };
  revision: number;
  created_at: string;
  updated_at: string;
  owner_name?: string;
}

/**
 * Hook providing authenticated fetch requests to the backend using Clerk tokens.
 */
export function useApi() {
  const { getToken } = useAuth();

  async function request(path: string, options: RequestInit = {}): Promise<any> {
    const token = await getToken();
    const headers = new Headers(options.headers);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error || `HTTP error ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  return { request };
}
