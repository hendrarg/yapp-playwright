import { creatorAuthTest as test } from '../test-base';
import type { WalletTransactionType } from '@pages/creator/WalletPage';

test.describe('Creator Wallet', () => {
  test('injected "at" token loads the wallet page without redirecting to auth', {
    tag: ['@wallet', '@creator', '@smoke'],
  }, async ({ creatorNav }) => {
    await creatorNav.open('wallet');
  });

  test('Wallet — Status Filter, Type Filter', {
    tag: ['@AUT-WLT-002', '@wallet', '@creator', '@regression'],
  }, async ({ creatorNav, walletPage }) => {
    test.setTimeout(120000);

    await test.step('Status filter tabs (All, Pending, Settled) are visible and filter history rows', async () => {
      await creatorNav.open('wallet');
      await walletPage.expectLoaded();
      await walletPage.expectStatusTabsVisible();

      // Pending filter
      await walletPage.selectStatusTab('Pending');
      await walletPage.expectHistoryRowsStatus('pending');

      // Settled filter
      await walletPage.selectStatusTab('Settled');
      await walletPage.expectHistoryRowsStatus('settled');

      // Return to All filter
      await walletPage.selectStatusTab('All');
    });

    await test.step('Type filter combobox can filter by Tips, Withdraw, Convert, Order, and Referrer Fees', async () => {
      const types: WalletTransactionType[] = ['Tips', 'Withdraw', 'Convert', 'Order', 'Referrer Fees', 'All'];
      for (const type of types) {
        await walletPage.selectTypeFilter(type);
        await walletPage.expectTypeFilterSelected(type);
      }
    });
  });
});
