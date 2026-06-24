import type { Page, Route } from '@playwright/test';
import { errorMock } from '@test-data/mocks/common.data';

/**
 * Mock a server error (500) for a URL pattern.
 * Use in E2E tests to verify error-handling UI.
 */
export async function mockServerError(page: Page, urlPattern: string | RegExp) {
  await page.route(urlPattern, (route: Route) =>
    route.fulfill({
      status: errorMock.serverError.status,
      contentType: 'application/json',
      body: JSON.stringify(errorMock.serverError.body),
    })
  );
}

/**
 * Mock a network failure (connection refused) for a URL pattern.
 */
export async function mockNetworkFailure(
  page: Page,
  urlPattern: string | RegExp,
  reason: Parameters<Route['abort']>[0] = 'connectionrefused'
) {
  await page.route(urlPattern, (route: Route) => route.abort(reason));
}

/**
 * Mock a delayed response to simulate timeout or slow backend.
 * The delay exceeds typical fetch timeouts, triggering the app's timeout handler.
 */
export async function mockTimeout(page: Page, urlPattern: string | RegExp, delayMs = 30_000) {
  await page.route(urlPattern, async (route: Route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

/**
 * Mock an intermittent failure pattern — fails `failureCount` times then succeeds.
 * Useful for testing retry logic in the UI.
 */
export async function mockIntermittent(
  page: Page,
  urlPattern: string | RegExp,
  successBody: unknown,
  failureCount = 2
) {
  let attempts = 0;
  await page.route(urlPattern, (route: Route) => {
    attempts++;
    if (attempts <= failureCount) {
      return route.fulfill({
        status: errorMock.serverError.status,
        contentType: 'application/json',
        body: JSON.stringify(errorMock.serverError.body),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(successBody),
    });
  });
}
