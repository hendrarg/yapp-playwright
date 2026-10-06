import { authTest as test, test as guestTest, expect } from '../test-base';
import { creatorProfile, membershipCreatorProfile, creatorProfiles } from '@test-data/buyer/profile.data';

test.describe('Buyer Profile', () => {
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

test('Validate Public Profile Share Options', {
  tag: ['@AUT-FV-232', '@profile', '@buyer', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-B-009' },
  ],
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

test('Validate Buyer Quick Tip Amount Selection', {
  tag: ['@AUT-FV-234', '@profile', '@tip', '@buyer', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-B-014' },
  ],
}, async ({ buyerNav, buyerProfilePage }) => {
  test.setTimeout(60000);

  const enabledTips = creatorProfiles.hendrarg.tipSuggestions.idr;

  await test.step('Open creator profile and verify quick tip amounts visible', async () => {
    await buyerNav.open('profile', { handle: creatorProfile });
    await buyerProfilePage.expectAuthenticated();
    await buyerProfilePage.expectQuickTipAmountsVisible(enabledTips);
  });

  await test.step('Select a quick tip amount and verify it is applied', async () => {
    await buyerProfilePage.selectTipSuggestion();
    await buyerProfilePage.expectSendTipEnabled();
  });
});

guestTest('Validate Public Profile Access and Visible Follower Count', {
  tag: ['@AUT-FV-235', '@profile', '@buyer', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-B-016, TC-PRF-B-021' },
  ],
}, async ({ buyerNav, buyerProfilePage }) => {
  guestTest.setTimeout(60000);

  await guestTest.step('Open public creator profile as guest', async () => {
    await buyerNav.goto('profile', { handle: creatorProfile });
    await buyerProfilePage.expectLoaded();
    await buyerProfilePage.expectProfileAvatarVisible();
  });

  await guestTest.step('Verify follower count is visible', async () => {
    await expect(buyerProfilePage.followerCountText.first()).toBeVisible({ timeout: 5000 });
  });
});
});
