/**
 * Decodes the JWT payload (no signature verification) and checks `exp` against current time.
 * No network call — pure local decode. Returns true if token is expired or malformed.
 */
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf8')
    );
    if (typeof payload.exp !== 'number') return true;
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
