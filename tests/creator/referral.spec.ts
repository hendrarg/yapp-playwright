import { creatorAuthTest as test, expect } from '../test-base';
import { creatorsBaseURL } from '../../config/env';


test('injected "at" token loads the referral page without redirecting to auth', async ({ page }) => {
  await page.goto(new URL('referral', creatorsBaseURL).toString());
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/referral/);
  expect(page.url()).not.toContain('/auth');
});
