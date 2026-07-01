export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? (import.meta.env.DEV ? 'http://localhost:4000' : '/api');

export function buildApiUrl(path: string) {
  const baseUrl = new URL(API_BASE_URL, window.location.origin);
  const basePath = baseUrl.pathname.replace(/\/$/, '');

  const parsed = new URL(path, 'http://local');
  const pathOnly = parsed.pathname;
  const requestPath =
    basePath.endsWith('/api') && pathOnly.startsWith('/api/') ? pathOnly.slice('/api'.length) : pathOnly;

  baseUrl.pathname = `${basePath}${requestPath}`.replace(/\/{2,}/g, '/');
  baseUrl.search = parsed.search;
  return baseUrl.toString();
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, token: string | null, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path), { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new ApiError(data.message ?? 'Request failed', response.status);
  }
  return data as T;
}
