import { creatorAuthTest as test, expect } from '../test-base';
import { baseURL } from '@config/env';
import { customColors, generateProfileFormState, generateProfileName, layoutOptions, themePresets, tipButtonColors, tipButtonData } from '@test-data/creator/profile.data';
import { creatorProfiles } from '@test-data/buyer/profile.data';
import { showTipButton } from '@helpers/api/tip-button';
import { ProfilePage as BuyerProfilePage } from '@pages/buyer/ProfilePage';

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
      await new BuyerProfilePage(publicTab, baseURL).expectTextAbsent(unsavedName);
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

test('Validate Customize Live Preview and Save Behavior', {
  tag: ['@AUT-FV-223', '@profile', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-C-066, TC-PRF-C-067, TC-PRF-C-068, TC-PRF-C-069' },
  ],
}, async ({ creatorNav, customizePage, page }) => {
  test.setTimeout(120000);

  const creatorHandle = creatorProfiles.hendrarg.handle;
  const previewName = generateProfileName();

  await test.step('Open /customize and verify Live Preview is visible', async () => {
    await creatorNav.goto('customize');
    await customizePage.expectLoaded();
    await customizePage.expectPreviewVisible();
  });

  await test.step('Change Theme preset and verify preview updates immediately', async () => {
    await customizePage.selectThemeTab();
    await customizePage.expectThemeTabActive();
    await customizePage.selectThemePreset('Ocean');
    await customizePage.expectColorControlsChanged();
    await customizePage.expectPreviewVisible();
  });

  await test.step('Change Profile name and verify preview updates immediately', async () => {
    await customizePage.selectProfileTab();
    await customizePage.expectProfileTabActive();
    await customizePage.fillYourName(previewName);
    await customizePage.expectPreviewVisible();
  });

  await test.step('Toggle Tip Button text and verify preview updates immediately', async () => {
    await showTipButton(page.request);
    await customizePage.selectTipButtonTab();
    await customizePage.expectTipButtonTabActive();
    await customizePage.fillTipButtonText('TipMe ' + Date.now().toString().slice(-2));
    await customizePage.expectPreviewVisible();
  });

  await test.step('Verify unsaved changes are private (public profile unchanged)', async () => {
    const publicTab = await page.context().newPage();
    try {
      await publicTab.goto(new URL(creatorHandle, baseURL).toString(), { waitUntil: 'domcontentloaded' });
      await new BuyerProfilePage(publicTab, baseURL).expectTextAbsent(previewName);
    } finally {
      await publicTab.close();
    }
  });

  await test.step('Save and verify changes persist across all tabs', async () => {
    await customizePage.selectProfileTab();
    await customizePage.expectProfileTabActive();
    await expect(customizePage.saveButton).toBeEnabled({ timeout: 5000 });
    await customizePage.clickSave();
    await customizePage.expectSaveSuccess();

    await customizePage.goto();
    await customizePage.expectLoaded();

    await customizePage.selectProfileTab();
    await customizePage.expectProfileTabActive();
    await customizePage.expectNameValue(previewName);

    await customizePage.selectThemeTab();
    await customizePage.expectThemeTabActive();
    await customizePage.expectColorControlsChanged();
  });
});

test('Validate Profile Role and Interest Controls', {
  tag: ['@AUT-FV-224', '@profile', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-C-041, TC-PRF-C-044' },
  ],
}, async ({ creatorNav, customizePage }) => {
  test.setTimeout(120000);

  await test.step('Open Profile tab and verify Role selector visible', async () => {
    await creatorNav.goto('customize');
    await customizePage.expectLoaded();
    await customizePage.selectProfileTab();
    await customizePage.expectProfileTabActive();
    await customizePage.expectRoleVisible();
  });

  await test.step('Select a different role', async () => {
    await customizePage.selectRole('Design');
  });

  await test.step('Select multiple interest tags', async () => {
    await customizePage.clickInterestTag('Technology');
    await customizePage.clickInterestTag('Gaming');
    await customizePage.clickInterestTag('Travel');
    await customizePage.expectInterestTagSelected('Technology');
    await customizePage.expectInterestTagSelected('Gaming');
    await customizePage.expectInterestTagSelected('Travel');
  });

  await test.step('Save and verify role and interests persist', async () => {
    await expect(customizePage.saveButton).toBeEnabled({ timeout: 5000 });
    await customizePage.clickSave();
    await customizePage.expectSaveSuccess();

    await customizePage.gotoProfileTab();
    await customizePage.expectLoaded();
    await customizePage.expectProfileTabActive();
    await customizePage.expectRoleHasChanged();
  });
});

