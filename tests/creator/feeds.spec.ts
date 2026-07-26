import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Feeds', () => {
test('injected "at" token loads the feeds page without redirecting to auth', { 
  tag: ['@AUT-FV-304', '@feeds', '@creator', '@smoke'] }, async ({ creatorFeedsPage }) => {
  await creatorFeedsPage.goto();
  await creatorFeedsPage.expectLoaded();
});
});
