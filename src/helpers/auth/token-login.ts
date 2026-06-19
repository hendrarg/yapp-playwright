import type { BrowserContext } from '@playwright/test';

/**
 * Derives the apex domain (e.g. "yapp-dev.yapp.ink" -> ".yapp.ink") from a subdomain
 * URL, so a cookie set on it is sent to every subdomain underneath — letting one
 * token serve both the buyer (yapp-dev.yapp.ink) and creator (creators-dev.yapp.ink)
 * experiences without needing a separate cookie per domain.
 */
function apexDomain(url: string): string {
  return new URL(url).hostname.replace(/^[^.]+\./, '.');
}

/** Injects a previously-obtained "at" cookie, bypassing the OTP UI entirely. */
export async function loginWithToken(context: BrowserContext, accessToken: string, baseURL: string) {
  await context.addCookies([
    { name: 'at', value: accessToken, domain: apexDomain(baseURL), path: '/', secure: true, sameSite: 'Lax' },
  ]);
}
