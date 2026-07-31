import { creatorAuthTest as test, expect } from '../test-base';
import { deleteProduct } from '@helpers/api/product';
import { createOversizedImageFixture } from '@helpers/creator/oversized-image';
import {
  consultationMediaData,
  generateConsultationTitle,
} from '@test-data/creator/consultation.media.data';
import { consultationNavigationData } from '@test-data/creator/consultation.navigation.data';
import { consultationValidationData } from '@test-data/creator/consultation.validation.data';
import {
  digitalProductValidationData,
  productsCreationData,
} from '@test-data/creator/products.creation.data';
import { faker } from '@faker-js/faker';

test.describe('Creator Sessions', () => {
  test('Validate Consultation Inputs and Boundary Conditions', {
    tag: ['@AUT-FV-017', '@sessions', '@creator', '@regression'],
    annotation: [
      { type: 'covers', description: 'TC-CON-C-001' },
      { type: 'covers', description: 'TC-CON-C-009' },
      { type: 'covers', description: 'TC-CON-C-025' },
    ],
  }, async ({ creatorNav, productsPage }) => {
    test.setTimeout(120000);

    const consultationType = productsCreationData.productTypes.find(
      (type) => type.label === 'Consultation',
    )!;
    const { linkValidation } = digitalProductValidationData;
    const [validLink] = linkValidation.validLinks;

    await test.step('Open Consultation create flow', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(consultationType.buttonName);
      await productsPage.expectConsultationCreateFlow();
    });

    await test.step('Require title and enforce description counter limit', async () => {
      await productsPage.fillConsultationDescription(
        consultationValidationData.descriptionWordsAtLimit,
      );
      await productsPage.expectConsultationDescriptionCounter(
        consultationValidationData.descriptionCounterMax,
      );
      await productsPage.appendConsultationDescription(
        consultationValidationData.descriptionOverflowWord,
      );
      await productsPage.expectConsultationDescriptionCounter(
        consultationValidationData.descriptionCounterMax,
      );
      await productsPage.submitConsultationDetails();
      await productsPage.expectConsultationTitleRequired();
    });

    await test.step('Protect mandatory buyer fields and enforce five custom questions', async () => {
      await productsPage.expectMandatoryBuyerFieldsProtected();

      for (const question of consultationValidationData.customQuestions) {
        await productsPage.addCustomBuyerQuestion(question);
      }
      await productsPage.expectAddQuestionsDisabled();

      await productsPage.removeCustomBuyerQuestion(
        consultationValidationData.customQuestions[0],
      );
      await productsPage.expectAddQuestionsEnabled();
    });

    await test.step('Validate after-sales link buttons', async () => {
      await productsPage.enableAfterSalesLinks();
      await productsPage.openEmbedLinkDialog();
      await productsPage.fillEmbedLink(linkValidation.longLabel, linkValidation.invalidUrl);
      await productsPage.expectInvalidEmbedLinkFeedback();

      await productsPage.fillEmbedLink(validLink.label, validLink.url);
      await productsPage.saveCurrentEmbedLink();
      await productsPage.expectEmbedLinksSaved([validLink.label]);
    });
  });

  test('Upload and Manage Consultation Media and Content', {
    tag: ['@AUT-FV-018', '@sessions', '@creator', '@regression'],
  }, async ({ creatorNav, productsPage, page }) => {
    test.setTimeout(180000);

    const consultationType = productsCreationData.productTypes.find(
      (type) => type.label === 'Consultation',
    )!;
    const title = generateConsultationTitle();
    const editedTitle = `${title} edited`;
    const accessToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    let productUuid = '';
    let sharePath = '';

    try {
      await test.step('Open Consultation create flow', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.openAddProductSheet();
        await productsPage.selectProductType(consultationType.buttonName);
        await productsPage.expectConsultationCreateFlow();
      });

      await test.step('Apply rich text formatting in description', async () => {
        await productsPage.fillConsultationTitle(title);
        await productsPage.applyConsultationRichTextFormatting(consultationMediaData.description);
      });

      await test.step('Reject missing hero, undersized, and oversized images', async () => {
        await productsPage.submitConsultationDetails();
        await productsPage.expectConsultationHeroRequired();

        const oversized = createOversizedImageFixture();
        try {
          await productsPage.chooseConsultationHeroFile(oversized.filePath);
          await productsPage.expectConsultationImageTooLarge();
          await productsPage.expectConsultationHeroNotUploaded();
        } finally {
          oversized.cleanup();
        }

        await productsPage.chooseConsultationHeroFile(consultationMediaData.tinyImagePath);
        await productsPage.expectConsultationImageTooSmall('tiny-1x1.png');
        await productsPage.expectConsultationHeroNotUploaded();
      });

      await test.step('Upload hero and ten additional images', async () => {
        await productsPage.uploadConsultationHero(consultationMediaData.heroImagePath);

        await productsPage.chooseConsultationGalleryFiles([
          consultationMediaData.undersizedImagePath,
        ]);
        await productsPage.expectConsultationImageTooSmall('hermes.jpg');

        await productsPage.uploadConsultationGallery(consultationMediaData.additionalImagePaths);
        await productsPage.expectConsultationGalleryCount(
          consultationMediaData.maxAdditionalImages,
        );
        await productsPage.expectConsultationGalleryInputUnavailable();
      });

      await test.step('Publish consultation and review Product Complete modal', async () => {
        await productsPage.submitConsultationDetails();
        await productsPage.expectConsultationAvailabilityStep();
        await productsPage.addConsultationWeekdayTimeSlot('Mon');
        await productsPage.createConsultation();
        await productsPage.expectProductCompleteModal();
        sharePath = await productsPage.readProductCompleteSharePath();
        const copied = await productsPage.copyProductCompleteLink();
        expect(copied).toContain(sharePath);
        await productsPage.closeProductCompleteModal();
      });

      await test.step('Republish edits with unchanged share URL', async () => {
        await productsPage.expectLoaded();
        await productsPage.searchProducts(title);
        await productsPage.expectProductVisible(title);
        await productsPage.openEditProduct(title);
        productUuid = await productsPage.readAppointmentProductUuidFromUrl();

        await productsPage.fillConsultationTitle(editedTitle);
        await productsPage.fillConsultationDescription(consultationMediaData.updatedDescription);
        await productsPage.saveAndPublishConsultation();
        await productsPage.expectConsultationLiveModalWithSharePath(sharePath);
      });
    } finally {
      if (productUuid && accessToken) {
        await deleteProduct(page.request, productUuid, accessToken).catch(() => undefined);
      }
    }
  });

  test('Validate Consultation Navigation and Unsaved Warning', {
    tag: ['@AUT-FV-019', '@sessions', '@creator', '@smoke', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-CON-C-003' }],
  }, async ({ creatorNav, productsPage }) => {
    const consultationType = productsCreationData.productTypes.find(
      (type) => type.label === 'Consultation',
    )!;
    const title = `${consultationNavigationData.unsavedTitlePrefix} ${faker.string.alphanumeric(8)}`;

    await test.step('Open Consultation create with unsaved changes', async () => {
      // Establish history so Back returns to Products instead of about:blank.
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.useConsultationMobileViewport();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(consultationType.buttonName);
      await productsPage.expectConsultationCreateFlow();
      await productsPage.makeConsultationUnsavedChanges(
        title,
        consultationNavigationData.unsavedDescription,
      );
    });

    await test.step('Scroll and verify Next: Set Availability stays sticky', async () => {
      await productsPage.expectConsultationNextCtaStickyAfterScroll();
    });

    await test.step('Navigate away and review unsaved confirmation dialog', async () => {
      await productsPage.navigateAwayFromConsultationViaBack();
      await productsPage.expectConsultationUnsavedChangesDialog();
    });
  });
});