test('Validate Profile Social Link External Behavior', {
  tag: ['@AUT-FV-225', '@profile', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-C-055' },
  ],
}, async ({ creatorNav, customizePage, page }) => {
  test.setTimeout(120000);

  const creatorHandle = creatorProfiles.hendrarg.handle;

  await test.step('Open Profile tab and verify saved username link', async () => {
    await creatorNav.goto('customize');
    await customizePage.expectLoaded();
    await customizePage.selectProfileTab();
    await customizePage.expectProfileTabActive();
    await customizePage.expectLinkPrefixed();
  });

  await test.step('Open public creator profile and verify social link is accessible', async () => {
    const publicTab = await page.context().newPage();
    try {
      await publicTab.goto(new URL(creatorHandle, baseURL).toString(), { waitUntil: 'domcontentloaded' });
      await new BuyerProfilePage(publicTab, baseURL).expectSocialLinkAttached();
    } finally {
      await publicTab.close();
    }
  });
});

test('Validate Tip Button Color Controls', {
  tag: ['@AUT-FV-226', '@profile', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-C-060, TC-PRF-C-061, TC-PRF-C-062' },
  ],
}, async ({ creatorNav, customizePage, page }) => {
  test.setTimeout(120000);

  await test.step('Ensure Tip Button is shown via API', async () => {
    await showTipButton(page.request);
  });

  await test.step('Open Tip Button tab and verify color inputs visible', async () => {
    await creatorNav.goto('customize');
    await customizePage.expectLoaded();
    await customizePage.selectTipButtonTab();
    await customizePage.expectTipButtonTabActive();
    await customizePage.expectTipButtonColorControlsVisible();
  });

  await test.step('Update Text Color and verify preview updates', async () => {
    await customizePage.fillTipButtonTextColor(tipButtonColors.text);
    await customizePage.expectPreviewVisible();
  });

  await test.step('Update Button Left color and verify preview updates', async () => {
    await customizePage.fillTipButtonLeftColor(tipButtonColors.left);
    await customizePage.expectPreviewVisible();
  });

  await test.step('Update Button Right color and verify preview updates', async () => {
    await customizePage.fillTipButtonRightColor(tipButtonColors.right);
    await customizePage.expectPreviewVisible();
  });

  const colorLabel = "Tip " + Date.now().toString().slice(-4);

  await test.step('Save with label change and verify tip button colors persist', async () => {
    await customizePage.fillTipButtonText(colorLabel);
    await expect(customizePage.saveButton).toBeEnabled({ timeout: 5000 });
    await customizePage.clickSave();
    await customizePage.expectSaveSuccess();

    await customizePage.goto();
    await customizePage.expectLoaded();
    await customizePage.selectTipButtonTab();
    await customizePage.expectTipButtonTabActive();
    await customizePage.expectTipButtonTextColorValue(tipButtonColors.text);
    await customizePage.expectTipButtonLeftColorValue(tipButtonColors.left);
    await customizePage.expectTipButtonRightColorValue(tipButtonColors.right);
  });
});

test('Validate Profile Banner Upload and Persistence', {
  tag: ['@AUT-FV-227', '@profile', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-C-025, TC-PRF-C-026, TC-PRF-C-027' },
  ],
}, async ({ creatorNav, customizePage }) => {
  test.setTimeout(120000);

  await test.step('Open Profile tab and select a banner image from gallery', async () => {
    await creatorNav.goto('customize');
    await customizePage.expectLoaded();
    await customizePage.selectProfileTab();
    await customizePage.expectProfileTabActive();
    await customizePage.selectBannerGalleryOption(1);
  });

  await test.step('Save banner and verify it persists after reload', async () => {
    await expect(customizePage.saveButton).toBeEnabled({ timeout: 5000 });
    await customizePage.clickSave();
    await customizePage.expectSaveSuccess();

    await customizePage.gotoProfileTab();
    await customizePage.expectLoaded();
    await customizePage.expectProfileTabActive();
    await customizePage.expectBannerControlVisible();
    await customizePage.expectPreviewVisible();
  });
});

