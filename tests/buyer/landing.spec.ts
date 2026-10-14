import { test as guestTest, expect } from '../test-base';
import { baseURL, creatorsBaseURL } from '@config/env';
import { LandingPage } from '@pages/buyer/LandingPage';
import { creatorSignUpCtas, footerQuickLinks, generateGetYappUsername, landingAnchors, landingCopy, landingJoinYapp, landingMulticurrency, landingPricing, landingSocialLinks, mobileMenuItems } from '@test-data/buyer/landing.data';

guestTest.describe('Buyer Landing Page', () => {
  guestTest('Landing Page — Page Load, Header Navigation, Hero Copy, Primary CTA, Header Menu, Feature Tabs', {
    tag: ['@AUT-LP-001', '@landing', '@buyer', '@smoke'],
  }, async ({ buyerNav, landingPage, explorePage }) => {
    await guestTest.step('The landing page loads with hero, content sections and footer', async () => {
      await buyerNav.open('landing');
      await landingPage.expectLandingShellVisible();
    });

    await guestTest.step('The header shows Explore, Features, Pricing, FAQ and Log In', async () => {
      await landingPage.expectHeaderLabels();
    });

    await guestTest.step('The hero headline and supporting copy use the approved wording', async () => {
      await landingPage.expectHeroCopy();
    });

    await guestTest.step('The Explore menu expands and collapses', async () => {
      await landingPage.openExploreMenu();
      await landingPage.closeExploreMenu();
    });

    await guestTest.step('All core feature tabs are shown', async () => {
      await landingPage.expectFeatureTabs();
    });

    await guestTest.step('Start Exploring opens Explore with the recommended section', async () => {
      await landingPage.clickStartExploring();
      await explorePage.expectLoaded();
      await explorePage.expectRecommendedSectionVisible();
    });

    await guestTest.step('Become a Creator opens the creator sign-up flow', async () => {
      await buyerNav.open('landing');
      const creatorAuthPage = await landingPage.clickBecomeACreator();
      await landingPage.expectCreatorJoinFormVisible(creatorAuthPage);
      if (creatorAuthPage !== landingPage.page) await creatorAuthPage.close();
    });

    await guestTest.step('Each Explore menu item opens its explore page', async () => {
      for (const item of landingCopy.exploreMenuItems) {
        await buyerNav.open('landing');
        await landingPage.openExploreMenuItem(item);
      }
    });
  });

  guestTest('Landing Page — Feature Cards, Creators Section, Products Section, Campaigns Section, FAQ Accordion, Footer Navigation, Get Yapp Form, Copy Regression', {
    tag: ['@AUT-LP-002', '@landing', '@buyer', '@regression'],
  }, async ({ buyerNav, landingPage, page }) => {
    await guestTest.step('Feature cards show title, description and the Sign Up CTA', async () => {
      await buyerNav.open('landing');
      await landingPage.expectFeatureCards();
    });

    await guestTest.step('The Creators section renders creator cards and View More', async () => {
      await landingPage.expectCreatorsSection();
    });

    await guestTest.step('The Products section renders title, price and discount details', async () => {
      await landingPage.expectProductsSection();
    });

    await guestTest.step('The Campaigns section renders goal and progress', async () => {
      await landingPage.expectCampaignsSection();
    });

    await guestTest.step('An FAQ item expands and collapses', async () => {
      await landingPage.expandFaq();
      await landingPage.collapseFaq();
    });

    await guestTest.step('The page uses the approved marketing copy with no placeholders', async () => {
      await landingPage.expectApprovedCopy();
    });

    await guestTest.step('Footer links open their destinations', async () => {
      for (const link of landingCopy.footerLinks) {
        await buyerNav.open('landing');
        const destination = await landingPage.openFooterLink(link.name);
        await expect(destination).toHaveURL(link.urlPattern);
        if (destination !== page) await destination.close();
      }
    });

    await guestTest.step('The Get Yapp field accepts a username and opens the join form with it', async () => {
      await buyerNav.open('landing');
      const username = generateGetYappUsername();
      await landingPage.submitGetYapp(username);
      await landingPage.expectCreatorJoinFormVisible(landingPage.page, username);
    });
  });

  guestTest('Landing Page — Anchor Navigation, Pricing Section, Multicurrency Section, Join Yapp Section, Footer Quick Links, Footer Social Links, Authentication Entry, Responsive Header', {
    tag: ['@AUT-LP-003', '@landing', '@buyer', '@regression'],
  }, async ({ buyerNav, landingPage, browser }) => {
    guestTest.setTimeout(180000);
    await guestTest.step('Header Features, Pricing and FAQ scroll their section in just below the sticky header', async () => {
      await buyerNav.open('landing');
      for (const anchor of landingAnchors) await landingPage.followHeaderAnchor(anchor.name, anchor.sectionId);
    });

    await guestTest.step('Pricing shows the free plan, its price, the CTA and the included features', async () => {
      await landingPage.expectPricingSection(landingPricing);
    });

    await guestTest.step('Multicurrency states the supported currencies and shows their artwork', async () => {
      await landingPage.expectMulticurrencySection(landingMulticurrency);
    });

    await guestTest.step('Join Yapp shows the persona card, its copy, Be A Creator and the sample creator pages', async () => {
      await landingPage.expectJoinYappSection(landingJoinYapp);
    });

    await guestTest.step('Each footer Creators link brings its feature card to the front', async () => {
      for (const link of footerQuickLinks) await landingPage.openFooterQuickLink(link.label, link.card);
    });

    await guestTest.step('Footer Instagram and LinkedIn open the official profiles in a new tab', async () => {
      for (const social of landingSocialLinks) {
        await landingPage.expectSocialLink(social.href);
        const tab = await landingPage.openSocialLink(social.href);
        await expect.poll(() => tab.url(), { timeout: 15000 }).toContain(new URL(social.href).hostname.replace(/^www\./, ''));
        await tab.close();
      }
    });

    await guestTest.step('Header Log In opens the sign-in page on the same host', async () => {
      await buyerNav.open('landing');
      await landingPage.openLogIn();
    });

    await guestTest.step('At 390×844 the header collapses into a working Menu drawer', async () => {
      const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      try {
        const landing = new LandingPage(await mobile.newPage(), baseURL);
        await landing.goto();
        await landing.expectMobileHeader();
        await landing.openMobileMenu(mobileMenuItems);
      } finally {
        await mobile.close();
      }
    });
  });

  guestTest('Landing Page — Environment Config', {
    tag: ['@AUT-LP-004', '@landing', '@buyer', '@regression'],
  }, async ({ buyerNav, landingPage }) => {
    await guestTest.step('Every creator sign-up CTA points at the creators host of this environment', async () => {
      await buyerNav.open('landing');
      const hrefs = await landingPage.creatorCtaHrefs(creatorSignUpCtas);
      expect(hrefs.length).toBeGreaterThanOrEqual(creatorSignUpCtas.length);
      for (const href of hrefs) expect(new URL(href).host).toBe(new URL(creatorsBaseURL).host);
    });
  });
});
