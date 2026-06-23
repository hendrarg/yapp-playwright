import { authTest as test } from '../test-base';

test('injected "at" token loads the explore page without redirecting to auth', { 
  tag: ['@explore', '@buyer', '@smoke'] }, async ({ explorePage }) => {
  await explorePage.goto();
  await explorePage.expectLoaded();
  await explorePage.expectAuthenticated();
});
