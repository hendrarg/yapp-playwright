import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartLocator } from "@utils/heal-utils";
import { safeFill } from "@utils/playwright.utils";
import { productsSearchData } from "@test-data/creator/products.search.data";

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
}
