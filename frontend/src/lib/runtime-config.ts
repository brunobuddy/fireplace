interface FireplaceRuntimeConfig {
  apiUrl?: string;
}

declare global {
  interface Window {
    __FIREPLACE__?: FireplaceRuntimeConfig;
  }
}

/**
 * Resolve the API base URL with this precedence:
 *   1. `window.__FIREPLACE__.apiUrl` — injected at container start from the
 *      `API_URL` env var (`/env.js`). Lets one built image deploy anywhere.
 *   2. `VITE_API_URL` — baked at build time (local dev).
 *   3. localhost fallback.
 */
export function resolveApiUrl(): string {
  const fromWindow =
    typeof window !== 'undefined' ? window.__FIREPLACE__?.apiUrl : undefined;
  const fromEnv = import.meta.env.VITE_API_URL;
  const url =
    (fromWindow && fromWindow.trim()) ||
    (fromEnv && fromEnv.trim()) ||
    'http://localhost:3000';
  return url.replace(/\/$/, '');
}
