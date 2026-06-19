import { creatorAuthTest as test, expect } from '../test-base';
import { creatorsBaseURL } from '../../config/env';


test('injected "at" token loads the promotions page without redirecting to auth', async ({ page }) => {
  await page.goto(new URL('promotions', creatorsBaseURL).toString());
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/promotions/);
  expect(page.url()).not.toContain('/auth');
});
