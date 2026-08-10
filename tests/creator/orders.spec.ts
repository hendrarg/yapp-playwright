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

  await test.step('Verify each visible row has a non-empty, unique Order ID', async () => {
    await ordersPage.expectFirstRowHasOrderId();
    await ordersPage.expectEachRowHasUniqueOrderId();
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
    await ordersPage.expectCustomerCellHasNameAndContact();
  });
});

test('Validate Orders Product Info and Boundary Conditions', {
  tag: ['@AUT-FV-183', '@orders', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-ORD-C-011, TC-ORD-C-014, TC-ORD-C-016' },
  ],
}, async ({ creatorNav, ordersPage }) => {
  test.setTimeout(120000);

  await test.step('Open Orders page and verify product type + name populated', async () => {
    await creatorNav.open('orders');
    await ordersPage.expectLoaded();
    await ordersPage.expectProductCellHasTypeAndName();
  });

  await test.step('Verify empty state with unmatched search', async () => {
    await ordersPage.searchOrders(ordersFilterData.emptySearch);
    await ordersPage.expectEmptyResultsState();
    await ordersPage.expectFiltersStillEditable();
    await ordersPage.resetFilters();
    await ordersPage.expectDefaultUnfilteredState();
  });
});

test('Persist Orders State and Tab Navigation', {
  tag: ['@AUT-FV-184', '@orders', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-ORD-C-020' },
  ],
}, async ({ creatorNav, ordersPage }) => {
  test.setTimeout(120000);

  await test.step('Open Orders page and verify loaded', async () => {
    await creatorNav.open('orders');
    await ordersPage.expectLoaded();
  });

  await test.step('Navigate to Promotions tab and back to Orders, verify state preserved', async () => {
    await ordersPage.navigateToPromotionsAndBack();
    await ordersPage.expectOrdersTabLoaded();
    await ordersPage.expectOrderColumnsVisible();
  });
});

test('Validate Orders Read-Only Detail Display', {
  tag: ['@AUT-FV-185', '@orders', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-ORD-C-021' },
  ],
}, async ({ creatorNav, ordersPage }) => {
  test.setTimeout(120000);

  await test.step('Open Orders page and verify read-only display', async () => {
    await creatorNav.open('orders');
    await ordersPage.expectLoaded();
  });

  await test.step('Verify no editable fields exist in the orders table', async () => {
    await ordersPage.expectNoEditableFieldsInTable();
  });
});

test('Validate Orders Time Filter and Combined Filters', {
  tag: ['@AUT-FV-186', '@orders', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-ORD-C-022, TC-ORD-C-023, TC-ORD-C-045' },
  ],
}, async ({ creatorNav, ordersPage }) => {
  test.setTimeout(120000);

  await test.step('Open Orders page and verify time filter options exist', async () => {
    await creatorNav.open('orders');
    await ordersPage.expectLoaded();
    await ordersPage.expectTimeFilterOptionsVisible();
  });

  await test.step('Select Last 30 days and verify filter applied', async () => {
    await ordersPage.selectTimeRange('Last 30 days');
    await ordersPage.expectTimeFilterLabel('Last 30 days');
    await ordersPage.expectFiltersStillEditable();
  });

  await test.step('Combine product types and time range, verify both applied', async () => {
    await ordersPage.resetFilters();
    await ordersPage.applyCombinedFilters(['Digital Download'], 'Last 7 days');
    await ordersPage.expectTimeFilterLabel('Last 7 days');
    await ordersPage.expectFiltersStillEditable();
  });

  await test.step('Reset and verify default state restored', async () => {
    await ordersPage.resetFilters();
    await ordersPage.expectDefaultUnfilteredState();
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
