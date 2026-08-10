import { creatorAuthTest as test, expect } from '../test-base';
import { baseURL } from '@config/env';
import { generateProfileFormState, generateProfileName } from '@test-data/creator/profile.data';
import { creatorProfiles } from '@test-data/buyer/profile.data';

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
});
