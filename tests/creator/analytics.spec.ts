import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the analytics page without redirecting to auth', { 
  tag: ['@TAT-C-FV-001', '@analytics', '@creator', '@smoke'] }, async ({ analyticsPage }) => {
  await analyticsPage.goto();
  await analyticsPage.expectLoaded();
});
