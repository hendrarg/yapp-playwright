import { test as guestTest, expect } from '../test-base';
import { landingCopy, generateGetYappUsername } from '@test-data/buyer/landing.data';

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
});
