import { authTest as test, expect } from '../test-base';
import { baseURL } from '../../config/env';


test('injected "at" token loads the messages page without redirecting to auth', async ({ page }) => {
  await page.goto(new URL('direct', baseURL).toString());
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/direct/);
  expect(page.url()).not.toContain('/auth');
});
