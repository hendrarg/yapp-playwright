import { creatorAuthTest as test, expect } from '../test-base';
import { ordersFilterData } from '@test-data/creator/orders.data';

test.describe('Creator Orders', () => {

test('Verify Orders Display and Navigation', {
  tag: ['@AUT-FV-181', '@orders', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-ORD-C-009, TC-ORD-C-015' },
  ],
}, async ({ creatorNav, ordersPage }) => {
  test.setTimeout(120000);

  await test.step('Open Orders page and verify all columns visible', async () => {
    await creatorNav.open('orders');
    await ordersPage.expectLoaded();
    await ordersPage.expectOrderColumnsVisible();
  });

  await test.step('Verify first order row has a non-empty Order ID', async () => {
    await ordersPage.expectFirstRowHasOrderId();
  });
});

test('Verify Orders Customer Information Display', {
  tag: ['@AUT-FV-182', '@orders', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-ORD-C-010' },
  ],
}, async ({ creatorNav, ordersPage }) => {
  test.setTimeout(120000);

  await test.step('Open Orders page and verify customer info populated', async () => {
    await creatorNav.open('orders');
    await ordersPage.expectLoaded();
    await ordersPage.expectFirstRowHasCustomerInfo();
  });
});

test('Validate Orders Product Info and Boundary Conditions', {
  tag: ['@AUT-FV-183', '@orders', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-ORD-C-011, TC-ORD-C-014, TC-ORD-C-016' },
  ],
}, async ({ creatorNav, ordersPage }) => {
  test.setTimeout(120000);

  await test.step('Open Orders page and verify product info populated', async () => {
    await creatorNav.open('orders');
    await ordersPage.expectLoaded();
    await ordersPage.expectFirstRowHasProductInfo();
  });

  await test.step('Verify product info contains recognizable type and name', async () => {
    const cell = ordersPage.page.locator('table tbody td:nth-child(3)').first();
    const text = (await cell.textContent()) ?? '';
    const hasProductType = /Digital Download|Online Course|Discord Membership|Consultations?|Telegram Membership/i.test(text);
    expect(hasProductType).toBe(true);
  });
});

  test('Search, Filter, Sort, and Discover Orders Data', {
    tag: ['@AUT-FV-187', '@orders', '@creator', '@regression'],
  }, async ({ creatorNav, ordersPage }) => {
    test.setTimeout(120000);

    await test.step('Open Orders tab on Products', async () => {
      await creatorNav.open('orders');
      await ordersPage.expectLoaded();
    });

    await test.step('Open product filter and verify available product types', async () => {
      await ordersPage.expectProductFilterOptions(ordersFilterData.productTypes);
      await ordersPage.closeFilterPopover();
    });

    await test.step('Select multiple product types and keep both selected', async () => {
      await ordersPage.selectProductTypes(ordersFilterData.multiSelectTypes);
      await ordersPage.expectProductTypesSelected(ordersFilterData.multiSelectTypes);
    });

    await test.step('Verify results only include selected product types', async () => {
      await ordersPage.expectOrderRowsOnlyProductTypes(ordersFilterData.multiSelectTypes);
    });

    await test.step('Apply time and product filters and verify list updates', async () => {
      await ordersPage.selectTimeRange(ordersFilterData.timeRange);
      await ordersPage.expectTimeFilterLabel(ordersFilterData.timeRange);
      await expect(ordersPage.page.getByText(/Page 1 of \d+/).first()).toBeVisible({ timeout: 10000 });
      await ordersPage.expectOrderRowsOnlyProductTypes(ordersFilterData.multiSelectTypes);
    });

    await test.step('Reset filters and restore default orders list', async () => {
      await ordersPage.resetFilters();
      await ordersPage.expectDefaultUnfilteredState();
    });

    await test.step('Apply unmatched filter and verify empty state remains editable', async () => {
      await ordersPage.searchOrders(ordersFilterData.emptySearch);
      await ordersPage.expectEmptyResultsState();
      await ordersPage.expectFiltersStillEditable();
      await ordersPage.resetFilters();
      await ordersPage.expectDefaultUnfilteredState();
    });
  });
});
