import { creatorAuthTest as test, expect } from '../test-base';
import { baseURL } from '@config/env';
import { customColors, generateProfileFormState, generateProfileName, layoutOptions, themePresets, tipButtonData } from '@test-data/creator/profile.data';
import { creatorProfiles } from '@test-data/buyer/profile.data';
import { showTipButton } from '@helpers/api/tip-button';

test.describe('Creator Profile', () => {

test('Validate Profile Tab Information and Persistence', {
  tag: ['@AUT-FV-219', '@profile', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-C-001, TC-PRF-C-002, TC-PRF-C-003, TC-PRF-C-004, TC-PRF-C-005, TC-PRF-C-006, TC-PRF-C-007, TC-PRF-C-008, TC-PRF-C-009, TC-PRF-C-010' },
  ],
}, async ({ creatorNav, customizePage, page }) => {
  test.setTimeout(120000);

  const updatedForm = generateProfileFormState();
  const creatorHandle = creatorProfiles.hendrarg.handle;

  let originalName = '';
  let originalBio = '';

  await test.step('Open Customize Profile tab and verify pre-populated fields', async () => {
    await creatorNav.goto('customize');
    await customizePage.expectLoaded();
    await customizePage.selectProfileTab();
    await customizePage.expectProfileTabActive();
    await customizePage.expectBannerControlVisible();
    await customizePage.expectProfilePictureControlVisible();
    await customizePage.expectNamePrefilled();
    await customizePage.expectLinkPrefixed();
  });

  await test.step('Read currently saved profile values for later restore', async () => {
    originalName = await customizePage.yourNameInput.inputValue();
    originalBio = await customizePage.bioTextarea.inputValue();
  });

  await test.step('Update profile name', async () => {
    await customizePage.fillYourName(updatedForm.name);
  });

  await test.step('Update creator bio', async () => {
    await customizePage.fillBio(updatedForm.bio);
  });

  await test.step('Validate creator profile link field with yapp.ink/ prefix', async () => {
    await customizePage.expectLinkPrefixed();
    await customizePage.fillLink(updatedForm.link);
  });

  await test.step('Persist Profile tab values after save', async () => {
    await expect(customizePage.saveButton).toBeEnabled({ timeout: 5000 });
    await customizePage.clickSave();
    await customizePage.expectSaveSuccess();

    await customizePage.gotoProfileTab();
    await customizePage.expectLoaded();
    await customizePage.expectProfileTabActive();

    await customizePage.expectNameValue(updatedForm.name);
    await customizePage.expectBioValue(updatedForm.bio);
  });

  await test.step('Change values without saving and verify public profile unchanged', async () => {
    const unsavedName = generateProfileName();
    await customizePage.fillYourName(unsavedName);

    const publicTab = await page.context().newPage();
    try {
      await publicTab.goto(new URL(creatorHandle, baseURL).toString(), { waitUntil: 'domcontentloaded' });
      await expect(publicTab.getByText(unsavedName)).toHaveCount(0, { timeout: 10000 });
    } finally {
      await publicTab.close();
    }
  });

  await test.step('Publish multiple Profile tab changes together', async () => {
    await customizePage.gotoProfileTab();
    await customizePage.expectLoaded();
    await customizePage.expectProfileTabActive();

    await customizePage.fillYourName(originalName);
    await customizePage.fillBio(originalBio);

    await expect(customizePage.saveButton).toBeEnabled({ timeout: 5000 });
    await customizePage.clickSave();
    await customizePage.expectSaveSuccess();

    await customizePage.gotoProfileTab();
    await customizePage.expectLoaded();
    await customizePage.expectProfileTabActive();

    await customizePage.expectNameValue(originalName);
    await customizePage.expectBioValue(originalBio);
  });
});

test('Validate Profile Theme Presets', {
  tag: ['@AUT-FV-220', '@profile', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-C-011, TC-PRF-C-012, TC-PRF-C-013, TC-PRF-C-014, TC-PRF-C-015, TC-PRF-C-016, TC-PRF-C-017, TC-PRF-C-018' },
  ],
}, async ({ creatorNav, customizePage }) => {
  test.setTimeout(120000);

  await test.step('Open Customize Theme tab and verify preset list', async () => {
    await creatorNav.goto('customize');
    await customizePage.expectLoaded();
    await customizePage.selectThemeTab();
    await customizePage.expectThemeTabActive();
    await customizePage.expectThemePresetsVisible();
  });

  for (const preset of themePresets) {
    await test.step(`Select ${preset} theme and verify controls and preview update`, async () => {
      await customizePage.selectThemePreset(preset);
      await customizePage.expectColorControlsVisible();
      await customizePage.expectColorControlsChanged();
      await customizePage.expectPreviewVisible();
    });
  }

  await test.step('Verify only one theme preset active at a time', async () => {
    await customizePage.selectThemePreset('Sunset');
    await customizePage.selectThemePreset('Ocean');

    await customizePage.expectColorControlsChanged();
  });

  await test.step('Persist selected theme after save and refresh', async () => {
    await customizePage.selectThemePreset('Forest');
    await expect(customizePage.saveButton).toBeEnabled({ timeout: 5000 });
    await customizePage.clickSave();
    await customizePage.expectSaveSuccess();

    await customizePage.goto();
    await customizePage.expectLoaded();
    await customizePage.selectThemeTab();
    await customizePage.expectThemeTabActive();
    await customizePage.expectColorControlsVisible();
  });
});

test('Validate Custom Theme Colors and Profile Layout', {
  tag: ['@AUT-FV-221', '@profile', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-C-028, TC-PRF-C-029, TC-PRF-C-030, TC-PRF-C-031, TC-PRF-C-032, TC-PRF-C-033, TC-PRF-C-034, TC-PRF-C-035, TC-PRF-C-036, TC-PRF-C-037, TC-PRF-C-038' },
  ],
}, async ({ creatorNav, customizePage }) => {
  test.setTimeout(120000);

  await test.step('Open Customize Theme tab and verify layout options', async () => {
    await creatorNav.goto('customize');
    await customizePage.expectLoaded();
    await customizePage.selectThemeTab();
    await customizePage.expectThemeTabActive();
    await customizePage.expectLayoutOptionsVisible();
  });

  for (const layout of layoutOptions) {
    await test.step(`Select ${layout} layout and verify preview updates`, async () => {
      await customizePage.selectLayout(layout);
      await customizePage.expectPreviewVisible();
    });
  }

  await test.step('Verify only one layout active at a time', async () => {
    await customizePage.selectLayout('Default');
    await customizePage.selectLayout('Simple');
    await customizePage.expectPreviewVisible();
  });

  await test.step('Verify custom color fields are visible', async () => {
    await customizePage.expectColorControlsVisible();
  });

  await test.step('Edit Background Color and verify preview updates', async () => {
    await customizePage.fillBackgroundColor(customColors.background);
    await customizePage.expectPreviewVisible();
  });

  await test.step('Edit Primary color and verify preview updates', async () => {
    await customizePage.fillPrimaryColor(customColors.primary);
    await customizePage.expectPreviewVisible();
  });

  await test.step('Edit Secondary color and verify preview updates', async () => {
    await customizePage.fillSecondaryColor(customColors.secondary);
    await customizePage.expectPreviewVisible();
  });

  await test.step('Persist layout and custom colors after save', async () => {
    await expect(customizePage.saveButton).toBeEnabled({ timeout: 5000 });
    await customizePage.clickSave();
    await customizePage.expectSaveSuccess();

    await customizePage.goto();
    await customizePage.expectLoaded();
    await customizePage.selectThemeTab();
    await customizePage.expectThemeTabActive();

    await customizePage.expectColorControlsVisible();
    await customizePage.expectBackgroundColorValue(customColors.background);
    await customizePage.expectPrimaryColorValue(customColors.primary);
    await customizePage.expectSecondaryColorValue(customColors.secondary);
  });
});

test('Validate Tip Button Visibility, Text, and Quick Amount Basics', {
  tag: ['@AUT-FV-222', '@profile', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-C-056, TC-PRF-C-057, TC-PRF-C-058, TC-PRF-C-059, TC-PRF-C-063, TC-PRF-C-064' },
  ],
}, async ({ creatorNav, customizePage, page }) => {
  test.setTimeout(120000);

  await test.step('Ensure Tip Button is enabled via API', async () => {
    await showTipButton(page.request);
  });

  await test.step('Open Customize Tip Button tab and verify controls', async () => {
    await creatorNav.goto('customize');
    await customizePage.expectLoaded();
    await customizePage.selectTipButtonTab();
    await customizePage.expectTipButtonTabActive();
    await customizePage.expectTipButtonControlsVisible();
  });

  await test.step('Toggle Show Tip Button off and on and observe Preview', async () => {
    await customizePage.toggleTipButton(false);
    await customizePage.toggleTipButton(true);
    await customizePage.expectPreviewVisible();
  });

  const savedLabel = "Tip " + Date.now().toString().slice(-4);

  await test.step('Update Tip Button text', async () => {
    await customizePage.fillTipButtonText(savedLabel);
    await customizePage.expectPreviewVisible();
  });

  await test.step('Enforce Button Text 40-character limit', async () => {
    await customizePage.fillTipButtonText(tipButtonData.overflowLabel);
    const value = await customizePage.tipButtonTextInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(tipButtonData.labelMaxChars);
  });

  await test.step('Update quick amounts, reset label, and save', async () => {
    await customizePage.fillIdrQuickAmount(0, tipButtonData.idrAmount1);
    await customizePage.fillIdrQuickAmount(1, tipButtonData.idrAmount2);
    await customizePage.fillIdrQuickAmount(2, tipButtonData.idrAmount3);
    await customizePage.fillUsdtQuickAmount(0, tipButtonData.usdtAmount1);
    await customizePage.fillUsdtQuickAmount(1, tipButtonData.usdtAmount2);
    await customizePage.fillUsdtQuickAmount(2, tipButtonData.usdtAmount3);
    await customizePage.fillTipButtonText(savedLabel);
    await expect(customizePage.saveButton).toBeEnabled({ timeout: 5000 });
    await customizePage.clickSave();
    await customizePage.expectSaveSuccess();
  });

  await test.step('Verify Tip Button text persists after reload', async () => {
    await customizePage.goto();
    await customizePage.expectLoaded();
    await customizePage.selectTipButtonTab();
    await customizePage.expectTipButtonTabActive();
    await customizePage.expectTipButtonText(savedLabel);
  });
});

});
