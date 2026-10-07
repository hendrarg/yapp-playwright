import { creatorAuthTest as test, expect } from '../test-base';
import { signInWithEmailOtp } from '@helpers/auth/otp-login';
import { loginWithToken } from '@helpers/auth/token-login';
import { allTimeStart, getOrder, getOrderSummary, listAllOrders, listOrders, orderDate } from '@helpers/api/orders';
import type { ShopOrder } from '@helpers/api/orders';
import { createDigitalProduct, deleteProduct, productSharePath } from '@helpers/api/product';
import { depositWebhook } from '@helpers/api/webhook';
import { OrdersPage } from '@pages/creator/OrdersPage';
import { ProductPurchasePage } from '@pages/buyer/ProductPurchasePage';
import { baseURL, creatorsBaseURL } from '@config/env';
import { orderDetailLabels, orderTypeLabels, ordersFilterData as F, ordersOverview as O } from '@test-data/creator/orders.data';
import { testImages } from '@test-data/creator/post.data';
import { inboxAccounts, testAccounts } from '@test-data/users';

const buyerToken = () => process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
const phone = () => `812${Date.now().toString().slice(-9)}`;
const typeLabel = (o: ShopOrder) => orderTypeLabels[o.productType];

test.describe('Creator Orders', () => {
  test('Orders — Earnings Freshness, Lifetime Earnings, Orders List, Customer Information, Product Information, Order Amount, Ordering', {
    tag: ['@AUT-ORD-002', '@orders', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'L-41' },
  }, async ({ creatorNav, ordersPage, page, browser }) => {
    test.setTimeout(300000);
    // Known bug L-41: Lifetime Earnings is rounded, so it misses the fractional rupiah the orders add up to. Last step.
    test.fail(true, 'L-41: Lifetime Earnings does not reconcile exactly with the sum of the orders');
    const request = page.request;
    let firstPage: ShopOrder[] = [];
    let rows: Awaited<ReturnType<OrdersPage['readRows']>> = [];

    await test.step('The Orders list shows the transaction table', async () => {
      await creatorNav.open('orders');
      firstPage = (await listOrders(request)).data;
      await ordersPage.expectRowsMatch(firstPage);
      rows = await ordersPage.readRows();
      expect(rows).toHaveLength(firstPage.length);
    });

    await test.step('Every row shows its own, unique Order ID', async () => {
      expect(rows.map((r) => r.id)).toEqual(firstPage.map((o) => OrdersPage.displayId(o.orderUUID)));
      expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    });

    await test.step('Customer name, email and phone match the buyer of each order', async () => {
      rows.forEach((row, i) => expect([row.name, row.email, row.phone]).toEqual([
        firstPage[i].buyerName, OrdersPage.displayEmail(firstPage[i].buyerEmail), firstPage[i].buyerPhoneNumber,
      ]));
    });

    await test.step('Product type and product name match the purchased item', async () => {
      rows.forEach((row, i) => expect([row.type, row.product]).toEqual([typeLabel(firstPage[i]), firstPage[i].productName]));
    });

    await test.step('Purchase date and total price are accurate', async () => {
      rows.forEach((row, i) => expect([row.date, row.total]).toEqual([
        OrdersPage.displayDate(firstPage[i].purchaseDate), `Rp${firstPage[i].priceAfterDiscount.toLocaleString('id-ID')}`,
      ]));
    });

    await test.step('Newest transactions come first', async () => {
      const dates = firstPage.map((o) => o.purchaseDate);
      expect([...dates].sort().reverse()).toEqual(dates);
      const secondPage = (await listOrders(request, { page: 2 })).data;
      expect(secondPage[0].purchaseDate <= dates[dates.length - 1]).toBe(true);
    });

    await test.step('A new completed transaction shows up first and in the overview after a refresh', async () => {
      const title = `Orders freshness ${Date.now()}`;
      const product = await createDigitalProduct(request, {
        title, description: 'Orders overview freshness', thumbnailImagePath: testImages.claude, price: 15000,
        links: [{ label: 'Notes', url: 'https://example.com/notes' }],
      });
      const buyer = await browser.newContext({ viewport: page.viewportSize() });
      try {
        await loginWithToken(buyer, buyerToken()!, baseURL);
        const checkout = new ProductPurchasePage(await buyer.newPage(), baseURL);
        await checkout.openOnlineCourseCheckout(title, productSharePath(product));
        const orderId = await checkout.payOnlineCourseCheckout({ name: 'QA Buyer', phone: phone() });
        await depositWebhook(request, orderId);
        await expect.poll(async () => (await listOrders(request)).data[0].productName, { timeout: 30000 }).toBe(title);
        await page.reload();
        await ordersPage.expectRowsMatch((await listOrders(request)).data);
        expect((await ordersPage.readRows())[0].product).toBe(title);
        await ordersPage.expectEarnings(O.lifetime, (await getOrderSummary(request)).totalEarnings);
      } finally {
        await buyer.close();
        await deleteProduct(request, product.productUuid);
      }
    });

    await test.step('Lifetime Earnings equals the total received over every completed order', async () => {
      const all = await listAllOrders(request);
      const received = all.reduce((sum, o) => sum + o.receivedBySeller, 0);
      expect(await ordersPage.earnings(O.lifetime)).toBe(received);
    });
  });

  test('Orders — Empty Earnings, 30 Days Earnings, Empty Orders, Stability (negative & boundary)', {
    tag: ['@AUT-ORD-003', '@orders', '@creator', '@regression'],
  }, async ({ creatorNav, ordersPage, page, browser }) => {
    test.setTimeout(300000);
    const request = page.request;
    const errors = ordersPage.trackErrors();

    await test.step('Last 30 days earnings count exactly the orders inside the window', async () => {
      await creatorNav.open('orders');
      const start = orderDate(F.timeRangeDays);
      const sent = await ordersPage.selectTimeRange(F.timeRange);
      expect(sent?.searchParams.get('start_date')).toBe(start);
      const summary = await getOrderSummary(request, { start });
      await ordersPage.expectEarnings(O.periodEarnings(F.timeRangeDays), summary.totalEarningOnRangeTime);
      const inside = await listAllOrders(request, { start });
      expect(inside).toHaveLength(summary.totalSalesOnRangeTime);
      const startOfWindow = new Date(`${start}T00:00:00+07:00`).getTime();
      for (const o of inside) expect(new Date(o.purchaseDate).getTime()).toBeGreaterThanOrEqual(startOfWindow);
      const outside = (await listAllOrders(request, { start: allTimeStart })).filter((o) => !inside.some((i) => i.orderUUID === o.orderUUID));
      for (const o of outside) expect(new Date(o.purchaseDate).getTime()).toBeLessThan(startOfWindow);
    });

    await test.step('The page loads, filters and pages without runtime errors in the console', async () => {
      await page.reload();
      await ordersPage.expectLoaded();
      await ordersPage.selectProductTypes(F.multiSelectTypes);
      await ordersPage.resetFromToolbar();
      await ordersPage.goToLastPage();
      expect(errors.runtime, `console/page errors (failed requests: ${errors.failedRequests.join(', ')})`).toEqual([]);
    });

    const creator = await browser.newContext({ viewport: page.viewportSize() });
    try {
      const signIn = await creator.newPage();
      const { token } = await signInWithEmailOtp(signIn, baseURL, inboxAccounts.emptyCreator);
      await loginWithToken(creator, token, creatorsBaseURL);
      const empty = new OrdersPage(signIn, creatorsBaseURL);

      await test.step('A creator with no completed transaction sees zero earnings and a prompt to create a product', async () => {
        await empty.goto();
        await empty.expectNoSalesState();
      });

      await test.step('A creator with no orders sees an empty list, not a broken table or someone else\'s orders', async () => {
        await empty.expectNoOrderRows();
      });
    } finally {
      await creator.close();
    }
  });

  test('Orders — Navigation, Order Information, Payment Method, Purchased Product, Revenue Summary, Back Navigation, Read-only, List-Detail Consistency', {
    tag: ['@AUT-ORD-004', '@orders', '@creator', '@smoke'],
  }, async ({ creatorNav, ordersPage, page }) => {
    test.setTimeout(180000);
    const request = page.request;
    const [first] = (await listOrders(request)).data;
    const order = await getOrder(request, first.orderUUID);
    let row!: Awaited<ReturnType<OrdersPage['readRows']>>[number];

    await test.step('Clicking an order opens Order Details for that order', async () => {
      await creatorNav.open('orders');
      await ordersPage.expectRowsMatch((await listOrders(request)).data);
      [row] = await ordersPage.readRows();
      expect(await ordersPage.openRow(0)).toBe(first.orderUUID);
      await ordersPage.expectDetailOf(first.orderUUID);
    });

    await test.step('Customer details match the list and the order', async () => {
      await ordersPage.expectCustomerDetails(order);
      expect(row.name).toBe(order.buyerName);
    });

    await test.step('Payment method matches the transaction', async () => {
      await ordersPage.expectDetailField(orderDetailLabels.paymentMethod, order.paymentMethod);
    });

    await test.step('The purchased product is shown with its type and name', async () => {
      await ordersPage.expectPurchasedProduct(row, order.quantity);
    });

    await test.step('Product price, subtotal and amount received by the seller are accurate', async () => {
      await ordersPage.expectRevenue(order);
    });

    await test.step('Order Details is read-only', async () => {
      await ordersPage.expectDetailReadOnly();
    });

    await test.step('Purchase date on Order Details matches the list', async () => {
      await ordersPage.expectDetailField(orderDetailLabels.purchaseDate, row.date);
      await ordersPage.expectDetailField(orderDetailLabels.subtotal, row.total);
    });

    await test.step('Back returns to the Orders list', async () => {
      await ordersPage.backToList();
    });
  });

  test('Orders — Time Period Filter, Last 30 Days, Product Filter, Multi-selection, Product Results, Apply Filters, Clear Filters', {
    tag: ['@AUT-ORD-005', '@orders', '@creator', '@regression'],
  }, async ({ creatorNav, ordersPage, page }) => {
    test.setTimeout(240000);
    const request = page.request;
    const types = [...F.multiSelectApiTypes];
    const totalPages = (await listOrders(request)).totalPages;

    await test.step('The time period filter offers the predefined ranges', async () => {
      await creatorNav.open('orders');
      await ordersPage.expectTimeOptions(F.timeRanges, F.customDate);
    });

    await test.step('Last 30 days shows only orders from the last 30 days', async () => {
      const sent = await ordersPage.selectTimeRange(F.timeRange);
      const start = orderDate(F.timeRangeDays);
      expect(sent?.searchParams.get('start_date')).toBe(start);
      await ordersPage.expectRowsMatch((await listOrders(request, { start })).data);
      await ordersPage.resetFromToolbar();
    });

    await test.step('The product filter lists product types as checkboxes with All Products on by default', async () => {
      await ordersPage.expectProductOptions(F.productTypes);
    });

    await test.step('Two product types stay selected together', async () => {
      const sent = await ordersPage.selectProductTypes(F.multiSelectTypes);
      expect(sent?.searchParams.get('product_type')?.split(',').sort()).toEqual([...types].sort());
      await ordersPage.expectProductTypesChecked(F.multiSelectTypes);
    });

    await test.step('Only orders of the selected types are listed', async () => {
      await ordersPage.expectRowsMatch((await listOrders(request, { productTypes: types })).data);
      await ordersPage.expectRowTypesOnly(F.multiSelectTypes);
    });

    await test.step('Applying a time period on top updates the list to both criteria', async () => {
      const sent = await ordersPage.selectTimeRange(F.narrowRange);
      const start = orderDate(60);
      expect([sent?.searchParams.get('start_date'), sent?.searchParams.get('product_type')?.split(',').sort().join(',')]).toEqual([start, [...types].sort().join(',')]);
      await ordersPage.expectRowsMatch((await listOrders(request, { start, productTypes: types })).data);
    });

    await test.step('Reset Filter in the toolbar brings back the full list', async () => {
      await ordersPage.resetFromToolbar();
      await ordersPage.expectDefaultFilters(totalPages);
      await ordersPage.expectRowsMatch((await listOrders(request)).data);
    });

    await test.step('Clear filter in the empty state resets the same way as the toolbar', async () => {
      await ordersPage.selectProductTypes(F.multiSelectTypes);
      await ordersPage.search(F.emptySearch);
      await ordersPage.expectNoResults();
      await ordersPage.clearFromEmptyState();
      await ordersPage.expectDefaultFilters(totalPages);
      await ordersPage.expectRowsMatch((await listOrders(request)).data);
    });
  });

  test('Orders — No Results, Combined Filters, Pagination State, Product Filter Terminology, Filter URL State', {
    tag: ['@AUT-ORD-006', '@orders', '@creator', '@regression'],
  }, async ({ creatorNav, ordersPage, page }) => {
    test.setTimeout(240000);
    const request = page.request;
    const types = [...F.multiSelectApiTypes];

    await test.step('A filter combination with no orders shows the empty result and keeps the filters editable', async () => {
      await creatorNav.open('orders');
      await ordersPage.selectTimeRange(F.timeRange);
      await ordersPage.search(F.emptySearch);
      await ordersPage.expectNoResults();
      await ordersPage.clearFromEmptyState();
    });

    await test.step('Time period and product types combine', async () => {
      await ordersPage.selectProductTypes(F.multiSelectTypes);
      await ordersPage.selectTimeRange(F.narrowRange);
      const expected = await listAllOrders(request, { start: orderDate(60), productTypes: types });
      await ordersPage.expectRowsMatch(expected.slice(0, 10));
      for (const o of expected) expect(types).toContain(o.productType);
      await ordersPage.resetFromToolbar();
    });

    await test.step('Changing a filter from the last page returns to page 1', async () => {
      const all = await listOrders(request);
      expect(await ordersPage.goToLastPage()).toBe(`Page ${all.totalPages} of ${all.totalPages}`);
      // A range not loaded yet in this test, so the page has to fetch it rather than answer from cache.
      const sent = await ordersPage.selectTimeRange(F.pagingRange);
      expect(sent?.searchParams.get('page')).toBe('1');
      const narrowed = await listOrders(request, { start: orderDate(F.pagingRangeDays) });
      await ordersPage.expectPage(`Page 1 of ${narrowed.totalPages}`);
      await ordersPage.resetFromToolbar();
    });

    await test.step('The product filter lists types but its trigger counts them as Products', async () => {
      expect(await ordersPage.productFilterLabel()).toBe('All Products');
      await ordersPage.selectProductTypes(F.multiSelectTypes);
      expect(await ordersPage.productFilterLabel()).toBe(`${F.multiSelectTypes.length} Products`);
    });

    await test.step('Applied filters are not reflected in the URL', async () => {
      await ordersPage.selectTimeRange(F.timeRange);
      await ordersPage.expectUrlCarriesNoFilters();
    });
  });
});
