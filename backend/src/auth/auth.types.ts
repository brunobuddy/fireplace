import type { Request } from 'express';

/** The authenticated principal exposed to controllers and the gateway. */
export interface AuthUser {
  email: string;
}

/** A configured login credential, parsed from the AUTH_USERS env var. */
export interface CredentialRecord {
  email: string;
  /** Plaintext password or a bcrypt hash (`$2…`) — auto-detected on compare. */
  secret: string;
}

/** Claims carried by the signed JWT. */
export interface JwtPayload {
  sub: string;
  email: string;
}

/** Express request after the guard has attached the authenticated user. */
export interface AuthedRequest extends Request {
  user?: AuthUser;
}
