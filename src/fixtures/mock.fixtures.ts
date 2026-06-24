import { test as base, expect } from '@playwright/test';
import { paymentMock } from '@test-data/mocks/payment.data';
import { emailMock } from '@test-data/mocks/email.data';

type MockOptions = {
  mockPayments: boolean;
  mockEmail: boolean;
  mockAnalytics: boolean;
};

/**
 * Fixture with toggleable mocks for external services.
 *
 * Default: all mocks enabled. Override per-test with `test.use()`.
 *
 * @example
 * // Use defaults (all mocked)
 * test('checkout', async ({ page }) => { ... });
 *
 * // Override: test with real payment
 * test('real payment', async ({ page }) => {
 *   test.use({ mockPayments: false });
 *   ...
 * });
 */
export const test = base.extend<MockOptions>({
  mockPayments: [true, { option: true }],
  mockEmail: [true, { option: true }],
  mockAnalytics: [true, { option: true }],

  page: async ({ page, mockPayments, mockEmail, mockAnalytics }, use) => {
    if (mockPayments) {
      await page.route('**/api/payment*/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(paymentMock.success),
        })
      );
    }

    if (mockEmail) {
      await page.route('**/api/email*/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(emailMock.sent),
        })
      );
    }

    if (mockAnalytics) {
      await page.route(
        '**/{google-analytics,segment,hotjar,mixpanel,intercom}.**/**',
        (route) => route.abort()
      );
    }

    await use(page);
  },
});

export { expect };
