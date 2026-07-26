import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Analytics', () => {
test('injected "at" token loads the analytics page without redirecting to auth', { 
  tag: ['@AUT-FV-302', '@analytics', '@creator', '@smoke'] }, async ({ analyticsPage }) => {
  await analyticsPage.goto();
  await analyticsPage.expectLoaded();
});
});
