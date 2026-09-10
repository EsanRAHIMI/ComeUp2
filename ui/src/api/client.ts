import { getT } from '../i18n';

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
  code?: string;
  body?: Record<string, unknown>;
  constructor(message: string, status: number, code?: string, body?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.body = body;
    this.name = 'ApiError';
  }
}

function parseResponseBody(text: string): { message?: string; code?: string } & Record<string, unknown> {
  if (!text) return {};
  try {
    return JSON.parse(text) as { message?: string; code?: string } & Record<string, unknown>;
  } catch {
    throw new ApiError(getT().api.invalidResponse, 502);
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
  const data = parseResponseBody(text);

  if (!response.ok) {
    throw new ApiError(
      (typeof data.message === 'string' ? data.message : undefined) ?? getT().api.requestFailed,
      response.status,
      typeof data.code === 'string' ? data.code : undefined,
      data,
    );
  }
  return data as T;
}

export async function apiUpload<T>(path: string, token: string, formData: FormData): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: formData,
  });
  const text = await response.text();
  const data = parseResponseBody(text);
  if (!response.ok) {
    throw new ApiError(
      (typeof data.message === 'string' ? data.message : undefined) ?? getT().api.uploadFailed,
      response.status,
      typeof data.code === 'string' ? data.code : undefined,
      data,
    );
  }
  return data as T;
}
