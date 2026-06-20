import { authTest as test } from '../test-base';

test('injected "at" token loads the library page without redirecting to auth', async ({ libraryPage }) => {
  await libraryPage.goto();
  await libraryPage.expectLoaded();
});
