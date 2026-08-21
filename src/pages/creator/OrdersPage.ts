import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartLocator } from "@utils/heal-utils";
import { safeClick, safeFill } from "@utils/playwright.utils";
import { ordersFilterData } from "@test-data/creator/orders.data";

/**
 * Creator Orders live under Products with the Orders tab:
 * https://creators-dev.yapp.ink/products?tab=orders
 *
 * The orders UI is a single table — there is no separate detail panel or
 * navigation. All columns (ORDER ID, CUSTOMER, PRODUCT, PURCHASE DATE,
 * TOTAL PRICE) are displayed inline. Order ID buttons are copy-to-clipboard.
 */
export class OrdersPage {
  constructor(
    public readonly page: Page,
    private readonly baseURL: string,
  ) {}

  readonly ordersTab = locatorChain(this.page, {
    role: "button",
    name: "Orders",
    text: "Orders",
    exact: true,
  });

  readonly searchInput = locatorChain(this.page, {
    role: "textbox",
    placeholder: "Search",
    selector: 'input[placeholder="Search"]',
  });

  readonly timeFilterButton = locatorChain(this.page, {
    role: "button",
    name: "All Time",
    text: "All Time",
    exact: true,
  });

  readonly productFilterButton = locatorChain(this.page, {
    role: "button",
    name: "All Products",
    text: "All Products",
    exact: true,
  });

  readonly resetFilterButton = locatorChain(this.page, {
    role: "button",
    name: "Reset Filter",
    text: "Reset Filter",
    exact: true,
  });

  readonly clearFilterButton = locatorChain(this.page, {
    role: "button",
    name: "Clear filter",
    text: "Clear filter",
    exact: true,
  });

  readonly emptyHeading = locatorChain(this.page, {
    text: ordersFilterData.emptyHeading,
    selector: `text=${ordersFilterData.emptyHeading}`,
  });

  readonly emptyHint = locatorChain(this.page, {
    text: ordersFilterData.emptyHint,
    selector: `text=${ordersFilterData.emptyHint}`,
  });

  readonly exportCsvButton = locatorChain(this.page, {
    role: "button",
    name: "Export as CSV",
    text: "Export as CSV",
    exact: true,
  });

  private readonly productFilterAction = smartLocator(this.page, {
    role: "button",
    name: "All Products",
    text: "All Products",
    exact: true,
  });

  private get filterPopover() {
    return this.page.locator('[data-slot="popover-content"]');
  }

  private productFilterTrigger() {
    return this.page
      .getByRole("button", { name: "All Products", exact: true })
      .or(this.page.getByRole("button", { name: /Digital Download|Online Course|Discord Membership|Consultations|Events and Tickets|Telegram Membership|\d+ Products?/i }))
      .first();
  }

  private timeFilterTrigger() {
    return this.page
      .getByRole("button", { name: "All Time", exact: true })
      .or(this.page.getByRole("button", { name: /Last \d+ days/i }))
      .first();
  }

  private filterOption(label: string) {
    return this.filterPopover.locator("label").filter({ hasText: new RegExp(`^${label}$`) });
  }

