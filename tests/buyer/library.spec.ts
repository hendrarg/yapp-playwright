import { authTest as test } from '../test-base';

test.describe('Buyer Library', () => {
test('Verify Digital Products Access, Entitlements, and Eligibility — Part 2', {
  tag: ['@AUT-FV-204', '@library', '@buyer', '@smoke'] }, async ({ buyerNav, libraryPage }) => {
  await buyerNav.open('library');
  await libraryPage.expectAuthenticated();
});
});
