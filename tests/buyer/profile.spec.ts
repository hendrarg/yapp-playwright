import { authTest as test, test as guestTest, expect } from '../test-base';
import {
  creatorProfile,
  membershipCreatorProfile,
} from '@test-data/buyer/profile.data';

test.describe('Buyer Profile', () => {
test('Buyer Creator Profile — Navigate Tabs & View Content', {
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

test('Buyer View Membership Plans — Browse & Select Tier', {
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

guestTest('Guest user blocked — Like action requires login', {
  tag: ['@AUT-FV-085', '@profile', '@auth', '@buyer', '@regression'],
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

guestTest('Guest user blocked — Comment action requires login', {
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

test('Share creator profile — Share button displays options', {
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
});
