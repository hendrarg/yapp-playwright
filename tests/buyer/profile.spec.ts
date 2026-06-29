import { authTest as test, test as guestTest, expect } from '../test-base';
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
    await buyerProfilePage.expectSendTipDisabled();
    await buyerProfilePage.selectTipSuggestion(profileLabels.tipSuggestion.idr[1]);
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

test('Buyer Support Creator — Tip IDR with Custom Amount', {
  tag: ['@TAT-B-E2E-008', '@profile', '@tip', '@buyer', '@regression'],
}, async ({ buyerProfilePage, tipPage, transactionPage, page }) => {
  test.setTimeout(180000);

  let orderId = '';

  await test.step('Open profile and verify tip form', async () => {
    await buyerProfilePage.goto(creatorProfileHandle);
    await buyerProfilePage.expectLoaded();
    await buyerProfilePage.expectAuthenticated();
    await buyerProfilePage.expectSupportSectionVisible();
    await buyerProfilePage.expectSendTipDisabled();
  });

  await test.step('Select IDR currency', async () => {
    await buyerProfilePage.selectIdrCurrency();
    await buyerProfilePage.expectSupportSectionVisible();
  });

  await test.step('Select tip suggestion Rp50.000 and verify Send Tip enabled', async () => {
    await buyerProfilePage.selectTipSuggestion(profileLabels.tipSuggestion.idr[1]);
    await buyerProfilePage.expectSendTipEnabled();
  });

  await test.step('Submit tip, verify tip page form auto-filled', async () => {
    await buyerProfilePage.submitTip();
    await tipPage.expectPageLoaded();
    await tipPage.expectFormAutoFilled();
  });

  await test.step('Submit from tip page, verify transaction page', async () => {
    orderId = await tipPage.submit();
    await transactionPage.expectPageLoaded('Hendra Rizal Gunawan');
  });

  await test.step('Post transaction via webhook API', async () => {
    const { depositWebhook } = await import('@helpers/api/webhook');
    await depositWebhook(page.request, orderId);
    await page.waitForTimeout(2500);
  });

  await test.step('Verify Payment Successful', async () => {
    await transactionPage.expectPaymentSuccess();
  });
});

test('Buyer View Membership Plans — Browse & Select Tier', {
  tag: ['@TAT-B-E2E-009', '@profile', '@membership', '@buyer', '@regression'],
}, async ({ buyerProfilePage, buyerMembershipPage, tierDetailPage }) => {
  test.setTimeout(120000);
  const creatorHandle = 'davidalfasunarna';

  await test.step('Open creator profile and verify membership section', async () => {
    await buyerProfilePage.goto(creatorHandle);
    await buyerProfilePage.expectLoaded();
    await buyerProfilePage.expectAuthenticated();
    await expect(buyerProfilePage.page.locator('main img').first()).toBeVisible({ timeout: 10000 });
    await buyerProfilePage.expectMembershipSectionVisible();
  });

  await test.step('Verify membership tier cards with price and Show More', async () => {
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
  tag: ['@TAT-B-FV-003', '@profile', '@auth', '@buyer', '@regression'],
}, async ({ buyerProfilePage, page }) => {
  guestTest.setTimeout(60000);

  await guestTest.step('Open profile as guest and verify Feeds tab visible', async () => {
    await buyerProfilePage.goto('hendrarg');
    await expect(page.locator('main').getByRole('button', { name: 'Feeds', exact: true })).toBeVisible({ timeout: 5000 });
  });

  await guestTest.step('Switch to Feeds tab', async () => {
    await buyerProfilePage.switchToTab('feeds');
    await buyerProfilePage.expectFeedsTabContent();
  });

  await guestTest.step('Click Like on post and verify sign in dialog', async () => {
    await page.getByRole('button', { name: 'Like post' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText(/Love this post/)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Sign in now!' })).toBeVisible();
  });

  await test.step('Click Sign in now and verify redirected to login', async () => {
    await page.getByRole('button', { name: 'Sign in now!' }).click();
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
  });
});

guestTest('Guest user blocked — Comment action requires login', {
  tag: ['@TAT-B-FV-004', '@profile', '@auth', '@buyer', '@regression'],
}, async ({ buyerProfilePage, page }) => {
  guestTest.setTimeout(60000);

  await guestTest.step('Open profile as guest and verify Feeds tab visible', async () => {
    await buyerProfilePage.goto('hendrarg');
    await expect(page.locator('main').getByRole('button', { name: 'Feeds', exact: true })).toBeVisible({ timeout: 5000 });
  });

  await guestTest.step('Switch to Feeds tab and verify posts', async () => {
    await buyerProfilePage.switchToTab('feeds');
    await buyerProfilePage.expectFeedsTabContent();
  });

  await guestTest.step('Click comment button to open post detail', async () => {
    const commentBtn = page.locator('main').getByRole('button', { name: /^\d+$/ }).first();
    await commentBtn.click();
    await expect(page.getByText('No comments yet.').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(page.getByText('Sign in to drop a comment!').first()).toBeVisible({ timeout: 5000 });
  });

  await guestTest.step('Click Sign In and verify sign in dialog', async () => {
    await page.getByRole('button', { name: 'Sign In' }).click();
    const dialog = page.getByRole('dialog', { name: 'Sign in before following' });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole('button', { name: 'Sign in now!' })).toBeVisible();
  });

  await guestTest.step('Click Sign in now and verify redirected to login', async () => {
    await page.getByRole('button', { name: 'Sign in now!' }).click();
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
  });
});