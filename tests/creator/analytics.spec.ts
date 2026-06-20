import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the analytics page without redirecting to auth', async ({ analyticsPage }) => {
  await analyticsPage.goto();
  await analyticsPage.expectLoaded();
});
