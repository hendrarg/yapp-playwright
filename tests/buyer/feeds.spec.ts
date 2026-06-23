import { authTest as test } from '../test-base';

test('injected "at" token loads the feeds page without redirecting to auth', { 
  tag: ['@feeds', '@buyer', '@smoke'] }, async ({ buyerFeedsPage }) => {
  await buyerFeedsPage.goto();
  await buyerFeedsPage.expectLoaded();
  await buyerFeedsPage.expectAuthenticated();
});
