import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the settings page without redirecting to auth', { 
  tag: ['@settings', '@creator', '@smoke'] }, async ({ settingsPage }) => {
  await settingsPage.goto();
  await settingsPage.expectLoaded();
});
