// Summer Quest — API Client
// Thin wrapper so pages don't repeat fetch boilerplate. Token storage
// uses sessionStorage scoped under an "sq_" prefix so it never collides
// with any token storage the rest of Fundraisely uses.

const API_BASE = import.meta.env.VITE_SQ_API_BASE || '/api/summer-quest';
const TOKEN_KEY = 'sq_token';
const ROLE_KEY = 'sq_role';

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
}

export function getStoredRole(): string | null {
  return sessionStorage.getItem(ROLE_KEY);
}

export function setStoredRole(role: string) {
  sessionStorage.setItem(ROLE_KEY, role);
}

export class SummerQuestApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = 'Something went wrong.';
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {
      // non-JSON error body, keep default message
    }
    throw new SummerQuestApiError(message, res.status);
  }

  return res.json();
}

export const sqApi = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
};

// CSV exports (and any other file-download endpoint) don't return JSON,
// so they go through this instead of sqApi.get — fetches with the same
// auth header, reads the response as a Blob, and triggers a browser
// download using the filename the server sent back rather than
// guessing one client-side.
export async function downloadSqFile(path: string, fallbackFilename: string): Promise<void> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { method: 'GET', headers });

  if (!res.ok) {
    let message = 'Could not download this file.';
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {
      // non-JSON error body, keep default message
    }
    throw new SummerQuestApiError(message, res.status);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackFilename;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
