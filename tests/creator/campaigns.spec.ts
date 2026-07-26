import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Campaigns', () => {
test('injected "at" token loads the campaigns page without redirecting to auth', { 
  tag: ['@AUT-FV-303', '@campaigns', '@creator', '@smoke'] }, async ({ campaignsPage }) => {
  await campaignsPage.goto();
  await campaignsPage.expectLoaded();
});
});
