import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * The account endpoint, matched on the exact path.
 *
 * A substring match on '/api/v1/accounts' also caught sub-resources. The creator
 * dashboard requests `/api/v1/accounts/domain` right after `/api/v1/accounts`, and that
 * returns 404 whenever the creator has no custom domain — a normal state. Because the
 * tracker kept the *last* matching status, a perfectly valid token was reported as
 * "Auth token invalid", failing whole specs before their first assertion.
 */
export function isAccountEndpoint(url: string): boolean {
  try {
    return new URL(url).pathname.replace(/\/$/, '') === '/api/v1/accounts';
  } catch {
    return false;
  }
}

/**
 * Sets up a listener that tracks the /api/v1/accounts response status.
 * Call `expectValid()` after page navigation to assert the token is still valid.
 *
 * Usage in page object:
 *   private auth = trackAuthToken(this.page);
 *   async expectAuthenticated() { await this.auth.expectValid(); }
 */
export function trackAuthToken(page: Page) {
  let status: number | null = null;

  page.on('response', (response) => {
    if (isAccountEndpoint(response.url()) && response.request().method() === 'GET') {
      status = response.status();
    }
  });

  return {
    async expectValid() {
      if (status !== null) {
        expect(status, `Auth token invalid — /api/v1/accounts returned ${status}`).toBe(200);
      }
    },
  };
}

/**
 * Waits for the /api/v1/accounts response triggered by a page navigation.
 * Must be called BEFORE page.goto() to intercept the response.
 *
 * Usage in fixture:
 *   const authCheck = waitForAuthResponse(page);
 *   await page.goto(baseURL);
 *   await authCheck;
 */
export function waitForAuthResponse(page: Page) {
  return page.waitForResponse(
    (r) => isAccountEndpoint(r.url()) && r.request().method() === 'GET',
    { timeout: 45000 },
  ).then((response) => {
    expect(response.status(), `Auth token invalid — /api/v1/accounts returned ${response.status()}`).toBe(200);
  });
}
