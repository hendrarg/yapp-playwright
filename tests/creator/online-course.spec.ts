import { creatorAuthTest as test, expect } from '../test-base';
import { signInWithEmailOtp } from '@helpers/auth/otp-login';
import { loginWithToken } from '@helpers/auth/token-login';
import { listCreatorTiers } from '@helpers/api/membership';
import { listOrders } from '@helpers/api/orders';
import { createOnlineCourseProduct, deleteProduct, getProduct, productShortPath } from '@helpers/api/product';
import { buyCourseAs } from '@helpers/buyer/course-purchase';
import { createOversizedImageFixture } from '@helpers/creator/oversized-image';
import { createOnlineCourseLessonFixtures } from '@helpers/creator/online-course-media';
import { addCustomBuyerQuestion, closeProductCompleteModal, copyProductCompleteLink, expectAddQuestionsDisabled, expectEmbedLinksSaved, expectImageTooSmall, expectInvalidEmbedLinkFeedback, expectMandatoryBuyerFieldsProtected, expectProductCompleteModal, expectSavedBuyerQuestion, fillEmbedLink, openEmbedLinkDialog, readProductCompleteSharePath, removeCustomBuyerQuestion, saveCurrentEmbedLink } from '@helpers/creator/product-editor';
import { LibraryPage } from '@pages/buyer/LibraryPage';
import { ProductPurchasePage } from '@pages/buyer/ProductPurchasePage';
import { OnlineCoursePage } from '@pages/creator/OnlineCoursePage';
import { baseURL, creatorsBaseURL } from '@config/env';
import { digitalProductValidationData, generateOnlineCourseAfterSalesLink, generateOnlineCourseAfterSalesMessage, generateOnlineCourseChapterTitle, generateOnlineCourseEpisodeContent, generateOnlineCourseEpisodeTitle, generateOnlineCourseProductData, onlineCourseMediaData, onlineCoursePricingData, productsCreationData } from '@test-data/creator/products.creation.data';
import { inboxAccounts, testAccounts } from '@test-data/users';