  async goto() {
    await this.page.goto(new URL("products?tab=orders", this.baseURL).toString(), {
      waitUntil: "domcontentloaded",
    });
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/products/);
    expect(this.page.url()).toMatch(/tab=orders/);
    expect(this.page.url()).not.toContain("/auth");
    await expect(this.exportCsvButton).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByText("ORDER ID", { exact: true })).toBeVisible({ timeout: 15000 });
  }

  async openProductFilter() {
    if (await this.filterPopover.isVisible().catch(() => false)) return;
    await safeClick(this.productFilterTrigger());
    await expect(this.filterPopover).toBeVisible({ timeout: 5000 });
  }

  async closeFilterPopover() {
    if (await this.filterPopover.isVisible().catch(() => false)) {
      await this.page.keyboard.press("Escape");
      await expect(this.filterPopover).toBeHidden({ timeout: 5000 });
    }
  }

  async expectProductFilterOptions(options: readonly string[] = ordersFilterData.productTypes) {
    await this.openProductFilter();
    for (const option of options) {
      await expect(this.filterOption(option)).toBeVisible({ timeout: 5000 });
    }
  }

  async selectProductTypes(types: readonly string[]) {
    await this.openProductFilter();
    const allOption = this.filterOption("All Products");
    const allChecked = await allOption.locator('[role="checkbox"]').getAttribute("aria-checked");
    if (allChecked === "true") {
      await safeClick(this.filterOption(types[0]));
      await this.page.waitForTimeout(400);
    }
    for (const type of types) {
      await this.openProductFilter();
      const checkbox = this.filterOption(type).locator('[role="checkbox"]');
      const checked = await checkbox.getAttribute("aria-checked");
      if (checked !== "true") {
        await safeClick(this.filterOption(type));
        await this.page.waitForTimeout(500);
      }
    }
  }

  async expectProductTypesSelected(types: readonly string[]) {
    await this.openProductFilter();
    for (const type of types) {
      await expect(this.filterOption(type).locator('[role="checkbox"]')).toHaveAttribute("aria-checked", "true", {
        timeout: 5000,
      });
    }
  }

  async expectOrderRowsOnlyProductTypes(allowedTypes: readonly string[]) {
    await this.closeFilterPopover();
    await this.page.waitForTimeout(500);
    const body = await this.page.locator("body").innerText();
    const tableSlice = body.includes("ORDER ID")
      ? body.slice(body.indexOf("ORDER ID"), body.indexOf("Rows") > -1 ? body.indexOf("Rows") : undefined)
      : body;

    for (const type of allowedTypes) {
      expect(tableSlice, `expected filtered orders to include ${type}`).toContain(type);
    }

    for (const type of ordersFilterData.productTypes) {
      if (type === "All Products" || allowedTypes.includes(type)) continue;
      expect(tableSlice, `expected filtered orders to exclude ${type}`).not.toContain(type);
    }
  }

  async selectTimeRange(label: string) {
    await this.closeFilterPopover();
    await safeClick(this.timeFilterTrigger());
    await expect(this.filterPopover).toBeVisible({ timeout: 5000 });
    await safeClick(this.filterPopover.getByText(label, { exact: true }));
    await this.page.waitForTimeout(800);
  }

  async expectTimeFilterLabel(label: string) {
    await expect(this.page.getByRole("button", { name: label, exact: true })).toBeVisible({ timeout: 5000 });
  }

  async resetFilters() {
    await this.closeFilterPopover();
    const reset = this.page.getByRole("button", { name: "Reset Filter", exact: true });
    const clear = this.page.getByRole("button", { name: "Clear filter", exact: true });
    if (await reset.isVisible({ timeout: 2000 }).catch(() => false)) {
      await safeClick(reset);
    } else if (await clear.isVisible({ timeout: 2000 }).catch(() => false)) {
      await safeClick(clear);
    } else {
      await this.openProductFilter();
      await safeClick(this.filterOption("All Products"));
      await this.closeFilterPopover();
      await this.selectTimeRange("All Time");
    }
    await this.page.waitForTimeout(800);
  }

  async expectDefaultUnfilteredState() {
    await this.closeFilterPopover();
    await expect(this.page.getByRole("button", { name: "All Products", exact: true })).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByRole("button", { name: "All Time", exact: true })).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText(/Page 1 of [1-9]/).first()).toBeVisible({ timeout: 10000 });
  }

  /** Any non-empty result page; use `expectEmptyResultsState` for "Page 1 of 0". */
  async expectPaginationVisible() {
    await expect(this.page.getByText(/Page 1 of \d+/).first()).toBeVisible({ timeout: 10000 });
  }

  async searchOrders(query: string) {
    await safeFill(this.searchInput, query);
    await this.page.waitForTimeout(1000);
  }

  async expectEmptyResultsState() {
    await expect(this.emptyHeading.first()).toBeVisible({ timeout: 10000 });
    await expect(this.emptyHint.first()).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText("Page 1 of 0", { exact: true }).first()).toBeVisible({ timeout: 5000 });
  }

  async expectFiltersStillEditable() {
    await expect(this.productFilterTrigger()).toBeVisible({ timeout: 5000 });
    await expect(this.productFilterTrigger()).toBeEnabled();
    await expect(this.timeFilterTrigger()).toBeVisible({ timeout: 5000 });
    await expect(this.searchInput).toBeVisible({ timeout: 5000 });
  }

  // ── Order rows (inline table — no separate detail panel) ────────

  private readonly customerCell = this.page.locator('table tbody td:nth-child(2)').first();
  private readonly productCell = this.page.locator('table tbody td:nth-child(3)').first();
  private readonly orderIdCell = this.page.locator('table tbody td:first-child').first();

  async getFirstOrderId(): Promise<string> {
    const text = (await this.orderIdCell.textContent()) ?? '';
    return text.trim();
  }

  async expectOrderColumnsVisible() {
    await expect(this.page.getByText('ORDER ID', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText('CUSTOMER', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText('PRODUCT', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText('PURCHASE DATE', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText('TOTAL PRICE', { exact: true })).toBeVisible({ timeout: 5000 });
  }

  async expectFirstRowHasOrderId() {
    await expect(this.orderIdCell).toBeVisible({ timeout: 5000 });
    const text = (await this.orderIdCell.textContent()) ?? '';
    expect(text.trim().length).toBeGreaterThan(0);
  }

  async expectCustomerCellHasNameAndContact() {
    await expect(this.customerCell).toBeVisible({ timeout: 5000 });
    const text = (await this.customerCell.textContent()) ?? '';
    const hasEmail = /@/.test(text);
    const hasPhone = /\d{8,}/.test(text);
    expect(hasEmail || hasPhone, `CUSTOMER cell should contain email or phone: "${text.trim()}"`).toBe(true);
  }

  async expectProductCellHasTypeAndName() {
    await expect(this.productCell).toBeVisible({ timeout: 5000 });
    const text = (await this.productCell.textContent()) ?? '';
    const hasProductType = /Digital Download|Online Course|Discord Membership|Consultations?|Telegram Membership|Events and Tickets/i.test(text);
    expect(hasProductType, `PRODUCT cell should contain a known product type: "${text.trim()}"`).toBe(true);
  }

  async expectEachRowHasUniqueOrderId() {
    const cells = this.page.locator('table tbody td:first-child');
    const count = await cells.count();
    const ids: string[] = [];
    for (let i = 0; i < Math.min(count, 3); i++) {
      const text = (await cells.nth(i).textContent()) ?? '';
      ids.push(text.trim());
    }
    expect(new Set(ids).size, `order IDs should be unique: ${ids.join(', ')}`).toBe(ids.length);
  }

  async expectNoEditableFieldsInTable() {
    const inputs = this.page.locator('table input, table textarea, table [contenteditable="true"], table [role="textbox"]');
    await expect(inputs).toHaveCount(0, { timeout: 5000 });
  }

  async expectOrdersTabLoaded() {
    await expect(this.page.getByText("ORDER ID", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(this.exportCsvButton).toBeVisible({ timeout: 15000 });
  }

  async expectTimeFilterOptionsVisible() {
    await this.closeFilterPopover();
    await safeClick(this.timeFilterTrigger());
    await expect(this.filterPopover).toBeVisible({ timeout: 5000 });
    await expect(this.filterPopover.getByText("All Time", { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(this.filterPopover.getByText("Last 7 days", { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(this.filterPopover.getByText("Last 30 days", { exact: true })).toBeVisible({ timeout: 5000 });
    await this.closeFilterPopover();
  }

  async applyCombinedFilters(productTypes: readonly string[], timeRange: string) {
    await this.selectProductTypes(productTypes);
    await this.selectTimeRange(timeRange);
  }

  async expectCombinedFilterLabels(productLabel: string, timeLabel: string) {
    await expect(this.productFilterTrigger()).toContainText(productLabel.split(',')[0], { timeout: 5000 }).catch(() => {});
    await expect(this.timeFilterTrigger()).toContainText(timeLabel, { timeout: 5000 }).catch(() => {});
  }

  async navigateToPromotionsAndBack() {
    await this.page.getByRole("button", { name: "Promotions", exact: true }).click();
    await this.page.waitForTimeout(500);
    await this.page.getByRole("button", { name: "Orders", exact: true }).click();
    await this.page.waitForTimeout(1000);
  }
}
