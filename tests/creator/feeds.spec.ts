import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Feeds', () => {
test('injected "at" token loads the feeds page without redirecting to auth', { 
  tag: ['@TAT-C-FV-001', '@feeds', '@creator', '@smoke'] }, async ({ creatorFeedsPage }) => {
  await creatorFeedsPage.goto();
  await creatorFeedsPage.expectLoaded();
});
});
