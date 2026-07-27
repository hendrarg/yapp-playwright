import { authTest as test } from '../test-base';

test.describe('Buyer Messages', () => {
test('Verify Buyer Messages and Broadcasts Notifications and Messaging — Part 1', {
  tag: ['@AUT-FV-145', '@messages', '@buyer', '@smoke'] }, async ({ buyerNav, messagePage }) => {
  await buyerNav.open('messages');
  await messagePage.expectAuthenticated();
});
});
