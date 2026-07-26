import { authTest as test } from '../test-base';

test.describe('Buyer Library', () => {
test('injected "at" token loads the library page without redirecting to auth', { 
  tag: ['@AUT-FV-204', '@library', '@buyer', '@smoke'] }, async ({ buyerNav, libraryPage }) => {
  await buyerNav.open('library');
  await libraryPage.expectAuthenticated();
});
});
