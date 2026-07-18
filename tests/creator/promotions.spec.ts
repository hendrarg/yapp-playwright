import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Promotions', () => {
test('injected "at" token loads the promotions page without redirecting to auth', { 
  tag: ['@TAT-C-FV-001', '@promotions', '@creator', '@smoke'] }, async ({ promotionsPage }) => {
  await promotionsPage.goto();
  await promotionsPage.expectLoaded();
});
});
