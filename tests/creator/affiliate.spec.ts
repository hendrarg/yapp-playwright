import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the affiliate page without redirecting to auth', { 
  tag: ['@affiliate', '@creator', '@smoke'] }, async ({ affiliatePage }) => {
  await affiliatePage.goto();
  await affiliatePage.expectLoaded();
});
