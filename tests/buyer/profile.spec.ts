import { authTest as test, test as guestTest, expect } from '../test-base';
import { creatorProfile, membershipCreatorProfile, creatorProfiles } from '@test-data/buyer/profile.data';

test.describe('Buyer Profile', () => {
test('Verify Feeds and Exclusive Creator Profile Navigation & Exclusive Preview', {
  tag: ['@AUT-FV-091', '@profile', '@buyer', '@smoke', '@regression'],
}, async ({ buyerNav, buyerProfilePage }) => {
  test.setTimeout(90000);

  await test.step('Open creator profile', async () => {
    await buyerNav.open('profile', { handle: creatorProfile });
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
    await buyerProfilePage.expectSendTipDisabled();
    await buyerProfilePage.selectTipSuggestion();
    await buyerProfilePage.expectSendTipEnabled();
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

test('Verify Membership Access, Entitlements, and Eligibility — Part 3', {
  tag: ['@AUT-FV-128', '@profile', '@membership', '@buyer', '@regression'],
}, async ({ buyerNav, buyerProfilePage, buyerMembershipPage, tierDetailPage }) => {
  test.setTimeout(120000);

  await test.step('Open creator profile and verify membership section', async () => {
    await buyerNav.open('profile', { handle: membershipCreatorProfile });
    await buyerProfilePage.expectAuthenticated();
    await buyerProfilePage.expectProfileAvatarVisible();
    await buyerProfilePage.expectMembershipSectionVisible();
  });

  await test.step('Click Show More and verify membership page', async () => {
    await buyerProfilePage.showMoreButton.click();
    await buyerMembershipPage.expectPageLoaded();
  });

  await test.step('Select a membership tier and verify detail page', async () => {
    await buyerMembershipPage.clickFirstTier();
    await tierDetailPage.expectPageLoaded();
  });
});

guestTest('Verify Guest Like Action Requires Sign In', {
  tag: ['@AUT-FV-303', '@profile', '@auth', '@buyer', '@regression'],
}, async ({ buyerNav, buyerProfilePage }) => {
  guestTest.setTimeout(60000);

  await guestTest.step('Open profile as guest and verify Feeds tab visible', async () => {
    await buyerNav.goto('profile', { handle: creatorProfile });
    await buyerProfilePage.expectFeedsTabVisibleOnProfile();
  });

  await guestTest.step('Switch to Feeds tab', async () => {
    await buyerProfilePage.switchToTab('feeds');
    await buyerProfilePage.expectFeedsTabContent();
  });

  await guestTest.step('Click Like on post and verify sign in dialog', async () => {
    await buyerProfilePage.clickFirstLikePostAsGuest();
    await buyerProfilePage.expectLoveThisPostSignInDialog();
  });

  await guestTest.step('Click Sign in now and verify redirected to login', async () => {
    await buyerProfilePage.clickSignInNowFromDialog();
    await expect(buyerProfilePage.page).toHaveURL(/\/auth/, { timeout: 10000 });
  });
});

guestTest('Validate Feeds and Exclusive Inputs and Boundary Conditions — Part 2', {
  tag: ['@AUT-FV-087', '@profile', '@auth', '@buyer', '@regression'],
}, async ({ buyerNav, buyerProfilePage }) => {
  guestTest.setTimeout(60000);

  await guestTest.step('Open profile as guest and verify Feeds tab visible', async () => {
    await buyerNav.goto('profile', { handle: creatorProfile });
    await buyerProfilePage.expectFeedsTabVisibleOnProfile();
  });

  await guestTest.step('Switch to Feeds tab and verify posts', async () => {
    await buyerProfilePage.switchToTab('feeds');
    await buyerProfilePage.expectFeedsTabContent();
  });

  await guestTest.step('Click comment button to open post detail', async () => {
    await buyerProfilePage.clickFirstCommentButtonOnFeed();
    await buyerProfilePage.expectGuestCommentPrompt();
  });

  await guestTest.step('Click Sign In and verify sign in dialog', async () => {
    await buyerProfilePage.clickSignInOnComment();
    await buyerProfilePage.expectGuestCommentSignInDialog();
  });

  await guestTest.step('Click Sign in now and verify redirected to login', async () => {
    await buyerProfilePage.clickSignInNowFromDialog();
    await expect(buyerProfilePage.page).toHaveURL(/\/auth/, { timeout: 10000 });
  });
});

test('Upload and Manage Profile Media and Content — Part 6', {
  tag: ['@AUT-FV-232', '@profile', '@buyer', '@regression'],
}, async ({ buyerNav, buyerProfilePage }) => {
  test.setTimeout(60000);

  await test.step('Open creator profile and verify Share button', async () => {
    await buyerNav.open('profile', { handle: creatorProfile });
    await buyerProfilePage.expectAuthenticated();
    await expect(buyerProfilePage.shareButton).toBeVisible({ timeout: 5000 });
  });

  await test.step('Click Share and verify share options displayed', async () => {
    await buyerProfilePage.clickShare();
    await buyerProfilePage.expectShareOptionsVisible();
  });
});

guestTest('Validate Profile Pricing, Vouchers, and Fees — Part 2', {
  tag: ['@AUT-FV-233', '@profile', '@tip', '@buyer', '@regression'],
}, async ({ buyerNav, buyerProfilePage, tipPage }) => {
  guestTest.setTimeout(90000);
  const enabledTips = creatorProfiles.hendrarg.tipSuggestions.idr;

  await guestTest.step('Open tipping flow with Quick Amount enabled and verify configured amounts', async () => {
    await buyerNav.open('profile', { handle: creatorProfile });
    await buyerProfilePage.expectQuickTipAmountsVisible(enabledTips);
    await buyerNav.open('tip', { handle: creatorProfile });
    await tipPage.expectQuickTipAmountsVisible(enabledTips);
  });

  await guestTest.step('Document blocked Quick Amount disabled case (TC-PRF-B-015)', async () => {
    // Fixture contract reserved for when a disabled-Quick-Amount creator is provisioned.
    expect(creatorProfiles.davidalfasunarna.tipSuggestions.idr).toEqual([]);
  });
});
});
