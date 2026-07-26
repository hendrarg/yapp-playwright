import { authTest as test, test as guestTest, expect } from '../test-base';
import { depositWebhook } from '@helpers/api/webhook';
import {
  creatorProfile,
  tipAmountBoundary,
  tipCheckoutData,
} from '@test-data/buyer/profile.data';

test.describe('Buyer Tip', () => {
test('Tip Complete IDR Payment Journey', {
  tag: ['@AUT-E2E-014', '@tip', '@payment', '@buyer', '@regression'],
}, async ({ buyerNav, buyerProfilePage, tipPage, transactionPage, page }) => {
  test.setTimeout(180000);

  let orderId = '';

  await test.step('Open profile and verify tip form', async () => {
    await buyerNav.open('profile', { handle: creatorProfile });
    await buyerProfilePage.expectAuthenticated();
    await buyerProfilePage.expectSupportTipFormInitialState();
  });

  await test.step('Select IDR currency', async () => {
    await buyerProfilePage.selectIdrCurrency();
    await buyerProfilePage.expectSupportSectionVisible();
  });

  await test.step('Select tip suggestion Rp50.000 and verify Send Tip enabled', async () => {
    await buyerProfilePage.selectTipSuggestion();
    await buyerProfilePage.expectSendTipEnabled();
  });

  await test.step('Submit tip, verify tip page form auto-filled', async () => {
    await buyerProfilePage.submitTip();
    await tipPage.expectPageLoaded();
    await tipPage.expectFormAutoFilled();
  });

  await test.step('Submit from tip page, verify transaction page', async () => {
    orderId = await tipPage.submit();
    await transactionPage.expectPageLoaded(tipCheckoutData.creatorName);
  });

  await test.step('Post transaction via webhook API', async () => {
    await depositWebhook(page.request, orderId);
  });

  await test.step('Verify Payment Successful', async () => {
    await transactionPage.expectPaymentSuccess();
  });
});

test('Tip Checkout, Payment & Transaction', {
  tag: ['@AUT-FV-287', '@tip', '@buyer', '@smoke', '@regression'],
}, async ({ buyerNav, tipPage, transactionPage, page }) => {
  test.setTimeout(120000);

  let orderId = '';
  let reviewTotal = '';

  await test.step('View and select an available payment method', async () => {
    await buyerNav.goto('tip', { handle: creatorProfile });
    await tipPage.prepareCheckout(tipCheckoutData);
  });

  await test.step('Block payment until the support agreement is accepted', async () => {
    await tipPage.uncheckSupportAgreement();
    await tipPage.expectSendTipDisabled();
    await tipPage.expectSubmissionBlocked();
  });

  await test.step('Review the tip information and start payment', async () => {
    await tipPage.acceptSupportAgreement();
    await tipPage.fillNotes(tipCheckoutData.publicNote, tipCheckoutData.privateNote);
    reviewTotal = await tipPage.expectReviewInformation(tipCheckoutData);
    orderId = await tipPage.submit();
  });

  await test.step('Follow the selected payment method instructions', async () => {
    await transactionPage.expectPageLoaded(tipCheckoutData.creatorName, reviewTotal);
    await transactionPage.expectTipPaymentInstructions({
      paymentMethod: tipCheckoutData.paymentMethod,
      subtotal: tipCheckoutData.displayAmount,
      total: reviewTotal,
    });
  });

  await test.step('Post transaction via webhook API', async () => {
    await depositWebhook(page.request, orderId);
  });

  await test.step('Verify the payment status updates automatically', async () => {
    await transactionPage.expectPaymentSuccess();
  });

  await test.step('Refresh the latest status without creating a new transaction', async () => {
    await transactionPage.reload();
    await transactionPage.expectSameTipTransaction(orderId, reviewTotal);
    await transactionPage.expectPaymentSuccess();
  });
});

test('Tip Payment & Transaction Summary', {
  tag: ['@AUT-FV-288', '@payment', '@tip', '@buyer', '@regression'],
}, async ({ buyerNav, tipPage, transactionPage }) => {
  test.setTimeout(120000);

  let reviewTotal = '';

  await test.step('Prepare the tip with the selected amount and payment method', async () => {
    await buyerNav.goto('tip', { handle: creatorProfile });
    await tipPage.prepareCheckout(tipCheckoutData);
    await tipPage.acceptSupportAgreement();
    await tipPage.fillNotes(tipCheckoutData.publicNote, tipCheckoutData.privateNote);
    reviewTotal = await tipPage.expectReviewInformation(tipCheckoutData);
    await tipPage.submit();
  });

  await test.step('Open Detail Transactions and verify payment method, subtotal, and Total Amount', async () => {
    await transactionPage.expectPageLoaded(tipCheckoutData.creatorName, reviewTotal);
    await transactionPage.expectTipPaymentInstructions({
      paymentMethod: tipCheckoutData.paymentMethod,
      subtotal: tipCheckoutData.displayAmount,
      total: reviewTotal,
    });
  });
});

test('Tip Agreement Selected by Default', {
  tag: ['@AUT-FV-289', '@payment', '@tip', '@buyer', '@regression'],
}, async ({ buyerNav, tipPage }) => {
  test.setTimeout(120000);

  await test.step('Open the tip review state with a valid amount and payment method', async () => {
    await buyerNav.goto('tip', { handle: creatorProfile });
    await tipPage.prepareCheckout(tipCheckoutData);
  });

  await test.step('Verify the agreement is selected by default and Send Tip is visible', async () => {
    await expect(tipPage.supportAgreementCheckbox).toHaveAttribute('aria-checked', 'true');
    await expect(tipPage.sendButton).toBeVisible();
    await tipPage.expectSendTipEnabled();
  });
});

test('Tip IDR Minimum Amount Boundary', {
  tag: ['@AUT-FV-291', '@payment', '@tip', '@buyer', '@regression'],
}, async ({ buyerNav, tipPage }) => {
  test.setTimeout(90000);

  await test.step('Select IDR and open the tip amount form', async () => {
    await buyerNav.goto('tip', { handle: creatorProfile });
    await tipPage.expectTipFormReady();
    await tipPage.selectCurrency(tipCheckoutData.currency);
  });

  await test.step('Reject Rp9.999 as below the minimum', async () => {
    await tipPage.fillAmount(tipAmountBoundary.belowMinimum);
    await tipPage.expectAmountError(tipAmountBoundary.minimumError);
  });

  await test.step('Accept Rp10.000 with Send Tip enabled', async () => {
    await tipPage.fillAmount(tipAmountBoundary.minimum);
    await tipPage.expectSendTipEnabled();
  });
});

test('Tip Validation & Amount Boundary', {
  tag: ['@AUT-FV-286', '@payment', '@tip', '@buyer', '@regression'],
}, async ({ buyerNav, tipPage }) => {

  await test.step('Verify buyer name and email are prefilled', async () => {
    await buyerNav.goto('tip', { handle: creatorProfile });
    await tipPage.expectTipFormReady();
  });

  await test.step('Validate required name on blur', async () => {
    await tipPage.clearName();
    await tipPage.blurName();
    await tipPage.expectNameError();
    await tipPage.expectEmailDisabled();
    await tipPage.fillName(tipCheckoutData.creatorName);
  });

  await test.step('Enable anonymous tip and continue with a valid amount', async () => {
    await tipPage.fillAmount(tipCheckoutData.amount);
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
  tag: ['@AUT-FV-285', '@payment', '@tip', '@buyer', '@regression'],
}, async ({ buyerNav, tipPage }) => {
  guestTest.setTimeout(60000);

  await guestTest.step('Open tip page and enter a valid amount', async () => {
    await buyerNav.goto('tip', { handle: creatorProfile });
    await tipPage.expectPageLoaded();
    await tipPage.fillAmount(tipCheckoutData.amount);
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

test('Tip validation — Invalid amount rejected', {
  tag: ['@AUT-FV-284', '@payment', '@tip', '@buyer', '@regression'],
}, async ({ buyerNav, tipPage }) => {
  test.setTimeout(60000);

  await test.step('Open tip amount form', async () => {
    await buyerNav.goto('tip', { handle: creatorProfile });
    await tipPage.expectPageLoaded();
    await tipPage.selectCurrency(tipCheckoutData.currency);
  });

  await test.step('Reject empty amount', async () => {
    await tipPage.clearAmount();
    await tipPage.expectAmountError(tipAmountBoundary.requiredError);
  });

  await test.step('Reject zero amount', async () => {
    await tipPage.fillAmount('0');
    await tipPage.expectAmountError(tipAmountBoundary.requiredError);
  });

  await test.step('Reject amount below minimum', async () => {
    await tipPage.fillAmount(tipAmountBoundary.belowMinimum);
    await tipPage.expectAmountError(tipAmountBoundary.minimumError);
  });
});

test('Tip validation — Currency switch to USDT', {
  tag: ['@AUT-FV-290', '@payment', '@tip', '@buyer', '@regression'],
}, async ({ buyerNav, tipPage }) => {
  test.setTimeout(60000);

  await test.step('Open tip amount form', async () => {
    await buyerNav.goto('tip', { handle: creatorProfile });
    await tipPage.expectPageLoaded();
  });

  await test.step('Switch currency between IDR and USDT — only one active', async () => {
    await tipPage.selectCurrency(tipCheckoutData.currency);
    await tipPage.expectOnlyCurrencyActive(tipCheckoutData.currency, tipCheckoutData.usdtCurrency);
    await tipPage.selectCurrency(tipCheckoutData.usdtCurrency);
    await tipPage.expectOnlyCurrencyActive(tipCheckoutData.usdtCurrency, tipCheckoutData.currency);
  });

  await test.step('Enter valid USDT amount and verify tip form is ready', async () => {
    await tipPage.fillAmount(tipCheckoutData.usdtAmount);
    await tipPage.expectOnlyCurrencyActive(tipCheckoutData.usdtCurrency, tipCheckoutData.currency);
    await expect(tipPage.amountInput).toHaveValue(tipCheckoutData.usdtDisplayAmount);
    await tipPage.expectSendTipEnabled();
  });
});
});
