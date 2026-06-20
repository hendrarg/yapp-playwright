import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the streaming page without redirecting to auth', async ({ streamingPage }) => {
  await streamingPage.goto();
  await streamingPage.expectLoaded();
});
