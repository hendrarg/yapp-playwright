# AUT-FV-176 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one mapped Playwright journey that validates Popular and Recommended product discovery for `AUT-FV-176` against the real Explore API responses.

**Architecture:** Extend the existing Buyer `ExplorePage` to capture the Featured and Explore product responses, scope product cards by section and stable `href`, and expose assertions and navigation actions. Append one `authTest` journey with descriptive steps to the existing Explore spec; no static product fixtures or new helpers are needed.

**Tech Stack:** TypeScript, Playwright, existing Yapp page fixtures and utilities

## Global Constraints

- Keep AUT-FV-176 as one test with multiple descriptive `test.step()` calls.
- Use `authTest`, the existing `explorePage` fixture, and Chromium only.
- Tag the test with `@AUT-FV-176`, `@explore`, `@buyer`, and `@regression`.
- Use `/api/v1/products/featured` as the Popular baseline and `/api/v1/products/explore` as the Recommended/full-list baseline.
- Validate backend-provided Popular order; do not independently recalculate the popularity algorithm.
- Do not validate ordering on `/explore/products`.
- Do not add static product IDs, product seeding, dependencies, intermediate TC Markdown, positional `.first()`, or unrelated refactors.
- Keep all element locators and UI interactions in `ExplorePage`.

---

### Task 1: Add the AUT-FV-176 Explore journey

**Files:**
- Modify: `tests/buyer/explore.spec.ts`
- Modify: `src/pages/buyer/ExplorePage.ts`

**Interfaces:**
- Consumes: `authTest`, `explorePage`, `safeClick`, `/api/v1/products/featured`, and `/api/v1/products/explore`
- Produces: `ExploreProduct`, `ExploreProductData`, `ExplorePage.gotoWithProductData()`, `expectProductSections()`, `expectPopularProducts()`, `expectRecommendedProducts()`, `openPopularProduct()`, `openRecommendedProduct()`, `returnToExplore()`, `openAllProducts()`, and `expectFullProductList()`

- [ ] **Step 1: Append the failing mapped journey**

Append this test to `tests/buyer/explore.spec.ts` without changing the existing `@AUT-FV-175` test:

```typescript
test('Explore Page: Popular & Recommended Product Discovery', {
  tag: ['@AUT-FV-176', '@explore', '@buyer', '@regression'],
}, async ({ explorePage }) => {
  test.setTimeout(90000);

  let products!: Awaited<ReturnType<typeof explorePage.gotoWithProductData>>;

  await test.step('Open Explore and capture product discovery data', async () => {
    products = await explorePage.gotoWithProductData();
    await explorePage.expectLoaded();
    await explorePage.expectAuthenticated();
  });

  await test.step('Validate Popular and Recommended sections', async () => {
    await explorePage.expectProductSections();
  });

  await test.step('Validate Popular product metadata, eligibility, and order', async () => {
    await explorePage.expectPopularProducts(products.popular);
  });

  await test.step('Open a Popular product detail', async () => {
    await explorePage.openPopularProduct(products.popular[0]);
    await explorePage.returnToExplore();
  });

  await test.step('Validate Recommended product metadata and eligibility', async () => {
    await explorePage.expectRecommendedProducts(products.recommended);
  });

  await test.step('Open a Recommended product detail', async () => {
    await explorePage.openRecommendedProduct(products.recommended[0]);
    await explorePage.returnToExplore();
  });

  await test.step('Open the full products view from Popular Products', async () => {
    await explorePage.openAllProducts();
    await explorePage.expectFullProductList(products.recommended, products.popular.length);
  });
});
```

- [ ] **Step 2: Run the type-check to prove the test is red**

Run:

```powershell
npx tsc --noEmit
```

Expected: FAIL because the new `ExplorePage` methods do not exist yet.

- [ ] **Step 3: Implement the minimum page-object support**

Replace `src/pages/buyer/ExplorePage.ts` with:

```typescript
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
    name: string;
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
      expect(product.creator?.name, `${section} creator name is required`).toBeTruthy();
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
```

- [ ] **Step 4: Run the type-check to verify the implementation is green**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS with exit code `0`.

- [ ] **Step 5: Run only AUT-FV-176**

Run:

```powershell
npx playwright test tests/buyer/explore.spec.ts --project=chromium --grep @AUT-FV-176
```

Expected: one Chromium test passes. The report shows seven named steps and does not execute the existing `@AUT-FV-175` test.

- [ ] **Step 6: Diagnose contract failures without weakening assertions**

If Step 5 fails, use `superpowers:systematic-debugging`. Inspect the captured response and current DOM for the failing section, then correct only an inaccurate response path, response shape, or section locator. Do not replace scoped locators with `.first()`, hardcode current product IDs, skip missing metadata, or remove eligibility/order assertions.

Re-run:

```powershell
npx tsc --noEmit
npx playwright test tests/buyer/explore.spec.ts --project=chromium --grep @AUT-FV-176
```

Expected: both commands pass.

- [ ] **Step 7: Review and commit the automation**

Run:

```powershell
git diff --check
git diff -- src/pages/buyer/ExplorePage.ts tests/buyer/explore.spec.ts
git status --short
git add src/pages/buyer/ExplorePage.ts tests/buyer/explore.spec.ts
git commit -m "test: automate AUT-FV-176 product discovery"
```

Expected: only the two planned implementation files are committed and the working tree is clean.
