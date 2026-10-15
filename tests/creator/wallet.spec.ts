import { creatorAuthTest as test } from '../test-base';
import type { WalletTransactionType } from '@pages/creator/WalletPage';

test.describe('Creator Wallet', () => {
  test('Wallet — Wallet Overview, Asset Summary, Withdraw entry point, Pending Balance, Transaction History, Empty State', {
    tag: ['@AUT-WLT-001', '@wallet', '@creator', '@smoke', '@regression'],
  }, async ({ creatorNav, walletPage }) => {
    test.setTimeout(120000);

    await test.step('Open Wallet page and verify all overview sections are visible', async () => {
      await creatorNav.open('wallet');
      await walletPage.expectLoaded();
      await walletPage.expectOverviewSectionsVisible();
    });

    await test.step('Verify active and pending balance cards display formatted amounts', async () => {
      await walletPage.expectActiveAndPendingBalances();
    });

    await test.step('Verify Asset Summary table structure and asset rows', async () => {
      await walletPage.expectAssetSummaryVisible();
    });

    await test.step('Click Withdraw button, verify withdrawal modal opens, and dismiss it', async () => {
      await walletPage.openAndCloseWithdrawDialog();
    });

    await test.step('Click Refresh on Pending Balance', async () => {
      await walletPage.refreshPendingBalance();
    });

    await test.step('Verify Transaction History status tabs (All, Pending, Settled) are visible and functional', async () => {
      await walletPage.expectStatusTabsVisible();
    });
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

  test('Wallet — Transaction Sorting, Combined Filters, Transaction History', {
    tag: ['@AUT-WLT-003', '@wallet', '@creator', '@regression'],
  }, async ({ creatorNav, walletPage }) => {
    test.setTimeout(120000);

    await test.step('Open Wallet page and verify Transaction History table structure', async () => {
      await creatorNav.open('wallet');
      await walletPage.expectLoaded();
      await walletPage.expectTransactionHistoryTableStructure();
    });

    await test.step('Sort transactions by Recent and Oldest', async () => {
      await walletPage.selectSortOption('Recent');
      await walletPage.selectSortOption('Oldest');
    });

    await test.step('Combine Status and Type filters and verify filtered rows', async () => {
      await walletPage.selectStatusTab('Settled');
      await walletPage.selectTypeFilter('Order');
      await walletPage.expectHistoryRowsStatus('settled');
      // Reset filters
      await walletPage.selectTypeFilter('All');
      await walletPage.selectStatusTab('All');
    });

    await test.step('Verify Rows per page selector options and pagination controls on first page', async () => {
      await walletPage.expectRowsSelectorOptions();
      await walletPage.expectPaginationControls();
    });
  });
});

