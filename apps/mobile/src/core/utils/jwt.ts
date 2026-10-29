import { fromBase64 } from '@/core/utils/base64';

interface JwtPayload {
  exp?: number;
  [claim: string]: unknown;
}

/**
 * Decodes a JWT's payload claims without verifying its signature —
 * signature verification is the server's job, this is client-side routing
 * only. Returns null for anything that isn't a well-formed JWT.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  const segments = token.split('.');
  if (segments.length !== 3) return null;

  try {
    return JSON.parse(fromBase64(segments[1])) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * True when the token has no readable `exp` claim, or `exp` has passed.
 *
 * Not wired into bootstrap routing yet — see auth.store.ts: no real access
 * token is persisted today, so there's nothing to validate and enforcing
 * this now would strand every session. Kept ready so routing can switch on
 * it later without another round of plumbing.
 */
export function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}
