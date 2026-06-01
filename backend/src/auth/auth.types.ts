import type { Request } from 'express';
import type { MemberRole } from '../family/entities/member.entity';

/**
 * The authenticated principal exposed to controllers, gateways and decorators.
 * After login the JWT carries everything needed to attribute writes (memberId,
 * familyId), so the client never has to send "who did this" — the server reads
 * it from the verified token.
 */
export interface AuthUser {
  memberId: string;
  familyId: string;
  email: string;
  name: string;
  role: MemberRole;
  color: string;
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
  memberId: string;
  familyId: string;
  email: string;
  name: string;
  role: MemberRole;
  color: string;
}

/** Express request after the guard has attached the authenticated user. */
export interface AuthedRequest extends Request {
  user?: AuthUser;
}
