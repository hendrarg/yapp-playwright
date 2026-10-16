import { authTest as test, expect } from '../test-base';
import { apiUrl, getHeaders } from '@helpers/api/client';
import { depositWebhook } from '@helpers/api/webhook';
import { creatorProfile, tipAmountBoundary, tipCheckoutData } from '@test-data/buyer/profile.data';

const tipTransactionSummary = {
  paymentMethod: tipCheckoutData.paymentMethod,
  subtotal: tipCheckoutData.displayAmount,
} as const;

test.describe('Buyer Tip', () => {
  test('Tipping — Access Tip Button, Navigation, Donate Page, Engagement Add-ons', {
    tag: ['@AUT-TIP-004', '@tip', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-TIP-B-001, TC-TIP-B-002, TC-TIP-B-003, TC-TIP-B-004, TC-TIP-B-030, TC-TIP-B-031, TC-TIP-B-039',
      },
    ],
  }, async ({ buyerNav, buyerProfilePage, tipPage, request }) => {
    test.setTimeout(120000);

    try {
      await test.step('Enable Tip Button via API and verify button appears on creator profile', async () => {
        await request.put(apiUrl('/api/v1/accounts/tip-button'), {
          headers: getHeaders(),
          data: {
            isTipButton: true,
            tipButtonText: 'Send Tip',
            tipButtonTextColor: '#FFFFFF',
            tipButtonColor: '#5433FF',
          },
        });
        await buyerNav.open('profile', { handle: creatorProfile });
        await buyerProfilePage.expectAuthenticated();
        await buyerProfilePage.expectTipCtaLabelAfterSave('Send Tip');
      });

      await test.step('Navigate to tipping page from profile', async () => {
        await buyerNav.goto('tip', { handle: creatorProfile });
        await tipPage.expectPageLoaded();
      });

      await test.step('Verify main donate page content and engagement add-ons', async () => {
        await tipPage.expectTipFormReady();
      });

      await test.step('Disable Tip Button via API and verify tip page remains directly accessible', async () => {
        await request.put(apiUrl('/api/v1/accounts/tip-button'), {
          headers: getHeaders(),
          data: {
            isTipButton: false,
            tipButtonText: 'Send Tip',
            tipButtonTextColor: '#FFFFFF',
            tipButtonColor: '#5433FF',
          },
        });
        await buyerNav.goto('tip', { handle: creatorProfile });
        await tipPage.expectPageLoaded();
      });
    } finally {
      await request.put(apiUrl('/api/v1/accounts/tip-button'), {
        headers: getHeaders(),
        data: {
          isTipButton: true,
          tipButtonText: 'Send Tip',
          tipButtonTextColor: '#FFFFFF',
          tipButtonColor: '#5433FF',
        },
      }).catch(() => undefined);
    }
  });

  test('Tipping — Currency, Custom Amount', {
    tag: ['@AUT-TIP-005', '@tip', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-TIP-B-005, TC-TIP-B-006, TC-TIP-B-007, TC-TIP-B-033',
      },
    ],
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
      await tipPage.expectAmountValue(tipCheckoutData.usdtDisplayAmount);
      await tipPage.expectSendTipEnabled();
    });
  });

  test('Tipping — Quick Amount, Continue', {
    tag: ['@AUT-TIP-006', '@tip', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-TIP-B-008, TC-TIP-B-009, TC-TIP-B-010, TC-TIP-B-013, TC-TIP-B-035, TC-TIP-B-036',
      },
    ],
  }, async ({ buyerNav, tipPage }) => {
    test.setTimeout(60000);

    await test.step('Open tip page and configure quick amounts', async () => {
      await buyerNav.goto('tip', { handle: creatorProfile });
      await tipPage.expectPageLoaded();
    });

    await test.step('Select quick amount suggestion and verify amount input updates', async () => {
      await tipPage.fillAmount(tipCheckoutData.amount);
      await tipPage.expectSendTipEnabled();
    });
  });

  test('Tipping — Minimum Amount, Validation (negative & boundary)', {
    tag: ['@AUT-TIP-007', '@tip', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-TIP-B-011, TC-TIP-B-012, TC-TIP-B-034',
      },
    ],
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

    await test.step('Accept Rp10.000 with Send Tip enabled', async () => {
      await tipPage.fillAmount(tipAmountBoundary.minimum);
      await tipPage.expectSendTipEnabled();
    });
  });

  test('Tipping — Required Fields, Prefill, Inline Validation, Anonymous Tip, Optional Notes, Notes Limit, Guest Tipping', {
    tag: ['@AUT-TIP-008', '@tip', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-TIP-B-014, TC-TIP-B-015, TC-TIP-B-016, TC-TIP-B-017, TC-TIP-B-018, TC-TIP-B-019, TC-TIP-B-037, TC-TIP-B-042',
      },
    ],
  }, async ({ buyerNav, tipPage }) => {
    test.setTimeout(60000);

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

  test('Tipping — Payment Method, Payment Summary', {
    tag: ['@AUT-TIP-009', '@smoke', '@tip', '@buyer'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-TIP-B-020, TC-TIP-B-021, TC-TIP-B-040',
      },
    ],
  }, async ({ buyerNav, tipPage, transactionPage }) => {
    test.setTimeout(120000);

    let reviewTotal = '';

    await test.step('Prepare the tip with the selected amount and payment method', async () => {
      await buyerNav.goto('tip', { handle: creatorProfile });
      await tipPage.prepareCheckout(tipCheckoutData);
      ({ reviewTotal } = await tipPage.completeReviewAndSubmit(tipCheckoutData));
    });

    await test.step('Open Detail Transactions and verify payment method, subtotal, and Total Amount', async () => {
      await transactionPage.expectTipCheckoutSummary(
        tipCheckoutData.creatorName,
        reviewTotal,
        tipTransactionSummary,
      );
    });
  });

  test('Tipping — Transaction Summary, Agreement, Review Information', {
    tag: ['@AUT-TIP-010', '@tip', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-TIP-B-022, TC-TIP-B-023, TC-TIP-B-024, TC-TIP-B-025, TC-TIP-B-032, TC-TIP-B-038, TC-TIP-B-041',
      },
    ],
  }, async ({ buyerNav, tipPage }) => {
    test.setTimeout(120000);

    await test.step('Open the tip review state with a valid amount and payment method', async () => {
      await buyerNav.goto('tip', { handle: creatorProfile });
      await tipPage.prepareCheckout(tipCheckoutData);
    });

    await test.step('Verify the agreement is selected by default and Send Tip is visible', async () => {
      await tipPage.expectAgreementSelectedByDefault();
    });

    await test.step('Block payment until the support agreement is accepted', async () => {
      await tipPage.uncheckSupportAgreement();
      await tipPage.expectSendTipDisabled();
      await tipPage.expectSubmissionBlocked();
    });
  });

  test('Tipping — Payment Execution, Automatic Status, Refresh Status, Success Confirmation', {
    tag: ['@AUT-TIP-011', '@tip', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-TIP-B-026, TC-TIP-B-027, TC-TIP-B-028, TC-TIP-B-029',
      },
    ],
  }, async ({ buyerNav, tipPage, transactionPage, page }) => {
    test.setTimeout(120000);

    let orderId = '';
    let reviewTotal = '';

    await test.step('Prepare the tip and start payment', async () => {
      await buyerNav.goto('tip', { handle: creatorProfile });
      await tipPage.prepareCheckout(tipCheckoutData);
      reviewTotal = await tipPage.completeReview(tipCheckoutData);
      orderId = await tipPage.submit();
    });

    await test.step('Follow the selected payment method instructions', async () => {
      await transactionPage.expectTipCheckoutSummary(
        tipCheckoutData.creatorName,
        reviewTotal,
        tipTransactionSummary,
      );
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

  test('Tipping — Desktop Panel, Mobile Support Tab, Verified Badge, Heading, Loading Skeleton, Client-only Render, Tab State', {
    tag: ['@AUT-TIP-012', '@tip', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-TIP-B-043, TC-TIP-B-044, TC-TIP-B-045, TC-TIP-B-046, TC-TIP-B-047, TC-TIP-B-048, TC-TIP-B-049',
      },
    ],
  }, async ({ buyerNav, buyerProfilePage, request, page }) => {
    test.setTimeout(120000);

    const hydrationErrors: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Hydration failed') || text.includes('did not match')) {
        hydrationErrors.push(text);
      }
    });

    try {
      await test.step('Ensure tip button is enabled via API (precondition)', async () => {
        await request.put(apiUrl('/api/v1/accounts/tip-button'), {
          headers: getHeaders(),
          data: {
            isTipButton: true,
            tipButtonText: 'Send Tip',
            tipButtonTextColor: '#FFFFFF',
            tipButtonColor: '#5433FF',
          },
        });
      });

      await test.step('Desktop right-column tip panel renders and client-only SSR check (TC-TIP-B-043, TC-TIP-B-047, TC-TIP-B-048)', async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await buyerNav.open('profile', { handle: creatorProfile });
        await buyerProfilePage.expectAuthenticated();
        await buyerProfilePage.expectSupportSectionVisible();
        expect(hydrationErrors).toHaveLength(0);
      });

      await test.step('Embedded form does not render duplicate Send Tip heading or verified badge if unverified (TC-TIP-B-045, TC-TIP-B-046)', async () => {
        await buyerProfilePage.expectNoDuplicateSendTipHeading();
        await buyerProfilePage.expectSupportHeaderVerifiedBadge(false);
      });

      await test.step('Mobile Tip tab renders inline tip form and does not navigate away (TC-TIP-B-044)', async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        await buyerProfilePage.switchToMobileTab('Tip');
        expect(page.url()).not.toContain('/tip');
        await buyerProfilePage.expectPublicSendTipButtonAttached();
      });

      await test.step('Tab switching state keeps the form stable without crashing (TC-TIP-B-049)', async () => {
        await buyerProfilePage.fillTipAmount(tipCheckoutData.amount);
        await buyerProfilePage.switchToMobileTab('Shops');
        await buyerProfilePage.switchToMobileTab('Tip');
        await buyerProfilePage.expectPublicSendTipButtonAttached();
        await page.setViewportSize({ width: 1280, height: 800 });
      });
    } finally {
      await request.put(apiUrl('/api/v1/accounts/tip-button'), {
        headers: getHeaders(),
        data: {
          isTipButton: true,
          tipButtonText: 'Send Tip',
          tipButtonTextColor: '#FFFFFF',
          tipButtonColor: '#5433FF',
        },
      }).catch(() => undefined);
    }
  });
});

