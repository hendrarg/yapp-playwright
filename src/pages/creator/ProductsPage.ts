import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartLocator } from "@utils/heal-utils";
import { productsHideFromProfileData } from "@test-data/creator/products.hide-from-profile.data";
import { safeClick, safeFill } from "@utils/playwright.utils";
import { flakyClick } from "@utils/flaky-utils";
import { productsSearchData } from "@test-data/creator/products.search.data";
import { productsCreationData } from "@test-data/creator/products.creation.data";
import { productsStatusData, type ProductStatusTab } from "@test-data/creator/products.status.data";

export class ProductsPage {
  constructor(
    public readonly page: Page,
    private readonly baseURL: string,
  ) {}

  readonly addProductButton = locatorChain(this.page, {
    role: "button",
    name: "Add Product",
    text: "Add Product",
    exact: true,
  });

  readonly searchInput = locatorChain(this.page, {
    role: "textbox",
    placeholder: "Search",
    selector: 'input[placeholder="Search"]',
  });

  readonly emptyHeading = locatorChain(this.page, {
    text: productsSearchData.emptyHeading,
    selector: `text=${productsSearchData.emptyHeading}`,
  });

  readonly emptyHint = locatorChain(this.page, {
    text: productsSearchData.emptyHint,
    selector: `text=${productsSearchData.emptyHint}`,
  });

  readonly createProductCta = locatorChain(this.page, {
    role: "button",
    name: "Create Product",
    text: "Create Product",
    exact: true,
  });

  readonly addNewProductHeading = locatorChain(this.page, {
    role: "heading",
    name: "Add New Product",
    text: "Add New Product",
  });

  // Keep smartLocator live for locator audit + interaction helpers
  private readonly searchAction = smartLocator(this.page, {
    role: "textbox",
    placeholder: "Search",
    selector: 'input[placeholder="Search"]',
  });

  private readonly activeStatusTabAction = smartLocator(this.page, {
    role: "tab",
    name: "Active",
    selector: 'button[role="tab"]',
  });

  private readonly shareAction = smartLocator(this.page, {
    role: "menuitem",
    name: "Share",
    text: "Share",
    selector: '[role="menuitem"]',
  });

  private readonly shareDialog = smartLocator(this.page, {
    role: "dialog",
    text: "Share",
    selector: '[role="dialog"]',
  });

  private readonly copyProductUrlAction = smartLocator(this.page, {
    role: "button",
    name: "Copy link",
    selector: '[role="dialog"] input#link + button',
  });

  private readonly deleteProductAction = smartLocator(this.page, {
    role: "menuitem",
    name: "Delete",
    text: "Delete",
    selector: '[role="menuitem"]',
  });

  private readonly setInactiveSwitchAction = smartLocator(this.page, {
    role: "switch",
    name: "Set Inactive",
    selector: '[role="menuitem"]:has-text("Set Inactive") [role="switch"]',
  });

  private readonly typeFilter = smartLocator(this.page, {
    role: "combobox",
    name: "Filter by product type",
    selector: '[aria-label="Filter by product type"]',
  });

  private readonly noResultsRow = smartLocator(this.page, {
    role: "row",
    name: "No results.",
    text: "No results.",
  });

  private productActionMenuItem(name: string): Locator {
    return this.productActionMenu().getByRole("menuitem", { name, exact: true });
  }

  private addProductSheet(): Locator {
    return this.page.getByRole("dialog", { name: "Add New Product" });
  }

  private productTypeButton(buttonName: RegExp): Locator {
    return this.addProductSheet().getByRole("button", { name: buttonName }).locator("visible=true");
  }

  private productRows(productName: string): Locator {
    return this.page
      .getByRole("row", { name: productName })
      .or(this.page.locator("tr").filter({ hasText: productName }));
  }

  private productRow(productName: string): Locator {
    return this.productRows(productName).first();
  }

  private productActionsTrigger(productName: string): Locator {
    return this.productRow(productName).getByRole("button").last();
  }

