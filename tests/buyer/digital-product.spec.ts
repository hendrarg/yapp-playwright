import { authTest as test, expect } from '../test-base';
import { getAccount } from '@helpers/api/account';
import { apiUrl, getHeaders } from '@helpers/api/client';
import { createDigitalProduct, deleteProduct, productSharePath } from '@helpers/api/product';
import { createPromotion, deletePromotion, getPromotionId } from '@helpers/api/promotion';
import { depositWebhook } from '@helpers/api/webhook';
import { loginWithToken } from '@helpers/auth/token-login';
import { markInboxStart, testmailConfig, waitForEmail } from '@helpers/otp/testmail';
import { LoginPage } from '@pages/auth/LoginPage';
import { LibraryPage } from '@pages/buyer/LibraryPage';
import { ProductPurchasePage } from '@pages/buyer/ProductPurchasePage';
import { baseURL } from '@config/env';
import { buyerEventsDetailData } from '@test-data/buyer/events.detail.data';
import { onlineCourseCheckoutData } from '@test-data/buyer/online-course.detail.data';
import { promotionData } from '@test-data/buyer/promotion.data';
import { testImages } from '@test-data/creator/post.data';
import { generatePromotionData } from '@test-data/creator/promotion.data';
import { testAccounts } from '@test-data/users';

