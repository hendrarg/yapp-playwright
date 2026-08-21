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

  private productActionMenuItem(name: string): Locator {
    return this.productActionMenu().getByRole("menuitem", { name, exact: true });
  }

  private addProductSheet(): Locator {
    return this.page.getByRole("dialog", { name: "Add New Product" });
  }

  private productTypeButton(buttonName: RegExp): Locator {
    return this.addProductSheet().getByRole("button", { name: buttonName });
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
    await this.openProductActionsMenu(productName);

    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/shop/products") &&
        !response.url().includes("/hide-from-profile") &&
        ["PATCH", "POST", "PUT"].includes(response.request().method()),
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
    await this.openProductActionsMenu(productName);
    const editAction = this.productActionMenu().getByRole("menuitem", { name: "Edit", exact: true });
    await expect(editAction).toBeVisible({ timeout: 10000 });
    await editAction.click({ timeout: 10000 });
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
}
