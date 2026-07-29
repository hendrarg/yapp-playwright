import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartLocator } from "@utils/heal-utils";
import { safeClick, safeFill } from "@utils/playwright.utils";
import { productsSearchData } from "@test-data/creator/products.search.data";
import {
  productsStatusData,
  type ProductStatusTab,
} from "@test-data/creator/products.status.data";

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

  private statusTab(status: ProductStatusTab): Locator {
    const pattern = new RegExp(`^${status} \\(\\d+\\)$`);
    return this.page
      .getByRole("tab", { name: pattern })
      .or(this.page.locator('button[role="tab"]').filter({ hasText: pattern }));
  }

  async goto() {
    await this.page.goto(new URL("products", this.baseURL).toString(), {
      waitUntil: "domcontentloaded",
    });
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

  async clearSearch() {
    await safeFill(this.searchInput, "");
    await this.page.waitForTimeout(1200);
  }

  async expectActiveCount(count: number | RegExp) {
    const pattern = count instanceof RegExp ? count : new RegExp(`Active \\(${count}\\)`);
    await expect(this.page.getByText(pattern).first()).toBeVisible({ timeout: 10000 });
  }

  async expectProductVisible(productName: string) {
    await expect(this.page.getByText(productName, { exact: true }).first()).toBeVisible({
      timeout: 10000,
    });
  }

  async expectProductHidden(productName: string) {
    await expect(this.page.getByText(productName, { exact: true })).toHaveCount(0, {
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

  async selectStatusTab(status: ProductStatusTab) {
    void this.activeStatusTabAction;
    await safeClick(this.statusTab(status));
    await expect(this.statusTab(status)).toHaveAttribute("aria-selected", "true", {
      timeout: 10000,
    });
    await this.page.waitForTimeout(1000);
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
}
