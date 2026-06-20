import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the consultation sessions page without redirecting to auth', async ({ sessionsPage }) => {
  await sessionsPage.goto();
  await sessionsPage.expectLoaded();
});
