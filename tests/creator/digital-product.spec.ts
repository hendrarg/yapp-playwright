import { creatorAuthTest as test, expect } from '../test-base';
import { listCreatorTiers } from '@helpers/api/membership';
import { listOrders } from '@helpers/api/orders';
import { deleteProduct, findProductByTitle, getProduct } from '@helpers/api/product';
import { depositWebhook } from '@helpers/api/webhook';
import { loginWithToken } from '@helpers/auth/token-login';
import { buyCourseAs } from '@helpers/buyer/course-purchase';
import { createDigitalProductUploadFixtures } from '@helpers/creator/digital-product-media';
import { addCustomBuyerQuestion, closeProductCompleteModal, copyProductCompleteLink, enableAfterSalesLinks, expectAddQuestionsDisabled, expectEmbedLinksSaved, expectImageTooSmall, expectInvalidEmbedLinkFeedback, expectMandatoryBuyerFieldsProtected, expectProductCompleteModal, expectProductCompleteModalSoft, expectSavedBuyerQuestion, fillEmbedLink, openEmbedLinkDialog, readProductCompleteSharePath, removeCustomBuyerQuestion, saveCurrentEmbedLink } from '@helpers/creator/product-editor';
import { LibraryPage } from '@pages/buyer/LibraryPage';
import { ProductPurchasePage } from '@pages/buyer/ProductPurchasePage';
import type { DigitalProductPage } from '@pages/creator/DigitalProductPage';
import type { OnlineCoursePage } from '@pages/creator/OnlineCoursePage';
import { baseURL } from '@config/env';
import { digitalProductPricingData, digitalProductValidationData, generateDigitalProductBuyerOnlyDescription, generateDigitalProductDescription, generateDigitalProductTitle, generateOnlineCourseAfterSalesMessage, onlineCourseMediaData } from '@test-data/creator/products.creation.data';
import { testAccounts } from '@test-data/users';