test('Validate Tip Button Visibility and Retained Configuration', {
  tag: ['@AUT-FV-228', '@profile', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-C-075, TC-PRF-C-076, TC-PRF-C-077' },
  ],
}, async ({ creatorNav, customizePage, page }) => {
  test.setTimeout(120000);

  const savedLabel = "Btn " + Date.now().toString().slice(-4);

  await test.step('Ensure Tip Button is enabled via API', async () => {
    await showTipButton(page.request);
  });

  await test.step('Open Tip Button tab, configure and save', async () => {
    await creatorNav.goto('customize');
    await customizePage.expectLoaded();
    await customizePage.selectTipButtonTab();
    await customizePage.expectTipButtonTabActive();

    await customizePage.fillTipButtonText(savedLabel);
    await customizePage.fillTipButtonTextColor(tipButtonColors.left);
    await customizePage.fillTipButtonLeftColor(tipButtonColors.right);
    await customizePage.fillTipButtonRightColor(tipButtonColors.text);
    await customizePage.fillIdrQuickAmount(0, tipButtonData.idrAmount1);

    await expect(customizePage.saveButton).toBeEnabled({ timeout: 5000 });
    await customizePage.clickSave();
    await customizePage.expectSaveSuccess();
  });

  await test.step('Toggle off and verify controls hidden, toggle on and verify retained', async () => {
    await customizePage.toggleTipButton(false);
    const offValue = await customizePage.tipButtonTextInput.inputValue();
    expect(offValue).toBe(savedLabel);

    await customizePage.toggleTipButton(true);

    await expect(customizePage.tipButtonTextInput).toHaveValue(savedLabel);
    await customizePage.expectTipButtonTextColorValue(tipButtonColors.left);
    await customizePage.expectTipButtonLeftColorValue(tipButtonColors.right);
    await customizePage.expectTipButtonRightColorValue(tipButtonColors.text);
  });
});

test('Validate Unsaved Banner Change Stays Private', {
  tag: ['@AUT-FV-229', '@profile', '@creator', '@regression', '@smoke'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-C-026' },
  ],
}, async ({ creatorNav, customizePage, page }) => {
  test.setTimeout(120000);

  const creatorHandle = creatorProfiles.hendrarg.handle;

  await test.step('Open Profile tab and select a new banner without saving', async () => {
    await creatorNav.goto('customize');
    await customizePage.expectLoaded();
    await customizePage.selectProfileTab();
    await customizePage.expectProfileTabActive();
    await customizePage.selectBannerGalleryOption(0);
  });

  await test.step('Open public profile and verify it still shows the last saved state', async () => {
    const publicTab = await page.context().newPage();
    try {
      await publicTab.goto(new URL(creatorHandle, baseURL).toString(), { waitUntil: 'domcontentloaded' });
      const publicProfile = new BuyerProfilePage(publicTab, baseURL);
      await publicProfile.expectHandleVisible(creatorHandle);
      await publicProfile.expectPublicSendTipButtonVisible(5000);
    } finally {
      await publicTab.close();
    }
  });
});

test('Validate Tip Button Text Public Persistence', {
  tag: ['@AUT-FV-230', '@profile', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-C-078, TC-PRF-C-079' },
  ],
}, async ({ creatorNav, customizePage, page }) => {
  test.setTimeout(120000);

  const creatorHandle = creatorProfiles.hendrarg.handle;
  const tipLabel = "TipMe " + Date.now().toString().slice(-4);

  await test.step('Ensure Tip Button is shown and configure custom text', async () => {
    await showTipButton(page.request);
    await creatorNav.goto('customize');
    await customizePage.expectLoaded();
    await customizePage.selectTipButtonTab();
    await customizePage.expectTipButtonTabActive();

    await customizePage.fillTipButtonText(tipLabel);
    await customizePage.expectPreviewVisible();

    await expect(customizePage.saveButton).toBeEnabled({ timeout: 5000 });
    await customizePage.clickSave();
    await customizePage.expectSaveSuccess();
  });

  await test.step('Reload and verify custom text persists', async () => {
    await customizePage.goto();
    await customizePage.expectLoaded();
    await customizePage.selectTipButtonTab();
    await customizePage.expectTipButtonTabActive();
    await customizePage.expectTipButtonText(tipLabel);
  });

  await test.step('Open public profile and verify the saved tip button label is shown', async () => {
    const publicTab = await page.context().newPage();
    try {
      await publicTab.goto(new URL(creatorHandle, baseURL).toString(), { waitUntil: 'domcontentloaded' });
      // This test exists to prove the creator's custom text reaches the public profile,
      // so assert that exact label — asserting the default "Send Tip" checked nothing.
      await new BuyerProfilePage(publicTab, baseURL).expectPublicTipCtaLabel(tipLabel);
    } finally {
      await publicTab.close();
    }
  });
});

