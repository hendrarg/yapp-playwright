import { test as guestTest, expect } from '../test-base';
import { landingCopy, generateGetYappUsername } from '@test-data/buyer/landing.data';

guestTest.describe('Buyer Landing Page', () => {
  guestTest('Verify Landing Page Hero, Header, and Copy Regression', {
    tag: ['@AUT-FV-306', '@landing', '@buyer', '@regression'],
  }, async ({ buyerNav, landingPage }) => {
    await guestTest.step('Open landing page and verify shell renders', async () => {
      await buyerNav.open('landing');
      await landingPage.expectLandingShellVisible();
    });

    await guestTest.step('Verify header navigation labels', async () => {
      await landingPage.expectHeaderLabels();
    });

    await guestTest.step('Verify hero headline and supporting copy', async () => {
      await landingPage.expectHeroCopy();
    });

    await guestTest.step('Verify Explore menu expands and collapses', async () => {
      await landingPage.openExploreMenu();
      await landingPage.closeExploreMenu();
    });

    await guestTest.step('Verify approved marketing copy with no placeholders', async () => {
      await landingPage.expectApprovedCopy();
    });
  });

  guestTest('Verify Landing Page Primary Conversion CTAs and Join Form', {
    tag: ['@AUT-FV-307', '@landing', '@buyer', '@smoke', '@regression'],
  }, async ({ buyerNav, landingPage, explorePage }) => {
    await guestTest.step('Open landing page', async () => {
      await buyerNav.open('landing');
    });

    await guestTest.step('Verify Start Exploring navigates to Explore', async () => {
      await landingPage.clickStartExploring();
      await explorePage.expectLoaded();
      await explorePage.expectRecommendedSectionVisible();
    });

    await guestTest.step('Verify Become a Creator opens creator join flow', async () => {
      await buyerNav.open('landing');
      const creatorAuthPage = await landingPage.clickBecomeACreator();
      await landingPage.expectCreatorJoinFormVisible(creatorAuthPage);
      await creatorAuthPage.close();
    });

    await guestTest.step('Verify Get Yapp form accepts input and submits', async () => {
      await buyerNav.open('landing');
      const username = generateGetYappUsername();
      await landingPage.submitGetYapp(username);
      await landingPage.expectCreatorJoinFormVisible(landingPage.page, username);
    });
  });

  guestTest('Verify Landing Page Feature, Creator, Product, and Campaign Discovery Sections', {
    tag: ['@AUT-FV-308', '@landing', '@buyer', '@regression'],
  }, async ({ buyerNav, landingPage }) => {
    await guestTest.step('Open landing page', async () => {
      await buyerNav.open('landing');
    });

    await guestTest.step('Verify core feature tabs are visible', async () => {
      await landingPage.expectFeatureTabs();
    });

    await guestTest.step('Verify feature cards show copy and Sign Up CTA', async () => {
      await landingPage.expectFeatureCards();
    });

    await guestTest.step('Verify Creators section cards and View More', async () => {
      await landingPage.expectCreatorsSection();
    });

    await guestTest.step('Verify Products section metadata', async () => {
      await landingPage.expectProductsSection();
    });

    await guestTest.step('Verify Campaigns section progress metadata', async () => {
      await landingPage.expectCampaignsSection();
    });
  });

  guestTest('Verify Landing Page FAQ Accordion and Footer Navigation', {
    tag: ['@AUT-FV-309', '@landing', '@buyer', '@regression'],
  }, async ({ buyerNav, landingPage, page }) => {
    await guestTest.step('Open landing page', async () => {
      await buyerNav.open('landing');
    });

    await guestTest.step('Verify FAQ expands and collapses', async () => {
      await landingPage.expandFaq();
      await landingPage.collapseFaq();
    });

    await guestTest.step('Verify footer links navigate to correct destinations', async () => {
      for (const link of landingCopy.footerLinks) {
        await buyerNav.open('landing');
        const destination = await landingPage.openFooterLink(link.name);
        await expect(destination).toHaveURL(link.urlPattern);
        if (destination !== page) {
          await destination.close();
        }
      }
    });
  });
});
