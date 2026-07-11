import { authTest as test } from '../test-base';

test('injected "at" token loads the library page without redirecting to auth', { 
  tag: ['@TAT-B-FV-001', '@library', '@buyer', '@smoke'] }, async ({ libraryPage }) => {
  await libraryPage.goto();
  await libraryPage.expectLoaded();
  await libraryPage.expectAuthenticated();
});
