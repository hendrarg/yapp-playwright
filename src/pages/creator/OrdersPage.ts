import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { safeClick, safeFill, waitForLoaded } from "@utils/playwright.utils";
import type { ShopOrder, ShopOrderDetail } from "@helpers/api/orders";
import { orderDetailLabels as D, orderTypeLabels, ordersFilterData as F, ordersOverview as O } from "@test-data/creator/orders.data";

/** One Orders list row as rendered (cells read by role, not by position in the DOM). */
export interface OrderRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  product: string;
  date: string;
  total: string;
}

const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Creator Orders — its own sidebar page at `/orders` since Oct 2026 (it used to be the Orders
 * tab of `/products`). Overview cards on top, then Performance Details with the Products tab:
 * search, time and product-type filters, the orders table and the pager. A row opens
 * `/orders/<orderUuid>` (Order Details).
 */
export class OrdersPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  private get main(): Locator {
    return this.page.getByRole("main");
  }

  /** The active Performance Details tab; the hidden tabs render their own pager and empty texts. */
  private get panel(): Locator {
    return this.page.getByRole("tabpanel", { name: "Products" });
  }

  readonly searchInput = this.page.getByRole("textbox", { name: "Search" });
  readonly exportCsvButton = this.page.getByRole("button", { name: "Export as CSV", exact: true });
  readonly resetFilterButton = this.page.getByRole("button", { name: "Reset Filter", exact: true });
  readonly clearFilterButton = this.page.getByRole("button", { name: "Clear filter", exact: true });
  get pageIndicator(): Locator {
    return this.panel.getByText(/^Page \d+ of \d+$/).filter({ visible: true });
  }
  /** Radix popover holding the product checkboxes; `data-slot` is the app's own stable hook. */
  private readonly filterPopover = this.page.locator('[data-slot="popover-content"]');

  /** A creator who never finished onboarding lands on /onboard first; "I'll do it later" lets them through. */
  async goto() {
    await this.page.goto(new URL("orders", this.baseURL).toString(), { waitUntil: "domcontentloaded" });
    const later = this.page.getByRole("button", { name: "I'll do it later" });
    await expect(this.page.getByText(O.lifetime).or(later).first()).toBeVisible({ timeout: 20000 });
    if (await later.isVisible()) {
      await safeClick(later);
      await this.page.goto(new URL("orders", this.baseURL).toString(), { waitUntil: "domcontentloaded" });
    }
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/orders$/);
    await expect(this.main.getByText(O.lifetime, { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByRole("columnheader", { name: "ORDER ID" })).toBeVisible({ timeout: 15000 });
    await expect(this.exportCsvButton).toBeVisible();
  }

  // ── Overview ──
  /** An overview card: the smallest block holding its label and an Rp figure. */
  private card(label: string | RegExp): Locator {
    return this.main.locator("div")
      .filter({ has: this.page.getByText(label, { exact: true }) })
      .filter({ hasText: /Rp[\d.]+/ })
      .last();
  }

  async earnings(label: string | RegExp): Promise<number> {
    const text = (await this.card(label).textContent()) ?? "";
    return Number((text.match(/Rp([\d.]+)/) ?? [])[1]?.replace(/\./g, "") ?? NaN);
  }

  async expectEarnings(label: string | RegExp, amount: number) {
    await expect.poll(() => this.earnings(label), { timeout: 20000 }).toBe(Math.round(amount));
  }

  /** A creator with no completed order: both cards Rp0 and the list invites them to create a product. */
  async expectNoSalesState() {
    await expect(this.card(O.lifetime)).toContainText("Rp0", { timeout: 20000 });
    await expect(this.card(O.allTime)).toContainText("Rp0");
    await expect(this.panel.getByText(O.noOrdersHeading).filter({ visible: true })).toBeVisible();
    await expect(this.panel.getByText(O.noOrdersHint).filter({ visible: true })).toBeVisible();
    await expect(this.panel.getByRole("link", { name: O.createProduct })).toHaveAttribute("href", /\/products/);
  }

  /** The empty list keeps its header and pager, and shows no order rows from anyone. */
  async expectNoOrderRows() {
    await expect(this.page.getByRole("columnheader", { name: "ORDER ID" })).toBeVisible();
    await expect(this.dataRows()).toHaveCount(1);
    await expect(this.dataRows().first()).toContainText(O.noOrdersHeading);
    await expect(this.panel.getByText(/@/)).toHaveCount(0);
    await expect(this.pageIndicator).toBeVisible();
  }

  // ── List ──
  private dataRows(): Locator {
    return this.panel.getByRole("rowgroup").nth(1).getByRole("row");
  }

  async readRows(): Promise<OrderRow[]> {
    await expect(this.dataRows().first()).toBeVisible({ timeout: 20000 });
    const rows: OrderRow[] = [];
    for (const row of await this.dataRows().all()) {
      const cells = row.getByRole("cell");
      const customer = cells.nth(1);
      const product = cells.nth(2);
      rows.push({
        id: ((await cells.nth(0).textContent()) ?? "").trim(),
        name: ((await customer.getByRole("paragraph").first().textContent()) ?? "").trim(),
        email: ((await customer.getByRole("button").nth(0).textContent()) ?? "").trim(),
        phone: ((await customer.getByRole("button").nth(1).textContent()) ?? "").trim(),
        type: ((await product.textContent()) ?? "").replace(((await product.getByRole("paragraph").textContent()) ?? ""), "").trim(),
        product: ((await product.getByRole("paragraph").textContent()) ?? "").trim(),
        date: ((await cells.nth(3).textContent()) ?? "").trim(),
        total: ((await cells.nth(4).textContent()) ?? "").trim(),
      });
    }
    return rows;
  }

  /** Wait until the rendered rows are this page of orders (the table refreshes with no spinner). */
  async expectRowsMatch(orders: ShopOrder[]) {
    await expect.poll(async () => (await this.readRows()).map((r) => r.id).join(","), { timeout: 20000 })
      .toBe(orders.map((o) => OrdersPage.displayId(o.orderUUID)).join(","));
    const rows = await this.readRows();
    orders.forEach((order, i) => OrdersPage.expectRowShowsOrder(rows[i], order));
  }

  /** `850b42f3...3069` — the first 8 and last 4 characters of the order UUID. */
  static displayId(uuid: string) {
    return `${uuid.slice(0, 8)}...${uuid.slice(-4)}`;
  }

  /** `alt...j7m@yopmail.com` — 3 characters either side of the local part. */
  static displayEmail(email: string) {
    const [local, domain] = email.split("@");
    return `${local.slice(0, 3)}...${local.slice(-3)}@${domain}`;
  }

  /** `07 October 2026 13:18`, Jakarta time — the list and the detail use the same format. */
  static displayDate(iso: string) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
    return `${parts.day} ${parts.month} ${parts.year} ${parts.hour}:${parts.minute}`;
  }

  static expectRowShowsOrder(row: OrderRow, order: ShopOrder) {
    expect(row, `row for ${order.orderUUID}`).toEqual({
      id: OrdersPage.displayId(order.orderUUID),
      name: order.buyerName,
      email: OrdersPage.displayEmail(order.buyerEmail),
      phone: order.buyerPhoneNumber,
      type: orderTypeLabels[order.productType] ?? row.type,
      product: order.productName,
      date: OrdersPage.displayDate(order.purchaseDate),
      total: rupiah(order.priceAfterDiscount),
    });
  }

  async expectRowTypesOnly(allowed: readonly string[]) {
    const rows = await this.readRows();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(allowed, `row ${row.id} type`).toContain(row.type);
  }

  async openRow(index = 0): Promise<string> {
    await safeClick(this.dataRows().nth(index).getByRole("cell").nth(3));
    await expect(this.page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, { timeout: 20000 });
    await waitForLoaded(this.page);
    return this.page.url().split("/orders/")[1];
  }

  // ── Order Details ──
  async openDetail(orderUuid: string) {
    await this.page.goto(new URL(`orders/${orderUuid}`, this.baseURL).toString(), { waitUntil: "domcontentloaded" });
    await this.expectDetailOf(orderUuid);
  }

  /** Revenue names the redeemed promotion: `Promo Code Discount (<promo name>) -Rp<discount>`. */
  async expectPromoCodeDiscount(promoName: string, discount: number) {
    await this.expectDetailField(`${D.promoCodeDiscount} (${promoName})`, `-${rupiah(discount)}`);
  }

  async expectDetailOf(orderUuid: string) {
    await expect(this.main.getByRole("heading", { name: `Order #${orderUuid}` })).toBeVisible({ timeout: 20000 });
  }

  /** A label/value pair on Order Details (the value directly follows its label). */
  async expectDetailField(label: string, value: string) {
    await expect(this.main, `${label} on Order Details`).toContainText(new RegExp(`${escape(label)}\\s*${escape(value)}`), { timeout: 15000 });
  }

  async expectCustomerDetails(order: ShopOrderDetail) {
    await expect(this.main.getByRole("heading", { name: D.customer })).toBeVisible();
    await this.expectDetailField("Name", order.buyerName);
    await this.expectDetailField("Email", order.buyerEmail);
    await this.expectDetailField("Phone Number", order.buyerPhoneNumber);
  }

  async expectPurchasedProduct(row: OrderRow, quantity: number) {
    const product = this.main.locator("div").filter({ has: this.page.getByRole("img", { name: row.product, exact: true }) }).filter({ hasText: row.type }).last();
    await expect(product).toContainText(row.product);
    await expect(this.main).toContainText(`Order items: ${quantity}`);
    await expect(this.main).toContainText(`${quantity}x`);
  }

  async expectRevenue(order: ShopOrderDetail) {
    await expect(this.main.getByText(D.revenue, { exact: true })).toBeVisible();
    await this.expectDetailField(D.productPrice, rupiah(order.originalPrice));
    await this.expectDetailField(D.subtotal, rupiah(order.priceAfterDiscount));
    await this.expectDetailField(D.receivedBySeller, rupiah(order.receivedBySeller));
  }

  /** Order Details offers nothing to type into and no save/edit/delete action. */
  async expectDetailReadOnly() {
    await expect(this.main.getByRole("textbox")).toHaveCount(0);
    await expect(this.main.locator("input, textarea, select, [contenteditable='true']")).toHaveCount(0);
    await expect(this.main.getByRole("button", { name: /save|edit|update|delete|cancel order/i })).toHaveCount(0);
  }

  async backToList() {
    await safeClick(this.main.getByRole("button", { name: "Back", exact: true }));
    await expect(this.page).toHaveURL(/\/orders$/, { timeout: 20000 });
    await expect(this.dataRows().first()).toBeVisible({ timeout: 20000 });
  }

  // ── Filters ──
  private timeTrigger(): Locator {
    return this.page.getByRole("button", { name: /^(All Time|Last \d+ days|Custom Date.*)$/ });
  }

  private productTrigger(): Locator {
    const types = F.productTypes.slice(1).map(escape).join("|");
    return this.page.getByRole("button", { name: new RegExp(`^(All Products|\\d+ Products|${types})$`) });
  }

  async expectTimeOptions(options: readonly string[], extra: string) {
    await safeClick(this.timeTrigger());
    for (const option of options) await expect(this.page.getByRole("radio", { name: option, exact: true })).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText(extra, { exact: true })).toBeVisible();
    await expect(this.page.getByRole("radio", { name: "All Time", exact: true })).toBeChecked();
    await this.page.keyboard.press("Escape");
  }

  /**
   * The order-list request a filter change fires, or null when the page answers it from its query
   * cache (a filter combination already loaded in this session sends nothing).
   */
  private nextListRequest(): Promise<URL | null> {
    return this.page.waitForRequest((r) => /\/shop\/orders\?/.test(r.url()), { timeout: 5000 })
      .then((r) => new URL(r.url()), () => null);
  }

  /** Pick a preset; returns the list request it fired (null when served from cache). */
  async selectTimeRange(label: string): Promise<URL | null> {
    await safeClick(this.timeTrigger());
    const request = this.nextListRequest();
    await safeClick(this.page.getByRole("radio", { name: label, exact: true }));
    const url = await request;
    await expect(this.timeTrigger()).toHaveText(label, { timeout: 10000 });
    return url;
  }

  private async openProductFilter() {
    if (await this.filterPopover.isVisible()) return;
    await safeClick(this.productTrigger());
    await expect(this.filterPopover).toBeVisible({ timeout: 5000 });
  }

  private productCheckbox(label: string): Locator {
    return this.filterPopover.getByRole("checkbox", { name: label, exact: true });
  }

  async closeProductFilter() {
    if (await this.filterPopover.isVisible()) {
      await this.page.keyboard.press("Escape");
      await expect(this.filterPopover).toBeHidden({ timeout: 5000 });
    }
  }

  /** Every option is a product type checkbox, and only All Products is ticked by default. */
  async expectProductOptions(options: readonly string[]) {
    await this.openProductFilter();
    const labels = (await this.filterPopover.locator("label").allTextContents()).map((t) => t.trim());
    expect(labels).toEqual([...options]);
    for (const option of options) {
      await expect(this.productCheckbox(option)).toHaveAttribute("aria-checked", option === "All Products" ? "true" : "false");
    }
    await this.closeProductFilter();
  }

  /** Tick the given types (the first tick also clears All Products); returns the last list request. */
  async selectProductTypes(types: readonly string[]): Promise<URL | null> {
    let url: URL | null = null;
    for (const type of types) {
      await this.openProductFilter();
      const request = this.nextListRequest();
      await safeClick(this.filterPopover.locator("label").filter({ hasText: new RegExp(`^${escape(type)}$`) }));
      url = await request;
    }
    await this.closeProductFilter();
    return url;
  }

  async expectProductTypesChecked(types: readonly string[]) {
    await this.openProductFilter();
    for (const label of F.productTypes) {
      await expect(this.productCheckbox(label), label).toHaveAttribute("aria-checked", types.includes(label) ? "true" : "false");
    }
    await this.closeProductFilter();
  }

  async productFilterLabel(): Promise<string> {
    return ((await this.productTrigger().textContent()) ?? "").trim();
  }

  async search(query: string) {
    await safeFill(this.searchInput, query);
  }

  /** No matching order: the empty message with its own Clear filter, filters still usable. */
  async expectNoResults() {
    await expect(this.panel.getByText(F.emptyHeading).filter({ visible: true })).toBeVisible({ timeout: 20000 });
    await expect(this.panel.getByText(F.emptyHint).filter({ visible: true })).toBeVisible();
    await expect(this.clearFilterButton).toBeVisible();
    for (const control of [this.searchInput, this.timeTrigger(), this.productTrigger()]) await expect(control).toBeEnabled();
  }

  async resetFromToolbar() {
    await safeClick(this.resetFilterButton);
  }

  async clearFromEmptyState() {
    await safeClick(this.clearFilterButton);
  }

  /** All Time, All Products, empty search, no reset button, first page of the full list. */
  async expectDefaultFilters(totalPages: number) {
    await expect(this.timeTrigger()).toHaveText("All Time", { timeout: 15000 });
    await expect(this.productTrigger()).toHaveText("All Products");
    await expect(this.searchInput).toHaveValue("");
    await expect(this.resetFilterButton).toHaveCount(0);
    await expect(this.pageIndicator).toHaveText(`Page 1 of ${totalPages}`, { timeout: 15000 });
  }

  async goToLastPage(): Promise<string> {
    await safeClick(this.page.getByRole("button", { name: "Go to last page" }));
    await expect(this.page.getByRole("button", { name: "Go to last page" })).toBeDisabled({ timeout: 15000 });
    return ((await this.pageIndicator.textContent()) ?? "").trim();
  }

  async expectPage(text: string) {
    await expect(this.pageIndicator).toHaveText(text, { timeout: 15000 });
    await expect(this.dataRows().first().getByRole("cell").nth(3)).toHaveText(/\d{2} \w+ \d{4} \d{2}:\d{2}/);
  }

  /** Filters live in component state: the address stays the bare /orders route. */
  async expectUrlCarriesNoFilters() {
    const url = new URL(this.page.url());
    expect(url.pathname).toBe("/orders");
    expect(url.search).toBe("");
  }

  /** Console errors and uncaught page errors seen while this page is used (network 404s reported separately). */
  trackErrors() {
    const runtime: string[] = [];
    const failedRequests: string[] = [];
    this.page.on("pageerror", (e) => runtime.push(e.message));
    this.page.on("console", (m) => { if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) runtime.push(m.text()); });
    this.page.on("response", (r) => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`); });
    return { runtime, failedRequests };
  }
}
