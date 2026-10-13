import { creatorAuthTest as test, expect } from '../test-base';
import { createDiscordMembershipProduct, deleteProduct, getProduct, productSharePath, waitForProductByTitle } from '@helpers/api/product';
import { createOversizedImageFixture } from '@helpers/creator/oversized-image';
import { addCustomBuyerQuestion, chooseGalleryFiles, chooseHeroFile, closeProductCompleteModal, enableAfterSalesLinks, expectAddQuestionsDisabled, expectEmbedLinkLabelCapped, expectEmbedLinksSaved, expectGalleryCount, expectGalleryInputUnavailable, expectHeroNotUploaded, expectImageTooLarge, expectImageTooSmall, expectInvalidEmbedLinkFeedback, expectMandatoryBuyerFieldsProtected, expectPreviewPaidPrice, expectPriceValue, expectSavedBuyerQuestion, fillEmbedLink, fillPrice, openEmbedLinkDialog, readPricingEnabled, readProductCompleteSharePath, saveCurrentEmbedLink, setPricingEnabled, uploadHero } from '@helpers/creator/product-editor';
import type { DiscordMembershipPage } from '@pages/creator/DiscordMembershipPage';
import type { ProductsPage } from '@pages/creator/ProductsPage';
import { consultationMediaData } from '@test-data/creator/consultation.media.data';
import { consultationAfterSalesData } from '@test-data/creator/consultation.config.data';
import { discordMembershipPricingData, discordMembershipSettingsData, discordMembershipValidationData, generateDiscordMembershipBuyerQuestion, generateDiscordMembershipDescription, generateDiscordMembershipSettingsNote, generateDiscordMembershipTitle } from '@test-data/creator/membership.data';
import { digitalProductPricingData, digitalProductValidationData, productTypeSheet } from '@test-data/creator/products.creation.data';
import { testImages } from '@test-data/creator/post.data';

const creatorToken = () => process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
const discordType = productTypeSheet.find((type) => type.label === 'Discord Membership')!;
const { serverName, roleName, durationUnits } = discordMembershipValidationData;
const countedDescription = 'Membership access lasts for the full term after a buyer joins this server.';

async function openDiscordCreate(
  creatorNav: { open(route: 'products'): Promise<unknown> },
  productsPage: ProductsPage,
  discordMembershipPage: DiscordMembershipPage,
) {
  await creatorNav.open('products');
  await productsPage.expectLoaded();
  await productsPage.openAddProductSheet();
  await productsPage.selectProductType(discordType.buttonName);
  await discordMembershipPage.expectDiscordMembershipCreateFlow();
}

