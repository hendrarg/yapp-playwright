import { creatorAuthTest as test, expect } from '../test-base';
import { baseURL, creatorsBaseURL } from '@config/env';
import { getAccount } from '@helpers/api/account';
import { getAccountProfile, getCreatorFavorites } from '@helpers/api/profile-appearance';
import { createTextBlock, deleteTextBlock, findTextBlock, updateTextBlock } from '@helpers/api/text-block';
import { signInWithEmailOtp } from '@helpers/auth/otp-login';
import { loginWithToken } from '@helpers/auth/token-login';
import { withPublicProfile as openPublicProfile } from '@helpers/creator/public-profile';
import { TipPage } from '@pages/buyer/TipPage';
import { CustomizePage } from '@pages/creator/CustomizePage';
import { creatorProfiles } from '@test-data/buyer/profile.data';
import {bioLimit,
  customColors,
  generateProfileBio,
  generateProfileLink,
  generateProfileName,
  generateSocialHandle,
  generateTextBlockContent,
  generateTipLabel,
  invalidColors,
  layoutOptions,
  myPageTabs,
  profileCustomizationData,
  profileDialogs,
  quickAmountEdits,
  roleOptions,
  textBlockData,
  themePresets,
  tipButtonColors,
  tipButtonData,
  toolLabels,
  validColorForPrimary,} from '@test-data/creator/profile.data';
import { inboxAccounts } from '@test-data/users';

const handle = creatorProfiles.hendrarg.handle;

/** The ratio stated by an upload dialog's "Recommended aspect ratio: a:b" line, as a number. */
function guidanceRatio(lines: string[]): number {
  const match = lines.join(' ').match(/aspect ratio:\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)/i);
  if (!match) throw new Error(`No aspect ratio in guidance: ${lines.join(' | ')}`);
  return Number(match[1]) / Number(match[2]);
}

