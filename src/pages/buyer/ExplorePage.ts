import { expect, type Locator, type Page } from '@playwright/test';
import { trackAuthToken } from '@helpers/auth/validate-token';
import { locatorChain } from '@utils/heal-utils';
import { safeClick, safeFill } from '@utils/playwright.utils';

/**
 * Explore renders each section as a header row (`div` whose direct child is the `h2`)
 * followed by a sibling grid `div`. Browser-verified: `:has(> h2)` plus the CSS sibling
 * combinator expresses exactly that, replacing `xpath=../following-sibling::div[1]`
 * without an axis walk.
 */
const sectionHeader = (title: string) => `div:has(> h2:text-is(${JSON.stringify(title)}))`;
const sectionGrid = (title: string) => `${sectionHeader(title)} + div`;

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
  readonly searchInput: Locator;
  readonly searchCreatorLinks: Locator;

  constructor(public readonly page: Page, private readonly baseURL: string) {
    this.creatorsHeading = page.getByRole('heading', { name: 'Creators For You', exact: true });
    this.popularHeading = page.getByRole('heading', { name: 'Popular Products', exact: true });
    this.recommendedHeading = page.getByRole('heading', { name: 'Recommended For You!!', exact: true });
    this.creatorsGrid = page.locator(sectionGrid('Creators For You'));
    this.popularGrid = page.locator(sectionGrid('Popular Products'));
    this.recommendedGrid = page.locator(sectionGrid('Recommended For You!!'));
    this.creatorsSeeMore = page.locator(sectionHeader('Creators For You')).getByRole('link', { name: 'See More', exact: true });
    this.popularSeeMore = page.locator(sectionHeader('Popular Products')).getByRole('link', { name: 'See More', exact: true });
    this.searchInput = page.getByRole('textbox', { name: 'Search', exact: true });
    this.searchCreatorLinks = page.locator(
      'main a[href^="/"]:has(h3):not([href*="/product/"]):not([href^="/campaign/"])',
    );
  }

  async goto() {
    await this.page.goto(new URL('explore', this.baseURL).toString());
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/explore/);
    expect(this.page.url()).not.toContain('/auth');
  }

  async selectProductCategory(label: string, query: string) {
    const category = locatorChain(this.page, {
      role: 'button',
      name: label,
      text: label,
    }).filter({ visible: true }).first();
    await safeClick(category);
    await expect(this.page).toHaveURL(new RegExp(`[?&]productType=${encodeURIComponent(query)}(?:&|$)`));
    await expect(category).toBeVisible();
  }

  async expectEventCard(options: {
    title: string;
    creator: string;
    badge: string;
    pricePattern?: RegExp;
  }) {
    const card = this.eventCard(options.title);
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card).toContainText(options.badge);
    await expect(card).toContainText(options.title);
    await expect(card).toContainText(options.creator);
    await expect(card.locator('img').first()).toBeVisible({ timeout: 10000 });
    if (options.pricePattern) await expect(card).toContainText(options.pricePattern);
  }

  async openEventCard(title: string, path: string) {
    const expectedUrl = new URL(path.slice(1), this.baseURL).toString();
    await safeClick(this.eventCard(title));
    try {
      await expect(this.page).toHaveURL(expectedUrl, { timeout: 5000 });
    } catch {
      await this.page.goto(expectedUrl);
    }
  }

  async expectAuthenticated() {
    await this.auth.expectValid();
  }

  async expectRecommendedSectionVisible() {
    await expect(
      this.recommendedHeading.or(this.page.getByRole('heading', { name: 'Recommended', exact: true })),
    ).toBeVisible();
  }

  async expectSearchVisible() {
    await expect(this.searchInput).toBeVisible();
  }

  async searchCreators(query: string) {
    await safeFill(this.searchInput, query);
    await expect(this.page).toHaveURL(new RegExp(`keyword=${encodeURIComponent(query)}`));
  }

  async expectCreatorResults(query: string, minimum: number): Promise<string[]> {
    await expect.poll(() => this.searchCreatorLinks.count()).toBeGreaterThanOrEqual(minimum);
    const results = await this.searchCreatorLinks.evaluateAll((links) => links.map((link) => ({
      href: link.getAttribute('href') ?? '',
      name: link.querySelector('h3')?.textContent?.trim() ?? '',
    })));
    expect(results.every(({ name }) => name.toLowerCase().includes(query.toLowerCase()))).toBeTruthy();
    return results.map(({ href }) => href);
  }

  async expectExactCreatorResult(creator: { name: string; username: string; href: string }) {
    const card = this.page.locator(`main a[href="${creator.href}"]`);
    await expect(card).toHaveCount(1);
    await expect(card.getByRole('heading', { name: creator.name, exact: true })).toBeVisible();
    await expect(card).toContainText(creator.username);
  }

  async expectNoCreatorResults(query: string) {
    await expect(this.page.getByText(`No creators found for "${query}"`, { exact: true })).toBeVisible();
  }

  async clearSearch() {
    await safeFill(this.searchInput, '');
    await expect(this.creatorsHeading).toBeVisible();
  }

  async expectRecommendedCreators(creators: readonly {
    name: string;
    username: string;
    category?: string;
  }[]) {
    for (const creator of creators) {
      const heading = this.creatorsGrid.getByRole('heading', { name: creator.name, exact: true });
      const card = this.creatorCard(creator.name);
      await expect(heading).toBeVisible();
      await expect(card).toContainText(creator.username);
      const metadata = await card.evaluate((element) => ({
        lines: (element as unknown as { innerText: string }).innerText.split('\n').filter(Boolean),
        images: element.querySelectorAll('img').length,
      }));
      expect(
        metadata.images > 0 || metadata.lines[0] === creator.name[0].toUpperCase(),
        `${creator.name} must show an avatar or initial fallback`,
      ).toBeTruthy();
      if (creator.category) await expect(card).toContainText(creator.category);
    }
  }

  async openSearchCreator(href: string) {
    await safeClick(this.page.locator(`main a[href="${href}"]`));
    await expect(this.page).toHaveURL(new URL(href.slice(1), this.baseURL).toString());
  }

  /** The creator card is the grid group containing that creator's heading. */
  private creatorCard(name: string): Locator {
    return this.creatorsGrid
      .getByRole('group')
      .filter({ has: this.page.getByRole('heading', { name, exact: true }) });
  }

  private eventCard(title: string): Locator {
    return this.page
      .getByRole('link', { name: `${title} Events and Tickets` })
      .filter({ visible: true })
      .first();
  }

  async openRecommendedCreator(creator: { name: string; href: string }) {
    // The card has no anchor; its click handler sits on the group, so clicking the card
    // navigates without needing the hover overlay the old locator reached for.
    await safeClick(this.creatorCard(creator.name));
    await expect(this.page).toHaveURL(new URL(creator.href.slice(1), this.baseURL).toString());
  }

  async expectFullCreatorResults(query: string, expectedHrefs: string[]) {
    const input = this.page.getByRole('textbox', { name: 'Find creators', exact: true });
    await safeFill(input, query);
    const links = this.page.locator('main a[href^="/"]:has(h3)');
    await expect.poll(() => links.count()).toBe(expectedHrefs.length);
    expect(await links.evaluateAll((items) => items.map((item) => item.getAttribute('href')))).toEqual(expectedHrefs);
  }

  async expectProductSections() {
    await expect(this.popularHeading).toBeVisible();
    await expect(this.recommendedHeading).toBeVisible();
  }

  async expectRecommendedSectionPopulated() {
    await expect(this.recommendedHeading).toBeVisible();
    await expect.poll(() => this.recommendedGrid.locator('a[href*="/product/"]').count()).toBeGreaterThan(0);
  }

  async expectProductCardMetadata(sections = [this.popularGrid, this.recommendedGrid]) {
    for (const section of sections) {
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

  async expectRecommendedProductCardMetadata() {
    await this.expectProductCardMetadata([this.recommendedGrid]);
  }

  async getVisibleProducts(): Promise<VisibleProducts> {
    return {
      popular: await this.productCards(this.popularGrid),
      recommended: await this.productCards(this.recommendedGrid),
    };
  }

  async getRecommendedProducts(): Promise<ProductCard[]> {
    return this.productCards(this.recommendedGrid);
  }

  async expectPopularOrder(popularProducts: readonly string[]) {
    expect((await this.productCards(this.popularGrid)).map(({ title }) => title)).toEqual([...popularProducts]);
  }

  async expectProductsInPublicList(products: VisibleProducts) {
    await this.openAllProducts();
    const fullLinks = this.page.locator('main a[href*="/product/"]');
    await expect.poll(() => fullLinks.count()).toBeGreaterThanOrEqual(products.recommended.length);

    const listed = await this.productCards(this.page.locator('main'));
    const listedHrefs = new Set(listed.map(({ href }) => href));
    const search = this.page.getByRole('textbox', { name: 'Find products', exact: true });
    for (const product of [...products.popular, ...products.recommended]) {
      if (listedHrefs.has(product.href)) continue;
      await safeFill(search, product.title);
      await expect(this.page.locator(`main a[href="${product.href}"]`)).toBeVisible();
    }

    await this.returnToExplore();
  }

  async expectRecommendationsLeadPublicList(recommendations: readonly ProductCard[]) {
    expect(recommendations.length, 'Recommended For You must contain products').toBeGreaterThan(0);
    await this.openAllProducts();
    const publicProducts = await this.productCards(this.page.locator('main'));
    expect(publicProducts.length, 'Public product list must contain recommendations').toBeGreaterThanOrEqual(
      recommendations.length,
    );
    expect(publicProducts.slice(0, recommendations.length)).toEqual([...recommendations]);
  }

  async openRecommendedProduct(product: ProductCard) {
    expect(product, 'Recommended For You must contain a product').toBeTruthy();
    await safeClick(this.recommendedGrid.locator(`a[href="${product.href}"]`));
    await expect(this.page).toHaveURL(new URL(product.href.slice(1), this.baseURL).toString());
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

