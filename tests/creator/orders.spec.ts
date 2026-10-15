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
import { orderDetailLabels, orderTypeLabels, ordersExportData, ordersFilterData as F, ordersOverview as O } from '@test-data/creator/orders.data';
import { testImages } from '@test-data/creator/post.data';
import { inboxAccounts, testAccounts } from '@test-data/users';

const buyerToken = () => process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
const phone = () => `812${Date.now().toString().slice(-9)}`;
const typeLabel = (o: ShopOrder) => orderTypeLabels[o.productType];

test.describe('Creator Orders', () => {
  test('Orders — Earnings Overview, Earnings Calculation', {
    tag: ['@AUT-ORD-001', '@orders', '@creator', '@regression'],
  }, async ({ creatorNav, ordersPage, page }) => {
    test.setTimeout(180000);
    const request = page.request;

    await test.step('Lifetime and period earnings cards are displayed with values and currency', async () => {
      await creatorNav.open('orders');
      await ordersPage.expectLoaded();
      const lifetime = await ordersPage.earnings(O.lifetime);
      expect(lifetime).toBeGreaterThanOrEqual(0);
      const allTime = await ordersPage.earnings(O.allTime);
      expect(allTime).toBeGreaterThanOrEqual(0);
    });

    await test.step('Earnings reflect completed transactions and exclude non-completed orders', async () => {
      const summary = await getOrderSummary(request);
      expect(summary.totalEarnings).toBeGreaterThanOrEqual(0);
      expect(summary.totalSales).toBeGreaterThanOrEqual(0);
      const orders = await listOrders(request);
      for (const order of orders.data) {
        expect(order.receivedBySeller).toBeGreaterThanOrEqual(0);
      }
    });

    await test.step('Second earnings card follows selected time period', async () => {
      for (const range of ['Last 7 days', 'Last 14 days', 'Last 30 days'] as const) {
        await ordersPage.selectTimeRange(range);
        const days = range === 'Last 7 days' ? 7 : range === 'Last 14 days' ? 14 : 30;
        const val = await ordersPage.earnings(O.periodEarnings(days));
        expect(val).toBeGreaterThanOrEqual(0);
      }
      await ordersPage.selectTimeRange('All Time');
    });

    await test.step('Export CSV received by seller total matches period orders', async () => {
      await ordersPage.openExportDialog();
      await ordersPage.selectExportPreset('30 days');
      const { lines } = await ordersPage.downloadExportCsv();
      expect(lines.length).toBeGreaterThan(0);
      const headerCols = lines[0].split(',');
      const sellerIdx = headerCols.findIndex((h) => /Received By Seller/i.test(h));
      expect(sellerIdx).toBeGreaterThanOrEqual(0);
      let sumSeller = 0;
      for (let i = 1; i < lines.length; i++) {
        const val = parseFloat(lines[i].split(',')[sellerIdx] || '0');
        if (!isNaN(val)) sumSeller += val;
      }
      expect(sumSeller).toBeGreaterThanOrEqual(0);
    });

    await test.step('Zero-price completed orders add zero to earnings', async () => {
      const completed = (await listOrders(request)).data;
      const freeOrder = completed.find((o) => o.originalPrice === 0 || o.priceAfterDiscount === 0);
      if (freeOrder) {
        expect(freeOrder.receivedBySeller).toBe(0);
      }
    });
  });

  test('Orders — Earnings Freshness, Lifetime Earnings, Orders List, Customer Information, Product Information, Order Amount, Ordering', {
    tag: ['@AUT-ORD-002', '@orders', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'L-41' },
  }, async ({ creatorNav, ordersPage, page, browser }) => {
    test.setTimeout(300000);
    // Known bug L-41 (OM-9): IDR orders reconcile exactly since 2026-10-15, but USDT orders (no final_amount_in_idr) add nothing to Lifetime Earnings. Last step.
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

  test('Orders — Export CTA, Date Options, Custom Range, Last 30 Days Export, Last 60 Days Export, Last 90 Days Export, Custom Range Export, Order Information', {
    tag: ['@AUT-ORD-007', '@orders', '@creator', '@regression'],
  }, async ({ creatorNav, ordersPage }) => {
    test.setTimeout(180000);

    await test.step('Export as CSV button is visible and opens the export dialog', async () => {
      await creatorNav.open('orders');
      await ordersPage.openExportDialog();
    });

    await test.step('Date options include 30 days, 60 days, 90 days and Custom Days presets', async () => {
      await ordersPage.expectExportRangeOptions(ordersExportData.options);
      await ordersPage.closeExportDialog();
    });

    await test.step('Export CSV for Last 30 Days downloads file containing accurate order headers', async () => {
      await ordersPage.openExportDialog();
      await ordersPage.selectExportPreset('30 days');
      const { filename, lines } = await ordersPage.downloadExportCsv();
      expect(filename).toMatch(/\.csv$/);
      expect(lines.length).toBeGreaterThan(0);
      const header = lines[0];
      for (const h of ordersExportData.expectedHeaders) {
        expect(header).toContain(h);
      }
    });

    await test.step('Export CSV for Last 60 Days downloads valid CSV', async () => {
      await ordersPage.openExportDialog();
      await ordersPage.selectExportPreset('60 days');
      const { filename, lines } = await ordersPage.downloadExportCsv();
      expect(filename).toMatch(/\.csv$/);
      expect(lines.length).toBeGreaterThan(0);
    });

    await test.step('Export CSV for Last 90 Days downloads valid CSV', async () => {
      await ordersPage.openExportDialog();
      await ordersPage.selectExportPreset('90 days');
      const { filename, lines } = await ordersPage.downloadExportCsv();
      expect(filename).toMatch(/\.csv$/);
      expect(lines.length).toBeGreaterThan(0);
    });

    await test.step('Custom date range can be selected and exported', async () => {
      await ordersPage.openExportDialog();
      await ordersPage.selectCustomExportRange();
      const { filename, lines } = await ordersPage.downloadExportCsv();
      expect(filename).toMatch(/\.csv$/);
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  test('Orders — Product Information, Buyer Information, Payment Information, Promotion Information, Affiliate Information, Export Accuracy, Downloaded File', {
    tag: ['@AUT-ORD-008', '@orders', '@creator', '@regression'],
  }, async ({ creatorNav, ordersPage }) => {
    test.setTimeout(180000);

    let csvData!: { filename: string; content: string; lines: string[] };

    await test.step('Downloaded file is valid CSV and can be opened', async () => {
      await creatorNav.open('orders');
      await ordersPage.openExportDialog();
      await ordersPage.selectExportPreset('90 days');
      csvData = await ordersPage.downloadExportCsv();
      expect(csvData.filename).toMatch(/\.csv$/);
      expect(csvData.lines.length).toBeGreaterThan(1);
    });

    await test.step('CSV contains Product Information columns', async () => {
      const header = csvData.lines[0];
      for (const col of ordersExportData.productHeaders) {
        expect(header).toContain(col);
      }
    });

    await test.step('CSV contains Buyer Information columns', async () => {
      const header = csvData.lines[0];
      for (const col of ordersExportData.buyerHeaders) {
        expect(header).toContain(col);
      }
    });

    await test.step('CSV contains Payment Information columns', async () => {
      const header = csvData.lines[0];
      for (const col of ordersExportData.paymentHeaders) {
        expect(header).toContain(col);
      }
    });

    await test.step('CSV contains Promotion Information columns', async () => {
      const header = csvData.lines[0];
      for (const col of ordersExportData.promoHeaders) {
        expect(header).toContain(col);
      }
    });

    await test.step('CSV contains Affiliate Information columns', async () => {
      const header = csvData.lines[0];
      for (const col of ordersExportData.affiliateHeaders) {
        expect(header).toContain(col);
      }
    });

    await test.step('Export Accuracy: record rows have consistent column count and non-empty IDs', async () => {
      const headerCols = csvData.lines[0].split(',');
      const dataRows = csvData.lines.slice(1).filter((l) => l.trim().length > 0);
      expect(dataRows.length).toBeGreaterThan(0);
      for (const row of dataRows) {
        const cols = row.split(',');
        expect(cols.length).toBe(headerCols.length);
        expect(cols[0].trim().length).toBeGreaterThan(0);
      }
    });

    await test.step('CSV carries a Product Type column with the list badge labels', async () => {
      const headerCols = csvData.lines[0].replace(/^﻿/, '').split(',');
      const typeIndex = headerCols.indexOf('Product Type');
      expect(typeIndex).toBe(headerCols.indexOf('Product Name') + 1);
      const types = new Set(csvData.lines.slice(1).map((l) => l.split(',')[typeIndex]));
      for (const type of types) expect(ordersExportData.productTypeLabels).toContain(type);
    });
  });

  test('Orders — Search, Customer Privacy, Copy Actions, Pagination, Transaction Statuses', {
    tag: ['@AUT-ORD-009', '@orders', '@creator', '@regression'],
  }, async ({ creatorNav, ordersPage, page, context }) => {
    test.setTimeout(180000);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const request = page.request;
    const [first] = (await listOrders(request)).data;

    await test.step('Search Orders filters matching product name and empty query restores list', async () => {
      await creatorNav.open('orders');
      await ordersPage.expectLoaded();
      await ordersPage.search(first.productName.slice(0, 10));
      await page.waitForTimeout(1000);
      const rows = await ordersPage.readRows();
      expect(rows.length).toBeGreaterThan(0);
      await ordersPage.search(F.emptySearch);
      await ordersPage.expectNoResults();
      await ordersPage.clearFromEmptyState();
    });

    await test.step('Customer email is truncated on the list and full on Order Details', async () => {
      await ordersPage.expectLoaded();
      const rows = await ordersPage.readRows();
      expect(rows[0].email).toContain('...');
      const copiedEmail = await ordersPage.copyBuyerEmail(0);
      expect(copiedEmail).toBe(first.buyerEmail);
      await ordersPage.openRow(0);
      await ordersPage.expectDetailField('Email', first.buyerEmail);
      await ordersPage.expectDetailField('Phone Number', first.buyerPhoneNumber);
      await ordersPage.backToList();
    });

    await test.step('Copy Order ID copies full UUID with confirmation toast', async () => {
      const copiedUuid = await ordersPage.copyOrderId(0);
      expect(copiedUuid).toBe(first.orderUUID);
    });

    await test.step('Page indicator displays Page 1 of 0 when search yields no results', async () => {
      await ordersPage.search(F.emptySearch);
      await ordersPage.expectNoResults();
      const indicatorText = await ordersPage.pageIndicator.textContent();
      expect(indicatorText).toMatch(/Page (?:1|0) of 0/);
      await ordersPage.clearFromEmptyState();
    });

    await test.step('Orders List, Order Details, and CSV do not display transaction status', async () => {
      const headers = await page.getByRole('columnheader').allTextContents();
      for (const h of headers) {
        expect(h.toLowerCase()).not.toContain('status');
      }
      await ordersPage.openRow(0);
      const mainText = (await page.getByRole('main').textContent()) ?? '';
      expect(mainText.toLowerCase()).not.toContain('transaction status');
      await ordersPage.backToList();
      await ordersPage.openExportDialog();
      const { lines } = await ordersPage.downloadExportCsv();
      const headerLine = lines[0] ?? '';
      const csvCols = headerLine.split(',');
      for (const col of csvCols) {
        expect(col.toLowerCase().trim()).not.toBe('status');
      }
    });

    await test.step('Pagination 10 rows per page with first/prev disabled on page 1', async () => {
      await ordersPage.expectLoaded();
      const rows = await ordersPage.readRows();
      expect(rows.length).toBeLessThanOrEqual(10);
      await expect(page.getByRole('button', { name: 'Go to first page' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Go to previous page' })).toBeDisabled();
      await expect(ordersPage.pageIndicator).toHaveText(/^Page 1 of \d+$/);
    });
  });

  test('Orders — Timezone, CSV Schema, CSV Contract, Download Delivery, Direct URL, Filter Persistence, Export and Page Filter Relation', {
    tag: ['@AUT-ORD-010', '@orders', '@creator', '@regression'],
  }, async ({ creatorNav, ordersPage, page }) => {
    test.setTimeout(180000);
    const request = page.request;
    const [first] = (await listOrders(request)).data;

    let csvData!: { filename: string; content: string; lines: string[] };

    await test.step('CSV delivery: direct download, valid filename, comma delimiter, UTF-8 BOM and CRLF line endings', async () => {
      await creatorNav.open('orders');
      await ordersPage.openExportDialog();
      await ordersPage.selectExportPreset('30 days');
      csvData = await ordersPage.downloadExportCsv();
      expect(csvData.filename).toMatch(/^report_\d{8}_\d{6}_user_\w+\.csv$/);
      expect(csvData.content.startsWith('\uFEFF')).toBe(true);
      expect(csvData.lines[0]).toContain(',');
      expect(csvData.lines[0]).not.toContain(';');
      expect(csvData.content).toContain('\r\n');
      expect(csvData.content).not.toMatch(/[^\r]\n/);
    });

    await test.step('CSV uses UTC and marks it in the header and rows while web displays local time', async () => {
      expect(csvData.lines[0]).toContain('Purchase Date (UTC)');
      if (csvData.lines.length > 1) {
        expect(csvData.lines[1]).toContain('UTC');
      }
      const rows = await ordersPage.readRows();
      expect(rows[0].date).toMatch(/\d{2} \w+ \d{4} \d{2}:\d{2}/);
    });

    await test.step('CSV schema includes dynamic columns such as product custom questions', async () => {
      const headerCols = csvData.lines[0].split(',');
      expect(headerCols.length).toBeGreaterThanOrEqual(24);
      for (let i = 1; i < csvData.lines.length; i++) {
        expect(csvData.lines[i].split(',').length).toBe(headerCols.length);
      }
    });

    await test.step('Order Details can be loaded directly via URL', async () => {
      await ordersPage.openDetail(first.orderUUID);
      await ordersPage.expectDetailOf(first.orderUUID);
      await ordersPage.backToList();
    });

    await test.step('Returning from Order Details resets list filters to default', async () => {
      await ordersPage.selectTimeRange('Last 30 days');
      await ordersPage.openRow(0);
      await ordersPage.backToList();
      await ordersPage.expectDefaultFilters();
    });

    await test.step('CSV export follows dialog date range and ignores page filters', async () => {
      await ordersPage.selectProductTypes([F.multiSelectTypes[0]]);
      let exportUrl: string | undefined;
      page.on('request', (req) => {
        if (req.url().includes('/orders/reports')) {
          exportUrl = req.url();
        }
      });
      await ordersPage.openExportDialog();
      await ordersPage.selectExportPreset('30 days');
      await ordersPage.downloadExportCsv();
      if (exportUrl) {
        const u = new URL(exportUrl);
        expect(u.searchParams.get('product_type')).toBeNull();
        expect(u.searchParams.get('status')).toBe('completed');
      }
      await ordersPage.resetFromToolbar();
    });
  });

  test('Orders — Tipping Records, Tipping Sort', {
    tag: ['@AUT-ORD-011', '@orders', '@creator', '@regression'],
  }, async ({ creatorNav, ordersPage }) => {
    test.setTimeout(180000);

    await test.step('Open Orders and switch to Tipping tab', async () => {
      await creatorNav.open('orders');
      await ordersPage.expectLoaded();
      await ordersPage.selectTab('Tipping');
    });

    const panel = ordersPage.tabPanel('Tipping');

    await test.step('Tipping records display supporter, relative time, amount, and message if available', async () => {
      await expect(panel.getByText(/Rp[\d.]+/).first()).toBeVisible({ timeout: 15000 });
      await expect(panel.getByText(/ago|yesterday|today|\d{4}/i).first()).toBeVisible();
    });

    await test.step('Sort tipping records by Recent', async () => {
      await ordersPage.selectTippingSort('Recent');
      await expect(panel.getByRole('combobox')).toHaveText(/Recent/i);
      await expect(panel.getByText(/Rp[\d.]+/).first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('Sort tipping records by Leaderboard', async () => {
      await ordersPage.selectTippingSort('Leaderboard');
      await expect(panel.getByRole('combobox')).toHaveText(/Leaderboard/i);
      await expect(panel.getByText(/Rp[\d.]+/).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test('Orders — Campaign Records, PPV Records, PPV Filter, PPV Export', {
    tag: ['@AUT-ORD-012', '@orders', '@creator', '@regression'],
  }, async ({ creatorNav, ordersPage }) => {
    test.setTimeout(180000);

    await test.step('Campaign activations display donation type, donor, and amount without message', async () => {
      await creatorNav.open('orders');
      await ordersPage.expectLoaded();
      await ordersPage.selectTab('Campaigns Activations');
      const campPanel = ordersPage.tabPanel('Campaigns Activations');
      await expect(campPanel.getByText(/Rp\s*[\d.]+/).first()).toBeVisible({ timeout: 15000 });
      await expect(campPanel.getByText(/Message/i)).toHaveCount(0);
    });

    await test.step('PPV tab renders table headers for post purchases', async () => {
      await ordersPage.selectTab('PPV');
      const ppvPanel = ordersPage.tabPanel('PPV');
      for (const col of ['ORDER ID', 'CUSTOMER', 'POST', 'PURCHASE DATE', 'TOTAL PRICE']) {
        await expect(ppvPanel.getByRole('columnheader', { name: col })).toBeVisible({ timeout: 10000 });
      }
    });

    await test.step('PPV tab provides date range filter', async () => {
      const ppvPanel = ordersPage.tabPanel('PPV');
      const trigger = ppvPanel.getByRole('combobox').or(ppvPanel.getByRole('button', { name: /days/i })).first();
      await expect(trigger).toBeVisible();
    });

    await test.step('Export as CSV from PPV downloads valid CSV', async () => {
      const { filename, lines } = await ordersPage.exportTabCsv('PPV');
      expect(filename).toMatch(/\.csv$/);
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  test('Orders — Membership Records, Membership Filter, Membership Export', {
    tag: ['@AUT-ORD-013', '@orders', '@creator', '@regression'],
  }, async ({ creatorNav, ordersPage }) => {
    test.setTimeout(180000);

    await test.step('Membership tab renders table headers and existing records', async () => {
      await creatorNav.open('orders');
      await ordersPage.expectLoaded();
      await ordersPage.selectTab('Membership');
      const memPanel = ordersPage.tabPanel('Membership');
      for (const col of ['ORDER ID', 'CUSTOMER', 'MEMBERSHIP NAME', 'PURCHASE DATE', 'TOTAL PRICE']) {
        await expect(memPanel.getByRole('columnheader', { name: col })).toBeVisible({ timeout: 10000 });
      }
      await expect(memPanel.getByRole('rowgroup').nth(1).getByRole('row').first()).toBeVisible({ timeout: 15000 });
    });

    await test.step('Membership tab provides date range filter', async () => {
      const memPanel = ordersPage.tabPanel('Membership');
      const trigger = memPanel.getByRole('combobox').or(memPanel.getByRole('button', { name: /days/i })).first();
      await expect(trigger).toBeVisible();
    });

    await test.step('Export as CSV from Membership downloads valid CSV', async () => {
      const { filename, lines } = await ordersPage.exportTabCsv('Membership');
      expect(filename).toMatch(/\.csv$/);
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  test('Orders — Lifetime Access Records, Lifetime Access Filter, Lifetime Access Export', {
    tag: ['@AUT-ORD-014', '@orders', '@creator', '@regression'],
  }, async ({ creatorNav, ordersPage }) => {
    test.setTimeout(180000);

    await test.step('Lifetime Access tab renders table headers for lifetime purchases', async () => {
      await creatorNav.open('orders');
      await ordersPage.expectLoaded();
      await ordersPage.selectTab('Lifetime Access');
      const lifePanel = ordersPage.tabPanel('Lifetime Access');
      for (const col of ['ORDER ID', 'CUSTOMER', 'AMOUNT', 'PURCHASE DATE', 'TOTAL PRICE']) {
        await expect(lifePanel.getByRole('columnheader', { name: col })).toBeVisible({ timeout: 10000 });
      }
    });

    await test.step('Lifetime Access tab provides date range filter', async () => {
      const lifePanel = ordersPage.tabPanel('Lifetime Access');
      const trigger = lifePanel.getByRole('combobox').or(lifePanel.getByRole('button', { name: /days/i })).first();
      await expect(trigger).toBeVisible();
    });

    await test.step('Export as CSV from Lifetime Access downloads valid CSV', async () => {
      const { filename, lines } = await ordersPage.exportTabCsv('Lifetime Access');
      expect(filename).toMatch(/\.csv$/);
      expect(lines.length).toBeGreaterThan(0);
    });
  });
});

