import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the campaigns page without redirecting to auth', { 
  tag: ['@campaigns', '@creator', '@smoke'] }, async ({ campaignsPage }) => {
  await campaignsPage.goto();
  await campaignsPage.expectLoaded();
});
