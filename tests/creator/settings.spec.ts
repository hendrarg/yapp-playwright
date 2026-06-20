import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the settings page without redirecting to auth', async ({ settingsPage }) => {
  await settingsPage.goto();
  await settingsPage.expectLoaded();
});
