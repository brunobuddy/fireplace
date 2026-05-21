/**
 * Holds the bearer token outside the component tree so the plain `http` and
 * `socket` modules can read it without importing Solid context. The auth
 * provider is the only writer.
 */
let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function getAuthToken(): string | null {
  return token;
}

export function setAuthToken(next: string | null): void {
  token = next;
}

/** Registered by the auth provider to react to an expired/rejected token. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export function notifyUnauthorized(): void {
  onUnauthorized?.();
}
