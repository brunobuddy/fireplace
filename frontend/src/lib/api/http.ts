import { getAuthToken, notifyUnauthorized } from './auth-token';

/**
 * Minimal typed fetch wrapper. The API is same-origin — NestJS serves the SPA
 * in production and Vite proxies `/api` in dev — so the base is a relative
 * path and no CORS is involved. Feature API modules stay one-liners.
 */
const BASE = '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  // A 401 while we held a token means it expired/was revoked → end the
  // session. A 401 without a token (e.g. a failed login) just surfaces below.
  if (res.status === 401 && token) {
    notifyUnauthorized();
  }

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

/**
 * Turn an error response into a human-readable message. NestJS sends
 * `{ statusCode, message, error }`, where `message` is a string or (for
 * validation failures) an array — unwrap that so the UI shows a clean line
 * instead of raw JSON; otherwise fall back to the body, status text, or a
 * generic message.
 */
async function readErrorMessage(res: Response): Promise<string> {
  const fallback = `Request failed (${res.status})`;
  const raw = await res.text().catch(() => '');
  if (!raw) {
    return res.statusText || fallback;
  }
  try {
    const body = JSON.parse(raw) as { message?: unknown; error?: unknown };
    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }
    if (typeof body.message === 'string' && body.message) {
      return body.message;
    }
    if (typeof body.error === 'string' && body.error) {
      return body.error;
    }
  } catch {
    // Body wasn't JSON — fall through to the raw text.
  }
  return raw || res.statusText || fallback;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
