import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the promotions page without redirecting to auth', async ({ promotionsPage }) => {
  await promotionsPage.goto();
  await promotionsPage.expectLoaded();
});
