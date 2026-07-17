import { authTest as test } from '../test-base';

test('injected "at" token loads the messages page without redirecting to auth', { 
  tag: ['@AUT-FV-009', '@messages', '@buyer', '@smoke'] }, async ({ messagePage }) => {
  await messagePage.goto();
  await messagePage.expectLoaded();
  await messagePage.expectAuthenticated();
});