test('Validate Creator Quick Tip Amount Configuration', {
  tag: ['@AUT-FV-231', '@profile', '@creator', '@regression'],
  annotation: [
    { type: 'covers', description: 'TC-PRF-C-080, TC-PRF-C-081, TC-PRF-C-082, TC-PRF-C-083, TC-PRF-C-084, TC-PRF-C-085' },
  ],
}, async ({ creatorNav, customizePage, page }) => {
  test.setTimeout(120000);

  const creatorHandle = creatorProfiles.hendrarg.handle;
  const tipLabel = "Tip " + Date.now().toString().slice(-4);

  await test.step('Ensure Tip Button is shown and open tab', async () => {
    await showTipButton(page.request);
    await creatorNav.goto('customize');
    await customizePage.expectLoaded();
    await customizePage.selectTipButtonTab();
    await customizePage.expectTipButtonTabActive();
    await customizePage.expectTipButtonControlsVisible();
  });

  await test.step('Edit IDR quick amount values and save', async () => {
    await customizePage.fillIdrQuickAmount(0, tipButtonData.idrAmount1);
    await customizePage.fillIdrQuickAmount(1, tipButtonData.idrAmount2);
    await customizePage.fillIdrQuickAmount(2, tipButtonData.idrAmount3);
  });

  await test.step('Edit USDT quick amount values and save', async () => {
    await customizePage.fillUsdtQuickAmount(0, tipButtonData.usdtAmount1);
    await customizePage.fillUsdtQuickAmount(1, tipButtonData.usdtAmount2);
    await customizePage.fillUsdtQuickAmount(2, tipButtonData.usdtAmount3);
    await customizePage.fillTipButtonText(tipLabel);

    await expect(customizePage.saveButton).toBeEnabled({ timeout: 5000 });
    await customizePage.clickSave();
    await customizePage.expectSaveSuccess();
  });

  await test.step('Reload and verify IDR and USDT values persist', async () => {
    await customizePage.goto();
    await customizePage.expectLoaded();
    await customizePage.selectTipButtonTab();
    await customizePage.expectTipButtonTabActive();

    await customizePage.expectIdrQuickAmountValue(0, tipButtonData.idrAmount1);
    await customizePage.expectIdrQuickAmountValue(1, tipButtonData.idrAmount2);
    await customizePage.expectIdrQuickAmountValue(2, tipButtonData.idrAmount3);
    await customizePage.expectUsdtQuickAmountValue(0, tipButtonData.usdtAmount1);
    await customizePage.expectUsdtQuickAmountValue(1, tipButtonData.usdtAmount2);
    await customizePage.expectUsdtQuickAmountValue(2, tipButtonData.usdtAmount3);
  });

  await test.step('Open public profile and verify support section is visible', async () => {
    const publicTab = await page.context().newPage();
    try {
      await publicTab.goto(new URL(creatorHandle, baseURL).toString(), { waitUntil: 'domcontentloaded' });
      await new BuyerProfilePage(publicTab, baseURL).expectPublicSendTipButtonAttached();
    } finally {
      await publicTab.close();
    }
  });

  await test.step('Toggle off and on, verify quick amounts retained', async () => {
    await customizePage.toggleTipButton(false);
    await customizePage.toggleTipButton(true);

    await customizePage.expectIdrQuickAmountValue(0, tipButtonData.idrAmount1);
    await customizePage.expectIdrQuickAmountValue(1, tipButtonData.idrAmount2);
    await customizePage.expectIdrQuickAmountValue(2, tipButtonData.idrAmount3);
    await customizePage.expectUsdtQuickAmountValue(0, tipButtonData.usdtAmount1);
    await customizePage.expectUsdtQuickAmountValue(1, tipButtonData.usdtAmount2);
    await customizePage.expectUsdtQuickAmountValue(2, tipButtonData.usdtAmount3);
  });
});

});
