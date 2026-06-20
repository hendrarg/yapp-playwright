import { authTest as test } from '../test-base';

test('injected "at" token loads the feeds page without redirecting to auth', async ({ buyerFeedsPage }) => {
  await buyerFeedsPage.goto();
  await buyerFeedsPage.expectLoaded();
});
