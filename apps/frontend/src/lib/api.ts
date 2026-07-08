const API_BASE = 'http://localhost:4000';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
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
 * Perform an authenticated or unauthenticated REST API request to the backend.
 */
export async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = localStorage.getItem('token');
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

  // Handle DELETE or other endpoints returning empty responses or success messages
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