test.describe('Creator Profile', () => {
  test('Profile — Profile Tab, Profile Picture, Profile Banner, Your Name', {
    tag: ['@AUT-PRF-001', '@profile', '@creator', '@smoke'],
  }, async ({ creatorNav, customizePage, browser, request, creatorAppearance, dbFixtures }) => {
    test.setTimeout(240000);
    const before = await getAccountProfile(request);
    await dbFixtures.protectAppearanceMedia((await getAccount(request)).uuid);
    const name = generateProfileName();
    let uploadedBanner = '';

    await test.step('Profile tab opens with the saved values and every control', async () => {
      await creatorNav.goto('customize');
      await customizePage.openSection('Profile');
      await customizePage.expectHeaderControls();
      await customizePage.expectProfileValues({ name: creatorAppearance.profile.name, link: before.username, bio: creatorAppearance.profile.bio });
      await customizePage.expectLinkPrefix();
      await customizePage.openRoleOptions();
      expect(await customizePage.roleOptionNames()).toEqual([...roleOptions]);
      await customizePage.closeRoleOptions();
      await customizePage.expectInterestSelected(before.interestNames[0]);
      await expect(customizePage.page).toHaveURL(/\/customize/);
    });

    await test.step('Your Name and Link have no length limit or counter, Bio is capped at 200 with a counter', async () => {
      await customizePage.expectNoLengthLimit('name');
      await customizePage.expectNoLengthLimit('link');
      await customizePage.expectBioLimit(bioLimit);
      expect(await customizePage.counterTexts()).toEqual([`${creatorAppearance.profile.bio.length}/${bioLimit}`]);
    });

    await test.step('A new name is saved and shown after refresh and on the public profile', async () => {
      await customizePage.fillName(name);
      await customizePage.save();
      await customizePage.reloadSection('Profile');
      await customizePage.expectProfileValues({ name });
      await openPublicProfile(browser, handle, (profile) => profile.expectTextShown(name));
    });

    await test.step('A valid profile picture is cropped, previewed, saved and kept after refresh', async () => {
      await customizePage.uploadProfilePicture(profileCustomizationData.profilePicturePath);
      await expect.poll(() => customizePage.pictureImageSrc()).toMatch(/^data:image\//);
      await customizePage.save();
      const after = await getAccountProfile(request);
      expect(after.photoPath).not.toBe(before.photoPath);
      await customizePage.reloadSection('Profile');
      await expect.poll(() => customizePage.pictureImageSrc()).toContain(encodeURIComponent(after.photoPath.split('/').pop()!));
    });

    await test.step('An uploaded banner is cropped, previewed, saved and shown on the public profile', async () => {
      await customizePage.uploadBanner(profileCustomizationData.bannerPath);
      await expect.poll(() => customizePage.bannerImageSrc()).toMatch(/^data:image\//);
      await customizePage.save();
      await expect.poll(async () => (await getAccountProfile(request)).backgroundPath, { timeout: 15000 }).not.toBe(before.backgroundPath);
      uploadedBanner = (await getAccountProfile(request)).backgroundPath;
      expect(uploadedBanner).toContain('/background/');
      await openPublicProfile(browser, handle, (profile) => profile.expectBannerFile(uploadedBanner.split('/').pop()!));
    });

    await test.step('A replaced but unsaved banner stays off the public profile', async () => {
      await customizePage.openBannerDialog();
      await customizePage.chooseBannerGallery(2);
      await expect.poll(() => customizePage.bannerImageSrc()).not.toContain(uploadedBanner.split('/').pop()!);
      await openPublicProfile(browser, handle, (profile) => profile.expectBannerFile(uploadedBanner.split('/').pop()!));
    });

    await test.step('The saved banner is still the one applied after refresh', async () => {
      await customizePage.reloadSection('Profile');
      expect((await getAccountProfile(request)).backgroundPath).toBe(uploadedBanner);
      await expect.poll(() => customizePage.bannerImageSrc()).toContain(encodeURIComponent(uploadedBanner.split('/').pop()!));
    });
  });

  test('Profile — Bio, Social Links, Profile Link', {
    tag: ['@AUT-PRF-002', '@profile', '@creator', '@regression'],
  }, async ({ creatorNav, customizePage, browser, request, creatorAppearance, dbFixtures }) => {
    test.setTimeout(240000);
    const before = await getAccountProfile(request);
    const name = creatorAppearance.profile.name || generateProfileName();
    const bio = generateProfileBio();
    const tiktok = generateSocialHandle();

    await test.step('The Bio counter counts characters and hard-stops at 200', async () => {
      await creatorNav.goto('customize');
      await customizePage.openSection('Profile');
      await customizePage.fillBio('x'.repeat(68));
      await customizePage.expectBioCounter(`68/${bioLimit}`);
      await customizePage.fillBio('word '.repeat(52));
      await expect(customizePage.bioInput).toHaveValue('word '.repeat(52).slice(0, bioLimit));
      await customizePage.expectBioCounter(`${bioLimit}/${bioLimit}`);
    });

    await test.step('A bio within the limit is saved and shown after refresh and on the public profile', async () => {
      await customizePage.fillName(name);
      await customizePage.fillBio(bio);
      await customizePage.save();
      await customizePage.reloadSection('Profile');
      await customizePage.expectProfileValues({ bio });
      await openPublicProfile(browser, handle, (profile) => profile.expectTextShown(bio));
    });

    await test.step('A social link is saved and shown after refresh', async () => {
      await customizePage.updateSocialLink('tiktok', tiktok);
      await customizePage.expectSocialHandle(tiktok);
      await customizePage.save();
      await customizePage.reloadSection('Profile');
      await customizePage.expectSocialHandle(tiktok);
    });

    await test.step('The saved social link renders on the profile and opens its external page', async () => {
      await openPublicProfile(browser, handle, async (profile) => {
        await profile.expectSocialLink('TikTok profile', `https://tiktok.com/@${tiktok}`);
        const opened = await profile.openSocialLink('TikTok profile');
        await expect(opened).toHaveURL(new RegExp(`tiktok\\.com/@${tiktok}`), { timeout: 30000 });
        await opened.close();
      });
    });

    await test.step('The Link field keeps its yapp.ink/ prefix and saves a valid new link', async () => {
      await dbFixtures.protectProfile((await getAccount(request)).uuid);
      const link = generateProfileLink();
      await customizePage.expectLinkPrefix();
      await customizePage.fillLink(link);
      await customizePage.save();
      await customizePage.reloadSection('Profile');
      await customizePage.expectProfileValues({ link });
      await customizePage.expectLinkPrefix();
      expect((await getAccountProfile(request)).username).toBe(link);
      expect(before.username).toBe(handle);
    });
  });

  test('Profile — Profile Save, Accessibility, Unsaved Changes, Media Upload', {
    tag: ['@AUT-PRF-003', '@profile', '@creator', '@regression'],
  }, async ({ creatorNav, customizePage, browser, context, request, creatorAppearance, dbFixtures }) => {
    test.setTimeout(240000);
    await dbFixtures.protectAppearanceMedia((await getAccount(request)).uuid);
    const original = await getAccountProfile(request);
    const name = generateProfileName();
    const bio = generateProfileBio();
    const tiktok = generateSocialHandle();
    const interest = original.interestNames.includes('Travel') ? 'Cosplay' : 'Travel';

    await test.step('Your Name blocks Save silently when empty while an empty Link enables it', async () => {
      await creatorNav.goto('customize');
      await customizePage.openSection('Profile');
      await customizePage.expectSaveEnabled(false);
      await customizePage.fillName(name);
      await customizePage.expectSaveEnabled();
      await customizePage.fillName('');
      await customizePage.nameInput.blur();
      await customizePage.expectSaveEnabled(false);
      await customizePage.expectNoFieldError();
      await customizePage.fillName(name);
      await customizePage.fillLink('');
      await customizePage.linkInput.blur();
      await customizePage.expectSaveEnabled();
      await customizePage.expectNoFieldError();
      await customizePage.fillLink(original.username);
    });

    await test.step('An interest chip shows its selected state once clicked', async () => {
      const before = await customizePage.interestState(interest);
      await customizePage.toggleInterest(interest);
      const after = await customizePage.interestState(interest);
      expect(after.className).not.toBe(before.className);
      await customizePage.expectInterestSelected(interest);
      await customizePage.toggleInterest(interest);
      await customizePage.expectInterestSelected(interest, false);
    });

    await test.step('Banner and profile picture uploads go through a real file input', async () => {
      await customizePage.openPictureUpload();
      await customizePage.expectFileInput('Upload Profile Picture');
      await customizePage.chooseImageFile('Upload Profile Picture', profileCustomizationData.profilePicturePath, 'Crop Profile Picture');
      await customizePage.cancelCrop('Crop Profile Picture');
      await customizePage.openBannerDialog();
      await customizePage.openBannerUploadTab();
      await customizePage.expectFileInput('Header Background');
      await customizePage.chooseImageFile('Header Background', profileCustomizationData.bannerPath, 'Crop Header');
      await customizePage.cancelCrop('Crop Header');
    });

    await test.step('Unsaved changes raise the inline notice and the browser leave prompt, and reload discards them', async () => {
      const draft = await context.newPage();
      const editor = new CustomizePage(draft, creatorsBaseURL);
      await editor.goto();
      await editor.openSection('Profile');
      await editor.expectNoUnsavedNotice();
      await editor.fillBio(`draft ${bio}`);
      await editor.expectUnsavedNotice();
      const prompt = draft.waitForEvent('dialog');
      await draft.close({ runBeforeUnload: true });
      const dialog = await prompt;
      expect(dialog.type()).toBe('beforeunload');
      await dialog.dismiss();
      await editor.reloadSection('Profile');
      await editor.expectProfileValues({ bio: creatorAppearance.profile.bio });
      await editor.expectNoUnsavedNotice();
      await draft.close();
    });

    await test.step('Unsaved Profile changes stay off the public profile', async () => {
      await customizePage.fillName(name);
      await openPublicProfile(browser, handle, (profile) => profile.expectTextAbsent(name));
    });

    await test.step('Several Profile changes publish together with one Save', async () => {
      await customizePage.fillBio(bio);
      await customizePage.updateSocialLink('tiktok', tiktok);
      await customizePage.toggleInterest(interest);
      await customizePage.openBannerDialog();
      await customizePage.chooseBannerGallery(1);
      await customizePage.save();
      const saved = await getAccountProfile(request);
      expect(saved).toMatchObject({ name, bio });
      expect(saved.backgroundPath).not.toBe(original.backgroundPath);
      expect(saved.interestNames).toContain(interest);
      await openPublicProfile(browser, handle, async (profile) => {
        await profile.expectTextShown(name);
        await profile.expectTextShown(bio);
        await profile.expectSocialLink('TikTok profile', `https://tiktok.com/@${tiktok}`);
      });
    });

    await test.step('Saved Profile values persist after refresh', async () => {
      await customizePage.reloadSection('Profile');
      await customizePage.expectProfileValues({ name, bio });
      await customizePage.expectSocialHandle(tiktok);
      await customizePage.expectInterestSelected(interest);
    });
  });

  test('Profile — Theme Presets — Part 1', {
    tag: ['@AUT-PRF-004', '@profile', '@creator', '@regression'],
  }, async ({ creatorNav, customizePage, creatorAppearance }) => {
    test.setTimeout(240000);
    expect(creatorAppearance.customization.customTheme.backgroundColor).toBeTruthy();

    await test.step('Theme lists the five presets', async () => {
      await creatorNav.goto('customize');
      await customizePage.openSection('Theme');
      await customizePage.expectThemePresets(themePresets);
    });

    for (const preset of ['Default', 'Sunset', 'Ocean', 'Forest'] as const) {
      await test.step(`${preset} becomes active, fills the colour fields, updates the preview and survives a reload`, async () => {
        const previous = await customizePage.readThemeColors();
        await customizePage.selectThemePreset(preset);
        const colors = await customizePage.readThemeColors();
        expect(colors).not.toEqual(previous);
        await customizePage.expectPreviewBackground(colors['Background Color']);
        await customizePage.save();
        await customizePage.reloadSection('Theme');
        await customizePage.expectOnlyThemeChecked(preset, themePresets);
        expect(await customizePage.readThemeColors()).toEqual(colors);
      });
    }
  });

  test('Profile — Theme Presets — Part 2', {
    tag: ['@AUT-PRF-005', '@profile', '@creator', '@regression'],
  }, async ({ creatorNav, customizePage, creatorAppearance }) => {
    test.setTimeout(180000);
    expect(creatorAppearance.customization.profileLayoutPreference).toBeTruthy();
    let midnight: Record<string, string> = {};

    await test.step('Midnight becomes active, fills the colour fields, updates the preview and saves', async () => {
      await creatorNav.goto('customize');
      await customizePage.openSection('Theme');
      await customizePage.selectThemePreset('Midnight');
      midnight = await customizePage.readThemeColors();
      await customizePage.expectPreviewBackground(midnight['Background Color']);
      await customizePage.save();
    });

    await test.step('Choosing another preset leaves only that one active', async () => {
      await customizePage.selectThemePreset('Sunset');
      await customizePage.expectOnlyThemeChecked('Sunset', themePresets);
      await customizePage.selectThemePreset('Ocean');
      await customizePage.expectOnlyThemeChecked('Ocean', themePresets);
    });

    await test.step('The saved theme is still selected with its colours after a reload', async () => {
      await customizePage.reloadSection('Theme');
      await customizePage.expectOnlyThemeChecked('Midnight', themePresets);
      expect(await customizePage.readThemeColors()).toEqual(midnight);
    });

    await test.step('Custom is a usage indicator in the preset row, not a selectable preset', async () => {
      await customizePage.expectCustomEntryIsIndicatorOnly();
      await customizePage.applyCustomTheme(customColors);
      await customizePage.expectPreviewBackground(customColors.background);
      await customizePage.expectOnlyThemeChecked(null, themePresets);
      await customizePage.expectCustomEntryIsIndicatorOnly();
    });
  });

  test('Profile — Accessibility, Profile Layout', {
    tag: ['@AUT-PRF-006', '@profile', '@creator', '@regression'],
  }, async ({ creatorNav, customizePage, creatorAppearance }) => {
    test.setTimeout(180000);
    const current = creatorAppearance.customization.profileLayoutPreference === 'simple' ? 'Simple' : 'Default';
    const other = current === 'Simple' ? 'Default' : 'Simple';

    await test.step('Theme presets and layout options expose their names to assistive technology', async () => {
      await creatorNav.goto('customize');
      await customizePage.openSection('Theme');
      await customizePage.expectThemePresets(themePresets);
      await customizePage.expectLayoutOptions(layoutOptions);
    });

    await test.step('Profile layout offers Default and Simple', async () => {
      await customizePage.expectLayoutOptions(layoutOptions);
      await customizePage.expectOnlyLayoutChecked(current, layoutOptions);
    });

    await test.step('Switching layouts updates the preview immediately without saving', async () => {
      await customizePage.selectLayout('Simple');
      await customizePage.expectPreviewLayout('Simple');
      await customizePage.selectLayout('Default');
      await customizePage.expectPreviewLayout('Default');
    });

    await test.step('Only the latest selected layout stays active', async () => {
      await customizePage.selectLayout('Simple');
      await customizePage.expectOnlyLayoutChecked('Simple', layoutOptions);
      await customizePage.selectLayout('Default');
      await customizePage.expectOnlyLayoutChecked('Default', layoutOptions);
    });

    await test.step(`Selecting ${other} and saving keeps it after a reload`, async () => {
      await customizePage.selectLayout(other);
      await customizePage.save();
      await customizePage.reloadSection('Theme');
      await customizePage.expectOnlyLayoutChecked(other, layoutOptions);
      await customizePage.expectPreviewLayout(other);
    });

    await test.step(`Selecting ${current} and saving keeps it after a reload`, async () => {
      await customizePage.selectLayout(current);
      await customizePage.save();
      await customizePage.reloadSection('Theme');
      await customizePage.expectOnlyLayoutChecked(current, layoutOptions);
      await customizePage.expectPreviewLayout(current);
    });
  });

  test('Profile — Custom Theme Colors', {
    tag: ['@AUT-PRF-007', '@profile', '@creator', '@regression'],
  }, async ({ creatorNav, customizePage, creatorAppearance }) => {
    test.setTimeout(180000);
    expect(creatorAppearance.customization.customTheme).not.toEqual(customColors);

    await test.step('Custom shows Background Color, Primary and Secondary fields', async () => {
      await creatorNav.goto('customize');
      await customizePage.openSection('Theme');
      for (const field of ['Background Color', 'Primary', 'Secondary'] as const) await expect(customizePage.colorInput(field)).toBeVisible();
    });

    await test.step('A valid Background Color is accepted and repaints the preview', async () => {
      await customizePage.setColor('Background Color', customColors.background);
      await customizePage.expectColor('Background Color', customColors.background);
      await customizePage.expectPreviewBackground(customColors.background);
    });

    await test.step('A valid Primary colour is accepted and used by the preview', async () => {
      await customizePage.setColor('Primary', customColors.primary);
      await customizePage.expectColor('Primary', customColors.primary);
      await customizePage.expectPreviewUsesColor(customColors.primary);
    });

    await test.step('A valid Secondary colour is accepted and used by the preview', async () => {
      await customizePage.setColor('Secondary', customColors.secondary);
      await customizePage.expectColor('Secondary', customColors.secondary);
      await customizePage.expectPreviewUsesColor(customColors.secondary);
    });

    await test.step('Saved custom colours persist after a reload', async () => {
      await customizePage.save();
      await customizePage.reloadSection('Theme');
      await customizePage.expectColor('Background Color', customColors.background);
      await customizePage.expectColor('Primary', customColors.primary);
      await customizePage.expectColor('Secondary', customColors.secondary);
    });

    await test.step('Invalid colours stay in the field without an error and only keep Save disabled', async () => {
      await customizePage.expectColorFieldsFreeText();
      await customizePage.setColor('Primary', validColorForPrimary);
      await customizePage.expectSaveEnabled();
      for (const value of invalidColors) {
        await customizePage.setColor('Primary', value);
        await customizePage.expectColor('Primary', value);
        await customizePage.expectNoColorError();
        await customizePage.expectSaveEnabled(false);
      }
    });
  });

  test('Profile — Role, Header Background, Image Crop Editor, Upload Guidance, Your Interest, First Run', {
    tag: ['@AUT-PRF-008', '@profile', '@creator', '@regression'],
    annotation: [{ type: 'issue', description: 'L-53 (CP-12)' }],
  }, async ({ creatorNav, customizePage, browser, request, creatorAppearance, dbFixtures }) => {
    test.setTimeout(300000);
    // Known bug L-53 / CP-12: the Header upload copy says 1:1 and 1080px while the cropper makes 900×506. Last step.
    test.fail(true, 'L-53 (CP-12): upload guidance does not match the cropper output');
    const account = await getAccount(request);
    await dbFixtures.protectAppearanceMedia(account.uuid);
    const name = creatorAppearance.profile.name || generateProfileName();
    const interest = (await getAccountProfile(request)).interestNames.includes('Travel') ? 'Cosplay' : 'Travel';

    await test.step('A saved role can be swapped for another, Others covers unlisted roles, and there is no empty option', async () => {
      await creatorNav.goto('customize');
      await customizePage.openSection('Profile');
      await customizePage.fillName(name);
      await customizePage.openRoleOptions();
      await customizePage.chooseRoleOption('Educator');
      await customizePage.save();
      await customizePage.reloadSection('Profile');
      await customizePage.openRoleOptions();
      await customizePage.expectRoleOptionMarked('Educator');
      expect(await customizePage.roleOptionNames()).toEqual([...roleOptions]);
      await customizePage.chooseRoleOption('Others');
      await customizePage.fillName(name);
      await customizePage.save();
      await customizePage.reloadSection('Profile');
      await customizePage.expectRole('Others');
    });

    await test.step('A role chosen from the selector is saved and kept after refresh', async () => {
      await customizePage.openRoleOptions();
      await customizePage.chooseRoleOption('Content Creator');
      await customizePage.fillName(name);
      await customizePage.save();
      await customizePage.reloadSection('Profile');
      await customizePage.expectRole('Content Creator');
      expect((await getAccountProfile(request)).role).toBe('Content Creator');
    });

    await test.step('Selected interests show as active and persist after Save and refresh', async () => {
      await customizePage.toggleInterest(interest);
      await customizePage.expectInterestSelected(interest);
      await customizePage.fillName(name);
      await customizePage.save();
      await customizePage.reloadSection('Profile');
      await customizePage.expectInterestSelected(interest);
    });

    await test.step('Saved interests come from the interests endpoint; the account payload carries no interests field', async () => {
      const profile = await getAccountProfile(request);
      expect(profile.accountKeys).not.toContain('interests');
      expect(profile.interestNames).toContain(interest);
      for (const chip of profile.interestNames) await customizePage.expectInterestSelected(chip);
    });

    await test.step('Header Background offers a gallery and an upload, and the account follows the chosen source', async () => {
      await customizePage.openBannerDialog();
      await customizePage.expectBannerModes();
      await customizePage.expectBannerGalleryCount(4);
      await customizePage.chooseBannerGallery(3);
      await customizePage.fillName(name);
      await customizePage.save();
      await expect.poll(async () => (await getAccountProfile(request)).backgroundPath, { timeout: 15000 }).toContain('bg_option_3');
      await customizePage.uploadBanner(profileCustomizationData.bannerPath);
      await customizePage.save();
      await expect.poll(async () => (await getAccountProfile(request)).backgroundPath, { timeout: 15000 }).toContain(`${account.uuid}/background/`);
    });

    await test.step('Profile picture and header both pass through a crop editor with zoom, and Apply updates the preview', async () => {
      await customizePage.openPictureUpload();
      await customizePage.chooseImageFile('Upload Profile Picture', profileCustomizationData.profilePicturePath, 'Crop Profile Picture');
      await customizePage.expectCropControls('Crop Profile Picture');
      await customizePage.applyCrop('Crop Profile Picture');
      expect(await customizePage.stagedImageSize('picture')).toEqual(profileDialogs.cropOutput.picture);
      await customizePage.openBannerDialog();
      await customizePage.openBannerUploadTab();
      await customizePage.chooseImageFile('Header Background', profileCustomizationData.bannerPath, 'Crop Header');
      await customizePage.expectCropControls('Crop Header');
      await customizePage.applyCrop('Crop Header');
      expect(await customizePage.stagedImageSize('banner')).toEqual(profileDialogs.cropOutput.banner);
    });

    await test.step('A newly onboarded creator meets the welcome dialog and a My Page built from the chosen tools', async () => {
      const fresh = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      try {
        const signIn = await fresh.newPage();
        const { token } = await signInWithEmailOtp(signIn, baseURL, inboxAccounts.emptyCreator);
        await loginWithToken(fresh, token, creatorsBaseURL);
        const tools = await getCreatorFavorites(request, token);
        expect(tools.length).toBeGreaterThan(0);
        const home = new CustomizePage(signIn, creatorsBaseURL);
        await home.expectWelcomeDialog();
        await home.goto();
        await home.expectQuickActions(tools.map((tool) => toolLabels[tool] ?? tool));
        await home.expectMyPageTabs(myPageTabs);
        await home.expectLinksEmptyState();
      } finally {
        await fresh.close();
      }
    });

    await test.step('Upload guidance matches the aspect ratio and size each cropper actually produces', async () => {
      await customizePage.openPictureUpload();
      expect(await customizePage.uploadGuidance('Upload Profile Picture')).toEqual([...profileDialogs.guidance]);
      await customizePage.closeDialogs();
      await customizePage.openBannerDialog();
      await customizePage.openBannerUploadTab();
      const banner = profileDialogs.cropOutput.banner;
      expect(guidanceRatio(await customizePage.uploadGuidance('Header Background'))).toBeCloseTo(banner.width / banner.height, 1);
    });
  });

  test('Profile — Live Preview, Appearance Save', {
    tag: ['@AUT-PRF-009', '@profile', '@creator', '@regression'],
  }, async ({ creatorNav, customizePage, browser, creatorAppearance }) => {
    test.setTimeout(240000);
    const name = generateProfileName();
    const label = generateTipLabel();

    await test.step('Preview offers a desktop and a mobile mode, both unnamed, plus Close', async () => {
      await creatorNav.goto('customize');
      await customizePage.openSection('Theme');
      await customizePage.openPreviewDialog();
      await customizePage.expectPreviewDialogClose();
      await expect(customizePage.previewDialogModeButtons()).toHaveCount(2);
      expect(await customizePage.previewDialogModeNames()).toEqual(['', '']);
      await expect.poll(() => customizePage.previewDialogWidth()).toBe(1222);
      await customizePage.previewDialogModeButtons().nth(1).click();
      await expect.poll(() => customizePage.previewDialogWidth()).toBe(388);
      await customizePage.previewDialogModeButtons().nth(0).click();
      await expect.poll(() => customizePage.previewDialogWidth()).toBe(1222);
      await customizePage.closePreviewDialog();
    });

    await test.step('A live preview of the creator page sits beside the editor', async () => {
      await customizePage.expectLivePreview(handle);
      const mobile = await customizePage.previewWidth();
      await customizePage.togglePreviewDevice();
      await expect.poll(() => customizePage.previewWidth()).toBeGreaterThan(mobile);
      await customizePage.togglePreviewDevice();
      await expect.poll(() => customizePage.previewWidth()).toBe(mobile);
    });

    await test.step('Theme, Profile and Tip Button edits show in the preview immediately', async () => {
      await customizePage.selectThemePreset('Midnight');
      await customizePage.expectPreviewBackground((await customizePage.readThemeColors())['Background Color']);
      await customizePage.openSection('Profile');
      await customizePage.fillName(name);
      await customizePage.expectPreviewText(name);
      await customizePage.openSection('Tip Button');
      await customizePage.setTipButtonShown(true);
      await customizePage.fillTipLabel(label);
      await customizePage.expectPreviewText(label);
    });

    await test.step('Unsaved edits stay in the preview only; the public profile keeps the saved look', async () => {
      await openPublicProfile(browser, handle, async (profile) => {
        await profile.expectTextAbsent(name);
        await profile.expectTextAbsent(label);
      });
    });

    await test.step('Saving publishes the edits to the public profile and keeps them after refresh', async () => {
      await customizePage.save();
      await openPublicProfile(browser, handle, async (profile) => {
        await profile.expectTextShown(name);
        await profile.expectTipCtaLabelAfterSave(label);
      });
      await customizePage.reloadSection('Profile');
      await customizePage.expectProfileValues({ name });
      expect(creatorAppearance.tipButton.tipButtonText).not.toBe(label);
    });
  });

  test('Profile — Tip Button Controls, Tip Button Visibility, Button Text', {
    tag: ['@AUT-PRF-010', '@profile', '@creator', '@regression'],
  }, async ({ creatorNav, customizePage, browser, creatorAppearance }) => {
    test.setTimeout(240000);
    const label = generateTipLabel();
    const draftLabel = generateTipLabel();

    await test.step('Tip Button lists its switch, text, colours, both quick-amount sets, Preview and Save', async () => {
      await creatorNav.goto('customize');
      await customizePage.openSection('Tip Button');
      await customizePage.setTipButtonShown(true);
      await customizePage.expectTipControls();
    });

    await test.step('The Show Tip Button switch hides and shows the button in the preview', async () => {
      await customizePage.fillTipLabel(draftLabel);
      await customizePage.expectPreviewText(draftLabel);
      await customizePage.setTipButtonShown(false);
      await customizePage.expectTipControlsHidden();
      await customizePage.expectPreviewWithoutText(draftLabel);
      await customizePage.setTipButtonShown(true);
      await customizePage.expectPreviewText(draftLabel);
    });

    await test.step('Custom Button Text shows in the preview and saves', async () => {
      await customizePage.fillTipLabel(label);
      await customizePage.expectInlineTipPreview(label);
      await customizePage.expectPreviewText(label);
      await customizePage.fillTipColorsAndAmounts(tipButtonColors, quickAmountEdits.idr);
      await customizePage.save();
    });

    await test.step('Turning the Tip Button on and saving shows the tip CTA on the public profile', async () => {
      await openPublicProfile(browser, handle, (profile) => profile.expectTipCtaLabelAfterSave(label));
    });

    await test.step('Custom Button Text is applied in the preview and saved', async () => {
      await customizePage.expectTipLabel(label);
      await customizePage.expectPreviewText(label);
    });

    await test.step('The saved Button Text persists after refresh and on the public tip button', async () => {
      await customizePage.reloadSection('Tip Button');
      await customizePage.expectTipLabel(label);
      await openPublicProfile(browser, handle, (profile) => profile.expectTipCtaLabelAfterSave(label));
    });

    await test.step('Turning the Tip Button off and saving removes the tip surface from the public profile', async () => {
      await customizePage.setTipButtonShown(false);
      await customizePage.save();
      await openPublicProfile(browser, handle, (profile) => profile.expectNoTipSurface());
    });

    await test.step('Text, colours and quick amounts are kept while the button is hidden', async () => {
      await customizePage.reloadSection('Tip Button');
      await customizePage.setTipButtonShown(true);
      await customizePage.expectTipLabel(label);
      await customizePage.expectColor('Text Color', tipButtonColors.text);
      await customizePage.expectColor('Button Left', tipButtonColors.left);
      await customizePage.expectColor('Button Right', tipButtonColors.right);
      await customizePage.expectQuickAmounts('IDR', quickAmountEdits.idr);
      expect(creatorAppearance.tipButton.isTipButton).toBeDefined();
    });
  });

  test('Profile — Button Text, Tip Button Colors, Quick Amounts, Tip Button Save', {
    tag: ['@AUT-PRF-011', '@profile', '@creator', '@regression'],
  }, async ({ creatorNav, customizePage, creatorAppearance }) => {
    test.setTimeout(240000);
    expect(creatorAppearance.quickAmounts.rules.length).toBeGreaterThan(0);

    await test.step('Button Text stops at 40 characters with its counter', async () => {
      await creatorNav.goto('customize');
      await customizePage.openSection('Tip Button');
      await customizePage.setTipButtonShown(true);
      await customizePage.fillTipLabel(tipButtonData.overflowLabel);
      await expect(customizePage.tipLabelInput).toHaveValue(tipButtonData.overflowLabel.slice(0, tipButtonData.labelMaxChars));
      await customizePage.expectTipLabelCounter(`${tipButtonData.labelMaxChars}/${tipButtonData.labelMaxChars}`);
      await customizePage.fillTipLabel(tipButtonData.label);
    });

    await test.step('Text Color accepts a hex value and repaints the preview button text', async () => {
      await customizePage.setColor('Text Color', tipButtonColors.text);
      await customizePage.expectColor('Text Color', tipButtonColors.text);
      await expect.poll(async () => (await customizePage.inlineTipPreviewStyle(tipButtonData.label)).color).toBe(customizePage.rgb(tipButtonColors.text));
    });

    await test.step('Button Left accepts a hex value and starts the preview gradient', async () => {
      await customizePage.setColor('Button Left', tipButtonColors.left);
      await customizePage.expectColor('Button Left', tipButtonColors.left);
      await expect.poll(async () => (await customizePage.inlineTipPreviewStyle(tipButtonData.label)).background).toContain(customizePage.rgb(tipButtonColors.left));
    });

    await test.step('Button Right accepts a hex value and ends the preview gradient', async () => {
      await customizePage.setColor('Button Right', tipButtonColors.right);
      await customizePage.expectColor('Button Right', tipButtonColors.right);
      await expect.poll(async () => (await customizePage.inlineTipPreviewStyle(tipButtonData.label)).background).toContain(customizePage.rgb(tipButtonColors.right));
    });

    await test.step('IDR and USDT quick amounts save and persist', async () => {
      await customizePage.fillQuickAmounts('IDR', quickAmountEdits.idr);
      await customizePage.fillQuickAmounts('USDT', quickAmountEdits.usdt);
      await customizePage.save();
      await customizePage.reloadSection('Tip Button');
      await customizePage.expectQuickAmounts('IDR', quickAmountEdits.idr);
      await customizePage.expectQuickAmounts('USDT', quickAmountEdits.usdt);
    });

    await test.step('Text, colours and quick amounts survive turning the button off, saving, and on again', async () => {
      await customizePage.setTipButtonShown(false);
      await customizePage.save();
      await customizePage.reloadSection('Tip Button');
      await customizePage.setTipButtonShown(true);
      await customizePage.expectTipLabel(tipButtonData.label);
      await customizePage.expectColor('Text Color', tipButtonColors.text);
      await customizePage.expectColor('Button Left', tipButtonColors.left);
      await customizePage.expectColor('Button Right', tipButtonColors.right);
      await customizePage.expectQuickAmounts('IDR', quickAmountEdits.idr);
      await customizePage.expectQuickAmounts('USDT', quickAmountEdits.usdt);
    });
  });

  test('Profile — Quick Tip Amounts', {
    tag: ['@AUT-PRF-012', '@profile', '@creator', '@regression'],
  }, async ({ creatorNav, customizePage, browser, creatorAppearance }) => {
    test.setTimeout(240000);
    expect(creatorAppearance.quickAmounts.isEnabled).toBeDefined();

    await test.step('IDR and USDT quick-amount inputs show without a separate Quick Amount toggle', async () => {
      await creatorNav.goto('customize');
      await customizePage.openSection('Tip Button');
      await customizePage.setTipButtonShown(true);
      await expect(customizePage.quickAmounts('IDR')).toHaveCount(3);
      await expect(customizePage.quickAmounts('USDT')).toHaveCount(3);
      await customizePage.expectOnlyTipSwitch();
    });

    await test.step('Edited IDR quick amounts save and persist after refresh', async () => {
      await customizePage.fillQuickAmounts('IDR', quickAmountEdits.idr);
      await customizePage.save();
      await customizePage.reloadSection('Tip Button');
      await customizePage.expectQuickAmounts('IDR', quickAmountEdits.idr);
    });

    await test.step('Edited USDT quick amounts save and persist after refresh', async () => {
      await customizePage.fillQuickAmounts('USDT', quickAmountEdits.usdt);
      await customizePage.save();
      await customizePage.reloadSection('Tip Button');
      await customizePage.expectQuickAmounts('USDT', quickAmountEdits.usdt);
    });

    await test.step('Saved quick amounts are the choices in the public tipping flow', async () => {
      await openPublicProfile(browser, handle, (profile) => profile.expectQuickTipChips(quickAmountEdits.idrChips));
      const tipTab = await browser.newContext();
      try {
        const tip = new TipPage(await tipTab.newPage(), baseURL);
        await tip.goto(handle);
        await tip.expectQuickTipAmountsVisible(quickAmountEdits.idrChips);
      } finally {
        await tipTab.close();
      }
    });

    await test.step('Quick amounts stay populated after Save and refresh', async () => {
      await customizePage.reloadSection('Tip Button');
      await customizePage.expectQuickAmounts('IDR', quickAmountEdits.idr);
      await customizePage.expectQuickAmounts('USDT', quickAmountEdits.usdt);
    });

    await test.step('Quick amounts are kept when the button is turned off, saved, and turned on again', async () => {
      await customizePage.setTipButtonShown(false);
      await customizePage.save();
      await customizePage.reloadSection('Tip Button');
      await customizePage.setTipButtonShown(true);
      await customizePage.expectQuickAmounts('IDR', quickAmountEdits.idr);
      await customizePage.expectQuickAmounts('USDT', quickAmountEdits.usdt);
    });
  });

  test('Profile — Text Block', {
    tag: ['@AUT-PRF-013', '@profile', '@creator', '@regression'],
    annotation: [{ type: 'issue', description: 'CP-10' }],
  }, async ({ creatorNav, customizePage, browser, request }) => {
    test.setTimeout(300000);
    // Open gap under CP-10: the server still saves empty / whitespace-only Text blocks. Last step.
    test.fail(true, 'CP-10: the API accepts an empty Text block');
    const content = generateTextBlockContent();
    const tableMarker = `QA table ${Date.now().toString().slice(-5)}`;
    const created: number[] = [];

    try {
      await test.step('Add Block offers Text as the fourth suggested tile and opens the Add Text editor', async () => {
        await creatorNav.goto('customize');
        await customizePage.openSection('My Page');
        await customizePage.openMyPageTab('Links');
        await customizePage.openAddBlock();
        expect(await customizePage.suggestedBlockTiles()).toEqual([...textBlockData.suggestedTiles]);
        await customizePage.chooseTextBlock();
      });

      await test.step('Heading, bold, list and alignment formatting is saved and rendered on the public profile', async () => {
        await customizePage.expectTextToolbar(textBlockData.toolbar);
        await customizePage.expectNoTextControls(textBlockData.absentControls);
        await customizePage.typeInTextEditor(content.heading);
        await customizePage.setParagraphStyle('Heading');
        await customizePage.pressTextToolbar('Bold');
        await customizePage.page.keyboard.type(content.bold);
        await customizePage.pressTextToolbar('Bold');
        await customizePage.page.keyboard.press('Enter');
        await customizePage.pressTextToolbar('Bulleted list');
        await customizePage.page.keyboard.type(content.items[0]);
        await customizePage.page.keyboard.press('Enter');
        await customizePage.page.keyboard.type(content.items[1]);
        await customizePage.pressTextToolbar('Align center');
        await expect(customizePage.alignButton('Align center')).toHaveAttribute('aria-pressed', 'true');
        const html = await customizePage.editorHtml();
        expect(html).toMatch(/<h\d[^>]*>[^<]*QA heading/);
        expect(html).toContain(`<strong>${content.bold}</strong>`);
        expect(html).toMatch(/<ul[^>]*>[\s\S]*QA item one[\s\S]*QA item two/);
        await customizePage.submitTextBlock();
        await customizePage.expectTextBlockRow(content.heading);
        created.push((await findTextBlock(request, content.heading))!.id);
        await openPublicProfile(browser, handle, (profile) => profile.expectTextBlockFormatting({ heading: content.heading, bold: content.bold, listItems: content.items }));
      });

      await test.step('A table typed in the HTML code view renders as a real table in the editor and on the profile', async () => {
        await customizePage.openAddBlock();
        await customizePage.chooseTextBlock();
        await customizePage.openCodeView();
        await customizePage.fillHtmlSource(`<p>${tableMarker}</p>${textBlockData.tableHtml}`);
        await customizePage.backToEditor();
        await customizePage.expectEditorTable(textBlockData.tableCells);
        await customizePage.submitTextBlock();
        await customizePage.expectTextBlockRow(tableMarker);
        created.push((await findTextBlock(request, tableMarker))!.id);
        await openPublicProfile(browser, handle, (profile) => profile.expectTextBlockTable(textBlockData.tableCells));
      });

      await test.step('The server strips dangerous HTML on create and keeps the allow-list', async () => {
        const { status, block } = await createTextBlock(request, textBlockData.maliciousHtml);
        expect(status).toBe(200);
        created.push(block!.id);
        for (const tag of textBlockData.strippedTags) expect(block!.htmlContent).not.toContain(tag);
        for (const tag of textBlockData.keptTags) expect(block!.htmlContent).toContain(tag);
        for (const text of textBlockData.keptTexts) expect(block!.htmlContent).toContain(text);
      });

      await test.step('The server sanitises again on every edit', async () => {
        const { block: first } = await createTextBlock(request, '<p>QA clean block</p>');
        created.push(first!.id);
        const { status, block } = await updateTextBlock(request, first!.id, textBlockData.maliciousHtml);
        expect(status).toBe(200);
        for (const tag of textBlockData.strippedTags) expect(block!.htmlContent).not.toContain(tag);
        for (const tag of textBlockData.keptTags) expect(block!.htmlContent).toContain(tag);
      });

      await test.step('A Text block hides, shows again and deletes like any other block', async () => {
        await customizePage.setTextBlockShown(tableMarker, false);
        await openPublicProfile(browser, handle, (profile) => profile.expectNoTextBlock(tableMarker));
        await customizePage.setTextBlockShown(tableMarker, true);
        await openPublicProfile(browser, handle, (profile) => profile.expectTextBlock(tableMarker));
        await customizePage.deleteTextBlock(tableMarker);
        expect(await findTextBlock(request, tableMarker)).toBeUndefined();
      });

      await test.step('Empty or whitespace-only content cannot be added from the editor or saved through the API', async () => {
        await customizePage.openAddBlock();
        await customizePage.chooseTextBlock();
        await expect(customizePage.addTextButton).toBeDisabled();
        await customizePage.typeInTextEditor('   ');
        await expect(customizePage.addTextButton).toBeDisabled();
        for (const html of textBlockData.emptyContents) {
          const { status, block } = await createTextBlock(request, html);
          if (block) created.push(block.id);
          expect(status, `empty content ${JSON.stringify(html)} must be rejected`).toBeGreaterThanOrEqual(400);
        }
      });
    } finally {
      for (const marker of [content.heading, tableMarker]) {
        const leftover = await findTextBlock(request, marker);
        if (leftover) created.push(leftover.id);
      }
      for (const id of new Set(created)) await deleteTextBlock(request, id);
    }
  });
});
