import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Settings', () => {
test('injected "at" token loads the settings page without redirecting to auth', { 
  tag: ['@AUT-FV-313', '@settings', '@creator', '@smoke'] }, async ({ settingsPage }) => {
  await settingsPage.goto();
  await settingsPage.expectLoaded();
});
});
