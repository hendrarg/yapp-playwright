import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the promotions page without redirecting to auth', { 
  tag: ['@promotions', '@creator', '@smoke'] }, async ({ promotionsPage }) => {
  await promotionsPage.goto();
  await promotionsPage.expectLoaded();
});
