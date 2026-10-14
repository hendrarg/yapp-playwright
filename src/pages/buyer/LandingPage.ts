import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { landingCopy } from '@test-data/buyer/landing.data';
import { locatorChain, smartLocator } from '@utils/heal-utils';
import { safeClick, safeFill } from '@utils/playwright.utils';

export class LandingPage {
  constructor(
    public readonly page: Page,
    private readonly baseURL: string,
  ) {}

  readonly heroHeadline = locatorChain(this.page, {
    role: 'heading',
    name: landingCopy.heroHeadline,
    exact: true,
    selector: `h2:text-is("${landingCopy.heroHeadline}")`,
  });

  readonly heroSupporting = locatorChain(this.page, {
    selector: `h2:text-is("${landingCopy.heroHeadline}") + p`,
    text: landingCopy.heroSupporting,
  }).first();

  readonly footer = locatorChain(this.page, {
    role: 'contentinfo',
    selector: 'footer',
  });

  readonly exploreMenuButton = locatorChain(this.page, {
    role: 'button',
    name: 'Explore',
    text: 'Explore',
    exact: true,
  });

  readonly exploreCreatorsLink = locatorChain(this.page, {
    role: 'link',
    name: 'Creators',
    exact: true,
    selector: 'a[data-slot="navigation-menu-link"][href="/explore/creators"]',
  });

  readonly exploreProductsLink = locatorChain(this.page, {
    role: 'link',
    name: 'Products',
    exact: true,
    selector: 'a[data-slot="navigation-menu-link"][href="/explore/products"]',
  });

  readonly exploreCampaignsLink = locatorChain(this.page, {
    role: 'link',
    name: 'Campaigns',
    exact: true,
    selector: 'a[data-slot="navigation-menu-link"][href="/explore/campaigns"]',
  });

  readonly startExploringLink = locatorChain(this.page, {
    role: 'link',
    name: landingCopy.startExploring,
    text: landingCopy.startExploring,
    exact: true,
  });

  readonly becomeACreatorLink = locatorChain(this.page, {
    role: 'link',
    name: landingCopy.becomeACreator,
    text: landingCopy.becomeACreator,
    exact: true,
  });

  readonly getYappInput = locatorChain(this.page, {
    role: 'textbox',
    placeholder: landingCopy.getYappPlaceholder,
    selector: 'input[name="username"]',
  });

  readonly getYappButton = locatorChain(this.page, {
    role: 'button',
    name: landingCopy.getYapp,
    text: landingCopy.getYapp,
    selector: 'button[type="submit"]:has-text("Get Yapp")',
  });

  readonly creatorsHeading = locatorChain(this.page, {
    role: 'heading',
    name: landingCopy.creatorsHeading,
    exact: true,
    selector: `h2:text-is("${landingCopy.creatorsHeading}")`,
  });

  readonly productsHeading = locatorChain(this.page, {
    role: 'heading',
    name: landingCopy.productsHeading,
    exact: true,
    selector: `h2:text-is("${landingCopy.productsHeading}")`,
  });

  readonly campaignsHeading = locatorChain(this.page, {
    role: 'heading',
    name: landingCopy.campaignsHeading,
    exact: true,
    selector: `h2:text-is("${landingCopy.campaignsHeading}")`,
  });

  readonly creatorsViewMore = locatorChain(this.page, {
    role: 'link',
    name: landingCopy.viewMore,
    text: landingCopy.viewMore,
    selector: 'a[href="/explore/creators"]',
  });

  readonly productsViewMore = locatorChain(this.page, {
    role: 'link',
    name: landingCopy.viewMore,
    text: landingCopy.viewMore,
    selector: 'a[href="/explore/products"]',
  });

  readonly campaignsViewMore = locatorChain(this.page, {
    role: 'link',
    name: landingCopy.viewMore,
    text: landingCopy.viewMore,
    selector: 'a[href="/explore/campaigns"]',
  });

  readonly faqQuestion = locatorChain(this.page, {
    role: 'button',
    name: landingCopy.faqQuestion,
    exact: true,
    selector: `[data-slot="accordion-trigger"]:has-text("${landingCopy.faqQuestion}")`,
  });

  readonly creatorEmailInput = locatorChain(this.page, {
    role: 'textbox',
    placeholder: 'Email',
    label: 'Email',
    selector: 'input[name="email"]',
  });

