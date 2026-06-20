import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the feeds page without redirecting to auth', { 
  tag: ['@feeds', '@creator', '@smoke'] }, async ({ creatorFeedsPage }) => {
  await creatorFeedsPage.goto();
  await creatorFeedsPage.expectLoaded();
});