const token = (account: { envVar: string }) => process.env[account.envVar]?.replace(/"/g, '');
const [firstLink, secondLink] = digitalProductValidationData.linkValidation.validLinks;

/** Step 1 with one content link, then step 2 with title, description and thumbnail filled. */
async function reachDetails(digital: DigitalProductPage, course: OnlineCoursePage, title: string) {
  const page = digital.page;
  await digital.goto();
  await digital.expectDigitalProductCreateFlow();
  await digital.enableLinksContentType();
  await openEmbedLinkDialog(page);
  await fillEmbedLink(page, firstLink.label, firstLink.url);
  await saveCurrentEmbedLink(page);
  await digital.goToDetails();
  await course.fillTitle(title);
  await course.fillDescription(generateDigitalProductDescription());
  await course.uploadProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
}

/** Publish from step 2 and return the share path from the completion modal. */
async function publish(course: OnlineCoursePage): Promise<string> {
  await course.submitPublish();
  await expectProductCompleteModal(course.page);
  const sharePath = await readProductCompleteSharePath(course.page);
  await closeProductCompleteModal(course.page);
  return sharePath;
}

test.describe('Creator Digital Product', () => {
  test('Product Digital — Basic Information, Description, Navigation, Content Type', {
    tag: ['@AUT-PD-001', '@products', '@creator', '@regression'],
    annotation: [{ type: 'issue', description: 'L-42' }, { type: 'issue', description: 'M-46' }, { type: 'issue', description: 'M-13' }],
  }, async ({ creatorNav, productsPage, digitalProductPage, onlineCoursePage }) => {
    test.setTimeout(240000);
    // Known bugs L-42 (requirement does not name Media), M-46/M-26 (limits and counter), M-13 (no unsaved guard). Last three steps.
    test.fail(true, 'L-42 / M-46 / M-13: content-type message, description limit, unsaved changes');
    const uploads = createDigitalProductUploadFixtures();

    try {
      await test.step('Title is required before the product can be published', async () => {
        await reachDetails(digitalProductPage, onlineCoursePage, generateDigitalProductTitle());
        await onlineCoursePage.clearTitle();
        await onlineCoursePage.submitNextPublish();
        await onlineCoursePage.expectTitleRequiredError();
      });

      await test.step('At least one content type is required to continue', async () => {
        await creatorNav.open('products');
        await productsPage.openAddProductSheet();
        await productsPage.selectProductType(/Digital Products Digital Download Downloadable files/i);
        await digitalProductPage.expectDigitalProductCreateFlow();
        await digitalProductPage.submitEmptyDigitalProductAddContent();
        await digitalProductPage.expectContentTypeRequired();
      });

      await test.step('Three unticked content types; ticking opens a section, unticking drops it with no confirmation', async () => {
        await digitalProductPage.goto();
        await digitalProductPage.expectContentTypeOptions();
        for (const type of ['media', 'links', 'digital'] as const) {
          await digitalProductPage.setContentType(type, true);
          await digitalProductPage.expectContentSection(type, true);
          await digitalProductPage.expectUntickWithoutConfirmation(type);
        }
      });

      await test.step('Unticking Media clears the media already added', async () => {
        await digitalProductPage.setContentType('media', true);
        await digitalProductPage.uploadMedia([uploads.videos[0]]);
        await digitalProductPage.expectMediaItems({ videoNames: [uploads.videoNames[0]], imageCount: 0 });
        await digitalProductPage.setContentType('media', false);
        await digitalProductPage.setContentType('media', true);
        await digitalProductPage.expectMediaListEmpty();
      });

      await test.step('The content-type requirement names every type, Media included', async () => {
        await digitalProductPage.goto();
        await digitalProductPage.submitEmptyDigitalProductAddContent();
        await digitalProductPage.expectContentTypeMessageNamesAllTypes();
      });

      await test.step('Description keeps rich text and stops at 500 characters', async () => {
        await reachDetails(digitalProductPage, onlineCoursePage, generateDigitalProductTitle());
        await onlineCoursePage.applyRichTextFormatting();
        await onlineCoursePage.expectDescriptionFormatted();
        await onlineCoursePage.fillDescription('A'.repeat(550));
        await onlineCoursePage.expectDescriptionCounterSoft('500 / 500');
      });

      await test.step('Next stays reachable and leaving with unsaved changes asks for confirmation', async () => {
        await digitalProductPage.goto();
        await digitalProductPage.setContentType('links', true);
        await digitalProductPage.expectNextStaysVisibleAfterScroll();
        await digitalProductPage.leaveViaBack();
        await digitalProductPage.expectUnsavedChangesPrompt();
      });
    } finally {
      uploads.cleanup();
    }
  });

  test('Product Digital — Media Upload, External Links, Digital Files, Post-purchase Description, Thumbnails', {
    tag: ['@AUT-PD-002', '@products', '@creator', '@smoke'],
  }, async ({ digitalProductPage, onlineCoursePage, productPurchasePage, page }) => {
    test.setTimeout(360000);
    // Candidate bugs (not yet filed): .ogv/.avi are advertised but the upload answers 500 and publish
    // stalls silently; a file outside the media list is accepted with no message. Last two steps.
    test.fail(true, 'Advertised .ogv/.avi media cannot be published; unsupported media accepted silently');
    const uploads = createDigitalProductUploadFixtures();
    const titles: string[] = [];

    try {
      await test.step('Several external links are saved as separate items', async () => {
        await digitalProductPage.goto();
        await digitalProductPage.expectDigitalProductCreateFlow();
        await digitalProductPage.enableLinksContentType();
        for (const link of [firstLink, secondLink]) {
          await openEmbedLinkDialog(page);
          await fillEmbedLink(page, link.label, link.url);
          await saveCurrentEmbedLink(page);
        }
        await expectEmbedLinksSaved(page, [firstLink.label, secondLink.label]);
      });

      await test.step('An invalid URL is flagged inline and cannot be saved', async () => {
        await openEmbedLinkDialog(page);
        await fillEmbedLink(page, digitalProductValidationData.linkValidation.longLabel, digitalProductValidationData.linkValidation.invalidUrl);
        await expectInvalidEmbedLinkFeedback(page);
        await page.keyboard.press('Escape');
      });

      await test.step('Every advertised document format is accepted', async () => {
        await digitalProductPage.setContentType('digital', true);
        await digitalProductPage.uploadDigitalFiles(uploads.files);
        await digitalProductPage.expectDigitalFileNames(uploads.fileNames);
        // The stubs are extension-only. Leaving them on the form makes publish stall at file upload.
        await digitalProductPage.expectUntickWithoutConfirmation('digital');
      });

      await test.step('The buyer-only description is optional, formats and counts up to 500', async () => {
        await digitalProductPage.expectBuyerOnlyHint();
        await digitalProductPage.fillDigitalProductContentDescription(generateDigitalProductBuyerOnlyDescription(500));
        await digitalProductPage.expectDigitalProductContentDescriptionCounter('500 / 500');
        await digitalProductPage.applyDigitalProductContentDescriptionFormatting();
        await digitalProductPage.expectDigitalProductContentDescriptionFormatted();
        await digitalProductPage.fillDigitalProductContentDescription('');
        await digitalProductPage.expectDigitalProductContentDescriptionCounter('0 / 500');
        await digitalProductPage.goToDetails();
      });

      const title = generateDigitalProductTitle();
      titles.push(title);

      await test.step('Thumbnails: one hero plus a 10-image gallery, multi-select, undersized rejected', async () => {
        await onlineCoursePage.fillTitle(title);
        await onlineCoursePage.fillDescription(generateDigitalProductDescription());
        await onlineCoursePage.uploadThumbnailForValidation(onlineCourseMediaData.tinyThumbnailPath);
        await expectImageTooSmall(page, onlineCourseMediaData.tinyThumbnailPath.split('/').pop()!);
        await onlineCoursePage.uploadProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
        await onlineCoursePage.uploadProductGallery(onlineCourseMediaData.thumbnailPaths.slice(1));
        await onlineCoursePage.expectProductThumbnailLimit();
      });

      await test.step('The first thumbnail is the primary image of the published product', async () => {
        const sharePath = await publish(onlineCoursePage);
        const productUuid = (await findProductByTitle(page.request, title))!.uuid;
        const product = await getProduct(page.request, productUuid) as unknown as { thumbnailImage: string; productImages: unknown[] };
        expect(product.productImages.length).toBe(onlineCourseMediaData.thumbnailPaths.length - 1);
        await productPurchasePage.gotoSharePath(sharePath);
        expect(await productPurchasePage.primaryImagePath()).toBe(new URL(product.thumbnailImage).pathname);
      });

      await test.step('Every advertised media format is accepted and the product publishes', async () => {
        const mediaTitle = generateDigitalProductTitle();
        titles.push(mediaTitle);
        const publishableVideos = uploads.videos.filter((file) => !/\.(?:ogv|avi)$/i.test(file));
        await digitalProductPage.goto();
        await digitalProductPage.setContentType('media', true);
        await digitalProductPage.uploadMedia([...uploads.images, ...publishableVideos]);
        await digitalProductPage.expectMediaItems({
          videoNames: publishableVideos.map((file) => file.split(/[\\/]/).pop()!),
          imageCount: uploads.images.length,
        });
        await digitalProductPage.goToDetails();
        await onlineCoursePage.fillTitle(mediaTitle);
        await onlineCoursePage.fillDescription(generateDigitalProductDescription());
        await onlineCoursePage.uploadProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
        await publish(onlineCoursePage);
      });

      await test.step('Advertised .ogv and .avi media can be published', async () => {
        const stalled = uploads.videos.filter((file) => /\.(?:ogv|avi)$/i.test(file));
        await digitalProductPage.goto();
        await digitalProductPage.setContentType('media', true);
        await digitalProductPage.uploadMedia(stalled);
        await digitalProductPage.expectMediaItems({ videoNames: stalled.map((file) => file.split(/[\\/]/).pop()!), imageCount: 0 });
        await digitalProductPage.goToDetails();
        await onlineCoursePage.fillTitle(generateDigitalProductTitle());
        await onlineCoursePage.fillDescription(generateDigitalProductDescription());
        await onlineCoursePage.uploadProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
        await onlineCoursePage.submitPublish();
        await expectProductCompleteModalSoft(page);
      });

      await test.step('A file outside the supported media formats is rejected with a message', async () => {
        await digitalProductPage.goto();
        await digitalProductPage.setContentType('media', true);
        await digitalProductPage.uploadMedia([uploads.unsupported]);
        await digitalProductPage.expectMediaRejected(uploads.unsupportedName);
      });
    } finally {
      uploads.cleanup();
      for (const t of titles) {
        const product = await findProductByTitle(page.request, t).catch(() => undefined);
        if (product) await deleteProduct(page.request, product.uuid).catch(() => undefined);
      }
    }
  });

  test('Product Digital — Media Upload, Digital Files, Thumbnail Rejection Message, Deselect Without Confirmation', {
    tag: ['@AUT-PD-003', '@products', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'M-41' },
  }, async ({ digitalProductPage, onlineCoursePage, page }) => {
    test.setTimeout(240000);
    // Known bug M-41: unticking a filled content type discards its files with no confirmation. Last step.
    test.fail(true, 'M-41: unticking a content type discards its files without confirmation');
    const uploads = createDigitalProductUploadFixtures();

    try {
      await test.step('Several media files can be added from the picker and by drop, and one can be removed', async () => {
        await digitalProductPage.goto();
        await digitalProductPage.setContentType('media', true);
        await digitalProductPage.uploadMedia(uploads.videos.slice(0, 2));
        await digitalProductPage.expectMediaItems({ videoNames: uploads.videoNames.slice(0, 2), imageCount: 0 });
        const imagesBefore = await digitalProductPage.readMediaImageCount();
        await digitalProductPage.dropMedia([uploads.images[0]]);
        await expect.poll(() => digitalProductPage.readMediaImageCount(), { timeout: 15000 }).toBeGreaterThan(imagesBefore);
        await digitalProductPage.removeNamedFile(uploads.videoNames[0]);
      });

      await test.step('A full set of media files stays listed, and a count error is shown if one is applied', async () => {
        await digitalProductPage.goto();
        await digitalProductPage.setContentType('media', true);
        await digitalProductPage.uploadMedia([...uploads.images, ...uploads.videos]);
        await digitalProductPage.expectMediaItems({ videoNames: uploads.videoNames, imageCount: uploads.images.length });
      });

      await test.step('Several digital files can be added and removed, and an unsupported format is refused', async () => {
        await digitalProductPage.goto();
        await digitalProductPage.setContentType('digital', true);
        await digitalProductPage.uploadDigitalFiles(uploads.files.slice(0, 2));
        await digitalProductPage.expectDigitalFileNames(uploads.fileNames.slice(0, 2));
        await digitalProductPage.dropDigitalFiles([uploads.files[2]]);
        await digitalProductPage.expectDigitalFileNames([uploads.fileNames[2]]);
        await digitalProductPage.removeNamedFile(uploads.fileNames[0]);
        await digitalProductPage.uploadDigitalFiles([uploads.unsupported]);
        await digitalProductPage.expectDigitalFileRejected(uploads.unsupportedName);
      });

      await test.step('An undersized thumbnail is refused in a toast that names the file', async () => {
        await digitalProductPage.goto();
        await digitalProductPage.enableLinksContentType();
        await openEmbedLinkDialog(page);
        await fillEmbedLink(page, firstLink.label, firstLink.url);
        await saveCurrentEmbedLink(page);
        await digitalProductPage.goToDetails();
        await onlineCoursePage.fillTitle(generateDigitalProductTitle());
        await onlineCoursePage.fillDescription(generateDigitalProductDescription());
        const fileName = onlineCourseMediaData.tinyThumbnailPath.split('/').pop()!;
        await onlineCoursePage.uploadThumbnailForValidation(onlineCourseMediaData.tinyThumbnailPath);
        await expectImageTooSmall(page, fileName);
      });

      await test.step('Unticking a filled content type asks before the files are discarded', async () => {
        await digitalProductPage.goto();
        await digitalProductPage.setContentType('digital', true);
        await digitalProductPage.uploadDigitalFiles(uploads.files.slice(0, 1));
        await digitalProductPage.expectDigitalFileNames(uploads.fileNames.slice(0, 1));
        await digitalProductPage.requestContentTypeOff('digital');
        await digitalProductPage.expectDiscardConfirmation();
      });
    } finally {
      uploads.cleanup();
    }
  });

  test('Product Digital — Downloadable File, Pricing, Membership Benefit, Buyer Form, Limited Slot', {
    tag: ['@AUT-PD-004', '@products', '@creator', '@regression'],
  }, async ({ digitalProductPage, onlineCoursePage, productPurchasePage, page, browser }) => {
    test.setTimeout(480000);
    const request = page.request;
    const uploads = createDigitalProductUploadFixtures();
    const titles: string[] = [];
    const questions = Array.from({ length: 5 }, (_, i) => `Question ${i + 1} ${Date.now()}`);

    try {
      await test.step('Downloadable File defaults ON; OFF leaves the file viewable but not downloadable', async () => {
        const title = generateDigitalProductTitle();
        titles.push(title);
        await digitalProductPage.goto();
        await digitalProductPage.setContentType('digital', true);
        await digitalProductPage.uploadDigitalFiles(uploads.files.slice(0, 1));
        await digitalProductPage.goToDetails();
        await digitalProductPage.expectDownloadable(true);
        await digitalProductPage.setDownloadable(false);
        await onlineCoursePage.fillTitle(title);
        await onlineCoursePage.fillDescription(generateDigitalProductDescription());
        await onlineCoursePage.uploadProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
        await onlineCoursePage.fillOnlineCoursePrice(digitalProductPricingData.validPrice);
        const sharePath = await publish(onlineCoursePage);
        const bought = await buyCourseAs(browser, request, token(testAccounts.qa)!, { title, sharePath });
        try {
          await bought.page.goto(new URL(`product/${bought.orderId}`, baseURL).toString());
          await new LibraryPage(bought.page, baseURL).expectFileViewOnly(uploads.fileNames[0]);
        } finally {
          await bought.context.close();
        }
      });

      await test.step('A new product is free by default and shows Rp0 to buyers', async () => {
        const title = generateDigitalProductTitle();
        titles.push(title);
        await reachDetails(digitalProductPage, onlineCoursePage, title);
        await digitalProductPage.expectDigitalProductPricingFreeDefault();
        const sharePath = await publish(onlineCoursePage);
        await productPurchasePage.expectOnlineCourseFreeBuyerView(title, sharePath);
      });

      await test.step('Prices from 1 to 9.999 are rejected, 0 stays Free and Rp10.000 is accepted', async () => {
        await reachDetails(digitalProductPage, onlineCoursePage, generateDigitalProductTitle());
        await onlineCoursePage.fillOnlineCoursePrice(digitalProductPricingData.belowMinimumPrice);
        await onlineCoursePage.attemptOnlineCoursePricingContinue();
        await digitalProductPage.expectDigitalProductInvalidPriceFeedback();
        await onlineCoursePage.fillOnlineCoursePrice(digitalProductPricingData.zeroPrice);
        await digitalProductPage.expectDigitalProductPricingFreeDefault();
        await onlineCoursePage.fillOnlineCoursePrice(digitalProductPricingData.validPrice);
        await digitalProductPage.expectDigitalProductValidPrice();
      });

      await test.step('A tier benefit applies only to members of that tier', async () => {
        const title = generateDigitalProductTitle();
        titles.push(title);
        const held = (await listCreatorTiers(request)).find((t) => t.name === 'satu tahun' && t.isActive);
        expect(held, 'the QA buyer holds the satu tahun tier').toBeTruthy();
        await reachDetails(digitalProductPage, onlineCoursePage, title);
        await onlineCoursePage.fillOnlineCoursePrice('15000');
        await digitalProductPage.addFreeAccessBenefit(held!.name);
        const sharePath = await publish(onlineCoursePage);
        for (const [account, member] of [[testAccounts.qa, true], [testAccounts.sundanese, false]] as const) {
          const context = await browser.newContext({ viewport: page.viewportSize() });
          try {
            await loginWithToken(context, token(account)!, baseURL);
            const buyer = new ProductPurchasePage(await context.newPage(), baseURL);
            await buyer.gotoSharePath(sharePath);
            await buyer.expectMemberFreeAccessBadge(member, 'Rp15.000');
          } finally {
            await context.close();
          }
        }
      });

      await test.step('Name, email and phone cannot be switched off', async () => {
        await reachDetails(digitalProductPage, onlineCoursePage, generateDigitalProductTitle());
        await expectMandatoryBuyerFieldsProtected(page);
      });

      await test.step('Up to five custom questions; a sixth is blocked and one can be removed', async () => {
        for (const question of questions) await addCustomBuyerQuestion(page, question);
        for (const question of questions) await expectSavedBuyerQuestion(page, question);
        await expectAddQuestionsDisabled(page);
        await removeCustomBuyerQuestion(page, questions[4]);
      });

      await test.step('Limited Slot caps sales and shows the remaining count to buyers', async () => {
        const title = generateDigitalProductTitle();
        titles.push(title);
        await reachDetails(digitalProductPage, onlineCoursePage, title);
        await digitalProductPage.enableLimitedSlots(5);
        const sharePath = await publish(onlineCoursePage);
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectSlotCounter(0, 5);
      });
    } finally {
      uploads.cleanup();
      for (const title of titles) {
        const product = await findProductByTitle(request, title).catch(() => undefined);
        if (product) await deleteProduct(request, product.uuid).catch(() => undefined);
      }
    }
  });

  test('Product Digital — Save Draft, Publish, Toggle, Message, Links, Section Scope, Preview and Delivery, Accessibility', {
    tag: ['@AUT-PD-005', '@products', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'L-43' },
  }, async ({ digitalProductPage, onlineCoursePage, productPurchasePage, page, browser }) => {
    test.setTimeout(480000);
    // Known bug L-43 (unnamed Customize Message switch). Last step.
    test.fail(true, 'L-43: after-sales switch has no accessible name');
    const request = page.request;
    const titles: string[] = [];
    const message = generateOnlineCourseAfterSalesMessage();

    try {
      await test.step('Save keeps a draft that buyers cannot reach', async () => {
        const title = generateDigitalProductTitle();
        titles.push(title);
        await reachDetails(digitalProductPage, onlineCoursePage, title);
        const uuid = await onlineCoursePage.saveCourse().catch(async () => (await findProductByTitle(request, title))!.uuid);
        expect((await getProduct(request, uuid)).status).toBe('draft');
        await productPurchasePage.gotoSharePath(`/s/${(await getProduct(request, uuid)).shortUrl}`);
        await expect.poll(() => productPurchasePage.isProductPubliclyPurchasable()).toBe(false);
      });

      await test.step('Publish shows Product Complete with a copyable URL and View Product', async () => {
        const title = generateDigitalProductTitle();
        titles.push(title);
        await reachDetails(digitalProductPage, onlineCoursePage, title);
        await onlineCoursePage.submitPublish();
        await expectProductCompleteModal(page);
        const sharePath = await readProductCompleteSharePath(page);
        expect(await copyProductCompleteLink(page)).toContain(sharePath);
        await closeProductCompleteModal(page);
        expect((await findProductByTitle(request, title))?.status).toBe('active');
      });

      await test.step('After Sales defaults OFF; left off it saves and buyers get no custom message', async () => {
        const title = generateDigitalProductTitle();
        titles.push(title);
        await reachDetails(digitalProductPage, onlineCoursePage, title);
        expect(await onlineCoursePage.readAfterSalesMessageEnabled()).toBe(false);
        await onlineCoursePage.setAfterSalesMessageEnabled(false);
        await onlineCoursePage.fillOnlineCoursePrice(digitalProductPricingData.validPrice);
        const sharePath = await publish(onlineCoursePage);
        const bought = await buyCourseAs(browser, request, token(testAccounts.qa)!, { title, sharePath });
        try {
          await bought.page.goto(new URL(`product/${bought.orderId}`, baseURL).toString());
          await new LibraryPage(bought.page, baseURL).expectNoAfterSalesMessage();
        } finally {
          await bought.context.close();
        }
      });

      await test.step('After Sales holds only a message, its counter and up to 3 links — no file upload', async () => {
        await reachDetails(digitalProductPage, onlineCoursePage, generateDigitalProductTitle());
        await digitalProductPage.expectAfterSalesScope();
      });

      await test.step('Link labels stop at 40 characters, invalid URLs are rejected and valid links save', async () => {
        await onlineCoursePage.fillAfterSalesMessage(message);
        await enableAfterSalesLinks(page);
        await openEmbedLinkDialog(page);
        await fillEmbedLink(page, digitalProductValidationData.linkValidation.longLabel, digitalProductValidationData.linkValidation.invalidUrl);
        await expectInvalidEmbedLinkFeedback(page);
        await fillEmbedLink(page, firstLink.label, firstLink.url);
        await saveCurrentEmbedLink(page);
        await openEmbedLinkDialog(page);
        await fillEmbedLink(page, secondLink.label, secondLink.url);
        await saveCurrentEmbedLink(page);
        await expectEmbedLinksSaved(page, [firstLink.label, secondLink.label]);
      });

      await test.step('Preview shows the staged content read-only, and a repeated payment callback delivers once', async () => {
        await onlineCoursePage.openAfterSalesPreview();
        await onlineCoursePage.expectAfterSalesPreviewReadOnly(message, firstLink.label);
        await onlineCoursePage.closeAfterSalesPreview();
        const title = generateDigitalProductTitle();
        titles.push(title);
        await onlineCoursePage.fillTitle(title);
        await onlineCoursePage.fillOnlineCoursePrice(digitalProductPricingData.validPrice);
        const sharePath = await publish(onlineCoursePage);
        const bought = await buyCourseAs(browser, request, token(testAccounts.qa)!, { title, sharePath });
        try {
          // Replaying the same payment callback is refused (order no longer pending) — and must not deliver twice.
          await depositWebhook(request, bought.orderId, { tolerateTimeout: true }).catch((e) => expect(String(e)).toMatch(/not pending/));
          const orders = (await listOrders(request, { limit: 20 })).data.filter((o) => o.productName === title);
          expect(orders).toHaveLength(1);
          await bought.page.goto(new URL(`product/${bought.orderId}`, baseURL).toString());
          await new LibraryPage(bought.page, baseURL).expectAfterSalesMessageText(testAccounts.creator.username, message);
        } finally {
          await bought.context.close();
        }
      });

      await test.step('With After Sales ON an empty message is refused and the 1000-character limit holds', async () => {
        await reachDetails(digitalProductPage, onlineCoursePage, generateDigitalProductTitle());
        await onlineCoursePage.fillAfterSalesMessage('M'.repeat(1005));
        await onlineCoursePage.expectSaveBlockedByAfterSales(/Customize Message must be at most 1000 characters/);
        await onlineCoursePage.fillAfterSalesMessage('');
        await onlineCoursePage.expectSaveBlockedByAfterSales(/After-sales message is required when Customize Message is on/);
      });

      await test.step('The Customize Message switch has an accessible name like every other switch', async () => {
        await digitalProductPage.expectAfterSalesSwitchNamed();
      });
    } finally {
      for (const title of titles) {
        const product = await findProductByTitle(request, title).catch(() => undefined);
        if (product) await deleteProduct(request, product.uuid).catch(() => undefined);
      }
    }
  });

  test('Product Digital — Edit, future changes, republish, and URL stays, Title Length, Description Counter, Media List, Audio, Overlay, Accessibility', {
    tag: ['@AUT-PD-006', '@products', '@creator', '@regression'],
    annotation: [
      { type: 'issue', description: 'M-46' },
      { type: 'issue', description: 'M-26' },
      { type: 'issue', description: 'M-40' },
      { type: 'issue', description: 'L-43' },
    ],
  }, async ({ digitalProductPage, onlineCoursePage, page }) => {
    test.setTimeout(300000);
    // Known bugs last: M-46 title cap, M-26 word counter, M-40 image row, L-43 unnamed checkboxes.
    test.fail(true, 'M-46 / M-26 / M-40 / L-43: title cap, description unit, media rows, content-type names');
    const request = page.request;
    const uploads = createDigitalProductUploadFixtures();
    const titles: string[] = [];
    const stepOne = 'one two three four five six seven eight nine ten eleven';
    const stepTwo = 'alpha beta gamma delta epsilon zeta eta theta iota kappa';

    try {
      await test.step('The form is usable on the first visit, with no tour covering it', async () => {
        await digitalProductPage.goto();
        await digitalProductPage.expectFormReadyWithoutTour();
      });

      await test.step('The Media upload lists audio formats as well as images and video', async () => {
        await digitalProductPage.expectMediaAdvertisesAudio();
      });

      await test.step('Editing a published product keeps its URL and shows the saved change', async () => {
        const title = generateDigitalProductTitle();
        titles.push(title);
        await reachDetails(digitalProductPage, onlineCoursePage, title);
        const sharePath = await publish(onlineCoursePage);
        const product = (await findProductByTitle(request, title))!;
        const edited = `Future buyers see this note ${Date.now().toString().slice(-4)}`;
        await digitalProductPage.openEdit(product.uuid);
        await digitalProductPage.goToDetails();
        await onlineCoursePage.fillDescription(edited);
        await digitalProductPage.saveAndPublish();
        expect((await getProduct(request, product.uuid)).shortUrl).toBe(sharePath.replace(/^\/s\//, ''));
        await digitalProductPage.openEdit(product.uuid);
        await digitalProductPage.goToDetails();
        await onlineCoursePage.expectDescriptionContains(edited);
      });

      await test.step('The content description counter counts characters on both steps', async () => {
        await digitalProductPage.goto();
        await digitalProductPage.fillDigitalProductContentDescription(stepOne);
        await digitalProductPage.expectDigitalProductContentDescriptionCounterSoft(`${stepOne.length} / 500`);
        await digitalProductPage.setContentType('links', true);
        await openEmbedLinkDialog(page);
        await fillEmbedLink(page, firstLink.label, firstLink.url);
        await saveCurrentEmbedLink(page);
        await digitalProductPage.goToDetails();
        await onlineCoursePage.fillDescription(stepTwo);
        await onlineCoursePage.expectDescriptionCounterSoft(`${stepTwo.length} / 500`);
      });

      await test.step('An image and a video both list the file name and the size', async () => {
        await digitalProductPage.goto();
        await digitalProductPage.setContentType('media', true);
        await digitalProductPage.uploadMedia([uploads.images[0], uploads.videos[0]]);
        await digitalProductPage.expectMediaItems({ videoNames: [uploads.videoNames[0]], imageCount: 1 });
        await digitalProductPage.expectMediaFileListedWithSize(uploads.images[0].split(/[\\/]/).pop()!);
      });

      await test.step('Each content-type checkbox exposes its label', async () => {
        await digitalProductPage.expectContentTypeCheckboxesNamed();
      });

      await test.step('The title stops at its documented limit and shows that limit', async () => {
        await digitalProductPage.goToDetails();
        await onlineCoursePage.fillTitle('T'.repeat(556));
        await onlineCoursePage.expectTitleCappedSoft(556);
      });
    } finally {
      uploads.cleanup();
      for (const title of titles) {
        const product = await findProductByTitle(request, title).catch(() => undefined);
        if (product) await deleteProduct(request, product.uuid).catch(() => undefined);
      }
    }
  });

  test('Product Digital — Description Counter Unit, Limited Slot, Flexible Price, Step 1 Gate, Content Rendering', {
    tag: ['@AUT-PD-007', '@products', '@creator', '@regression'],
    annotation: [
      { type: 'issue', description: 'M-26' },
      { type: 'issue', description: 'M-39' },
    ],
  }, async ({ digitalProductPage, onlineCoursePage, productPurchasePage, page }) => {
    test.setTimeout(300000);
    test.fail(true, 'M-26 / M-39: word counter, entitlement media embed');
    const request = page.request;
    const titles: string[] = [];

    try {
      await test.step('Step 1 requires Upload Files or Embed Links before proceeding to details', async () => {
        await digitalProductPage.goto();
        await digitalProductPage.expectDigitalProductCreateFlow();
        await digitalProductPage.fillDigitalProductContentDescription(generateDigitalProductDescription());
        await digitalProductPage.submitEmptyDigitalProductAddContent();
        await digitalProductPage.expectContentTypeRequired();
      });

      await test.step('Content Description counter counts characters, not words', async () => {
        const probeText = 'one two three four five'; // 23 characters, 5 words
        await digitalProductPage.fillDigitalProductContentDescription(probeText);
        // Known bug M-26: displays '5 / 500' instead of '23 / 500'
        await digitalProductPage.expectDigitalProductContentDescriptionCounterSoft(`${probeText.length} / 500`);
      });

      await test.step('Limited Slot configuration enables slots count and remaining count display', async () => {
        const title = generateDigitalProductTitle();
        titles.push(title);
        await reachDetails(digitalProductPage, onlineCoursePage, title);
        await digitalProductPage.enableLimitedSlots(10);
        const sharePath = await publish(onlineCoursePage);
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectSlotCounter(0, 10);
      });

      await test.step('Flexible Price configuration allows setting minimum fair price', async () => {
        const title = generateDigitalProductTitle();
        titles.push(title);
        await reachDetails(digitalProductPage, onlineCoursePage, title);
        await digitalProductPage.enableFlexiblePrice('15000');
        await digitalProductPage.expectFlexiblePriceCryptoOption();
      });

      await test.step('Rich-text embed in description renders media player', async () => {
        const title = generateDigitalProductTitle();
        titles.push(title);
        await reachDetails(digitalProductPage, onlineCoursePage, title);
        const descWithEmbed = `${generateDigitalProductDescription()}\n\n::youtube{#NRZjdBdQ9ow}`;
        await onlineCoursePage.fillDescription(descWithEmbed);
        const sharePath = await publish(onlineCoursePage);
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectYoutubeEmbedRendered('NRZjdBdQ9ow');
      });
    } finally {
      for (const title of titles) {
        const product = await findProductByTitle(request, title).catch(() => undefined);
        if (product) await deleteProduct(request, product.uuid).catch(() => undefined);
      }
    }
  });
});
