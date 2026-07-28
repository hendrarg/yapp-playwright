import type { Page } from '@playwright/test';
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
  }

  async expectLoaded() {
    const expected = new URL(this.baseURL);
    await expect(this.page).toHaveURL((url) => {
      const actual = new URL(url);
      return actual.origin === expected.origin && (actual.pathname === '/' || actual.pathname === '');
    });
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
    await safeClick(this.faqQuestion);
    await expect(this.faqQuestion).toHaveAttribute('aria-expanded', 'true');
  }

  async collapseFaq() {
    await safeClick(this.faqQuestion);
    await expect(this.faqQuestion).toHaveAttribute('aria-expanded', 'false');
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
}