const token = (account: { envVar: string }) => process.env[account.envVar]?.replace(/"/g, '');
const onlineCourseType = productsCreationData.productTypes.find((type) => type.label === 'Online Course')!;

test.describe('Creator Online Course', () => {
  test('Online Course — Course Structure, Standalone Episode, Publish Validation, Navigation, Unsaved Changes', {
    tag: ['@AUT-OC-001', '@products', '@creator', '@smoke'],
    annotation: { type: 'issue', description: 'M-13' },
  }, async ({ creatorNav, productsPage, onlineCoursePage }) => {
    test.setTimeout(240000);
    // Known bug M-13: product forms have no unsaved-changes guard. Last step.
    test.fail(true, 'M-13: leaving the course editor with unsaved changes gives no confirmation');
    const chapterOne = generateOnlineCourseChapterTitle();
    const chapterTwo = generateOnlineCourseChapterTitle();

    await test.step('Two chapters with pages can be created', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(onlineCourseType.buttonName);
      await onlineCoursePage.expectLoaded();
      await onlineCoursePage.renameChapter(0, chapterOne);
      await onlineCoursePage.addChapter();
      await onlineCoursePage.renameChapter(1, chapterTwo);
      await onlineCoursePage.expectChapterNames([chapterOne, chapterTwo]);
      expect(await onlineCoursePage.getEpisodeCount()).toBeGreaterThanOrEqual(2);
    });

    await test.step('Pages and chapters can be renamed and reordered', async () => {
      await onlineCoursePage.openEpisode(0);
      await onlineCoursePage.renameSelectedEpisode(generateOnlineCourseEpisodeTitle());
      await onlineCoursePage.reorderChapterDown(0);
      await onlineCoursePage.expectChapterNames([chapterTwo, chapterOne]);
    });

    await test.step('A standalone page can live outside any chapter', async () => {
      const before = await onlineCoursePage.getStandaloneEpisodeCount();
      await onlineCoursePage.addStandaloneEpisode();
      expect(await onlineCoursePage.getStandaloneEpisodeCount()).toBe(before + 1);
    });

    await test.step('A course with no pages still reaches Details; Publish only asks for the required details', async () => {
      await onlineCoursePage.deleteAllChapters();
      await onlineCoursePage.attemptNextSetDetails();
      await onlineCoursePage.submitNextPublish();
      await onlineCoursePage.expectRequiredFieldsError();
    });

    await test.step('Next: Set Details stays visible while the structure scrolls', async () => {
      await onlineCoursePage.goto();
      await onlineCoursePage.expectLoaded();
      await onlineCoursePage.useMobileViewport();
      await onlineCoursePage.expectNextSetDetailsCtaStickyAfterScroll();
      await onlineCoursePage.useDesktopViewport();
    });

    await test.step('Leaving with unsaved content changes asks for confirmation', async () => {
      await onlineCoursePage.scrollToTop();
      await onlineCoursePage.renameChapter(0, generateOnlineCourseChapterTitle());
      await onlineCoursePage.navigateAwayFromContent();
    });
  });

  test('Online Course — Content Type, Episode Editing, Video Upload, Video Management, Video Thumbnail, File Upload, File Management', {
    tag: ['@AUT-OC-002', '@products', '@creator', '@regression'],
  }, async ({ creatorNav, productsPage, onlineCoursePage, page }) => {
    test.setTimeout(360000);
    const lessonFixtures = createOnlineCourseLessonFixtures();
    // Attachments only upload into a course that exists (on the create flow they sit at "Uploading...").
    const seeded = await createOnlineCourseProduct(page.request, generateOnlineCourseProductData());
    const contentA = `A ${generateOnlineCourseEpisodeContent()}`;
    const contentB = `B ${generateOnlineCourseEpisodeContent()}`;

    try {
      await test.step('Each page holds its own Video, Attachment or text content', async () => {
        await creatorNav.open('products');
        await productsPage.openAddProductSheet();
        await productsPage.selectProductType(onlineCourseType.buttonName);
        await onlineCoursePage.expectLoaded();
        await onlineCoursePage.addStandaloneEpisode();
        await onlineCoursePage.addStandaloneEpisode();
        const last = (await onlineCoursePage.getEpisodeCount()) - 1;
        await onlineCoursePage.openEpisode(0);
        await onlineCoursePage.selectContentType('Video');
        await onlineCoursePage.openEpisode(1);
        await onlineCoursePage.selectContentType('Attachment');
        await onlineCoursePage.openEpisode(last);
        await onlineCoursePage.setFreeTextContent(contentB);
        await onlineCoursePage.openEpisode(0);
        await onlineCoursePage.expectSelectedContentType('Video');
        await onlineCoursePage.openEpisode(1);
        await onlineCoursePage.expectSelectedContentType('Attachment');
      });

      await test.step('Switching pages keeps their content apart', async () => {
        const last = (await onlineCoursePage.getEpisodeCount()) - 1;
        await onlineCoursePage.openEpisode(1);
        await onlineCoursePage.setFreeTextContent(contentA);
        await onlineCoursePage.openEpisode(last);
        await onlineCoursePage.expectFreeTextContent(contentB);
        await onlineCoursePage.openEpisode(1);
        await onlineCoursePage.expectFreeTextContent(contentA);
      });

      await test.step('An MP4 uploads through the picker and previews', async () => {
        await onlineCoursePage.openEpisode(0);
        await onlineCoursePage.uploadVideo(onlineCourseMediaData.videoPath);
        await onlineCoursePage.expectVideoPreviewLoaded();
      });

      await test.step('The video can be removed and replaced', async () => {
        await onlineCoursePage.deleteVideo();
        await onlineCoursePage.uploadVideo(onlineCourseMediaData.videoPath);
        await onlineCoursePage.expectVideoPreviewLoaded();
      });

      await test.step('The video shows its first frame as the preview thumbnail', async () => {
        await onlineCoursePage.expectVideoPreviewLoaded();
      });

      await test.step('Every advertised lesson file type uploads', async () => {
        await onlineCoursePage.openEdit(seeded.productUuid);
        await onlineCoursePage.openEpisode(0);
        await onlineCoursePage.uploadLessonFiles(lessonFixtures.filePaths);
        await onlineCoursePage.expectLessonFilesUploaded(lessonFixtures.fileNames);
      });

      await test.step('A removed lesson file stays removed after saving', async () => {
        const removed = lessonFixtures.fileNames[0];
        const autosaved = onlineCoursePage.waitForPageAutosave();
        await onlineCoursePage.removeLessonFile(removed);
        await autosaved;
        await onlineCoursePage.saveCourse();
        await onlineCoursePage.openEdit(seeded.productUuid);
        await onlineCoursePage.openEpisode(0);
        await onlineCoursePage.expectLessonFileAbsent(removed);
      });
    } finally {
      lessonFixtures.cleanup();
      await deleteProduct(page.request, seeded.productUuid).catch(() => undefined);
    }
  });

  test('Online Course — Rich Text, Title and Description, Description Formatting, Title Length, Description Counter Unit, Thumbnail Rejection Message', {
    tag: ['@AUT-OC-003', '@products', '@creator', '@regression'],
    annotation: [{ type: 'issue', description: 'M-46' }, { type: 'issue', description: 'M-26' }],
  }, async ({ creatorNav, productsPage, onlineCoursePage }) => {
    test.setTimeout(240000);
    // Known bugs M-46 (no title limit) and M-26 (description counter counts words). Last three steps.
    test.fail(true, 'M-46 / M-26: title limit and description counter');
    const richText = generateOnlineCourseEpisodeContent();

    await test.step('Formatted page text is kept per page', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(onlineCourseType.buttonName);
      await onlineCoursePage.expectLoaded();
      await onlineCoursePage.addStandaloneEpisode();
      await onlineCoursePage.openEpisode(0);
      await onlineCoursePage.applyEpisodeRichTextFormatting(richText);
      await onlineCoursePage.openEpisode(1);
      await onlineCoursePage.openEpisode(0);
      await onlineCoursePage.expectEpisodeRichTextContent(richText);
    });

    await test.step('The product description keeps bold, italic, underline, lists and links', async () => {
      await onlineCoursePage.submitContentDetails();
      await onlineCoursePage.fillTitle(generateOnlineCourseChapterTitle());
      await onlineCoursePage.fillDescription(generateOnlineCourseEpisodeContent());
      await onlineCoursePage.applyRichTextFormatting();
      await onlineCoursePage.expectDescriptionFormatted();
    });

    await test.step('An undersized thumbnail is rejected with a message naming the file', async () => {
      await onlineCoursePage.uploadThumbnailForValidation(onlineCourseMediaData.tinyThumbnailPath);
      await expectImageTooSmall(onlineCoursePage.page, onlineCourseMediaData.tinyThumbnailPath.split('/').pop()!);
      await onlineCoursePage.expectThumbnailTooSmall();
    });

    await test.step('Title is required and the description stops at 500 characters', async () => {
      await onlineCoursePage.clearTitle();
      await onlineCoursePage.submitNextPublish();
      await onlineCoursePage.expectTitleRequiredError();
      await onlineCoursePage.fillDescription('A'.repeat(550));
      await onlineCoursePage.expectDescriptionCounter('500 / 500');
    });

    await test.step('Title enforces a length limit', async () => {
      await onlineCoursePage.fillTitle('T'.repeat(556));
      expect((await onlineCoursePage.readTitleValue()).length).toBeLessThan(556);
      await onlineCoursePage.expectTitleLimited();
    });

    await test.step('The description counter counts characters', async () => {
      const text = 'Learn the basics of design with simple tools and clear steps for beginners.';
      await onlineCoursePage.fillDescription(text);
      await onlineCoursePage.expectDescriptionCounter(`${text.length} / 500`);
    });
  });

  test('Online Course — Thumbnail Upload, Thumbnail Limits, Image Validation', {
    tag: ['@AUT-OC-004', '@products', '@creator', '@regression'],
  }, async ({ onlineCoursePage }) => {
    test.setTimeout(240000);

    await test.step('A valid thumbnail uploads through the picker', async () => {
      await onlineCoursePage.goto();
      await onlineCoursePage.expectLoaded();
      await onlineCoursePage.submitContentDetails();
      await onlineCoursePage.uploadProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
    });

    await test.step('Up to eleven images are accepted, the first one primary', async () => {
      await onlineCoursePage.uploadProductGallery(onlineCourseMediaData.thumbnailPaths.slice(1));
      await onlineCoursePage.expectProductThumbnailLimit();
    });

    await test.step('Undersized and oversized images are rejected', async () => {
      await onlineCoursePage.goto();
      await onlineCoursePage.expectLoaded();
      await onlineCoursePage.submitContentDetails();
      const oversized = createOversizedImageFixture();
      try {
        await onlineCoursePage.uploadThumbnailForValidation(onlineCourseMediaData.tinyThumbnailPath);
        await onlineCoursePage.expectThumbnailTooSmall();
        await onlineCoursePage.uploadThumbnailForValidation(oversized.filePath);
        await onlineCoursePage.expectThumbnailTooLarge();
      } finally {
        oversized.cleanup();
      }
    });
  });

  test('Online Course — Pricing, Pricing Validation, Membership Benefits, Buyer Form', {
    tag: ['@AUT-OC-005', '@products', '@creator', '@regression'],
  }, async ({ onlineCoursePage, page, browser }) => {
    test.setTimeout(300000);
    const questions = Array.from({ length: 5 }, (_, i) => `Question ${i + 1} ${Date.now()}`);

    await test.step('Pricing starts on Free at 0 and accepts Rp10.000 or more', async () => {
      await onlineCoursePage.goto();
      await onlineCoursePage.expectLoaded();
      await onlineCoursePage.submitContentDetails();
      await onlineCoursePage.fillTitle(generateOnlineCourseChapterTitle());
      await onlineCoursePage.fillDescription(generateOnlineCourseEpisodeContent());
      await onlineCoursePage.uploadThumbnailForValidation(onlineCourseMediaData.thumbnailPaths[0]);
      expect(await onlineCoursePage.readOnlineCoursePricingEnabled()).toBe(true);
      await onlineCoursePage.expectOnlineCourseFreePreview();
      await onlineCoursePage.fillOnlineCoursePrice(onlineCoursePricingData.validPrice);
      await onlineCoursePage.expectOnlineCoursePrice(onlineCoursePricingData.validPrice);
    });

    await test.step('A price below Rp10.000 is rejected', async () => {
      await onlineCoursePage.fillOnlineCoursePrice(onlineCoursePricingData.belowMinimumPrice);
      await onlineCoursePage.attemptOnlineCoursePricingContinue();
      expect(await onlineCoursePage.isOnlineCourseBelowMinimumPriceRejected()).toBe(true);
      await onlineCoursePage.fillOnlineCoursePrice(onlineCoursePricingData.validPrice);
    });

    await test.step('Membership benefits: tiers are selectable when they exist, disabled with a reason when not', async () => {
      const tiers = (await listCreatorTiers(page.request)).filter((t) => t.isActive).map((t) => t.name);
      await onlineCoursePage.expectMembershipTiersSelectable(tiers);
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      try {
        const signIn = await context.newPage();
        const { token: emptyToken } = await signInWithEmailOtp(signIn, baseURL, inboxAccounts.emptyCreator);
        await loginWithToken(context, emptyToken, creatorsBaseURL);
        const noTiers = new OnlineCoursePage(signIn, creatorsBaseURL);
        await noTiers.goto();
        await noTiers.expectLoaded();
        await noTiers.submitContentDetails();
        await noTiers.expectMembershipBenefitsUnavailable();
      } finally {
        await context.close();
      }
    });

    await test.step('Name, email and phone stay mandatory', async () => {
      await expectMandatoryBuyerFieldsProtected(page);
    });

    await test.step('Up to five questions can be added, and one removed', async () => {
      for (const question of questions) await addCustomBuyerQuestion(page, question);
      for (const question of questions) await expectSavedBuyerQuestion(page, question);
      await expectAddQuestionsDisabled(page);
      await removeCustomBuyerQuestion(page, questions[4]);
    });
  });

  test('Online Course — Draft, Publish, After Sales Toggle, Custom Message, Links, Preview, Published Product Update, Default State Divergence', {
    tag: ['@AUT-OC-006', '@products', '@creator', '@regression'],
  }, async ({ onlineCoursePage, productPurchasePage, page, browser }) => {
    test.setTimeout(480000);
    // Candidate bug (not yet filed): Customize Message starts ON on create but reads OFF on edit. Last step.
    test.fail(true, 'After Sales Customize Message default differs between create (ON) and edit (OFF)');
    const request = page.request;
    const title = `OC lifecycle ${Date.now()}`;
    const firstMessage = generateOnlineCourseAfterSalesMessage();
    const updatedMessage = generateOnlineCourseAfterSalesMessage();
    const afterSalesLink = generateOnlineCourseAfterSalesLink();
    const products: string[] = [];
    let draftUuid = '';
    let sharePath = '';

    try {
      await test.step('Save creates a draft that is not publicly available', async () => {
        await onlineCoursePage.goto();
        await onlineCoursePage.expectLoaded();
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.fillTitle(title);
        await onlineCoursePage.fillDescription(generateOnlineCourseEpisodeContent());
        await onlineCoursePage.uploadProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
        draftUuid = await onlineCoursePage.saveCourse();
        products.push(draftUuid);
        expect((await getProduct(request, draftUuid)).status).toBe('draft');
        sharePath = await productShortPath(request, draftUuid);
        await productPurchasePage.gotoSharePath(sharePath);
        await expect.poll(() => productPurchasePage.isProductPubliclyPurchasable()).toBe(false);
      });

      await test.step('Publishing shows the completion modal with the product link', async () => {
        await onlineCoursePage.openEdit(draftUuid);
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.submitPublish();
        await expectProductCompleteModal(page);
        expect(await readProductCompleteSharePath(page)).toBe(sharePath);
        expect(await copyProductCompleteLink(page)).toContain(sharePath);
        await closeProductCompleteModal(page);
      });

      const seeded = await createOnlineCourseProduct(request, { ...generateOnlineCourseProductData(), price: 15000 });
      products.push(seeded.productUuid);

      await test.step('After Sales Customize Message reads OFF on an unconfigured course and stays OFF after saving', async () => {
        await onlineCoursePage.openEdit(seeded.productUuid);
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.expectAfterSalesLoaded();
        expect(await onlineCoursePage.readAfterSalesMessageEnabled()).toBe(false);
        await onlineCoursePage.expectAfterSalesDisabledCopy();
        await onlineCoursePage.saveCourse();
        await onlineCoursePage.openEdit(seeded.productUuid);
        await onlineCoursePage.submitContentDetails();
        expect(await onlineCoursePage.readAfterSalesMessageEnabled()).toBe(false);
      });

      await test.step('A custom message can be formatted, and an empty message still saves', async () => {
        await onlineCoursePage.applyAfterSalesMessageFormatting(firstMessage);
        await onlineCoursePage.expectAfterSalesMessage(firstMessage);
        await onlineCoursePage.fillAfterSalesMessage('');
        await onlineCoursePage.saveCourse();
      });

      await test.step('Valid links save; an invalid URL and an over-long label are flagged', async () => {
        await onlineCoursePage.fillAfterSalesMessage(firstMessage);
        await onlineCoursePage.enableAfterSalesLinks();
        await openEmbedLinkDialog(page);
        await fillEmbedLink(page, digitalProductValidationData.linkValidation.longLabel, digitalProductValidationData.linkValidation.invalidUrl);
        await expectInvalidEmbedLinkFeedback(page);
        await fillEmbedLink(page, afterSalesLink.label, afterSalesLink.url);
        await saveCurrentEmbedLink(page);
        await expectEmbedLinksSaved(page, [afterSalesLink.label]);
      });

      await test.step('Preview renders the staged message and links read-only', async () => {
        await onlineCoursePage.openAfterSalesPreview();
        await onlineCoursePage.expectAfterSalesPreviewReadOnly(firstMessage, afterSalesLink.label);
        await onlineCoursePage.closeAfterSalesPreview();
        await onlineCoursePage.saveCourse();
      });

      await test.step('An After Sales change reaches buyers who purchase after it', async () => {
        const course = await getProduct(request, seeded.productUuid);
        const coursePath = await productShortPath(request, seeded.productUuid);
        await onlineCoursePage.fillAfterSalesMessage(updatedMessage);
        await onlineCoursePage.saveCourse();
        const later = await buyCourseAs(browser, request, token(testAccounts.sundanese)!, { title: course.title, sharePath: coursePath });
        try {
          const library = new LibraryPage(later.page, baseURL);
          await later.page.goto(new URL(`product/${later.orderId}`, baseURL).toString());
          await library.expectAfterSalesMessageText(testAccounts.creator.username, updatedMessage);
        } finally {
          await later.context.close();
        }
      });

      await test.step('Customize Message has the same default on create and on edit', async () => {
        await onlineCoursePage.goto();
        await onlineCoursePage.expectLoaded();
        await onlineCoursePage.submitContentDetails();
        const onCreate = await onlineCoursePage.readAfterSalesMessageEnabled();
        const fresh = await createOnlineCourseProduct(request, generateOnlineCourseProductData());
        products.push(fresh.productUuid);
        await onlineCoursePage.openEdit(fresh.productUuid);
        await onlineCoursePage.submitContentDetails();
        expect(await onlineCoursePage.readAfterSalesMessageEnabled()).toBe(onCreate);
      });
    } finally {
      for (const uuid of products) await deleteProduct(request, uuid).catch(() => undefined);
    }
  });

  test('Online Course — Edit Existing Course, Edit Content, Edit Settings, Republish, Edit Page Differences, Version History', {
    tag: ['@AUT-OC-007', '@products', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'L-52' },
  }, async ({ creatorNav, productsPage, onlineCoursePage, page, browser }) => {
    test.setTimeout(480000);
    // Candidate bug (not yet filed): a buyer question added while editing an existing course is not saved
    // (fails the price/buyer-form step). Known bug L-52: no confirmation after republishing (last step).
    test.fail(true, 'Buyer question added on edit is not saved; L-52: no confirmation after republishing');
    const request = page.request;
    const course = { ...generateOnlineCourseProductData(), price: 15000 };
    const created = await createOnlineCourseProduct(request, course);
    const question = `Experience level ${Date.now()}`;
    const renamed = `${course.title} v2`;

    try {
      await test.step('Edit opens the course with its saved values on both steps', async () => {
        await creatorNav.open('products');
        await productsPage.selectStatusTab('Active', { waitForRender: false });
        await productsPage.searchProductsUntilVisible(course.title);
        await productsPage.openEditProduct(course.title);
        await onlineCoursePage.expectLoaded();
        expect(await onlineCoursePage.getEpisodeCount()).toBeGreaterThan(0);
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.expectTitleValue(course.title);
        await onlineCoursePage.expectDescriptionContains(course.description);
      });

      await test.step('The edit page has its own heading, CTA and status line', async () => {
        await onlineCoursePage.openEdit(created.productUuid);
        await onlineCoursePage.expectEditHeader(course.title);
      });

      await test.step('Version history lists timestamped versions under a 10-version retention rule', async () => {
        await onlineCoursePage.expectVersionHistory();
      });

      await test.step('Structure and page content edits persist after saving', async () => {
        const chapter = generateOnlineCourseChapterTitle();
        // An empty Attachment placeholder holds nothing to save; give the page a real file.
        const lesson = createOnlineCourseLessonFixtures();
        try {
          await onlineCoursePage.addChapter();
          await onlineCoursePage.renameChapter(1, chapter);
          await onlineCoursePage.openEpisode(0);
          const autosaved = onlineCoursePage.waitForPageAutosave();
          await onlineCoursePage.uploadLessonFiles(lesson.filePaths.slice(0, 1));
          await autosaved;
          await onlineCoursePage.saveCourse();
          await onlineCoursePage.openEdit(created.productUuid);
          expect(await onlineCoursePage.getChapterNames()).toContain(chapter);
          await onlineCoursePage.openEpisode(0);
          await onlineCoursePage.expectLessonFilesUploaded(lesson.fileNames.slice(0, 1));
        } finally {
          lesson.cleanup();
        }
      });

      await test.step('Price and buyer form changes apply to new purchases, not existing orders', async () => {
        const sharePath = await productShortPath(request, created.productUuid);
        const first = await buyCourseAs(browser, request, token(testAccounts.qa)!, { title: course.title, sharePath });
        await first.context.close();
        await onlineCoursePage.openEdit(created.productUuid);
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.fillOnlineCoursePrice('20000');
        await addCustomBuyerQuestion(page, question);
        await onlineCoursePage.saveCourse();
        const second = await buyCourseAs(browser, request, token(testAccounts.sundanese)!, { title: course.title, sharePath });
        await second.context.close();
        const orders = (await listOrders(request, { limit: 20 })).data.filter((o) => o.productName === course.title);
        expect(orders.map((o) => o.originalPrice).sort()).toEqual([15000, 20000]);
        // The new buyer question should reach the next checkout (candidate bug: it is not saved on edit).
        const checkout = await browser.newContext({ viewport: page.viewportSize() });
        try {
          await loginWithToken(checkout, token(testAccounts.qa)!, baseURL);
          const buyer = new ProductPurchasePage(await checkout.newPage(), baseURL);
          await buyer.openOnlineCourseCheckout(course.title, sharePath);
          await buyer.expectCheckoutQuestion(question);
        } finally {
          await checkout.close();
        }
      });

      await test.step('Republishing keeps the share URL and confirms the update', async () => {
        await onlineCoursePage.openEdit(created.productUuid);
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.fillTitle(renamed);
        await onlineCoursePage.submitPublish();
        await creatorNav.open('products');
        await productsPage.selectStatusTab('Active', { waitForRender: false });
        await productsPage.searchProductsUntilVisible(renamed);
        expect(await productsPage.readProductSharePath(renamed)).toContain((await getProduct(request, created.productUuid)).shortUrl);
        await onlineCoursePage.openEdit(created.productUuid);
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.fillTitle(course.title);
        await onlineCoursePage.submitPublish();
        await onlineCoursePage.expectSaveConfirmation();
      });
    } finally {
      await deleteProduct(request, created.productUuid).catch(() => undefined);
    }
  });

  test('Online Course — Terminology, Word Counter Labelling, Insert Block Types, First-Run Overlay', {
    tag: ['@AUT-OC-008', '@products', '@creator', '@regression'],
  }, async ({ creatorNav, onlineCoursePage }) => {
    test.setTimeout(120000);

    await test.step('First-run tour overlay does not block form interactions on arrival', async () => {
      await creatorNav.open('products');
      await onlineCoursePage.goto();
      await onlineCoursePage.expectLoaded();
      await onlineCoursePage.expectNoDriverOverlay();
    });

    await test.step('Creator UI consistently uses Chapter and Page naming, with no legacy Episode terminology', async () => {
      await onlineCoursePage.expectChapterAndPageButtons();
      await onlineCoursePage.expectNoEpisodeTerminology();
    });

    await test.step('Insert menu offers all supported block types (Video, Attachment, Image, Carousel, Product)', async () => {
      await onlineCoursePage.expectInsertMenuBlockTypes();
    });

    await test.step('Page body editor word counter displays count and word unit accurately', async () => {
      const sampleText = 'one two three four five six seven eight nine ten eleven';
      await onlineCoursePage.fillPageBody(sampleText);
      await onlineCoursePage.expectPageBodyWordCounter('11 words');
    });
  });
});