  private statusTab(status: ProductStatusTab): Locator {
    const pattern = new RegExp(`^${status} \\(\\d+\\)$`);
    return this.page
      .getByRole("tab", { name: pattern })
      .or(this.page.locator('button[role="tab"]').filter({ hasText: pattern }));
  }

  private productActionMenu(): Locator {
    return this.page.getByRole("menu");
  }

  private deleteConfirmationDialog(): Locator {
    return this.page
      .getByRole("alertdialog")
      .or(this.page.getByRole("dialog"))
      .filter({ hasText: /delete|hapus|confirm|confirmation/i })
      .first();
  }

  private statusChangeConfirmationDialog(): Locator {
    return this.page
      .getByRole("alertdialog")
      .or(this.page.getByRole("dialog"))
      .filter({ has: this.page.getByRole("button", { name: /confirm/i }) })
      .first();
  }

  private hideFromProfileSwitch(): Locator {
    return this.productActionMenu().locator(
      `#${productsHideFromProfileData.hideFromProfileButtonId}`,
    );
  }

  async goto() {
    await this.page.goto(new URL("products", this.baseURL).toString(), {
      waitUntil: "domcontentloaded",
    });
  }

  async waitForListResponse() {
    const response = await this.page.waitForResponse(
      (candidate) =>
        candidate.url().includes("/api/v1/shop/products") &&
        candidate.request().method() === "GET",
      { timeout: 30000 },
    );
    expect(response.ok()).toBeTruthy();
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/products/);
    expect(this.page.url()).not.toContain("/auth");
    await expect(this.addProductButton).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByText("PRODUCT NAME", { exact: true }).first()).toBeVisible({
      timeout: 15000,
    });
  }

  async expectSearchFieldUsable() {
    await expect(this.searchInput).toBeVisible({ timeout: 10000 });
    await expect(this.searchInput).toBeEnabled();
    await this.searchInput.click();
    await expect(this.searchInput).toBeFocused();
    void this.searchAction;
  }

  async searchProducts(query: string) {
    await safeFill(this.searchInput, query);
    await this.page.waitForTimeout(1200);
  }

  async searchProductsUntilVisible(query: string) {
    const responsePromise = this.page.waitForResponse(
      (response) => {
        if (!response.url().includes("/api/v1/shop/products") || response.request().method() !== "GET") {
          return false;
        }
        return new URL(response.url()).searchParams.get("title") === query;
      },
      { timeout: 15000 },
    );
    await safeFill(this.searchInput, query);
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    await expect(this.productRow(query)).toBeVisible({ timeout: 10000 });
  }

  async clearSearch() {
    await safeFill(this.searchInput, "");
    await this.page.waitForTimeout(1200);
  }

  async expectActiveCount(count: number | RegExp) {
    const pattern = count instanceof RegExp ? count : new RegExp(`Active \\(${count}\\)`);
    await expect(this.page.getByText(pattern).first()).toBeVisible({ timeout: 10000 });
  }

  /** The number in a status tab's label, e.g. `Draft (3)`. */
  async readStatusCount(status: ProductStatusTab): Promise<number> {
    await expect(this.statusTab(status).first()).toHaveText(/\(\d+\)/, { timeout: 15000 });
    const text = await this.statusTab(status).first().textContent({ timeout: 10000 });
    const match = text?.match(/\((\d+)\)/);
    expect(match?.[1], `expected a numeric ${status} tab count`).toBeTruthy();
    return Number(match![1]);
  }

  async readActiveCount(): Promise<number> {
    const text = await this.statusTab("Active").first().textContent({ timeout: 10000 });
    const match = text?.match(/\((\d+)\)/);
    expect(match?.[1], "expected a numeric Active tab count").toBeTruthy();
    return Number(match![1]);
  }

  async expectProductVisible(productName: string) {
    await expect(this.productRow(productName)).toBeVisible({
      timeout: 10000,
    });
  }

  async expectProductHidden(productName: string) {
    await expect(this.productRows(productName)).toHaveCount(0, {
      timeout: 10000,
    });
  }

  async expectNameSearchResults(matchedName: string, excludedName: string) {
    await this.expectActiveCount(1);
    await this.expectProductVisible(matchedName);
    await this.expectProductHidden(excludedName);
  }

  async expectEmptySearchState() {
    await this.expectActiveCount(0);
    await expect(this.emptyHeading).toBeVisible({ timeout: 10000 });
    await expect(this.emptyHint).toBeVisible({ timeout: 5000 });
    await expect(this.createProductCta).toBeVisible({ timeout: 5000 });
  }

  async expectRestoredProductList(productNames: readonly string[]) {
    await this.expectActiveCount(/Active \([1-9]\d*\)/);
    for (const name of productNames) {
      await this.expectProductVisible(name);
    }
  }

  /** After a name search that yields a single match, read that product's share URL. */
  async readMatchedProductUrl(): Promise<string> {
    const link = this.page.getByRole("link", { name: /\/s\/[A-Za-z0-9_-]+/ }).first();
    await expect(link).toBeVisible({ timeout: 10000 });
    const href = await link.getAttribute("href");
    expect(href, "expected a visible product share URL").toBeTruthy();
    return href!;
  }

  async selectStatusTab(status: ProductStatusTab, options: { waitForRender?: boolean } = {}) {
    void this.activeStatusTabAction;
    await safeClick(this.statusTab(status));
    await expect(this.statusTab(status)).toHaveAttribute("aria-selected", "true", {
      timeout: 10000,
    });
    if (options.waitForRender !== false) {
      await this.page.waitForTimeout(1000);
    }
  }

  async expectStatusTabSelected(status: ProductStatusTab) {
    await expect(this.statusTab(status)).toBeVisible({ timeout: 10000 });
    await expect(this.statusTab(status)).toHaveAttribute("aria-selected", "true");
  }

  async expectStatusTabHasProducts(status: ProductStatusTab) {
    await expect(this.statusTab(status)).toHaveText(new RegExp(`^${status} \\([1-9]\\d*\\)$`), {
      timeout: 10000,
    });
  }

  async expectListShowsOnlyRowStatus(rowStatus: "ACTIVE" | "INACTIVE" | "DRAFT") {
    const body = await this.page.locator("body").innerText();
    const statuses = [...body.matchAll(/\b(ACTIVE|INACTIVE|DRAFT)\b/g)].map((match) => match[1]);
    expect(statuses.length, `expected ${rowStatus} rows in the product list`).toBeGreaterThan(0);
    for (const status of statuses) {
      expect(status).toBe(rowStatus);
    }
  }

  async openAddProductSheet() {
    // Dismiss the one-time "Add your active social media" dialog when it blocks
    // the products page (it can appear on first product dashboard visit).
    const skipButton = this.page.getByRole("button", { name: "Skip", exact: true });
    if (await skipButton.isVisible().catch(() => false)) {
      await safeClick(skipButton);
      await expect(skipButton).toBeHidden({ timeout: 10000 });
    }
    await safeClick(this.addProductButton);
    await expect(this.addNewProductHeading).toBeVisible({ timeout: 10000 });
  }

  /**
   * The first-run tour (driver.js) is gated on `users.is_complete_onboarding`. When it runs it
   * covers the page with an overlay and marks `body.driver-active`; neither may be present.
   */
  async expectNoOnboardingTour() {
    // driver.js renders no role or text to anchor on; its class names are the only hook.
    await expect(this.page.locator(".driver-overlay, .driver-popover")).toHaveCount(0, { timeout: 5000 });
    await expect(this.page.locator("body")).not.toHaveClass(/\bdriver-active\b/);
  }

  async expectProductTypesAvailable(
    types: readonly (typeof productsCreationData.productTypes)[number][] = productsCreationData.productTypes,
  ) {
    for (const type of types) {
      await expect(this.productTypeButton(type.buttonName)).toBeVisible({ timeout: 10000 });
    }
  }

  async selectProductType(buttonName: RegExp) {
    await safeClick(this.productTypeButton(buttonName));
  }

  async openProductActionsMenu(productName: string) {
    // FLAKY_FIX: product rows can re-render once after the filtered list response settles.
    const trigger = this.productActionsTrigger(productName);
    const menu = this.productActionMenu();
    for (let attempt = 0; attempt < 3; attempt++) {
      await flakyClick(trigger, { retries: 3, timeout: 5000 });
      if (await menu.isVisible().catch(() => false)) return;
      await this.page.waitForTimeout(500);
    }
    await expect(menu).toBeVisible({ timeout: 10000 });
  }

  async openShareDialog(productName: string) {
    await this.openProductActionsMenu(productName);
    await this.shareAction.click();
  }

  async openDeleteConfirmation(productName: string) {
    await this.openProductActionsMenu(productName);
    await this.deleteProductAction.click({ timeout: 10000 });
    await expect(this.deleteConfirmationDialog()).toBeVisible({ timeout: 10000 });
  }

  async expectDeleteConfirmationVisible() {
    const dialog = this.deleteConfirmationDialog();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole("heading", { name: /delete product/i })).toBeVisible();
    await expect(dialog).toContainText(/are you sure you want to delete this product\?/i);
    await expect(dialog.getByRole("button", { name: /cancel/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /confirm/i })).toBeVisible();
  }

  async dismissDeleteConfirmation() {
    const dialog = this.deleteConfirmationDialog();
    const cancelButton = dialog
      .getByRole("button", { name: /cancel|batal|close|no/i })
      .first();

    if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await safeClick(cancelButton);
    } else {
      await this.page.keyboard.press("Escape");
    }

    await expect(dialog).toBeHidden({ timeout: 10000 });
  }

  async setProductInactive(productName: string) {
    await this.switchProductStatus(productName, "inactive");
  }

  /** The same `Set Inactive` switch, clicked from the Inactive tab, brings a product back. */
  async setProductActive(productName: string) {
    await this.switchProductStatus(productName, "active");
  }

  /**
   * `Set Inactive` is a switch whose ON state means inactive; its label never changes. Each click
   * sends `PUT …/status` with the new status, which is checked here.
   */
  private async switchProductStatus(productName: string, status: "active" | "inactive") {
    await this.openProductActionsMenu(productName);

    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/shop/products") &&
        !response.url().includes("/hide-from-profile") &&
        ["PATCH", "POST", "PUT"].includes(response.request().method()) &&
        (!response.url().endsWith("/status") || response.request().postDataJSON()?.status === status),
      { timeout: 15000 },
    );

    await this.setInactiveSwitchAction.click({ timeout: 10000 });

    const dialog = this.statusChangeConfirmationDialog();
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      const confirmButton = dialog
        .getByRole("button", { name: /confirm|set inactive|yes/i })
        .first();
      await safeClick(confirmButton);
      await expect(dialog).toBeHidden({ timeout: 10000 });
    }

    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    await this.page.keyboard.press("Escape");
    await expect(this.productActionMenu()).toBeHidden({ timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(1200);
  }

  async expectShareDialogVisible() {
    expect(await this.shareDialog.text()).toMatch(/share/i);
  }

  async copyProductUrl() {
    await this.copyProductUrlAction.click({ timeout: 3000 });
  }

  async expectProductUrlCopied(expectedProductPath: string) {
    const copiedUrl = await this.page.evaluate(() =>
      (navigator as Navigator & { clipboard: { readText(): Promise<string> } }).clipboard.readText(),
    );
    const productSlug = expectedProductPath.split("/").pop();
    expect(productSlug).toBeTruthy();
    expect(copiedUrl).toContain(productSlug);
  }

  async expectHideFromProfileActionAvailable(productName: string) {
    await this.openProductActionsMenu(productName);
    await expect(
      this.productActionMenu().getByText(
        productsHideFromProfileData.hideFromProfileAction,
        { exact: true },
      ),
    ).toBeVisible({ timeout: 10000 });
    await expect(this.hideFromProfileSwitch()).toBeVisible({ timeout: 10000 });
    await expect(this.hideFromProfileSwitch()).toHaveAttribute("role", "switch");
    await this.page.keyboard.press("Escape");
  }

  async selectHideFromProfileAction(productName: string) {
    await this.openProductActionsMenu(productName);
    const toggle = this.hideFromProfileSwitch();
    await expect(toggle).toBeVisible({ timeout: 10000 });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/hide-from-profile") &&
        response.request().method() === "PUT",
      { timeout: 15000 },
    );
    await safeClick(toggle);
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
  }

  async selectRestoreVisibilityAction(productName: string) {
    await this.openProductActionsMenu(productName);
    const toggle = this.hideFromProfileSwitch();
    await expect(toggle).toBeVisible({ timeout: 10000 });
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/hide-from-profile") &&
        response.request().method() === "PUT",
      { timeout: 15000 },
    );
    await safeClick(toggle);
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    await this.openProductActionsMenu(productName);
    await expect(this.hideFromProfileSwitch()).toHaveAttribute("aria-checked", "false");
  }

  async expectStatusTabList(status: ProductStatusTab) {
    const rowStatus = productsStatusData.rowStatusByTab[status];
    const sample = productsStatusData.sampleProductByTab[status];
    await this.expectStatusTabSelected(status);
    await this.expectStatusTabHasProducts(status);
    await this.expectListShowsOnlyRowStatus(rowStatus);
    await this.expectProductVisible(sample);

    for (const other of productsStatusData.tabs) {
      if (other === status) continue;
      await this.expectProductHidden(productsStatusData.sampleProductByTab[other]);
    }
  }

  async openEditProduct(productName: string) {
    // The menu can re-render while the list refreshes, detaching the item mid-click; reopen and retry.
    await expect(async () => {
      if (!(await this.productActionMenu().isVisible())) await this.openProductActionsMenu(productName);
      const editAction = this.productActionMenu().getByRole("menuitem", { name: "Edit", exact: true });
      await expect(editAction).toBeVisible({ timeout: 5000 });
      await editAction.click({ timeout: 5000 });
    }).toPass({ timeout: 30000 });
    await expect(this.page).toHaveURL(
      /\/products\/update\/(?:appointment|discord-membership|online-course|digital-downloads|events-ticket)\//,
      { timeout: 30000 },
    );
  }

  async expectProductActionMenuItems(productName: string, itemNames: readonly string[]) {
    await this.openProductActionsMenu(productName);
    await expect(this.productActionMenu().getByRole("menuitem")).toHaveCount(itemNames.length, {
      timeout: 10000,
    });
    for (const name of itemNames) {
      await expect(this.productActionMenuItem(name)).toBeVisible({ timeout: 10000 });
    }
    await this.page.keyboard.press("Escape");
  }

  async expectProductRowStatus(
    productName: string,
    status: "ACTIVE" | "INACTIVE" | "DRAFT",
  ) {
    await expect(this.productRow(productName).getByText(status, { exact: true })).toBeVisible({
      timeout: 10000,
    });
  }

  async expectProductRowPrice(productName: string, pattern: RegExp) {
    await expect(this.productRow(productName).getByText(pattern)).toBeVisible({ timeout: 10000 });
  }

  async readProductSharePath(productName: string): Promise<string> {
    const link = this.productRow(productName).getByRole("link", { name: /\/s\// });
    await expect(link).toBeVisible({ timeout: 10000 });
    const href = await link.getAttribute("href");
    expect(href, "expected product share URL").toMatch(/\/s\//);
    const match = href!.match(/\/s\/[A-Za-z0-9_-]+/);
    expect(match?.[0], "expected share path").toBeTruthy();
    return match![0];
  }

  async searchValue(): Promise<string> {
    return this.searchInput.inputValue();
  }

  /**
   * Fill the search box and wait until that result is on screen. A repeated query can come
   * from the list already loaded, so a missing request is fine. Whitespace is not a title.
   */
  async searchProductsNow(query: string) {
    const responsePromise = this.page.waitForResponse((response) => {
      if (!response.url().includes("/api/v1/shop/products") || response.request().method() !== "GET") return false;
      return new URL(response.url()).searchParams.get("title") === query;
    }, { timeout: 15000 }).then((response) => response, () => null);
    await safeFill(this.searchInput, query);
    await expect(this.searchInput).toHaveValue(query);
    const response = await responsePromise;
    if (response) expect(response.ok(), await response.text()).toBeTruthy();
    const needle = query.trim().toLowerCase();
    if (!needle || needle !== query.toLowerCase()) return;
    const table = this.page.getByRole("table");
    const hit = await expect.poll(async () => (await table.innerText()).toLowerCase().includes(needle), { timeout: 4000 }).toBe(true).then(() => true, () => false);
    if (hit) return;
    await expect.poll(async () => (await table.innerText()).toLowerCase(), { timeout: 10000 }).toContain("no results");
  }

  /** Emptying the box restores the loaded list in the browser. It does not send a new list request. */
  async clearSearchNow() {
    const table = this.page.getByRole("table");
    const before = await table.innerText();
    await safeFill(this.searchInput, "");
    await expect(this.searchInput).toHaveValue("");
    await expect.poll(async () => table.innerText(), { timeout: 10000 }).not.toBe(before);
  }

  async expectNoResultsRow() {
    expect(await this.noResultsRow.text({ timeout: 15000 })).toMatch(/No results/);
  }

  /** The search text stays in the field and is not written into the address bar. */
  async expectSearchKeptLocally(query: string) {
    await expect(this.searchInput).toHaveValue(query);
    const url = new URL(this.page.url());
    expect(url.searchParams.get("title")).toBeNull();
    expect(url.searchParams.get("q")).toBeNull();
    expect(url.searchParams.get("keyword")).toBeNull();
  }

  async readStatusCounts(): Promise<Record<ProductStatusTab, number>> {
    return {
      Active: await this.readStatusCount("Active"),
      Inactive: await this.readStatusCount("Inactive"),
      Draft: await this.readStatusCount("Draft"),
    };
  }

  async expectListColumns() {
    for (const header of ["IMAGE", "PRODUCT NAME", "VIEW", "SALES", "SLOTS", "PRICE", "REVENUE", "STATUS", "ACTION"]) {
      await expect(this.page.getByRole("columnheader", { name: header, exact: true })).toBeVisible({ timeout: 10000 });
    }
  }

  /** Thumbnail and title are both links named after the product. They must share one href. */
  private async nameLinkHrefs(productName: string): Promise<string[]> {
    const links = this.productRow(productName).getByRole("link", { name: productName, exact: true });
    await expect(links.first()).toBeVisible({ timeout: 10000 });
    const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
    expect(hrefs.length, `expected a name link for ${productName}`).toBeGreaterThan(0);
    expect(new Set(hrefs).size, `name links for ${productName} should share one destination`).toBe(1);
    return hrefs;
  }

  async expectProductRowDetails(productName: string) {
    const row = this.productRow(productName);
    await expect(row).toBeVisible({ timeout: 15000 });
    await this.nameLinkHrefs(productName);
    await expect(row.getByRole("link", { name: /\/s\// })).toBeVisible();
    await expect(row.getByRole("img").first()).toBeVisible();
    const text = await row.innerText();
    expect(text, "row should show counts, a price, and a status").toMatch(/\d/);
    expect(text).toMatch(/Rp|Free|Start from/);
    expect(text).toMatch(/ACTIVE|INACTIVE|DRAFT/);
  }

  async readSlotsCell(productName: string): Promise<string> {
    const cell = this.productRow(productName).getByRole("cell").nth(4);
    await expect(cell).toBeVisible({ timeout: 10000 });
    return (await cell.innerText()).replace(/\s+/g, "");
  }

  async readNameLinkPath(productName: string): Promise<string> {
    return (await this.nameLinkHrefs(productName))[0];
  }

  async typeFilterLabel(): Promise<string> {
    return (await this.typeFilter.text()).trim();
  }

  /**
   * Choose a type. The label updates immediately. When a products GET is sent, it has to succeed.
   * The list can also refresh from the page already loaded, so a missing request is fine.
   */
  async selectTypeFilter(option: string) {
    const table = this.page.getByRole("table");
    const before = await table.innerText();
    const responsePromise = this.page
      .waitForResponse(
        (response) => response.url().includes("/api/v1/shop/products") && response.request().method() === "GET",
        { timeout: 15000 },
      )
      .then((response) => response, () => null);
    await this.typeFilter.click();
    await safeClick(this.page.getByRole("option", { name: option, exact: true }).locator("visible=true").first());
    await expect.poll(async () => (await this.typeFilter.text()).trim(), { timeout: 10000 }).toBe(option);
    const rowsSettled = expect.poll(async () => table.innerText(), { timeout: 10000 }).not.toBe(before).then(() => null);
    const response = await Promise.race([responsePromise, rowsSettled]);
    if (response) expect(response.ok(), await response.text()).toBeTruthy();
    await rowsSettled;
  }

  async expectTypeFilterOptions(options: readonly string[]) {
    await this.typeFilter.click();
    for (const option of options) {
      await expect(this.page.getByRole("option", { name: option, exact: true })).toBeVisible({ timeout: 10000 });
    }
    await expect(this.page.getByRole("option", { name: "Exclusive Content", exact: true })).toHaveCount(0);
    await this.page.keyboard.press("Escape");
  }

  async visibleProductTypes(): Promise<string[]> {
    const labels = new Set([
      "Consultation",
      "Digital Download",
      "Digital Product",
      "Discord Membership",
      "Online Course",
      "Telegram Membership",
      "Event Ticket",
    ]);
    const rows = this.page.getByRole("row");
    const count = await rows.count();
    const types: string[] = [];
    for (let i = 0; i < count; i++) {
      const lines = ((await rows.nth(i).innerText()) ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
      const firstLine = lines[0];
      if (!firstLine || firstLine === "IMAGE" || firstLine === "No results.") continue;
      types.push(lines.find((line) => labels.has(line)) ?? firstLine);
    }
    return types;
  }

  async closeAddProductSheet() {
    await this.page.keyboard.press("Escape");
    await expect(this.addProductSheet()).toBeHidden({ timeout: 10000 });
  }

  async expectAddProductTypes(types: readonly { readonly buttonName: RegExp; readonly group: string }[]) {
    for (const group of ["Digital Products", "Memberships", "Appointment"]) {
      await expect(this.addProductSheet().getByText(group, { exact: true }).locator("visible=true").first()).toBeVisible({ timeout: 10000 });
    }
    for (const type of types) {
      const button = this.productTypeButton(type.buttonName);
      await expect(button).toBeVisible({ timeout: 10000 });
      await expect(button).toContainText(type.group);
    }
  }

  /** Back from a create form reached via Add Product. A confirmation dialog would fail this. */
  async expectReturnedWithoutUnsavedPrompt() {
    const dialog = this.page.getByRole("alertdialog").or(this.page.getByRole("dialog")).filter({ hasText: /unsaved|discard|leave|lose your changes/i });
    await expect(dialog).toHaveCount(0);
    await expect(this.page).toHaveURL(/\/products\/?(?:\?|#|$)/, { timeout: 15000 });
  }

  async expectInactiveSwitch(productName: string, checked: boolean) {
    await this.openProductActionsMenu(productName);
    expect(await this.setInactiveSwitchAction.getAttribute("aria-checked")).toBe(String(checked));
    await this.page.keyboard.press("Escape");
  }

  /**
   * The list `Set Inactive` switch. ON means inactive. The click sends
   * `PUT …/status` and a toast, and the menu closes.
   */
  async setProductStatusFromMenu(productName: string, status: "active" | "inactive") {
    await this.openProductActionsMenu(productName);
    const toast = status === "inactive" ? "Product set to inactive" : "Product set to active";
    const responsePromise = this.page.waitForResponse((response) => {
      if (response.request().method() !== "PUT") return false;
      return /\/api\/v1\/shop\/products\/[0-9a-f-]{36}\/status$/.test(new URL(response.url()).pathname)
        && response.request().postDataJSON()?.status === status;
    }, { timeout: 15000 });
    const toastPromise = this.page.getByText(toast, { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
    await this.setInactiveSwitchAction.click({ timeout: 10000 });
    const dialog = this.statusChangeConfirmationDialog();
    if (await dialog.isVisible({ timeout: 1500 }).catch(() => false)) {
      await safeClick(dialog.getByRole("button", { name: /confirm|set inactive|yes/i }).first());
    }
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    expect(response.request().postDataJSON()).toEqual({ status });
    await toastPromise;
    await expect(this.productActionMenu()).toBeHidden({ timeout: 10000 });
  }

  /** List switch. ON hides the product from the public profile and leaves Explore alone. */
  async setHideFromProfileFromMenu(productName: string, hidden: boolean) {
    await this.openProductActionsMenu(productName);
    const toggle = this.hideFromProfileSwitch().locator("visible=true");
    await expect(toggle).toBeVisible({ timeout: 10000 });
    const responsePromise = this.page.waitForResponse((response) => {
      if (response.request().method() !== "PUT" || !response.url().includes("/hide-from-profile")) return false;
      return response.request().postDataJSON()?.isHideFromProfile === hidden;
    }, { timeout: 15000 });
    await safeClick(toggle);
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    expect(response.request().postDataJSON()).toEqual({ isHideFromProfile: hidden });
  }

  async hideFromExplore(productName: string, hidden: boolean) {
    await this.openProductActionsMenu(productName);
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes("/hide-from-explore") && response.request().method() === "PUT",
      { timeout: 15000 },
    );
    await safeClick(this.productActionMenuItem(hidden ? "Hide" : "Unhide"));
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    expect(response.request().postDataJSON()).toEqual({ isHideFromExplore: hidden });
  }

  async expectMenuItem(productName: string, label: string) {
    await this.openProductActionsMenu(productName);
    await expect(this.productActionMenuItem(label)).toBeVisible({ timeout: 10000 });
    await this.page.keyboard.press("Escape");
  }

  async confirmDelete() {
    const dialog = this.deleteConfirmationDialog();
    await safeClick(dialog.getByRole("button", { name: /confirm/i }));
    await expect(dialog).toBeHidden({ timeout: 15000 });
  }

  async deleteDialogText(): Promise<string> {
    return (await this.deleteConfirmationDialog().innerText()) ?? "";
  }

  async actionsTriggerName(productName: string): Promise<string> {
    const trigger = this.productActionsTrigger(productName);
    await expect(trigger).toBeVisible({ timeout: 10000 });
    return ((await trigger.getAttribute("aria-label")) ?? (await trigger.innerText())).trim();
  }

  async copyLinkName(): Promise<string> {
    const label = await this.copyProductUrlAction.getAttribute("aria-label");
    const text = await this.copyProductUrlAction.text();
    return (label ?? text).trim();
  }

  async waitForSuccessToast(timeout = 5000): Promise<boolean> {
    try {
      await this.page.locator("[data-sonner-toast]").first().waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }

  get pageIndicator(): Locator {
    return this.page.getByText(/^Page \d+ of \d+$/).filter({ visible: true });
  }

  async expectPageIndicator(pattern: RegExp | string) {
    await expect(this.pageIndicator).toHaveText(pattern, { timeout: 15000 });
  }
}
