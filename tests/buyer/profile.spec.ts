import { authTest as test } from '../test-base';
import { creatorProfileHandle, profileLabels } from '@test-data/buyer/profile.data';

test('injected "at" token loads the profile page without redirecting to auth', {
  tag: ['@profile', '@buyer', '@smoke'],
}, async ({ buyerProfilePage }) => {
  await buyerProfilePage.goto();
  await buyerProfilePage.expectLoaded();
  await buyerProfilePage.expectAuthenticated();
});

test('Buyer Creator Profile — Navigate Tabs & View Content', {
  tag: ['@TAT-B-E2E-002', '@profile', '@buyer', '@smoke', '@regression'],
}, async ({ buyerProfilePage }) => {
  test.setTimeout(90000);

  await test.step('Open creator profile', async () => {
    await buyerProfilePage.goto(creatorProfileHandle);
    await buyerProfilePage.expectLoaded();
    await buyerProfilePage.expectAuthenticated();
  });

  await test.step('View Shops tab content', async () => {
    await buyerProfilePage.expectProfileHeaderVisible();
    await buyerProfilePage.expectTabActive('shops');
    await buyerProfilePage.expectShopsTabContent();
  });

  await test.step('View Membership plans section (max 2 + Show More)', async () => {
    await buyerProfilePage.expectMembershipSectionVisible();
  });

  await test.step('View Support creator section + tip form interactions', async () => {
    await buyerProfilePage.expectSupportSectionVisible();
    await buyerProfilePage.expectSendTipesDisabled();
    await buyerProfilePage.selectTipSuggestion(profileLabels.tipSuggestion.idr[1]);
    await buyerProfilePage.expectSendTipesEnabled();
  });

  await test.step('Switch to Links tab and verify link cards', async () => {
    await buyerProfilePage.switchToTab('links');
    await buyerProfilePage.expectTabActive('links');
    await buyerProfilePage.expectLinksTabContent();
  });

  await test.step('Switch to Support tab and verify tip history', async () => {
    await buyerProfilePage.switchToTab('support');
    await buyerProfilePage.expectTabActive('support');
    await buyerProfilePage.expectSupportTabContent();
  });

  await test.step('Switch to Feeds tab, open public content', async () => {
    await buyerProfilePage.switchToTab('feeds');
    await buyerProfilePage.expectTabActive('feeds');
    await buyerProfilePage.expectFeedsTabContent();
  });

  await test.step('Switch to Feeds Exclusive tab, open exclusive image post, verify locked', async () => {
    await buyerProfilePage.toggleExclusiveOnly();
    await buyerProfilePage.expectExclusiveOnlyShowsLocked();
    await buyerProfilePage.openFirstPublicImagePost();
    await buyerProfilePage.expectPostDetailOpen();
    await buyerProfilePage.expectPublicImageUnlocked();
  });
});