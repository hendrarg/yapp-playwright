import { authTest as test } from '../test-base';

test('injected "at" token loads the messages page without redirecting to auth', { 
  tag: ['@messages', '@buyer', '@smoke'] }, async ({ messagePage }) => {
  await messagePage.goto();
  await messagePage.expectLoaded();
});
