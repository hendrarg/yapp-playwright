import { authTest as test } from '../test-base';

test.describe('Buyer Messages', () => {
test('injected "at" token loads the messages page without redirecting to auth', { 
  tag: ['@AUT-FV-145', '@messages', '@buyer', '@smoke'] }, async ({ buyerNav, messagePage }) => {
  await buyerNav.open('messages');
  await messagePage.expectAuthenticated();
});
});
