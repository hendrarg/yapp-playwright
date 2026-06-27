import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

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
    if (response.url().includes('/api/v1/accounts') && response.request().method() === 'GET') {
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
    (r) => r.url().includes('/api/v1/accounts') && r.request().method() === 'GET',
    { timeout: 45000 },
  ).then((response) => {
    expect(response.status(), `Auth token invalid — /api/v1/accounts returned ${response.status()}`).toBe(200);
  });
}
