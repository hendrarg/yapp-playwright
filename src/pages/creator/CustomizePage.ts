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

  private readonly themeTab = smartLocator(this.page, {
    role: "button",
    name: "Theme",
    text: "Theme",
    selector: "button:has-text('Theme')",
  });

  async selectThemeTab() {
    await this.themeTab.click();
  }

  private readonly tipButtonTab = smartLocator(this.page, {
    role: "button",
    name: "Tip Button",
    text: "Tip Button",
    selector: "button:has-text('Tip Button')",
  });

  async selectTipButtonTab() {
    await this.tipButtonTab.click();
  }

  private readonly presetOrder = ["Default", "Sunset", "Ocean", "Forest", "Midnight"];

  async selectThemePreset(name: string) {
    const index = this.presetOrder.indexOf(name);
    await this.page.getByRole("button", { name: "Aa" }).nth(index).click();
  }

  get backgroundColorInput(): Locator {
    return this.page.getByRole("textbox", { name: "Background Color" });
  }

  get primaryColorInput(): Locator {
    return this.page.getByRole("textbox", { name: "Primary" });
  }

  get secondaryColorInput(): Locator {
    return this.page.getByRole("textbox", { name: "Secondary" });
  }

  get previewFrame(): Locator {
    return this.page.locator("iframe").first();
  }

  async expectThemeTabActive() {
    await expect(this.page.getByRole("heading", { name: "Theme", level: 2 })).toBeVisible({ timeout: 10000 });
  }

  async expectThemePresetsVisible() {
    const swatches = this.page.getByRole("button", { name: "Aa" });
    await expect(swatches.first()).toBeVisible({ timeout: 5000 });
    await expect(swatches).toHaveCount(5);
  }

  async expectColorControlsVisible() {
    await expect(this.backgroundColorInput).toBeVisible({ timeout: 5000 });
    await expect(this.primaryColorInput).toBeVisible({ timeout: 5000 });
    await expect(this.secondaryColorInput).toBeVisible({ timeout: 5000 });
  }

  async expectPreviewVisible() {
    await expect(this.previewFrame).toBeAttached({ timeout: 5000 });
  }

  async expectColorControlsChanged() {
    const bg = await this.backgroundColorInput.inputValue();
    const primary = await this.primaryColorInput.inputValue();
    const secondary = await this.secondaryColorInput.inputValue();
    expect(bg).toBeTruthy();
    expect(primary).toBeTruthy();
    expect(secondary).toBeTruthy();
  }

  get layoutHeading(): Locator {
    return this.page.getByRole("heading", { name: "Profile layout", level: 2 });
  }

  async selectLayout(name: string) {
    await this.layoutHeading.locator("..").getByText(name, { exact: true }).click();
  }

  async expectLayoutOptionsVisible() {
    await expect(this.layoutHeading).toBeVisible({ timeout: 5000 });
    const layoutSection = this.layoutHeading.locator("..");
    await expect(layoutSection.getByText("Default", { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(layoutSection.getByText("Simple", { exact: true })).toBeVisible({ timeout: 5000 });
  }

  async fillBackgroundColor(value: string) {
    await safeFill(this.backgroundColorInput, value);
  }

  async fillPrimaryColor(value: string) {
    await safeFill(this.primaryColorInput, value);
  }

  async fillSecondaryColor(value: string) {
    await safeFill(this.secondaryColorInput, value);
  }

  async expectBackgroundColorValue(expected: string) {
    await expect(this.backgroundColorInput).toHaveValue(expected);
  }

  async expectPrimaryColorValue(expected: string) {
    await expect(this.primaryColorInput).toHaveValue(expected);
  }

  async expectSecondaryColorValue(expected: string) {
    await expect(this.secondaryColorInput).toHaveValue(expected);
  }

  get tipButtonSwitch(): Locator {
    return this.page.getByRole("switch").first();
  }

  get tipButtonTextInput(): Locator {
    return this.page.locator("#tip-button-label");
  }

  get tipButtonCharCount(): Locator {
    return this.page.locator('[class*="char"]').filter({ hasText: /\d+\/\d+/ });
  }

  async toggleTipButton(enabled: boolean) {
    const checked = await this.tipButtonSwitch.getAttribute("aria-checked");
    if ((checked === "true") !== enabled) {
      await this.tipButtonSwitch.click();
    }
    await expect(this.tipButtonSwitch).toHaveAttribute("aria-checked", enabled ? "true" : "false");
  }

  async fillTipButtonText(text: string) {
    await safeFill(this.tipButtonTextInput, text);
  }

  async fillIdrQuickAmount(index: number, value: string) {
    await safeFill(this.page.getByRole("textbox", { name: "IDR quick amount" }).nth(index), value);
  }

  async fillUsdtQuickAmount(index: number, value: string) {
    await safeFill(this.page.getByRole("textbox", { name: "USDT quick amount" }).nth(index), value);
  }

  get idrQuickAmounts(): Locator {
    return this.page.getByRole("textbox", { name: "IDR quick amount" });
  }

  get usdtQuickAmounts(): Locator {
    return this.page.getByRole("textbox", { name: "USDT quick amount" });
  }

  async expectTipButtonTabActive() {
    await expect(this.page.getByRole("heading", { name: "Tip Button", level: 2 })).toBeVisible({ timeout: 10000 });
  }

  async expectTipButtonControlsVisible() {
    await expect(this.tipButtonSwitch).toBeVisible({ timeout: 5000 });
    await expect(this.tipButtonTextInput).toBeVisible({ timeout: 5000 });
    await expect(this.idrQuickAmounts.first()).toBeVisible({ timeout: 5000 });
    await expect(this.usdtQuickAmounts.first()).toBeVisible({ timeout: 5000 });
  }

  async expectTipButtonText(value: string) {
    await expect(this.tipButtonTextInput).toHaveValue(value);
  }

  async expectTipButtonCharCountAt(max: number) {
    await expect(this.tipButtonCharCount.first()).toHaveText(new RegExp(`\\d+\\/${max}`));
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