  // Keep smartLocator import live for locator audit + click helpers
  private readonly startExploringAction = smartLocator(this.page, {
    role: 'link',
    name: landingCopy.startExploring,
    text: landingCopy.startExploring,
    exact: true,
  });

  async goto() {
    await this.page.goto(this.baseURL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async expectLoaded() {
    const expected = new URL(this.baseURL);
    const originPattern = expected.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(this.page).toHaveURL(new RegExp(`^${originPattern}/?$`), { timeout: 15000 });
    expect(this.page.url()).not.toContain('/auth');
  }

  async expectLandingShellVisible() {
    await expect(this.heroHeadline).toBeVisible();
    await expect(this.creatorsHeading).toBeVisible();
    await expect(this.productsHeading).toBeVisible();
    await expect(this.campaignsHeading).toBeVisible();
    await expect(this.footer).toBeVisible();
  }

  async expectHeaderLabels() {
    for (const label of landingCopy.headerLabels) {
      const locator = locatorChain(this.page, {
        role: label === 'Explore' ? 'button' : 'link',
        name: label,
        text: label,
        exact: true,
      });
      await expect(locator.first()).toBeVisible();
    }
  }

  async expectHeroCopy() {
    await expect(this.heroHeadline).toBeVisible();
    await expect(this.heroSupporting).toBeVisible();
    const body = (await this.page.locator('body').innerText()).toLowerCase();
    for (const forbidden of landingCopy.placeholderForbidden) {
      expect(body).not.toContain(forbidden);
    }
  }

  async openExploreMenu() {
    await safeClick(this.exploreMenuButton);
    await expect(this.exploreCreatorsLink).toBeVisible();
    await expect(this.exploreProductsLink).toBeVisible();
    await expect(this.exploreCampaignsLink).toBeVisible();
  }

  /** Open the header Explore menu, pick an item and land on its explore page (first load can be slow). */
  async openExploreMenuItem(item: { label: string; path: string; heading: string }) {
    await this.openExploreMenu();
    const links = { '/explore/creators': this.exploreCreatorsLink, '/explore/products': this.exploreProductsLink, '/explore/campaigns': this.exploreCampaignsLink } as Record<string, Locator>;
    await safeClick(links[item.path]);
    await this.page.waitForURL((url) => url.pathname === item.path, { timeout: 30000 });
    await expect(this.page.getByRole('heading', { name: item.heading, exact: true })).toBeVisible({ timeout: 15000 });
  }

  async closeExploreMenu() {
    await safeClick(this.exploreMenuButton);
    await expect(this.exploreCreatorsLink).toBeHidden();
  }

  async expectApprovedCopy() {
    for (const snippet of landingCopy.approvedSnippets) {
      await expect(this.page.getByText(snippet, { exact: false }).first()).toBeVisible();
    }
    const body = (await this.page.locator('body').innerText()).toLowerCase();
    for (const forbidden of landingCopy.placeholderForbidden) {
      expect(body).not.toContain(forbidden);
    }
  }

  async clickStartExploring() {
    await this.startExploringAction.click();
  }

  async clickBecomeACreator() {
    const link = this.becomeACreatorLink.first();
    const target = await link.getAttribute('target');
    if (target === '_blank') {
      const [popup] = await Promise.all([this.page.waitForEvent('popup'), safeClick(link)]);
      await popup.waitForLoadState('domcontentloaded');
      return popup;
    }
    await safeClick(link);
    return this.page;
  }

  async submitGetYapp(username: string) {
    await this.getYappInput.scrollIntoViewIfNeeded();
    await safeFill(this.getYappInput, username);
    await Promise.all([
      this.page.waitForURL(/\/auth/, { timeout: 20000, waitUntil: 'commit' }),
      safeClick(this.getYappButton),
    ]);
  }

  async expectCreatorJoinFormVisible(targetPage: Page = this.page, username?: string) {
    await expect(targetPage).toHaveURL(/\/auth/);
    if (username) {
      await expect(targetPage).toHaveURL(new RegExp(`username=${encodeURIComponent(username)}`));
    }
    const emailInput = locatorChain(targetPage, {
      role: 'textbox',
      placeholder: 'Email',
      label: 'Email',
      selector: 'input[name="email"]',
    });
    await expect(emailInput).toBeVisible();
    await expect(targetPage.getByText(/Join Yapp|Continue/i).first()).toBeVisible();
  }

  async expectFeatureTabs() {
    for (const tab of landingCopy.featureTabs) {
      const locator = locatorChain(this.page, {
        role: 'button',
        name: tab,
        text: tab,
        exact: true,
      });
      await expect(locator.first()).toBeVisible();
    }
  }

  async expectFeatureCards() {
    for (const title of landingCopy.featureCardTitles) {
      await expect(this.page.getByText(title, { exact: false }).first()).toBeVisible();
    }
    await expect(
      locatorChain(this.page, {
        role: 'link',
        name: landingCopy.signUpCta,
        text: landingCopy.signUpCta,
        exact: true,
      }).first(),
    ).toBeVisible();
  }

  async expectCreatorsSection() {
    await this.creatorsHeading.scrollIntoViewIfNeeded();
    await expect(this.creatorsHeading).toBeVisible();
    await expect(this.creatorsViewMore.first()).toBeVisible();
    await expect(this.page.locator('h3').nth(0)).toBeVisible();
  }

  async expectProductsSection() {
    await this.productsHeading.scrollIntoViewIfNeeded();
    await expect(this.productsHeading).toBeVisible();
    await expect(this.productsViewMore.first()).toBeVisible();
    await expect(this.page.getByText(/Rp|IDR|\$/i).first()).toBeVisible();
  }

  async expectCampaignsSection() {
    await this.campaignsHeading.scrollIntoViewIfNeeded();
    await expect(this.campaignsHeading).toBeVisible();
    await expect(this.campaignsViewMore.first()).toBeVisible();
    await expect(this.page.getByText(/Goals IDR|Goals/i).first()).toBeVisible();
  }

  async expandFaq() {
    await this.faqQuestion.scrollIntoViewIfNeeded();
    await expect(async () => {
      if ((await this.faqQuestion.getAttribute('aria-expanded')) !== 'true') {
        await safeClick(this.faqQuestion);
      }
      await expect(this.faqQuestion).toHaveAttribute('aria-expanded', 'true', { timeout: 2000 });
    }).toPass({ timeout: 10000 });
  }

  async collapseFaq() {
    await expect(async () => {
      if ((await this.faqQuestion.getAttribute('aria-expanded')) !== 'false') {
        await safeClick(this.faqQuestion);
      }
      await expect(this.faqQuestion).toHaveAttribute('aria-expanded', 'false', { timeout: 2000 });
    }).toPass({ timeout: 10000 });
  }

  async openFooterLink(name: string) {
    const link = locatorChain(this.page, {
      role: 'link',
      name,
      text: name,
      exact: true,
    }).first();
    await link.scrollIntoViewIfNeeded();
    const target = await link.getAttribute('target');
    if (target === '_blank') {
      const [popup] = await Promise.all([this.page.waitForEvent('popup'), safeClick(link)]);
      await popup.waitForLoadState('domcontentloaded');
      return popup;
    }
    await safeClick(link);
    return this.page;
  }

  // ── Header anchors ──

  private get header(): Locator {
    return this.page.getByRole('banner');
  }

  private section(id: string): Locator {
    return this.page.locator(`#${id}`);
  }

  /** Click a header anchor; its section must settle just below the sticky header. */
  async followHeaderAnchor(name: string, sectionId: string) {
    const anchor = this.header.getByRole('link', { name, exact: true });
    await expect(async () => {
      const headerBottom = await this.header.evaluate((el) => el.getBoundingClientRect().bottom);
      const topBefore = (await this.section(sectionId).boundingBox())?.y ?? -1;
      if (topBefore < Math.floor(headerBottom) || topBefore >= headerBottom + 120) {
        await safeClick(anchor);
      }
      await expect
        .poll(
          async () => {
            const top = (await this.section(sectionId).boundingBox())?.y ?? -1;
            return top >= Math.floor(headerBottom) && top < headerBottom + 120;
          },
          { timeout: 3000, message: `${name} section should start right under the header` },
        )
        .toBe(true);
    }).toPass({ timeout: 15000 });
  }

  // ── Pricing, Multicurrency, Join Yapp ──

  async expectPricingSection(pricing: { heading: string; planName: string; price: string; cta: string; features: readonly string[] }) {
    const section = this.section('pricing');
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole('heading', { name: pricing.heading })).toBeVisible();
    await expect(section.getByText(pricing.planName, { exact: true })).toBeVisible();
    await expect(section.getByText(pricing.price, { exact: true })).toBeVisible();
    await expect(section.getByRole('link', { name: pricing.cta })).toBeVisible();
    await expect(section.getByRole('listitem')).toHaveText([...pricing.features]);
  }

  async expectMulticurrencySection(copy: { heading: string; currencies: readonly string[] }) {
    const section = this.section('currency-section');
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole('heading', { name: copy.heading })).toBeVisible();
    const statement = section.getByText(/^We support /);
    for (const currency of copy.currencies) {
      await expect(statement).toContainText(currency);
      await expect(section.getByRole('img', { name: currency, exact: true })).toBeVisible();
    }
  }