test.describe('Creator Discord Membership', () => {
  test('Discord Membership — Membership Information, Description, Duration, Navigation, Duration Unit Labels, Description Counter Unit', {
    tag: ['@AUT-DM-001', '@membership', '@creator', '@smoke'],
    annotation: [
      { type: 'issue', description: 'M-46' },
      { type: 'issue', description: 'M-13' },
      { type: 'issue', description: 'M-26' },
    ],
  }, async ({ discordMembershipPage, creatorNav, productsPage, digitalProductPage }) => {
    test.setTimeout(240000);
    // Known bugs M-46 (description limit), M-26 (counter counts words), M-13 (no unsaved guard). Last three steps.
    test.fail(true, 'M-46 / M-26 / M-13: description limit, description counter, unsaved changes');
    const title = generateDiscordMembershipTitle();
    const description = generateDiscordMembershipDescription();

    await test.step('Each membership field is required on its own', async () => {
      await openDiscordCreate(creatorNav, productsPage, discordMembershipPage);
      await discordMembershipPage.submitDiscordMembershipDetails();
      await discordMembershipPage.expectDiscordMembershipRequiredFeedback();

      await discordMembershipPage.fillDiscordMembershipDescription(description);
      await discordMembershipPage.selectDiscordMembershipDuration('1', 'Month', 'Month');
      await discordMembershipPage.submitDiscordMembershipDetails();
      await discordMembershipPage.expectDiscordFeedback('Title is required');

      await discordMembershipPage.fillDiscordMembershipTitle(title);
      await discordMembershipPage.fillDiscordMembershipDescription('');
      await discordMembershipPage.submitDiscordMembershipDetails();
      await discordMembershipPage.expectDiscordFeedback('Description is required');

      await discordMembershipPage.fillDiscordMembershipDescription(description);
      await discordMembershipPage.selectDiscordMembershipDuration('', 'Month', 'Month');
      await discordMembershipPage.submitDiscordMembershipDetails();
      await discordMembershipPage.expectDiscordFeedback('Duration is required');
      await discordMembershipPage.selectDiscordMembershipDuration('1', 'Month', 'Month');
    });

    await test.step('Duration units are labelled Days, Month, and Years', async () => {
      await discordMembershipPage.expectDiscordDurationUnitLabels();
    });

    await test.step('A duration in days, months, or years stays selected', async () => {
      let current: string = 'Month';
      for (const unit of durationUnits) {
        await discordMembershipPage.selectDiscordMembershipDuration('1', current, unit);
        current = unit;
      }
      expect(await discordMembershipPage.readDiscordMembershipDurationValue()).toBe('1');
    });

    await test.step('Description formatting works and the text stops at 500 characters', async () => {
      await discordMembershipPage.fillDiscordMembershipDescription(description);
      await discordMembershipPage.applyDiscordMembershipDescriptionFormatting();
      await discordMembershipPage.fillDiscordMembershipDescription('A'.repeat(550));
      await discordMembershipPage.expectDiscordDescriptionCounter('500 / 500');
    });

    await test.step('The description counter counts characters', async () => {
      await discordMembershipPage.fillDiscordMembershipDescription(countedDescription);
      await discordMembershipPage.expectDiscordDescriptionCounter(`${countedDescription.length} / 500`);
    });

    await test.step('Next stays on screen and leaving asks before discarding edits', async () => {
      await digitalProductPage.expectNextStaysVisibleAfterScroll();
      await discordMembershipPage.navigateAwayFromDiscordMembershipViaBack();
      await discordMembershipPage.expectDiscordMembershipUnsavedChangesDialog();
    });
  });

  test('Discord Membership — Server Selection, Server and Role, Role Validation, Connect New Server', {
    tag: ['@AUT-DM-002', '@membership', '@creator', '@regression'],
  }, async ({ discordMembershipPage, creatorNav, productsPage, page }) => {
    test.setTimeout(300000);
    const accessToken = creatorToken();
    test.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN is required to clean up the Discord membership');
    if (!accessToken) return;

    const title = `${generateDiscordMembershipTitle()} ${Date.now().toString().slice(-6)}`;
    const description = generateDiscordMembershipDescription();
    let productUuid = '';

    try {
      await test.step('Publishing is blocked until a server is selected', async () => {
        await openDiscordCreate(creatorNav, productsPage, discordMembershipPage);
        await discordMembershipPage.fillDiscordMembershipTitle(title);
        await discordMembershipPage.fillDiscordMembershipDescription(description);
        await discordMembershipPage.selectDiscordMembershipDuration('1', 'Month', 'Month');
        await discordMembershipPage.submitDiscordMembershipDetails();
        await discordMembershipPage.expectDiscordOnFirstStep();
        await discordMembershipPage.expectDiscordMembershipServerRequirement();
      });

      await test.step('The server list includes the linked server and Connect new server', async () => {
        await discordMembershipPage.expectDiscordServerMenu(serverName);
      });

      await test.step('A selected server requires a role from that server', async () => {
        await discordMembershipPage.selectDiscordMembershipServer(serverName);
        await discordMembershipPage.expectDiscordRoleRequired();
        await discordMembershipPage.expectDiscordRoleOption(roleName);
      });

      await test.step('The chosen server and role are still there after saving', async () => {
        await discordMembershipPage.selectDiscordMembershipRole(roleName);
        await discordMembershipPage.continueToDiscordMembershipDetails();
        await uploadHero(page, consultationMediaData.heroImagePath);
        await setPricingEnabled(page, true);
        await fillPrice(page, discordMembershipPricingData.validPrice);
        await discordMembershipPage.fillDiscordMembershipAfterSalesMessage(description);
        await discordMembershipPage.publishDiscordMembershipAndReadSharePath();
        await closeProductCompleteModal(page);
        productUuid = (await waitForProductByTitle(page.request, title, accessToken)).uuid;
        await creatorNav.open('products');
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProductsUntilVisible(title);
        await productsPage.openEditProduct(title);
        expect(await discordMembershipPage.readDiscordMembershipProductUuidFromUrl()).toBe(productUuid);
        await discordMembershipPage.expectDiscordMembershipServerAndRole(serverName, roleName);
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid, accessToken).catch(() => undefined);
    }
  });

  test('Discord Membership — Thumbnail, Thumbnail Validation, Pricing, Pricing Validation, Buyer Form', {
    tag: ['@AUT-DM-003', '@membership', '@creator', '@regression'],
  }, async ({ discordMembershipPage, creatorNav, productsPage, digitalProductPage, page }) => {
    test.setTimeout(360000);

    const reachDetails = async () => {
      await openDiscordCreate(creatorNav, productsPage, discordMembershipPage);
      await discordMembershipPage.prepareDiscordMembershipDetails({
        title: generateDiscordMembershipTitle(),
        description: generateDiscordMembershipDescription(),
        serverName,
        roleName,
      });
    };

    await test.step('Eleven images are accepted and the first one stays the primary thumbnail', async () => {
      await reachDetails();
      await uploadHero(page, consultationMediaData.heroImagePath);
      await chooseGalleryFiles(page, consultationMediaData.additionalImagePaths);
      await expectGalleryCount(page, consultationMediaData.maxAdditionalImages);
      await discordMembershipPage.expectDiscordPrimaryThumbnail();
      await expectGalleryInputUnavailable(page);
    });

    await test.step('An image under 500 by 500 or over 500MB is rejected', async () => {
      await reachDetails();
      const oversized = createOversizedImageFixture();
      try {
        await chooseHeroFile(page, consultationMediaData.tinyImagePath);
        await expectImageTooSmall(page, 'tiny-1x1.png');
        await expectHeroNotUploaded(page);
        await chooseHeroFile(page, oversized.filePath);
        await expectImageTooLarge(page);
        await expectHeroNotUploaded(page);
      } finally {
        oversized.cleanup();
      }
    });

    await test.step('Pricing starts on Free and a price of at least Rp10.000 is accepted', async () => {
      expect(await readPricingEnabled(page)).toBe(true);
      await expectPriceValue(page, '0');
      await digitalProductPage.expectDigitalProductPricingFreeDefault();
      await fillPrice(page, discordMembershipPricingData.validPrice);
      await expectPreviewPaidPrice(page, discordMembershipPricingData.previewPaidPricePattern);
    });

    await test.step('A price from 1 to 9,999 is rejected, while 0 stays Free', async () => {
      await fillPrice(page, digitalProductPricingData.belowMinimumPrice);
      await discordMembershipPage.submitDiscordMembershipPricing();
      await digitalProductPage.expectDigitalProductInvalidPriceFeedback();
      await expect(page).toHaveURL(/\/products\/(?:create|update)\/discord-membership/);
      await fillPrice(page, discordMembershipPricingData.zeroPrice);
      await digitalProductPage.expectDigitalProductValidPrice();
      await digitalProductPage.expectDigitalProductPricingFreeDefault();
      await fillPrice(page, digitalProductPricingData.validPrice);
      await digitalProductPage.expectDigitalProductValidPrice();
      await expectPreviewPaidPrice(page, digitalProductPricingData.validPriceDisplayPattern);
    });

    await test.step('Name, email, and phone stay mandatory, and a sixth question cannot be added', async () => {
      const questions = Array.from({ length: 5 }, (_, index) => `${generateDiscordMembershipBuyerQuestion()} ${index + 1}`);
      await expectMandatoryBuyerFieldsProtected(page);
      for (const question of questions) await addCustomBuyerQuestion(page, question);
      for (const question of questions) await expectSavedBuyerQuestion(page, question);
      await expectAddQuestionsDisabled(page);
    });
  });

  test('Discord Membership — Section and Toggle, Message, Preview, Published Update, Accessibility, Preview Gating, Link Label Cap', {
    tag: ['@AUT-DM-005', '@membership', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'L-43' },
  }, async ({ discordMembershipPage, creatorNav, productsPage, digitalProductPage, page }) => {
    test.setTimeout(480000);
    // Known bug L-43: Customize Message has no accessible name. Last step.
    test.fail(true, 'L-43: Customize Message switch has no accessible name');
    const accessToken = creatorToken();
    test.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN is required to clean up the Discord membership');
    if (!accessToken) return;

    const title = `${generateDiscordMembershipTitle()} ${Date.now().toString().slice(-6)}`;
    const description = generateDiscordMembershipDescription();
    const message = generateDiscordMembershipSettingsNote();
    const updatedMessage = generateDiscordMembershipSettingsNote();
    const link = digitalProductValidationData.linkValidation.validLinks[0];
    let productUuid = '';

    try {
      await test.step('After Sales starts on, and turning it off hides the editor while the purpose sentence stays', async () => {
        await openDiscordCreate(creatorNav, productsPage, discordMembershipPage);
        await discordMembershipPage.prepareDiscordMembershipDetails({ title, description, serverName, roleName });
        await uploadHero(page, consultationMediaData.heroImagePath);
        await discordMembershipPage.expectDiscordMembershipSettingsSections();
        await discordMembershipPage.expectDiscordAfterSalesDefaultOn(
          consultationAfterSalesData.purposeCopy,
          consultationAfterSalesData.emptyCounter,
        );
        await discordMembershipPage.setDiscordCustomizeMessage(false);
        await discordMembershipPage.expectDiscordAfterSalesOff(
          consultationAfterSalesData.purposeCopy,
          consultationAfterSalesData.emptyCounter,
        );
        await setPricingEnabled(page, true);
        await fillPrice(page, discordMembershipPricingData.validPrice);
        await discordMembershipPage.expectDiscordPublishEnabled(true);
        await discordMembershipPage.publishDiscordMembershipAndReadSharePath();
        await closeProductCompleteModal(page);
        productUuid = (await waitForProductByTitle(page.request, title, accessToken)).uuid;
        await discordMembershipPage.openDiscordMembershipEdit(productUuid);
        await discordMembershipPage.continueToDiscordMembershipDetails();
        await discordMembershipPage.expectDiscordAfterSalesOff(
          consultationAfterSalesData.purposeCopy,
          consultationAfterSalesData.emptyCounter,
        );
      });

      await test.step('The message counter is in characters, links stop at three, and After Sales has no file upload', async () => {
        await discordMembershipPage.setDiscordCustomizeMessage(true);
        await digitalProductPage.expectAfterSalesScope();
      });

      await test.step('Preview stays off until there is a message, then opens that message read-only', async () => {
        await discordMembershipPage.expectDiscordAfterSalesPreviewEnabled(false);
        await discordMembershipPage.fillDiscordMembershipAfterSalesMessage(message);
        await discordMembershipPage.expectDiscordAfterSalesPreviewEnabled(true);
        await discordMembershipPage.openDiscordAfterSalesPreview();
        await discordMembershipPage.expectDiscordAfterSalesPreviewReadOnly(message);
        await discordMembershipPage.closeDiscordAfterSalesPreview();
      });

      await test.step('A formatted message is kept, and an empty message is discarded on publish', async () => {
        await discordMembershipPage.applyDiscordAfterSalesFormatting();
        await discordMembershipPage.fillDiscordMembershipAfterSalesMessage('');
        await discordMembershipPage.publishDiscordMembershipAndReadSharePath();
        await closeProductCompleteModal(page);
        await discordMembershipPage.openDiscordMembershipEdit(productUuid);
        await discordMembershipPage.continueToDiscordMembershipDetails();
        expect(await discordMembershipPage.readDiscordCustomizeMessage()).toBe(false);
        await discordMembershipPage.setDiscordCustomizeMessage(true);
        await discordMembershipPage.fillDiscordMembershipAfterSalesMessage(message);
      });

      await test.step('A link label stops at 40 characters', async () => {
        await enableAfterSalesLinks(page);
        await openEmbedLinkDialog(page);
        await fillEmbedLink(
          page,
          digitalProductValidationData.linkValidation.longLabel,
          link.url,
        );
        await expectEmbedLinkLabelCapped(page);
        await page.keyboard.press('Escape');
      });

      await test.step('Preview shows the staged message and link, and neither can be edited there', async () => {
        await openEmbedLinkDialog(page);
        await fillEmbedLink(page, link.label, link.url);
        await saveCurrentEmbedLink(page);
        await expectEmbedLinksSaved(page, [link.label]);
        await discordMembershipPage.openDiscordAfterSalesPreview();
        await discordMembershipPage.expectDiscordAfterSalesPreviewReadOnly(message, link.label);
        await discordMembershipPage.closeDiscordAfterSalesPreview();
      });

      await test.step('An After Sales edit is what the product stores afterwards', async () => {
        await discordMembershipPage.fillDiscordMembershipAfterSalesMessage(updatedMessage);
        await discordMembershipPage.publishDiscordMembershipAndReadSharePath();
        await closeProductCompleteModal(page);
        await discordMembershipPage.openDiscordMembershipEdit(productUuid);
        await discordMembershipPage.continueToDiscordMembershipDetails();
        await discordMembershipPage.expectDiscordMembershipAfterSalesMessage(updatedMessage);
      });

      await test.step('Customize Message has an accessible name on the edit page and on create', async () => {
        await discordMembershipPage.expectDiscordNamedSwitch('Add Pricing');
        await discordMembershipPage.expectDiscordNamedSwitch('Hide from Explore');
        await discordMembershipPage.expectDiscordCustomizeMessageNamed();
        await openDiscordCreate(creatorNav, productsPage, discordMembershipPage);
        await discordMembershipPage.prepareDiscordMembershipDetails({
          title: generateDiscordMembershipTitle(),
          description,
          serverName,
          roleName,
        });
        await discordMembershipPage.expectDiscordCustomizeMessageNamed();
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid, accessToken).catch(() => undefined);
    }
  });

  test('Discord Membership — Links, Open Editor, Discord Configuration, Settings, Republish, Republish Confirmation Copy', {
    tag: ['@AUT-DM-006', '@membership', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'M-05' },
  }, async ({ discordMembershipPage, creatorNav, productsPage, page }) => {
    test.setTimeout(480000);
    // Known bug M-05: saving an edit says the product was created. Last step.
    test.fail(true, 'M-05: republish confirmation says the product was created');
    const accessToken = creatorToken();
    test.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed a Discord membership');
    if (!accessToken) return;

    const title = `${generateDiscordMembershipTitle()} ${Date.now().toString().slice(-6)}`;
    const description = generateDiscordMembershipDescription();
    const note = generateDiscordMembershipSettingsNote();
    const question = `${generateDiscordMembershipBuyerQuestion()} ${Date.now().toString().slice(-4)}`;
    const renamed = `${generateDiscordMembershipTitle()} ${Date.now().toString().slice(-6)}`;
    const link = digitalProductValidationData.linkValidation.validLinks[1];
    const { linkValidation } = digitalProductValidationData;
    let productUuid = '';

    try {
      const seeded = await createDiscordMembershipProduct(page.request, {
        title,
        description,
        thumbnailImagePath: testImages.claude,
        price: 15000,
        serverName,
      }, accessToken);
      productUuid = seeded.productUuid;
      const sharePath = productSharePath(seeded);

      await test.step('Edit from the products list opens the saved membership', async () => {
        await creatorNav.open('products');
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProductsUntilVisible(title);
        await productsPage.openEditProduct(title);
        expect(await discordMembershipPage.readDiscordMembershipProductUuidFromUrl()).toBe(productUuid);
        await discordMembershipPage.expectDiscordMembershipEditorValues({ title, description, serverName, roleName });
        await discordMembershipPage.continueToDiscordMembershipDetails();
        await discordMembershipPage.expectDiscordMembershipSettingsPrice('15000');
        await discordMembershipPage.expectDiscordPublishEnabled(false);
      });

      await test.step('A valid after-sales link is kept, and a bad URL is rejected in the dialog', async () => {
        await discordMembershipPage.setDiscordCustomizeMessage(true);
        await discordMembershipPage.fillDiscordMembershipAfterSalesMessage(note);
        await enableAfterSalesLinks(page);
        await openEmbedLinkDialog(page);
        await fillEmbedLink(page, linkValidation.longLabel, linkValidation.invalidUrl);
        await expectInvalidEmbedLinkFeedback(page);
        await page.keyboard.press('Escape');
        await openEmbedLinkDialog(page);
        await fillEmbedLink(page, link.label, link.url);
        await saveCurrentEmbedLink(page);
        await expectEmbedLinksSaved(page, [link.label]);
        await discordMembershipPage.publishDiscordMembershipAndReadSharePath();
        await closeProductCompleteModal(page);
        await discordMembershipPage.openDiscordMembershipEdit(productUuid);
        await discordMembershipPage.continueToDiscordMembershipDetails();
        await expectEmbedLinksSaved(page, [link.label]);
      });

      await test.step('Only a Discord duration that was saved is still there after reopening', async () => {
        await discordMembershipPage.openDiscordMembershipEdit(productUuid);
        const unit = await discordMembershipPage.readDiscordDurationUnit();
        const original = await discordMembershipPage.readDiscordMembershipDurationValue();
        const next = original === '2' ? '3' : '2';
        await discordMembershipPage.selectDiscordMembershipDuration(next, unit, unit);
        await page.reload();
        await discordMembershipPage.expectLoaded();
        expect(await discordMembershipPage.readDiscordMembershipDurationValue()).toBe(original);
        await discordMembershipPage.selectDiscordMembershipDuration(next, unit, unit);
        await discordMembershipPage.continueToDiscordMembershipDetails();
        await discordMembershipPage.publishDiscordMembershipAndReadSharePath();
        await closeProductCompleteModal(page);
        await discordMembershipPage.openDiscordMembershipEdit(productUuid);
        expect(await discordMembershipPage.readDiscordMembershipDurationValue()).toBe(next);
        await discordMembershipPage.expectDiscordMembershipServerAndRole(serverName, roleName);
      });

      await test.step('Pricing, the after-sales note, advanced settings, benefits, and the buyer form save on the product', async () => {
        await discordMembershipPage.continueToDiscordMembershipDetails();
        await discordMembershipPage.expectDiscordNamedSwitch('Schedule Publish');
        await discordMembershipPage.expectDiscordNamedSwitch('Availability');
        await discordMembershipPage.expectDiscordNamedSwitch('Hide from Explore');
        await discordMembershipPage.fillDiscordMembershipSettingsPrice(discordMembershipSettingsData.updatedPrice);
        await discordMembershipPage.fillDiscordMembershipAfterSalesMessage(note);
        await discordMembershipPage.setDiscordMembershipHideFromExplore(discordMembershipSettingsData.hideFromExplore);
        await addCustomBuyerQuestion(page, question);
        await discordMembershipPage.publishDiscordMembershipAndReadSharePath();
        await closeProductCompleteModal(page);
        await discordMembershipPage.openDiscordMembershipEdit(productUuid);
        await discordMembershipPage.expectDiscordMembershipServerAndRole(serverName, roleName);
        await discordMembershipPage.continueToDiscordMembershipDetails();
        await discordMembershipPage.expectDiscordMembershipSettingsPrice(discordMembershipSettingsData.updatedPrice);
        await discordMembershipPage.expectDiscordMembershipAfterSalesMessage(note);
        await discordMembershipPage.expectDiscordMembershipHideFromExplore(discordMembershipSettingsData.hideFromExplore);
        await expectSavedBuyerQuestion(page, question);
      });

      await test.step('Republishing keeps the share link and shows the new title immediately', async () => {
        await discordMembershipPage.openDiscordMembershipEdit(productUuid);
        await discordMembershipPage.fillDiscordMembershipTitle(renamed);
        await discordMembershipPage.continueToDiscordMembershipDetails();
        await discordMembershipPage.expectDiscordPublishEnabled(true);
        await discordMembershipPage.submitDiscordMembershipPricing();
        expect(await readProductCompleteSharePath(page)).toBe(sharePath);
        await expect.poll(async () => (await getProduct(page.request, productUuid, accessToken)).title).toBe(renamed);
      });

      await test.step('The confirmation after an edit describes an update', async () => {
        await discordMembershipPage.expectDiscordUpdateConfirmation();
        await closeProductCompleteModal(page);
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid, accessToken).catch(() => undefined);
    }
  });

  test('Discord Membership — Duration Validation, Title Length, First-Run Overlay', {
    tag: ['@AUT-DM-007', '@membership', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'M-46' },
  }, async ({ discordMembershipPage, creatorNav, productsPage, page }) => {
    test.setTimeout(240000);
    // Known bug M-46: title has no length limit. Last step.
    test.fail(true, 'M-46: Discord membership title has no length limit');

    await test.step('The form can be used on the first visit, including after a reload', async () => {
      await openDiscordCreate(creatorNav, productsPage, discordMembershipPage);
      await discordMembershipPage.expectDiscordFormUsable();
      await discordMembershipPage.expectDiscordMembershipRequiredFeedback();
      await page.reload();
      await discordMembershipPage.expectDiscordMembershipCreateFlow();
      await discordMembershipPage.expectDiscordFormUsable();
      await discordMembershipPage.expectDiscordMembershipRequiredFeedback();
    });

    await test.step('Zero is rejected and the form stays on step 1', async () => {
      await discordMembershipPage.fillDiscordMembershipTitle(generateDiscordMembershipTitle());
      await discordMembershipPage.fillDiscordMembershipDescription(generateDiscordMembershipDescription());
      await discordMembershipPage.selectDiscordMembershipServer(serverName);
      await discordMembershipPage.selectDiscordMembershipRole(roleName);
      await discordMembershipPage.expectDiscordZeroDurationBlocked();
    });

    await test.step('Title enforces a maximum and shows a limit', async () => {
      await discordMembershipPage.fillDiscordMembershipTitle('T'.repeat(556));
      expect.soft((await discordMembershipPage.readDiscordMembershipTitle()).length).toBeLessThan(556);
      await discordMembershipPage.expectDiscordMembershipTitleLimited();
    });
  });
});
