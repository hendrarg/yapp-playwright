import type { Locator, Page, Response } from "@playwright/test";
import { expect } from "@playwright/test";
import { trackAuthToken } from "@helpers/auth/validate-token";
import { safeClick } from "@utils/playwright.utils";

export type ExploreProduct = {
  uuid: string;
  title: string;
  shortUrl: string;
  thumbnailImage?: string | null;
  isSetPrice: boolean;
  price: number;
  isFlexiblePrice?: boolean;
  minimumFlexiblePrice?: number | null;
  creator: {
    uuid: string;
    name?: string | null;
    username: string;
    photoProfileUrl?: string | null;
  };
};

export type ExploreProductData = {
  popular: ExploreProduct[];
  recommended: ExploreProduct[];
};

type ProductResponseBody = {
  data?: {
    data?: ExploreProduct[];
  };
};

export class ExplorePage {
  private auth = trackAuthToken(this.page);

  readonly popularHeading: Locator;
  readonly recommendedHeading: Locator;
  readonly popularGrid: Locator;
  readonly recommendedGrid: Locator;
  readonly popularSeeMore: Locator;
  readonly exploreProductsHeading: Locator;
  readonly fullProductLinks: Locator;

  constructor(public readonly page: Page, private readonly baseURL: string) {
    this.popularHeading = page.getByRole("heading", { name: "Popular Products", exact: true });
    this.recommendedHeading = page.getByRole("heading", { name: "Recommended For You!!", exact: true });
    this.popularGrid = this.popularHeading.locator("xpath=../following-sibling::div[1]");
    this.recommendedGrid = this.recommendedHeading.locator("xpath=../following-sibling::div[1]");
    this.popularSeeMore = this.popularHeading.locator("xpath=..").getByRole("link", { name: "See More", exact: true });
    this.exploreProductsHeading = page.getByRole("heading", { name: "Explore Products", exact: true });
    this.fullProductLinks = page.locator('main a[href*="/product/"]');
  }

  async goto() {
    await this.page.goto(new URL("explore", this.baseURL).toString());
    await this.page.waitForLoadState("networkidle");
  }

  async gotoWithProductData(): Promise<ExploreProductData> {
    const popularResponse = this.page.waitForResponse((response) =>
      this.isProductResponse(response, "/api/v1/products/featured"),
    );
    const recommendedResponse = this.page.waitForResponse((response) =>
      this.isProductResponse(response, "/api/v1/products/explore"),
    );

    await this.goto();

    const [popular, recommended] = await Promise.all([
      popularResponse.then((response) => this.readProducts(response, "Popular")),
      recommendedResponse.then((response) => this.readProducts(response, "Recommended")),
    ]);

    return { popular, recommended };
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/explore/);
    expect(this.page.url()).not.toContain("/auth");
  }

  async expectAuthenticated() {
    await this.auth.expectValid();
  }

  async expectProductSections() {
    await expect(this.popularHeading).toBeVisible();
    await expect(this.recommendedHeading).toBeVisible();
  }

  async expectPopularProducts(products: ExploreProduct[]) {
    expect(products.some((product) => product.isSetPrice), "Popular must contain a paid product").toBeTruthy();
    expect(products.some((product) => !product.isSetPrice), "Popular must contain a Free product").toBeTruthy();
    await this.expectProducts(this.popularGrid, products, { ordered: true, creatorPicture: true });
  }

  async expectRecommendedProducts(products: ExploreProduct[]) {
    await this.expectProducts(this.recommendedGrid, products, { ordered: false, creatorPicture: false });
  }

  async openPopularProduct(product: ExploreProduct) {
    await this.openProduct(this.popularGrid, product);
  }

  async openRecommendedProduct(product: ExploreProduct) {
    await this.openProduct(this.recommendedGrid, product);
  }

  async returnToExplore() {
    await this.goto();
    await this.expectLoaded();
  }

  async openAllProducts() {
    await safeClick(this.popularSeeMore);
    await expect(this.page).toHaveURL(new URL("explore/products", this.baseURL).toString());
  }

  async expectFullProductList(products: ExploreProduct[], popularCount: number) {
    await expect(this.exploreProductsHeading).toBeVisible();
    await expect.poll(() => this.fullProductLinks.count()).toBe(products.length);

    const actualHrefs = await this.productHrefs(this.fullProductLinks);
    const expectedHrefs = products.map((product) => this.productHref(product));

    expect([...actualHrefs].sort()).toEqual([...expectedHrefs].sort());
    expect(actualHrefs.length).toBeGreaterThan(popularCount);
  }

  private isProductResponse(response: Response, pathname: string) {
    const url = new URL(response.url());
    return response.request().method() === "GET" && url.pathname === pathname;
  }

  private async readProducts(response: Response, section: string): Promise<ExploreProduct[]> {
    expect(response.ok(), `${section} product request failed: ${response.status()}`).toBeTruthy();

    const body = await response.json() as ProductResponseBody;
    const products = body.data?.data;

    expect(Array.isArray(products), `${section} response must contain data.data`).toBeTruthy();
    expect(products?.length ?? 0, `${section} response must contain products`).toBeGreaterThan(0);

    for (const product of products ?? []) {
      expect(product.uuid, `${section} product uuid is required`).toBeTruthy();
      expect(product.title, `${section} product title is required`).toBeTruthy();
      expect(product.shortUrl, `${section} product shortUrl is required`).toBeTruthy();
      expect(product.creator?.username, `${section} creator username is required`).toBeTruthy();
    }

    return products ?? [];
  }

  private async expectProducts(
    section: Locator,
    products: ExploreProduct[],
    options: { ordered: boolean; creatorPicture: boolean },
  ) {
    const links = section.locator('a[href*="/product/"]');
    await expect.poll(() => links.count()).toBe(products.length);

    const actualHrefs = await this.productHrefs(links);
    const expectedHrefs = products.map((product) => this.productHref(product));

    if (options.ordered) {
      expect(actualHrefs).toEqual(expectedHrefs);
    } else {
      expect([...actualHrefs].sort()).toEqual([...expectedHrefs].sort());
    }

    for (const product of products) {
      const card = this.productCard(section, product);
      await expect(card).toHaveCount(1);
      await expect(card).toContainText(product.title);
      await expect(card).toContainText(product.creator.name || product.creator.username);
      await expect(card.getByRole("img", { name: product.title, exact: true })).toBeVisible();
      await expect(card).toContainText(product.isSetPrice ? /(?:Rp|\$)\s?[\d.,]+/ : "Free");

      if (options.creatorPicture) {
        await expect(card.locator('[data-slot="avatar"]')).toBeVisible();
      }
    }
  }

  private async openProduct(section: Locator, product: ExploreProduct) {
    const href = this.productHref(product);
    await safeClick(this.productCard(section, product));
    await expect(this.page).toHaveURL(new URL(href.slice(1), this.baseURL).toString());
  }

  private productCard(section: Locator, product: ExploreProduct) {
    return section.locator(`a[href="${this.productHref(product)}"]`);
  }

  private productHref(product: ExploreProduct) {
    return `/${product.creator.username}/product/${product.shortUrl}`;
  }

  private async productHrefs(links: Locator): Promise<string[]> {
    return links.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("href")).filter((href): href is string => Boolean(href)),
    );
  }
}
