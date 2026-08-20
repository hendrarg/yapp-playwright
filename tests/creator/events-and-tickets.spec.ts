import { creatorAuthTest as test } from '../test-base';
import { addCustomBuyerQuestion, cancelEditBuyerQuestion, chooseHeroFile, completeOpenBuyerQuestion, expectAddQuestionDialog, expectAddQuestionsDisabled, expectAdditionalQuestionsHeading, expectEditQuestionDialog, expectHeroNotUploaded, expectImageTooSmall, expectQuestionInputTypes, expectSavedBuyerQuestion, openAddQuestionDialog, openEditBuyerQuestion, submitEmptyQuestionLabel, uploadGallery, uploadHero } from '@helpers/creator/product-editor';
import { eventsBuyerFormData, generateEventsBuyerQuestionLabels, generateEventsBuyerQuestionOptions } from '@test-data/creator/events.buyer-form.data';
import { eventsMediaData, generateEventsDescription, generateEventsTitle } from '@test-data/creator/events.media.data';
import { productsCreationData } from '@test-data/creator/products.creation.data';

test.describe('Creator Events and Tickets', () => {
  test('Validate Event Thumbnail and Additional Image Upload', {
    tag: ['@AUT-FV-312', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-EVT-C-011, TC-EVT-C-012, TC-EVT-C-013, TC-EVT-C-047, TC-EVT-C-048',
    }],
  }, async ({
    eventsPage, creatorNav, productsPage, page }) => {
    test.setTimeout(180000);

    const eventsType = productsCreationData.productTypes.find(
      (type) => type.label === 'Events and Tickets',
    )!;

    await test.step('Open Events and Tickets create flow', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(eventsType.buttonName);
      await eventsPage.expectEventsCreateFlow();
    });

    await test.step('Fill All Day online details and continue to thumbnails', async () => {
      await eventsPage.fillMinimalEventsStep1({
        title: generateEventsTitle(),
        description: generateEventsDescription(),
      });
      await eventsPage.continueToEventsDetails();
    });

    await test.step('Verify hero and gallery file input accept lists', async () => {
      await eventsPage.expectHeroAndGalleryFileInputRules();
    });

    await test.step('Require a thumbnail before publish', async () => {
      await eventsPage.submitEventsPublishDetails();
      await eventsPage.expectThumbnailRequired();
    });

    await test.step('Reject undersized hero images on both axes', async () => {
      await chooseHeroFile(page, eventsMediaData.tinyImagePath);
      await expectImageTooSmall(page, eventsMediaData.tinyFileName);
      await expectHeroNotUploaded(page);

      await chooseHeroFile(page, eventsMediaData.oneAxisUndersizedPath);
      await expectImageTooSmall(page, eventsMediaData.oneAxisUndersizedFileName);
      await expectHeroNotUploaded(page);
    });

    await test.step('Upload a valid hero thumbnail', async () => {
      await uploadHero(page, eventsMediaData.heroImagePath);
    });

    await test.step('Count ten additional-image gallery slots', async () => {
      await eventsPage.expectEmptyAdditionalImageGallery();
    });

    await test.step('Upload one gallery image without changing the thumbnail', async () => {
      await uploadGallery(page, [eventsMediaData.galleryImagePath]);
      await eventsPage.expectGalleryAfterOneUpload();
    });
  });

  test('Validate Event Buyer Form Custom Questions Configuration', {
    tag: ['@AUT-FV-313', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-EVT-C-014, TC-EVT-C-015, TC-EVT-C-049',
    }],
  }, async ({
    eventsPage, creatorNav, productsPage, page }) => {
    test.setTimeout(180000);

    const eventsType = productsCreationData.productTypes.find(
      (type) => type.label === 'Events and Tickets',
    )!;
    const [textLabel, selectLabel, multiLabel, extraLabelOne, extraLabelTwo] =
      generateEventsBuyerQuestionLabels(5);
    const selectChoices = generateEventsBuyerQuestionOptions(2);
    const multiChoices = generateEventsBuyerQuestionOptions(2);

    await test.step('Open Events and Tickets create flow', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(eventsType.buttonName);
      await eventsPage.expectEventsCreateFlow();
    });

    await test.step('Fill All Day online details and continue to buyer form', async () => {
      await eventsPage.fillMinimalEventsStep1({
        title: generateEventsTitle(),
        description: generateEventsDescription(),
      });
      await eventsPage.continueToEventsDetails();
      await expectAdditionalQuestionsHeading(page);
    });

    await test.step('Open Add New Question dialog', async () => {
      await openAddQuestionDialog(page);
      await expectAddQuestionDialog(page);
    });

    await test.step('Enumerate Input Type options', async () => {
      await expectQuestionInputTypes(page, eventsBuyerFormData.inputTypes);
    });

    await test.step('Reject an empty question label', async () => {
      await submitEmptyQuestionLabel(page);
    });

    await test.step('Create Text, Select, and Multi Select questions', async () => {
      await completeOpenBuyerQuestion(page, textLabel);
      await expectSavedBuyerQuestion(page, textLabel);

      await addCustomBuyerQuestion(page, selectLabel, {
        type: 'Select',
        choices: selectChoices,
        required: true,
      });
      await expectSavedBuyerQuestion(page, selectLabel, { required: true });

      await addCustomBuyerQuestion(page, multiLabel, {
        type: 'Multi Select',
        choices: multiChoices,
      });
      await expectSavedBuyerQuestion(page, multiLabel);
    });

    await test.step('Edit a saved question', async () => {
      await openEditBuyerQuestion(page, textLabel);
      await expectEditQuestionDialog(page);
      await cancelEditBuyerQuestion(page);
    });

    await test.step('Disable Add Questions at the five-question maximum', async () => {
      await addCustomBuyerQuestion(page, extraLabelOne);
      await addCustomBuyerQuestion(page, extraLabelTwo);
      await expectAdditionalQuestionsHeading(page);
      await expectAddQuestionsDisabled(page);
    });
  });
});
