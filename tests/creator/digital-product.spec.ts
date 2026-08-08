import { creatorAuthTest as test, expect } from '../test-base';
import { digitalProductPricingData, digitalProductValidationData, generateDigitalProductBuyerOnlyDescription, generateDigitalProductDescription, generateDigitalProductTitle, onlineCourseMediaData, productsCreationData } from '@test-data/creator/products.creation.data';
import { closeProductCompleteModal, enableAfterSalesLinks, expectEmbedLinksSaved, expectInvalidEmbedLinkFeedback, expectProductCompleteModal, fillEmbedLink, openEmbedLinkDialog, readProductCompleteSharePath, saveCurrentEmbedLink } from '@helpers/creator/product-editor';
import { titleInput } from '@pages/shared/locators';

test.describe('Creator Digital Product', () => {
  test('Validate Digital Products Inputs and Boundary Conditions', {
    tag: ['@AUT-FV-188', '@products', '@creator', '@regression'],
  }, async ({
    digitalProductPage, creatorNav, productsPage, page }) => {
    await test.step('Open Digital Product creation flow', async () => {
      const digitalProductType = productsCreationData.productTypes.find(
        (type) => type.label === 'Digital Product',
      )!;

      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(digitalProductType.buttonName);
      await digitalProductPage.expectDigitalProductCreateFlow();
    });

    await test.step('Validate title and required Add Content fields cannot be empty', async () => {
      await digitalProductPage.submitEmptyDigitalProductAddContent();
      await digitalProductPage.expectDigitalProductRequiredFeedback();
    });

    await test.step('Validate link label boundary and invalid URL are blocked', async () => {
      await digitalProductPage.enableLinksContentType();
      await openEmbedLinkDialog(page);
      await fillEmbedLink(page,
        digitalProductValidationData.linkValidation.longLabel,
        digitalProductValidationData.linkValidation.invalidUrl,
      );
      await expectInvalidEmbedLinkFeedback(page);
    });

    await test.step('Correct link data and save multiple valid embedded links', async () => {
      const [firstLink, secondLink] = digitalProductValidationData.linkValidation.validLinks;

      await fillEmbedLink(page, firstLink.label, firstLink.url);
      await saveCurrentEmbedLink(page);
      await openEmbedLinkDialog(page);
      await fillEmbedLink(page, secondLink.label, secondLink.url);
      await saveCurrentEmbedLink(page);
      await expectEmbedLinksSaved(page, [firstLink.label, secondLink.label]);
    });
  });
  test('Validate Digital Product Navigation and Unsaved Changes', {
    tag: ['@AUT-FV-190', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-PD-C-003',
    }],
  }, async ({
    digitalProductPage, creatorNav, productsPage, page }) => {

    const digitalProductType = productsCreationData.productTypes.find(
      (type) => type.label === 'Digital Product',
    )!;

    await test.step('Open Digital Product creation flow and make an unsaved change', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(digitalProductType.buttonName);
      await digitalProductPage.expectDigitalProductCreateFlow();
      await titleInput(page).fill(generateDigitalProductTitle());
    });

    await test.step('Attempt to continue with incomplete content and remain on the form', async () => {
      await digitalProductPage.submitEmptyDigitalProductAddContent();
      await digitalProductPage.expectDigitalProductCreateFlow();
    });

    await test.step('Protect the unsaved Digital Product changes when leaving', async () => {
      await digitalProductPage.navigateAwayFromDigitalProductViaBack();
      await digitalProductPage.expectDigitalProductUnsavedChangesDialog();
      await page.keyboard.press('Escape');
    });
  });
  test('Validate Digital Product After Sales Link Validation', {
    tag: ['@AUT-FV-191', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-PD-C-027',
    }],
  }, async ({
    digitalProductPage, creatorNav, productsPage, onlineCoursePage, page }) => {
    const digitalProductType = productsCreationData.productTypes.find(
      (type) => type.label === 'Digital Product',
    )!;
    const { linkValidation } = digitalProductValidationData;

    await test.step('Open Digital Product and enable After Sales Links', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(digitalProductType.buttonName);
      await digitalProductPage.expectDigitalProductCreateFlow();
      await titleInput(page).fill(generateDigitalProductTitle());
      await onlineCoursePage.fillDescription(generateDigitalProductDescription());
      await digitalProductPage.uploadDigitalProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
      await digitalProductPage.enableLinksContentType();
      const [contentLink] = linkValidation.validLinks;
      await openEmbedLinkDialog(page);
      await fillEmbedLink(page, contentLink.label, contentLink.url);
      await saveCurrentEmbedLink(page);
      await onlineCoursePage.submitContentDetails();
      await enableAfterSalesLinks(page);
    });

    await test.step('Block invalid After Sales URL and over-limit label', async () => {
      await openEmbedLinkDialog(page);
      await fillEmbedLink(page, linkValidation.longLabel, linkValidation.invalidUrl);
      await expectInvalidEmbedLinkFeedback(page);
    });

    await test.step('Save multiple valid After Sales links', async () => {
      const [firstLink, secondLink] = linkValidation.validLinks;
      await fillEmbedLink(page, firstLink.label, firstLink.url);
      await saveCurrentEmbedLink(page);
      await openEmbedLinkDialog(page);
      await fillEmbedLink(page, secondLink.label, secondLink.url);
      await saveCurrentEmbedLink(page);
      await expectEmbedLinksSaved(page, [firstLink.label, secondLink.label]);
    });
  });
  test('Validate Digital Product Buyer-Only Description', {
    tag: ['@AUT-FV-192', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-PD-C-013',
    }],
  }, async ({
    digitalProductPage, creatorNav, productsPage, onlineCoursePage, page }) => {
    test.setTimeout(180000);

    const digitalProductType = productsCreationData.productTypes.find(
      (type) => type.label === 'Digital Product',
    )!;
    const [contentLink] = digitalProductValidationData.linkValidation.validLinks;

    await test.step('Open Digital Product creation flow', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(digitalProductType.buttonName);
      await digitalProductPage.expectDigitalProductCreateFlow();
    });

    await test.step('Fill required Add Content fields', async () => {
      await titleInput(page).fill(generateDigitalProductTitle());
      await onlineCoursePage.fillDescription(generateDigitalProductDescription());
      await digitalProductPage.enableLinksContentType();
      await openEmbedLinkDialog(page);
      await fillEmbedLink(page, contentLink.label, contentLink.url);
      await saveCurrentEmbedLink(page);
      await digitalProductPage.uploadDigitalProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
    });

    await test.step('Fill buyer-only description to the 500-word limit and verify counter', async () => {
      const buyerOnly = generateDigitalProductBuyerOnlyDescription(500);
      expect(buyerOnly.split(' ').length).toBe(500);
      await digitalProductPage.fillDigitalProductContentDescription(buyerOnly);
      await digitalProductPage.expectDigitalProductContentDescriptionCounter('500 / 500');
    });

    await test.step('Apply rich text formatting to buyer-only description', async () => {
      await digitalProductPage.applyDigitalProductContentDescriptionFormatting();
      await digitalProductPage.expectDigitalProductContentDescriptionFormatted();
    });

    await test.step('Clear buyer-only description and verify it remains optional', async () => {
      await digitalProductPage.fillDigitalProductContentDescription('');
      await digitalProductPage.expectDigitalProductContentDescriptionCounter('0 / 500');
      await onlineCoursePage.submitContentDetails();
      await digitalProductPage.expectDigitalProductSetDetailsLoaded();
    });
  });
  test('Validate Digital Product Pricing Rules', {
    tag: ['@AUT-FV-193', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-PD-C-018, TC-PD-C-019',
    }],
  }, async ({
    digitalProductPage, creatorNav, productsPage, onlineCoursePage, buyerNav, productPurchasePage, page }) => {
    test.setTimeout(240000);

    const digitalProductType = productsCreationData.productTypes.find(
      (type) => type.label === 'Digital Product',
    )!;
    const [contentLink] = digitalProductValidationData.linkValidation.validLinks;
    const freeTitle = generateDigitalProductTitle();
    let freeUuid = '';
    let freeSharePath = '';

    await test.step('Open Digital Product creation flow with pricing off by default', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(digitalProductType.buttonName);
      await digitalProductPage.expectDigitalProductCreateFlow();
    });

    await test.step('Fill Add Content and reach Set Details with pricing default', async () => {
      await titleInput(page).fill(freeTitle);
      await onlineCoursePage.fillDescription(generateDigitalProductDescription());
      await digitalProductPage.enableLinksContentType();
      await openEmbedLinkDialog(page);
      await fillEmbedLink(page, contentLink.label, contentLink.url);
      await saveCurrentEmbedLink(page);
      await digitalProductPage.uploadDigitalProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
      await onlineCoursePage.submitContentDetails();
      await digitalProductPage.expectDigitalProductSetDetailsLoaded();
    });

    await test.step('Verify free default pricing (preview shows IDR 0)', async () => {
      await digitalProductPage.expectDigitalProductPricingFreeDefault();
    });

    await test.step('Publish the free product and verify IDR 0 on the buyer page', async () => {
      await onlineCoursePage.submitPublish();
      await expectProductCompleteModal(page);
      freeSharePath = await readProductCompleteSharePath(page);
      expect(freeSharePath).toMatch(/\/s\//);
      await closeProductCompleteModal(page);

      await productPurchasePage.gotoSharePath(freeSharePath);
      await productPurchasePage.expectOnlineCourseFreeBuyerView(freeTitle, freeSharePath);
    });

    await test.step('Open paid pricing and reject below-minimum nominal values', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(digitalProductType.buttonName);
      await digitalProductPage.expectDigitalProductCreateFlow();
      await titleInput(page).fill(generateDigitalProductTitle());
      await onlineCoursePage.fillDescription(generateDigitalProductDescription());
      await digitalProductPage.enableLinksContentType();
      await openEmbedLinkDialog(page);
      await fillEmbedLink(page, contentLink.label, contentLink.url);
      await saveCurrentEmbedLink(page);
      await digitalProductPage.uploadDigitalProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
      await onlineCoursePage.submitContentDetails();
      await digitalProductPage.expectDigitalProductSetDetailsLoaded();

      await digitalProductPage.enableDigitalProductPricing();
      await digitalProductPage.fillDigitalProductPrice(digitalProductPricingData.belowMinimumPrice);
      await digitalProductPage.expectDigitalProductInvalidPriceFeedback();
      await digitalProductPage.fillDigitalProductPrice(digitalProductPricingData.zeroPrice);
      await digitalProductPage.expectDigitalProductPricingFreeDefault();
      await digitalProductPage.fillDigitalProductPrice(digitalProductPricingData.validPrice);
      await digitalProductPage.expectDigitalProductValidPrice();
    });

    await test.step('Enter a valid positive price and verify it persists', async () => {
      await digitalProductPage.fillDigitalProductPrice(digitalProductPricingData.validPrice);
      await digitalProductPage.expectDigitalProductValidPrice();
    });
  });
});
