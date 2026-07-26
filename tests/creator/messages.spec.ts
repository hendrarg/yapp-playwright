import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Messages', () => {
test('injected "at" token loads the messages page without redirecting to auth', { 
  tag: ['@AUT-FV-306', '@messages', '@creator', '@smoke'] }, async ({ creatorNav }) => {
  await creatorNav.open('messages');
});
});
