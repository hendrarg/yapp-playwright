/**
 * Decodes the JWT payload (no signature verification) and checks `exp` against current time.
 * No network call — pure local decode. Returns true if token is expired or malformed.
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeTokenClaims(token);
    if (typeof payload.exp !== 'number') return true;
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

/** Decodes JWT payload without verifying signature. */
export function decodeTokenClaims(token: string): Record<string, unknown> {
  const parts = token.replace(/^"|"$/g, '').trim().split('.');
  if (parts.length < 2) {
    throw new Error('Invalid JWT format');
  }
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf8')) as Record<string, unknown>;
}

/** Best-effort username from common JWT claim names. */
export function getTokenUsername(token: string): string | undefined {
  const claims = decodeTokenClaims(token);
  for (const key of ['username', 'preferred_username', 'unique_name', 'sub']) {
    const value = claims[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
}
