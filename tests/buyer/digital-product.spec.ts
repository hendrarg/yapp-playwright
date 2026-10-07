import { authTest as test, expect } from '../test-base';
import { createDigitalProduct, deleteProduct, productSharePath } from '@helpers/api/product';
import { depositWebhook } from '@helpers/api/webhook';
import { markInboxStart, testmailConfig, waitForEmail } from '@helpers/otp/testmail';
import { LoginPage } from '@pages/auth/LoginPage';
import { LibraryPage } from '@pages/buyer/LibraryPage';
import { ProductPurchasePage } from '@pages/buyer/ProductPurchasePage';
import { baseURL } from '@config/env';
import { buyerEventsDetailData } from '@test-data/buyer/events.detail.data';
import { promotionData } from '@test-data/buyer/promotion.data';
import { testImages } from '@test-data/creator/post.data';
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
});
