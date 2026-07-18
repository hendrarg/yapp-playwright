import { expect, type Locator, type Page } from '@playwright/test';
import { trackAuthToken } from '@helpers/auth/validate-token';
import { safeClick, safeFill } from '@utils/playwright.utils';

type ProductCard = { href: string; title: string };
type VisibleProducts = { popular: ProductCard[]; recommended: ProductCard[] };

export class ExplorePage {
  private auth = trackAuthToken(this.page);

  readonly creatorsHeading: Locator;
  readonly popularHeading: Locator;
  readonly recommendedHeading: Locator;
  readonly creatorsGrid: Locator;
  readonly popularGrid: Locator;
  readonly recommendedGrid: Locator;
  readonly creatorsSeeMore: Locator;
  readonly popularSeeMore: Locator;

  constructor(public readonly page: Page, private readonly baseURL: string) {
    this.creatorsHeading = page.getByRole('heading', { name: 'Creators For You', exact: true });
    this.popularHeading = page.getByRole('heading', { name: 'Popular Products', exact: true });
    this.recommendedHeading = page.getByRole('heading', { name: 'Recommended For You!!', exact: true });
    this.creatorsGrid = this.creatorsHeading.locator('xpath=../following-sibling::div[1]');
    this.popularGrid = this.popularHeading.locator('xpath=../following-sibling::div[1]');
    this.recommendedGrid = this.recommendedHeading.locator('xpath=../following-sibling::div[1]');
    this.creatorsSeeMore = this.creatorsHeading.locator('xpath=..').getByRole('link', { name: 'See More', exact: true });
    this.popularSeeMore = this.popularHeading.locator('xpath=..').getByRole('link', { name: 'See More', exact: true });
  }

  async goto() {
    await this.page.goto(new URL('explore', this.baseURL).toString());
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/explore/);
    expect(this.page.url()).not.toContain('/auth');
  }

  async expectAuthenticated() {
    await this.auth.expectValid();
  }

  async expectDiscoverySections() {
    await expect(this.creatorsHeading).toBeVisible();
    await expect(this.popularHeading).toBeVisible();
    await expect(this.recommendedHeading).toBeVisible();
  }

  async expectProductCardMetadata() {
    for (const section of [this.popularGrid, this.recommendedGrid]) {
      const cards = await section.locator('a[href*="/product/"]').evaluateAll((links) => links.map((link) => {
        const text = (link as unknown as { innerText: string }).innerText;
        const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
        const imageCount = link.querySelectorAll('img').length;
        return {
          title: link.querySelector('h3')?.textContent?.trim() || lines[0],
          imageCount,
          hasCreatorVisual: imageCount >= 2 || lines.length >= 5,
          creator: lines[lines.length - 1],
          lines: lines.length,
          text,
        };
      }));

      expect(cards.length, 'Product section must contain cards').toBeGreaterThan(0);
      for (const card of cards) {
        expect(card.title, 'Product name is required').toBeTruthy();
        expect(card.imageCount, `${card.title} must show a product image`).toBeGreaterThan(0);
        expect(card.hasCreatorVisual, `${card.title} must show a creator image or fallback`).toBeTruthy();
        expect(card.creator, `${card.title} must show a creator name`).not.toMatch(/^(?:Free|(?:Rp|\$)\s?[\d.,]+)$/);
        expect(card.lines, `${card.title} must show product and creator metadata`).toBeGreaterThanOrEqual(3);
        expect(card.text, `${card.title} must show a price or Free`).toMatch(/(?:Rp|\$)\s?[\d.,]+|Free/);
      }
    }
  }

  async getVisibleProducts(): Promise<VisibleProducts> {
    return {
      popular: await this.productCards(this.popularGrid),
      recommended: await this.productCards(this.recommendedGrid),
    };
  }

  async expectStaticDiscoveryOrder(popularProducts: readonly string[], creators: readonly string[]) {
    expect((await this.productCards(this.popularGrid)).map(({ title }) => title)).toEqual([...popularProducts]);
    await expect(this.creatorsGrid.locator('h3')).toHaveText([...creators]);
  }

  async expectProductsInPublicList(products: VisibleProducts) {
    await this.openAllProducts();
    const fullLinks = this.page.locator('main a[href*="/product/"]');
    await expect.poll(() => fullLinks.count()).toBeGreaterThanOrEqual(products.recommended.length);

    const listed = await this.productCards(this.page.locator('main'));
    expect(listed.slice(0, products.recommended.length).map(({ href }) => href)).toEqual(
      products.recommended.map(({ href }) => href),
    );

    const listedHrefs = new Set(listed.map(({ href }) => href));
    const search = this.page.getByRole('textbox', { name: 'Find products', exact: true });
    for (const product of [...products.popular, ...products.recommended]) {
      if (listedHrefs.has(product.href)) continue;
      await safeFill(search, product.title);
      await expect(this.page.locator(`main a[href="${product.href}"]`)).toBeVisible();
    }

    await this.returnToExplore();
  }

  async openProductFromEachSection(products: VisibleProducts) {
    for (const [section, product] of [
      [this.popularGrid, products.popular[0]],
      [this.recommendedGrid, products.recommended[0]],
    ] as const) {
      expect(product, 'Each product section must contain a card').toBeTruthy();
      await safeClick(section.locator(`a[href="${product.href}"]`));
      await expect(this.page).toHaveURL(new URL(product.href.slice(1), this.baseURL).toString());
      await this.returnToExplore();
    }
  }

  async returnToExplore() {
    await this.goto();
    await this.expectLoaded();
  }

  async openAllCreators() {
    await safeClick(this.creatorsSeeMore);
    await expect(this.page).toHaveURL(new URL('explore/creators', this.baseURL).toString());
    await expect(this.page.getByRole('heading', { name: 'Explore Creators', exact: true })).toBeVisible();
    await expect.poll(() => this.page.locator('main a:has(h3)').count()).toBeGreaterThan(4);
  }

  async expectCreatorSearch(name: string) {
    await safeFill(this.page.getByRole('textbox', { name: 'Find creators', exact: true }), name);
    await expect(this.page.getByRole('heading', { name, exact: true })).toBeVisible();
  }

  async openAllProducts() {
    await safeClick(this.popularSeeMore);
    await expect(this.page).toHaveURL(new URL('explore/products', this.baseURL).toString());
    await expect(this.page.getByRole('heading', { name: 'Explore Products', exact: true })).toBeVisible();
  }

  async expectPaidAndFreeProducts() {
    const cardText = await this.page.locator('main a[href*="/product/"]').allTextContents();
    expect(cardText.some((text) => /(?:Rp|\$)\s?[\d.,]+/.test(text)), 'Full list must contain a paid product').toBeTruthy();
    expect(cardText.some((text) => text.includes('Free')), 'Full list must contain a Free product').toBeTruthy();
  }

  async expectProductSearch(title: string) {
    await safeFill(this.page.getByRole('textbox', { name: 'Find products', exact: true }), title);
    await expect(this.page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }

  private async productCards(section: Locator): Promise<ProductCard[]> {
    return section.locator('a[href*="/product/"]').evaluateAll((links) => links.map((link) => {
      const text = (link as unknown as { innerText: string }).innerText;
      const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
      return {
        href: link.getAttribute('href') ?? '',
        title: link.querySelector('h3')?.textContent?.trim() || lines[0] || '',
      };
    }));
  }
}