  async expectJoinYappSection(copy: { intro: string; cta: string; samplePages: readonly string[] }) {
    const section = this.section('expert-section');
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByText(copy.intro, { exact: true })).toBeVisible();
    await expect(section.getByRole('heading', { level: 3 })).toHaveCount(1);
    await expect(section.getByText(landingCopy.heroSupporting, { exact: true })).toBeVisible();
    await expect(section.getByRole('link', { name: copy.cta })).toBeVisible();
    for (const page of copy.samplePages) await expect(section.getByText(page, { exact: true })).toBeVisible();
  }

  // ── Footer ──

  private get footerRoot(): Locator {
    return this.section('footer');
  }

  /**
   * The footer "Creators" links are buttons that scroll the auto-rotating feature carousel; the
   * card brought to the front (left edge inside the first half of the viewport) is the one shown.
   */
  async openFooterQuickLink(label: string, expectedCard: string) {
    const cardInFront = () =>
      this.section('features-root').evaluate((root, title) => {
        const g = globalThis as any;
        const card = [...root.querySelectorAll('p')].find((p: any) => p.textContent.trim() === title) as any;
        if (!card) return false;
        const box = card.getBoundingClientRect();
        return box.top >= 0 && box.bottom <= g.innerHeight && box.left >= 0 && box.left < g.innerWidth / 2;
      }, expectedCard);
    // The carousel rotates on its own, so a click caught mid-slide can be lost — click again until
    // the matching card is in front.
    await expect(async () => {
      await this.footerRoot.getByRole('button', { name: label, exact: true }).click();
      await expect.poll(cardInFront, { timeout: 4000 }).toBe(true);
    }, `${label} should bring "${expectedCard}" to the front`).toPass({ timeout: 20000 });
  }

  async expectSocialLink(href: string) {
    const link = this.footerRoot.locator(`a[href="${href}"]`);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
  }

  /** Follow a footer social link and return the tab it opened. */
  async openSocialLink(href: string): Promise<Page> {
    const [popup] = await Promise.all([this.page.waitForEvent('popup'), safeClick(this.footerRoot.locator(`a[href="${href}"]`))]);
    return popup;
  }

  // ── Auth entry and creator CTAs ──

  async openLogIn() {
    // A click before hydration is dropped; repeat until the sign-in route is reached.
    await expect(async () => {
      await this.header.getByRole('link', { name: 'Log In', exact: true }).click();
      await expect(this.page).toHaveURL(new URL('/auth', this.baseURL).toString(), { timeout: 4000 });
    }).toPass({ timeout: 20000 });
    await expect(this.page.getByRole('heading', { name: /^Sign in to Yapp/ })).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByRole('textbox', { name: 'Enter your email' })).toBeVisible();
  }

  /** `href` of every anchor wrapping one of the creator sign-up CTAs. */
  async creatorCtaHrefs(labels: readonly string[]): Promise<string[]> {
    const hrefs: string[] = [];
    for (const label of labels) {
      const anchors = this.page.getByRole('link', { name: label, exact: true });
      expect(await anchors.count(), `"${label}" CTA should be on the page`).toBeGreaterThan(0);
      for (const href of await anchors.evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''))) hrefs.push(href);
    }
    return hrefs;
  }

  // ── Mobile header ──

  async expectMobileHeader() {
    await expect(this.header.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 15000 });
    await expect(this.header.getByRole('navigation', { name: 'Main' })).toBeHidden();
  }

  async openMobileMenu(items: readonly string[]) {
    await this.page.waitForLoadState('networkidle').catch(() => {});
    const drawer = this.page.getByRole('dialog', { name: 'Menu' });
    await expect(async () => {
      if (!(await drawer.isVisible())) {
        await this.header.getByRole('button', { name: 'Menu' }).click();
      }
      await expect(drawer).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20000 });
    for (const item of items) {
      await expect(drawer.getByRole(item === 'Log In' ? 'link' : 'button', { name: item, exact: true })).toBeVisible();
    }
  }
}
