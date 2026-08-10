import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { smartLocator } from "@utils/heal-utils";
import { safeClick, safeFill } from "@utils/playwright.utils";

export class CustomizePage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto() {
    await this.page.goto(new URL("customize", this.baseURL).toString());
  }

  async gotoProfileTab() {
    await this.page.goto(new URL("customize", this.baseURL).toString());
    await this.profileTabLocator.first().click();
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/customize/);
    expect(this.page.url()).not.toContain("/auth");
  }

  private readonly profileTab = smartLocator(this.page, {
    role: "button",
    name: "Profile",
    text: "Profile",
    selector: "button:has-text('Profile')",
  });

  private get profileTabLocator(): Locator {
    return this.page.getByRole("button", { name: "Profile" });
  }

  async selectProfileTab() {
    await this.profileTab.click();
  }

  private readonly changeBanner = smartLocator(this.page, {
    role: "button",
    name: "Change profile banner",
    selector: '[aria-label="Change profile banner"]',
  });

  private readonly changePicture = smartLocator(this.page, {
    role: "button",
    name: "Change profile picture",
    selector: '[aria-label="Change profile picture"]',
  });

  private readonly saveBtn = smartLocator(this.page, {
    role: "button",
    name: "Save",
    text: "Save",
    selector: "button:has-text('Save')",
  });

  get yourNameInput(): Locator {
    return this.page.locator("#design-profile-name");
  }

  get linkPrefix(): Locator {
    return this.page.getByText("yapp.ink/");
  }

  get linkInput(): Locator {
    return this.page.locator("#design-profile-username");
  }

  get bioTextarea(): Locator {
    return this.page.locator("#design-profile-bio");
  }

  get saveButton(): Locator {
    return this.page.getByRole("button", { name: "Save" }).first();
  }

  get toastMessage(): Locator {
    return this.page.locator("[data-testid='toast'], .toast, [role='alert']");
  }

  async fillYourName(name: string) {
    await safeFill(this.yourNameInput, name);
  }

  async fillBio(bio: string) {
    await safeFill(this.bioTextarea, bio);
  }

  async fillLink(username: string) {
    await safeFill(this.linkInput, username);
  }

  async clickSave() {
    await this.saveBtn.click();
  }

  async expectProfileTabActive() {
    await expect(this.yourNameInput).toBeVisible({ timeout: 10000 });
  }

  async expectBannerControlVisible() {
    await expect(this.page.getByRole("button", { name: "Change profile banner" })).toBeVisible({ timeout: 5000 });
  }

  async expectProfilePictureControlVisible() {
    await expect(this.page.getByRole("button", { name: "Change profile picture" })).toBeVisible({ timeout: 5000 });
  }

  async expectNamePrefilled() {
    await expect(this.yourNameInput).not.toBeEmpty();
  }

  async expectLinkPrefixed() {
    await expect(this.linkPrefix).toBeVisible();
  }

  async expectNameValue(expected: string) {
    await expect(this.yourNameInput).toHaveValue(expected);
  }

  async expectBioValue(expected: string) {
    await expect(this.bioTextarea).toHaveValue(expected);
  }

  async expectLinkValue(expected: string) {
    await expect(this.linkInput).toHaveValue(expected);
  }

  async expectSaveSuccess() {
    await expect(this.toastMessage.first()).toBeVisible({ timeout: 10000 });
  }
}
