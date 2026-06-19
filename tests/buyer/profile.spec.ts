import { authTest as test, expect } from '../test-base';
import { baseURL } from '../../config/env';


test('injected "at" token loads the profile page without redirecting to auth', async ({ page }) => {
  await page.goto(new URL('profile', baseURL).toString());
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/profile/);
  expect(page.url()).not.toContain('/auth');
});
