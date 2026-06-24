import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { buildBrowserLikeHeaders } from '@helpers/api/headers';
import { baseURL, creatorsBaseURL } from '@config/env';

type ApiFixtures = {
  buyerRequest: APIRequestContext;
  creatorRequest: APIRequestContext;
};

/**
 * Pre-authenticated API request contexts for buyer and creator.
 *
 * Uses YAPP_TEST_ACCESS_TOKEN cookie + browser-like headers
 * (Origin, Referer, User-Agent) to pass Yapp's WAF.
 *
 * @example
 * import { test } from '../fixtures/api.fixtures';
 *
 * test('GET buyer profile', async ({ buyerRequest }) => {
 *   const resp = await buyerRequest.get('/api/profile');
 *   expect(resp.ok()).toBeTruthy();
 * });
 */
export const test = base.extend<ApiFixtures>({
  buyerRequest: async ({ playwright }, use) => {
    const accessToken = process.env.YAPP_TEST_ACCESS_TOKEN;
    base.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN must be set in .env');

    const context = await playwright.request.newContext({
      baseURL: baseURL,
      extraHTTPHeaders: {
        Cookie: `at=${accessToken}`,
        ...buildBrowserLikeHeaders(baseURL),
      },
    });
    await use(context);
    await context.dispose();
  },

  creatorRequest: async ({ playwright }, use) => {
    const accessToken = process.env.YAPP_TEST_ACCESS_TOKEN;
    base.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN must be set in .env');

    const context = await playwright.request.newContext({
      baseURL: creatorsBaseURL,
      extraHTTPHeaders: {
        Cookie: `at=${accessToken}`,
        ...buildBrowserLikeHeaders(creatorsBaseURL),
      },
    });
    await use(context);
    await context.dispose();
  },
});

export { expect };
