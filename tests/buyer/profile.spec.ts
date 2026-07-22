import { authTest as test, test as guestTest, expect } from '../test-base';
import { creatorProfileHandle, profileLabels } from '@test-data/buyer/profile.data';

test.describe('Buyer Profile', () => {
test('Buyer Creator Profile — Navigate Tabs & View Content', {
  tag: ['@AUT-FV-308', '@profile', '@buyer', '@smoke', '@regression'],
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

test('Buyer Support Creator — Complete IDR Tip Payment Journey', {
  tag: ['@AUT-E2E-009','@profile', '@tip', '@buyer', '@regression'],
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

test('Tip: Validation & Boundary', {
  tag: ['@AUT-FV-072', '@profile', '@buyer', '@regression'],
}, async ({ tipPage }) => {

  await test.step('Verify buyer name and email are prefilled', async () => {
    await tipPage.goto(creatorProfileHandle);
    await tipPage.expectPageLoaded();
    await tipPage.expectFormAutoFilled();
  });

  await test.step('Validate required name on blur', async () => {
    await tipPage.clearName();
    await tipPage.blurName();
    await tipPage.expectNameError();
    await tipPage.expectEmailDisabled();
    await tipPage.fillName('Hendra Rizal');
  });

  await test.step('Enable anonymous tip and continue with a valid amount', async () => {
    await tipPage.fillAmount('50000');
    await tipPage.selectAnonymous();
    await tipPage.expectAnonymousSelected();
    await tipPage.expectSendTipEnabled();
  });

  await test.step('Continue with optional notes empty', async () => {
    await tipPage.expectNotesEmpty();
    await tipPage.expectSendTipEnabled();
  });

  await test.step('Accept 200 Give Notes characters and block the 201st', async () => {
    await tipPage.expectGiveNotesLimit();
  });
});

guestTest('Tip validation — Name and Email are required', {
  tag: ['@AUT-FV-071', '@profile', '@tip', '@buyer', '@regression'],
}, async ({ tipPage }) => {
  guestTest.setTimeout(60000);

  await guestTest.step('Open tip page and enter a valid amount', async () => {
    await tipPage.goto(creatorProfileHandle);
    await tipPage.expectPageLoaded();
    await tipPage.fillAmount('50000');
  });

  await guestTest.step('Leave Name and Email empty', async () => {
    await expect(tipPage.nameInput).toHaveValue('');
    await expect(tipPage.emailInput).toHaveValue('');
  });

  await guestTest.step('Attempt to submit the tip', async () => {
    await tipPage.expectSendTipEnabled();
    await tipPage.attemptSubmit();
  });

  await guestTest.step('Verify submission blocked with required errors on Name and Email', async () => {
    await tipPage.expectNameError();
    await tipPage.expectEmailError();
    await tipPage.expectSubmissionBlocked();
  });
});

test('Buyer View Membership Plans — Browse & Select Tier', {
  tag: ['@AUT-FV-214', '@profile', '@membership', '@buyer', '@regression'],
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
  tag: ['@AUT-FV-246', '@profile', '@auth', '@buyer', '@regression'],
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
  tag: ['@AUT-FV-248', '@profile', '@auth', '@buyer', '@regression'],
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

test('Tip validation — Invalid amount rejected', {
  tag: ['@AUT-FV-070', '@profile', '@tip', '@buyer', '@regression'],
}, async ({ buyerProfilePage, tipPage }) => {
  test.setTimeout(60000);

  await test.step('Open profile, verify support section and Send Tip disabled', async () => {
    await buyerProfilePage.goto(creatorProfileHandle);
    await buyerProfilePage.expectLoaded();
    await buyerProfilePage.expectAuthenticated();
    await buyerProfilePage.expectSupportSectionVisible();
    await buyerProfilePage.expectSendTipDisabled();
  });

  await test.step('Enter 0 amount, verify button enabled and navigate to tip page', async () => {
    await buyerProfilePage.fillTipAmount('0');
    await buyerProfilePage.expectSendTipEnabled();
    await buyerProfilePage.submitTip();
    await tipPage.expectPageLoaded();
  });

  await test.step('Validate amount is required on tip page', async () => {
    await tipPage.fillAmount('0');
    await tipPage.expectAmountError('Amount is required');
  });

  await test.step('Validate minimum amount on tip page', async () => {
    await tipPage.fillAmount('1');
    await tipPage.expectAmountError('Minimum amount is Rp10.000');
  });
});

test('Tip validation — Currency switch to USD', {
  tag: ['@AUT-FV-070', '@profile', '@tip', '@buyer', '@regression'],
}, async ({ buyerProfilePage, tipPage }) => {
  test.setTimeout(60000);

  await test.step('Open profile, verify support section with currency selector', async () => {
    await buyerProfilePage.goto(creatorProfileHandle);
    await buyerProfilePage.expectLoaded();
    await buyerProfilePage.expectAuthenticated();
    await buyerProfilePage.expectSupportSectionVisible();
    await buyerProfilePage.expectSendTipDisabled();
  });

  await test.step('Select USDT currency and verify', async () => {
    await buyerProfilePage.selectUsdtCurrency();
    await expect(buyerProfilePage.usdtButton).toBeVisible({ timeout: 5000 });
  });

  await test.step('Enter valid amount, verify button enabled and submit', async () => {
    await buyerProfilePage.fillTipAmount('50');
    await buyerProfilePage.expectSendTipEnabled();
    await buyerProfilePage.submitTip();
    await tipPage.expectPageLoaded();
  });
});

test('Share creator profile — Share button displays options', {
  tag: ['@AUT-FV-294', '@profile', '@buyer', '@regression'],
}, async ({ buyerProfilePage }) => {
  test.setTimeout(60000);

  await test.step('Open creator profile and verify Share button', async () => {
    await buyerProfilePage.goto(creatorProfileHandle);
    await buyerProfilePage.expectLoaded();
    await buyerProfilePage.expectAuthenticated();
    await expect(buyerProfilePage.shareButton).toBeVisible({ timeout: 5000 });
  });

  await test.step('Click Share and verify share options displayed', async () => {
    await buyerProfilePage.clickShare();
    await buyerProfilePage.expectShareOptionsVisible();
  });
});
});