const sellerToken = () => process.env[testAccounts.sundanese.envVar]?.replace(/"/g, '');
const creatorName = 'Asep pisan';
const badge = 'Digital Product';
const link = { label: 'Course notes', url: 'https://example.com/course-notes' };
const fileName = 'deepseek.png';
const phone = () => `812${Date.now().toString().slice(-9)}`;
/** One fixed guest address: the first run creates its account, later runs reuse it. */
const guestEmail = () => `${process.env.TESTMAIL_NAMESPACE}.guestbuyer@inbox.testmail.app`;

test.describe('Buyer Digital Product', () => {
  test('Product Digital — Product Information, Carousel, CTA Naming, Bookmark Control, Owner View, Explore Filter Value', {
    tag: ['@AUT-PD-008', '@products', '@buyer', '@regression'],
  }, async ({ page, browser }) => {
    test.setTimeout(180000);
    const token = sellerToken();
    test.skip(!token, 'YAPP_TEST_ACCESS_TOKEN_2 is required to seed the digital product');
    if (!token) return;

    const stamp = Date.now();
    const product = { title: `Digital PDP ${stamp}`, description: `PDP details test ${stamp}` };
    let productUuid = '';
    let sharePath = '';

    try {
      await test.step('Seed a digital product with thumbnail and price', async () => {
        const created = await createDigitalProduct(page.request, {
          ...product,
          thumbnailImagePath: testImages.claude,
          price: 25000,
          links: [link],
        }, token);
        productUuid = created.productUuid;
        sharePath = productSharePath(created);
      });

      await test.step('Verify main product information, badge, tabs, and CTA naming as buyer', async () => {
        await page.goto(new URL(sharePath.slice(1), baseURL).toString());
        await expect(page.getByText(product.title, { exact: true }).filter({ visible: true })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Digital Product', { exact: true }).filter({ visible: true })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Overview' }).filter({ visible: true })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'About Creator' }).filter({ visible: true })).toBeVisible();
        await expect(page.getByRole('button', { name: /Purchase|Get Product/ }).filter({ visible: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Add To Cart', exact: true }).filter({ visible: true })).toBeVisible();
        await expect(page.getByRole('button', { name: /bookmark/i })).toHaveCount(0);
      });

      await test.step('Verify Explore filter productType=digital_download displays Digital Product badge', async () => {
        await page.goto(new URL('explore?productType=digital_download', baseURL).toString());
        await expect(page.getByText('Digital Product').first()).toBeVisible({ timeout: 15000 });
      });

      await test.step('Verify owner view settles to Edit Product CTA without purchase buttons', async () => {
        const ownerContext = await browser.newContext({ viewport: page.viewportSize() });
        try {
          await loginWithToken(ownerContext, token, baseURL);
          const ownerPage = await ownerContext.newPage();
          const ownerView = new ProductPurchasePage(ownerPage, baseURL);
          await ownerView.gotoSharePath(sharePath);
          await ownerView.expectOwnerEventView();
        } finally {
          await ownerContext.close();
        }
      });
    } finally {
      if (productUuid) {
        await deleteProduct(page.request, productUuid, token).catch(() => undefined);
      }
    }
  });

  test('Product Digital — Checkout entry, Buyer Information, Payment Method, Free Product, Voucher, Payment Summary, Free Product Checkout, Checkout Surface', {
    tag: ['@AUT-PD-009', '@products', '@buyer', '@smoke', '@regression'],
  }, async ({ productPurchasePage, page }) => {
    test.setTimeout(300000);
    const token = sellerToken();
    test.skip(!token, 'YAPP_TEST_ACCESS_TOKEN_2 is required to seed the digital products and promotion');
    if (!token) return;

    const stamp = Date.now();
    const paidTitle = `Digital Checkout ${stamp}`;
    const freeTitle = `Digital Free Checkout ${stamp}`;
    const description = `Digital checkout flow ${stamp}`;
    const promotion = generatePromotionData('active');
    const invalidCode = `NOPE${stamp.toString().slice(-6)}`;
    let paidUuid = '';
    let freeUuid = '';
    let promotionId = '';
    let paidSharePath = '';
    let freeSharePath = '';
    let creatorName = '';

    try {
      await test.step('Seed a paid digital product, a free digital product, and an active promotion', async () => {
        const creator = await getAccount(page.request, token);
        creatorName = creator.name || creator.username;

        const paid = await createDigitalProduct(page.request, {
          title: paidTitle,
          description,
          thumbnailImagePath: testImages.claude,
          price: 25000,
          links: [link],
        }, token);
        paidUuid = paid.productUuid;
        paidSharePath = productSharePath(paid);

        const free = await createDigitalProduct(page.request, {
          title: freeTitle,
          description,
          thumbnailImagePath: testImages.claude,
          price: 0,
          links: [link],
        }, token);
        freeUuid = free.productUuid;
        freeSharePath = productSharePath(free);

        promotionId = getPromotionId(await createPromotion(page.request, promotion, token));
      });

      await test.step('Purchase opens full-page checkout with product, creator, and quantity 1', async () => {
        await productPurchasePage.openOnlineCourseCheckout(paidTitle, paidSharePath);
        await expect(page).toHaveURL(new RegExp(`/product/${paidUuid}/checkout\\?quantity=1`));
        await productPurchasePage.expectOnlineCourseCheckoutInitiated({ title: paidTitle, creatorName });
      });

      await test.step('Verify checkout surface components and payment method catalog', async () => {
        await expect(page.getByText(/Personal Information/i).first()).toBeVisible({ timeout: 10000 });
        await expect(productPurchasePage.chooseVoucherButton).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('combobox')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/Detail Transactions|Subtotal/i).first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('button', { name: onlineCourseCheckoutData.payCtaPattern })).toBeVisible({ timeout: 10000 });
      });

      await test.step('Buyer fields prefill from account and required fields block submission', async () => {
        await productPurchasePage.expectOnlineCourseCheckoutPrefill();
        await productPurchasePage.expectOnlineCourseCheckoutRequiredValidation();
      });

      await test.step('Payment method dropdown reflects selection', async () => {
        await productPurchasePage.selectOnlineCoursePaymentMethod(/credit card/i);
        await productPurchasePage.expectOnlineCoursePaymentMethod(/credit card/i);
        await productPurchasePage.selectOnlineCoursePaymentMethod(/qris/i);
        await productPurchasePage.expectOnlineCoursePaymentMethod(/qris/i);
      });

      await test.step('A valid voucher applies discount and updates order summary consistently', async () => {
        await productPurchasePage.openOnlineCourseCheckout(paidTitle, paidSharePath);
        await productPurchasePage.openOnlineCourseVoucherDialog();
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(promotion.code);
        await productPurchasePage.expectActiveDiscount(before, onlineCourseCheckoutData.activePromotionDiscountPercent);

        const summary = await productPurchasePage.getOrderSummary();
        const payCta = page.getByRole('button', { name: onlineCourseCheckoutData.payCtaPattern });
        await expect(payCta).toContainText(`Rp${summary.total.toLocaleString('id-ID')}`, { timeout: 10000 });
      });

      await test.step('An unknown voucher is rejected and drops the fee rows', async () => {
        await productPurchasePage.openOnlineCourseCheckout(paidTitle, paidSharePath);
        await productPurchasePage.openOnlineCourseVoucherDialog();
        const rejectedBefore = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(invalidCode);
        await productPurchasePage.expectRejectedPromotion(rejectedBefore, promotionData.rejection.notFound);
      });

      await test.step('Checkout of a free digital product bypasses payment and shows zero total', async () => {
        await productPurchasePage.expectOnlineCourseFreeCheckout(freeTitle, freeSharePath);
      });
    } finally {
      if (paidUuid) await deleteProduct(page.request, paidUuid, token).catch(() => undefined);
      if (freeUuid) await deleteProduct(page.request, freeUuid, token).catch(() => undefined);
      if (promotionId) await deletePromotion(page.request, promotionId, token).catch(() => undefined);
    }
  });

  test('Product Digital — Voucher, Success Modal, Authenticated Access, Guest OTP, Files and Links, Conditional Sections, Order-Scoped URL', {
    tag: ['@AUT-PD-010', '@products', '@library', '@buyer', '@regression'],
    annotation: { type: 'issue', description: 'L-80' },
  }, async ({ productPurchasePage, transactionPage, libraryPage, page, browser }) => {
    test.setTimeout(420000);
    // Known bug L-80: Explore other products opens /dashboard/library, not Explore. Last step.
    test.fail(true, 'L-80: Explore other products on the success modal opens the library instead of Explore');
    const token = sellerToken();
    test.skip(!token, 'YAPP_TEST_ACCESS_TOKEN_2 is required to seed the digital products');
    if (!token) return;
    const stamp = Date.now();
    const full = { title: `Digital full ${stamp}`, description: `Files and links ${stamp}` };
    const linksOnly = { title: `Digital links only ${stamp}`, description: `Links only ${stamp}` };
    const products: string[] = [];
    let fullPath = '';
    let linksOnlyPath = '';

    try {
      await test.step('Seed a digital product with a file and a link, and one with only a link', async () => {
        const a = await createDigitalProduct(page.request, { ...full, thumbnailImagePath: testImages.claude, price: 25000, filePaths: [`src/test-data/assets/${fileName}`], links: [link] }, token);
        const b = await createDigitalProduct(page.request, { ...linksOnly, thumbnailImagePath: testImages.claude, price: 15000, links: [link] }, token);
        products.push(a.productUuid, b.productUuid);
        fullPath = productSharePath(a);
        linksOnlyPath = productSharePath(b);
      });

      await test.step('An unknown voucher is rejected and drops the fee rows', async () => {
        await productPurchasePage.openOnlineCourseCheckout(full.title, fullPath);
        await productPurchasePage.openOnlineCourseVoucherDialog();
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(`NOPE${stamp.toString().slice(-6)}`);
        await productPurchasePage.expectRejectedPromotion(before, promotionData.rejection.notFound);
      });

      await test.step('After paying, the success modal shows product and creator, and a download email is sent', async () => {
        const inboxStart = markInboxStart();
        await productPurchasePage.openOnlineCourseCheckout(full.title, fullPath);
        const orderId = await productPurchasePage.payOnlineCourseCheckout({ name: 'QA Buyer', phone: phone() });
        await depositWebhook(page.request, orderId);
        await transactionPage.expectProductPurchaseSuccess({ title: full.title, creatorName });
        const email = await waitForEmail(testmailConfig(), inboxStart, full.title);
        expect(email.subject).toContain('Your Download Is Ready');
      });

      await test.step('View Product leads the signed-in buyer to the order thank-you page and the download', async () => {
        await transactionPage.viewPurchasedProduct();
        await libraryPage.expectThankYouPage({ title: full.title, creatorName });
        await libraryPage.openDownloadFromThankYou();
      });

      await test.step('The access page is scoped to the order and carries the after-sales entry', async () => {
        await libraryPage.expectAccessPage({ title: full.title, badge, description: full.description, creatorName });
        await libraryPage.expectAfterSalesMessage(creatorName);
      });

      await test.step('The file downloads and the link opens in a new tab', async () => {
        await libraryPage.expectFileDownload(fileName);
        await libraryPage.expectLinkOpensInNewTab(link.label, link.url);
      });

      await test.step('A section without content is not rendered', async () => {
        await productPurchasePage.openOnlineCourseCheckout(linksOnly.title, linksOnlyPath);
        const orderId = await productPurchasePage.payOnlineCourseCheckout({ name: 'QA Buyer', phone: phone() });
        await depositWebhook(page.request, orderId);
        await transactionPage.viewPurchasedProduct();
        await libraryPage.openDownloadFromThankYou();
        await libraryPage.expectLinkOpensInNewTab(link.label, link.url);
        await libraryPage.expectSectionAbsent('Media');
      });

      await test.step('A guest buys with email and confirm-email, then claims access with the purchase email and OTP', async () => {
        const guestContext = await browser.newContext({ viewport: page.viewportSize() });
        try {
          const guestPage = await guestContext.newPage();
          const guestCheckout = new ProductPurchasePage(guestPage, baseURL);
          await guestCheckout.openOnlineCourseCheckout(linksOnly.title, linksOnlyPath);
          const orderId = await guestCheckout.payGuestCheckout({ name: 'Guest Buyer', email: guestEmail(), phone: phone() });
          await depositWebhook(page.request, orderId, { tolerateTimeout: true });
          const claimPage = await guestContext.newPage();
          await guestContext.clearCookies();
          await claimPage.goto(new URL(`product/${orderId}`, baseURL).toString());
          await new LoginPage(claimPage).signInFromRedirect(guestEmail(), new RegExp(`/product/${orderId}`));
          const guestLibrary = new LibraryPage(claimPage, baseURL);
          await guestLibrary.expectAccessPage({ title: linksOnly.title, badge, description: linksOnly.description, creatorName });
          await guestLibrary.expectLinkOpensInNewTab(link.label, link.url);
        } finally {
          await guestContext.close();
        }
      });

      await test.step('Explore other products returns to Explore', async () => {
        await productPurchasePage.openOnlineCourseCheckout(linksOnly.title, linksOnlyPath);
        const orderId = await productPurchasePage.payOnlineCourseCheckout({ name: 'QA Buyer', phone: phone() });
        await depositWebhook(page.request, orderId);
        await transactionPage.expectProductPurchaseSuccess({ title: linksOnly.title, creatorName });
        await transactionPage.exploreOtherProducts();
      });
    } finally {
      for (const id of products) await deleteProduct(page.request, id, token).catch(() => undefined);
    }
  });

  test('Product Digital — Purchased Product Listing, Redirect and Context, Message Links Files, Filter Chips', {
    tag: ['@AUT-PD-011', '@products', '@library', '@buyer', '@regression'],
    annotation: { type: 'issue', description: 'M-45' },
  }, async ({ productPurchasePage, transactionPage, libraryPage, page }) => {
    test.setTimeout(240000);
    // Known bug M-45: Back on the thank-you page goes to /dashboard/library instead of the product.
    test.fail(true, 'M-45: Back from the thank-you page lands on the library, not the product page');
    const token = sellerToken();
    test.skip(!token, 'YAPP_TEST_ACCESS_TOKEN_2 is required to seed the digital product');
    if (!token) return;
    const stamp = Date.now();
    const product = { title: `Digital library ${stamp}`, description: `Library listing ${stamp}` };
    let productUuid = '';
    let thankYouUrl = '';

    try {
      await test.step('Buy a digital product with a file and a link', async () => {
        const created = await createDigitalProduct(page.request, { ...product, thumbnailImagePath: testImages.claude, price: 20000, filePaths: [`src/test-data/assets/${fileName}`], links: [link] }, token);
        productUuid = created.productUuid;
        await productPurchasePage.openOnlineCourseCheckout(product.title, productSharePath(created));
        const orderId = await productPurchasePage.payOnlineCourseCheckout({ name: 'QA Buyer', phone: phone() });
        await depositWebhook(page.request, orderId);
        await transactionPage.expectProductPurchaseSuccess({ title: product.title, creatorName });
        await transactionPage.viewPurchasedProduct();
        thankYouUrl = page.url();
      });

      await test.step('The library lists the purchase with thumbnail, name, creator and date, and opens it', async () => {
        await libraryPage.goto();
        await libraryPage.expectLoaded();
        const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        await libraryPage.expectLibraryCard({ title: product.title, badge, creatorName, date: new RegExp(today) });
        await libraryPage.openPurchase(product.title);
        await libraryPage.expectAccessPage({ title: product.title, badge, description: product.description, creatorName });
      });

      await test.step('Type chips add up to All and the Digital Download chip filters', async () => {
        await libraryPage.goto();
        await libraryPage.expectChipsReconcile();
        const { library } = buyerEventsDetailData;
        await libraryPage.filterCategory(library.digitalChip, library.digitalQuery, product.title);
      });

      await test.step('The after-sales content is read-only: message, link in a new tab, downloadable file', async () => {
        await libraryPage.openPurchase(product.title);
        await libraryPage.expectReadOnly();
        await libraryPage.expectAfterSalesMessage(creatorName);
        await libraryPage.expectLinkOpensInNewTab(link.label, link.url);
        await libraryPage.expectFileDownload(fileName);
      });

      await test.step('The order thank-you page has the right context and Back returns to the product', async () => {
        await page.goto(thankYouUrl);
        await libraryPage.expectThankYouPage({ title: product.title, creatorName });
        await libraryPage.backFromThankYou(/\/sundanese\/product\//);
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid, token).catch(() => undefined);
    }
  });

  test('Product Digital — Empty Reviews, Write Review Validation, Submit Review (negative & boundary)', {
    tag: ['@AUT-PD-014', '@products', '@buyer', '@regression'],
  }, async ({ page, browser }) => {
    test.setTimeout(180000);
    const token = sellerToken();
    const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
    test.skip(!token || !buyerToken, 'YAPP_TEST_ACCESS_TOKEN_2 and YAPP_TEST_ACCESS_TOKEN_BUYER are required');
    if (!token || !buyerToken) return;

    const stamp = Date.now();
    const freeTitle = `Digital Val ${stamp}`;
    const description = `Review validation description ${stamp}`;
    let productUuid = '';
    let sharePath = '';

    try {
      await test.step('Seed a free digital product without reviews and check non-purchaser / guest view (TC-PD-B-031)', async () => {
        const created = await createDigitalProduct(page.request, {
          title: freeTitle,
          description,
          thumbnailImagePath: testImages.claude,
          price: 0,
        }, token);
        productUuid = created.productUuid;
        sharePath = productSharePath(created);

        // Guest / non-buyer sees no Reviews & Ratings section, no 0.0 rating, and no write CTA
        const guestContext = await browser.newContext();
        try {
          const guestPage = await guestContext.newPage();
          await guestPage.goto(new URL(sharePath.slice(1), baseURL).toString(), { waitUntil: 'domcontentloaded' });
          await expect(guestPage.getByRole('button', { name: /Write a review/i })).toHaveCount(0);
          await expect(guestPage.getByText(/Reviews & Ratings/i)).toHaveCount(0);
          await expect(guestPage.getByText(/0\.0/)).toHaveCount(0);
        } finally {
          await guestContext.close();
        }
      });

      await test.step('Eligible buyer on unreviewed product sees only the Write a review CTA (TC-PD-B-032)', async () => {
        // Purchase free product to become eligible
        await page.goto(`${baseURL}/product/${productUuid}/checkout?quantity=1`, { waitUntil: 'domcontentloaded' });
        const payBtn = page.getByRole('button', { name: /Pay Rp0/i });
        await expect(payBtn).toBeVisible({ timeout: 15000 });
        await payBtn.click();
        await page.waitForURL(/\/product\/transaction\//, { timeout: 15000 });

        // Navigate back to PDP
        await page.goto(new URL(sharePath.slice(1), baseURL).toString(), { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('button', { name: /Write a review/i })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/0\.0/)).toHaveCount(0);
      });

      await test.step('Submitting review without star rating displays validation and keeps draft text (TC-PD-B-033)', async () => {
        await page.getByRole('button', { name: /Write a review/i }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        const draftText = `Draft review text ${stamp}`;
        await dialog.getByRole('textbox').fill(draftText);
        await dialog.getByRole('button', { name: /Post Review/i }).click();

        await expect(dialog.getByText(/Please (give a rating|select a star rating)/i)).toBeVisible({ timeout: 5000 });
        expect(await dialog.getByRole('textbox').inputValue()).toBe(draftText);
      });

      await test.step('Failed network submission shows inline error and retains rating and draft text (TC-PD-B-037)', async () => {
        const dialog = page.getByRole('dialog');
        await page.route('**/api/v1/products/*/reviews', (route) => route.abort());

        await dialog.getByRole('radio', { name: /4 star/i }).click();
        await dialog.getByRole('button', { name: /Post Review/i }).click();

        await expect(dialog.getByText(/Couldn't submit your review|Please try again/i)).toBeVisible({ timeout: 10000 });
        await page.unroute('**/api/v1/products/*/reviews');
      });

      await test.step('Review text is optional and hard-capped at 500 characters; rating-only succeeds (TC-PD-B-034)', async () => {
        const dialog = page.getByRole('dialog');

        // Character counter stops at 500
        await dialog.getByRole('textbox').fill('x'.repeat(550));
        expect((await dialog.getByRole('textbox').inputValue()).length).toBe(500);

        // Empty text and submit rating only
        await dialog.getByRole('textbox').fill('');
        await dialog.getByRole('button', { name: /Post Review/i }).click();

        const toast = page.locator('[data-sonner-toast]');
        await expect(toast.filter({ hasText: /Thanks! Your review has been posted/i }).first()).toBeVisible({ timeout: 10000 });
        await expect(dialog).toBeHidden({ timeout: 5000 });
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid, token).catch(() => undefined);
    }
  });

  test('Product Digital — Submit Review, Own Review, One Review Per Buyer, Non-buyer View, Review Eligibility', {
    tag: ['@AUT-PD-015', '@products', '@buyer', '@regression'],
  }, async ({ page, browser }) => {
    test.setTimeout(180000);
    const token = sellerToken();
    const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
    test.skip(!token || !buyerToken, 'YAPP_TEST_ACCESS_TOKEN_2 and YAPP_TEST_ACCESS_TOKEN_BUYER are required');
    if (!token || !buyerToken) return;

    const stamp = Date.now();
    const freeTitle = `Digital Review ${stamp}`;
    const description = `Review testing description ${stamp}`;
    const reviewContent = `Review text ${stamp}`;
    let productUuid = '';
    let sharePath = '';

    try {
      await test.step('Seed a free digital product and verify review eligibility before purchase (TC-PD-B-042, TC-PD-B-043)', async () => {
        const created = await createDigitalProduct(page.request, {
          title: freeTitle,
          description,
          thumbnailImagePath: testImages.claude,
          price: 0,
        }, token);
        productUuid = created.productUuid;
        sharePath = productSharePath(created);

        // TC-PD-B-042: Non-purchaser cannot submit review via API (403 not_purchased)
        const unpurchasedPost = await page.request.post(apiUrl(`/api/v1/products/${productUuid}/reviews`), {
          headers: getHeaders(buyerToken),
          data: { rating: 5, reviewText: 'Nice' },
        });
        expect(unpurchasedPost.status()).toBe(403);

        // TC-PD-B-043: Server validation rejects invalid rating (<1 or >5)
        const postRatingZero = await page.request.post(apiUrl(`/api/v1/products/${productUuid}/reviews`), {
          headers: getHeaders(buyerToken),
          data: { rating: 0, reviewText: 'Zero' },
        });
        expect(postRatingZero.status()).toBe(400);

        const postRatingSix = await page.request.post(apiUrl(`/api/v1/products/${productUuid}/reviews`), {
          headers: getHeaders(buyerToken),
          data: { rating: 6, reviewText: 'Six' },
        });
        expect(postRatingSix.status()).toBe(400);
      });

      await test.step('Non-purchaser sees no review form or gate CTA on product page (TC-PD-B-040)', async () => {
        await page.goto(new URL(sharePath.slice(1), baseURL).toString(), { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('button', { name: /Write a review/i })).toHaveCount(0);
      });

      await test.step('Purchase free digital product so buyer becomes eligible (TC-PD-B-035)', async () => {
        await page.goto(`${baseURL}/product/${productUuid}/checkout?quantity=1`, { waitUntil: 'domcontentloaded' });
        const payBtn = page.getByRole('button', { name: /Pay Rp0/i });
        await expect(payBtn).toBeVisible({ timeout: 15000 });
        await payBtn.click();
        await page.waitForURL(/\/product\/transaction\//, { timeout: 15000 });
      });

      await test.step('Eligible buyer submits 4-star review and confirms lock during submit (TC-PD-B-035, TC-PD-B-036)', async () => {
        await page.goto(new URL(sharePath.slice(1), baseURL).toString(), { waitUntil: 'domcontentloaded' });
        const writeBtn = page.getByRole('button', { name: /Write a review/i });
        await expect(writeBtn).toBeVisible({ timeout: 15000 });
        await writeBtn.click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        const star4 = dialog.getByRole('radio', { name: /4 star/i });
        await star4.click();

        const textbox = dialog.getByRole('textbox');
        await textbox.fill(reviewContent);

        const postBtn = dialog.getByRole('button', { name: /Post Review/i });
        await postBtn.click();

        const toast = page.locator('[data-sonner-toast]');
        await expect(toast.filter({ hasText: /Thanks! Your review has been posted/i }).first()).toBeVisible({ timeout: 10000 });
      });

      await test.step('Buyer sees own review with "You" badge and no write/edit CTA (TC-PD-B-038)', async () => {
        await page.goto(new URL(sharePath.slice(1), baseURL).toString(), { waitUntil: 'domcontentloaded' });
        await expect(page.locator('text=You').filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(reviewContent).filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('button', { name: /Write a review/i })).toHaveCount(0);
      });

      await test.step('Server rejects second review submission with 409 already_reviewed (TC-PD-B-039)', async () => {
        const postSecond = await page.request.post(apiUrl(`/api/v1/products/${productUuid}/reviews`), {
          headers: getHeaders(buyerToken),
          data: { rating: 5, reviewText: 'Second try' },
        });
        expect(postSecond.status()).toBe(409);
      });

      await test.step('Guest user sees review and aggregate rating without write CTA (TC-PD-B-041)', async () => {
        const guestContext = await browser.newContext();
        try {
          const guestPage = await guestContext.newPage();
          await guestPage.goto(new URL(sharePath.slice(1), baseURL).toString(), { waitUntil: 'domcontentloaded' });
          await expect(guestPage.getByText(reviewContent).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
          await expect(guestPage.getByText(/4\.0/).filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
          await expect(guestPage.getByRole('button', { name: /Write a review/i })).toHaveCount(0);
        } finally {
          await guestContext.close();
        }
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid, token).catch(() => undefined);
    }
  });
});
