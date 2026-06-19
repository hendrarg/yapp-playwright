import { test, expect } from './test-base';
import { baseURL } from '../config/env';

// Manually obtained token (e.g. copied from a curl login response), set in .env —
// see .env.example. Bypasses the OTP/captcha flow entirely; never commit a real value.
const accessToken = process.env.YAPP_TEST_ACCESS_TOKEN;

test.beforeEach(async ({ context }) => {
  test.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN must be set in .env to run this token-injection test');

  // Leading-dot apex domain so the cookie is sent for both yapp-dev.yapp.ink and
  // any subdomain under it, matching how the app itself scopes the "at" cookie.
  const apexDomain = new URL(baseURL).hostname.replace(/^[^.]+\./, '.');

  await context.addCookies([
    { name: 'at', value: accessToken!, domain: apexDomain, path: '/', secure: true, sameSite: 'Lax' },
  ]);
});

test('injected "at" token loads the dashboard library without redirecting to auth', async ({ page }) => {
  await page.goto(new URL('dashboard/library', baseURL).toString());
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/dashboard\/library/);
  expect(page.url()).not.toContain('/auth');
});

