import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain } from "@utils/heal-utils";

export type CustomizeSection = "My Page" | "Theme" | "Profile" | "Tip Button";
export type ThemeColorField = "Background Color" | "Primary" | "Secondary";
export type TipColorField = "Text Color" | "Button Left" | "Button Right";
export type SocialPlatform = "tiktok" | "x" | "instagram" | "web" | "youtube";
export type MyPageTab = "Links" | "Products" | "Feeds" | "Memberships";

/** Social platforms in the order `/customize` renders their icon buttons (the API `position`). */
const SOCIAL_ORDER: readonly SocialPlatform[] = ["tiktok", "x", "instagram", "web", "youtube"];

/** The heading that tells a section has rendered. My Page has none — its tablist stands in. */
const SECTION_HEADING: Record<Exclude<CustomizeSection, "My Page">, string> = {
  Theme: "Theme",
  Profile: "Header",
  "Tip Button": "Tip Button",
};

/**
 * `/customize` — the creator's "My Page" editor. A section nav (My Page, Theme, Profile, Tip Button,
 * Domain, Clan) swaps the left workspace; the right panel holds a live preview iframe of the buyer
 * page plus Undo / Redo / Save. Nothing auto-saves: every section commits through the one Save.
 */
export class CustomizePage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto() {
    await this.page.goto(new URL("customize", this.baseURL).toString());
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/customize/);
    expect(this.page.url()).not.toContain("/auth");
  }

  /** The editor column; the page nests it in a second `main` inside the app shell's `main`. */
  private get workspace(): Locator {
    return this.page.getByRole("main").getByRole("main");
  }

  private sectionButton(section: CustomizeSection): Locator {
    return locatorChain(this.page, { role: "button", name: section, exact: true }).first();
  }

  async openSection(section: CustomizeSection) {
    await this.sectionButton(section).click();
    if (section === "My Page") {
      await expect(this.workspace.getByRole("tablist")).toBeVisible({ timeout: 15000 });
    } else {
      await expect(this.workspace.getByRole("heading", { name: SECTION_HEADING[section], level: 2 })).toBeVisible({ timeout: 15000 });
    }
  }

  /** Reload `/customize` and come back to a section — the persistence check every TC ends with. */
  async reloadSection(section: CustomizeSection) {
    await this.goto();
    await this.expectLoaded();
    await this.openSection(section);
  }

  // ── Side panel: Save, unsaved notice, live preview ──

  private get panel(): Locator {
    return this.page.getByRole("complementary");
  }

  get saveButton(): Locator {
    return this.panel.getByRole("button", { name: "Save", exact: true });
  }

  async expectSaveEnabled(enabled = true) {
    if (enabled) await expect(this.saveButton).toBeEnabled({ timeout: 5000 });
    else await expect(this.saveButton).toBeDisabled({ timeout: 5000 });
  }

  /** Save and wait for the "Changes saved" toast — the one confirmation every section shares. */
  async save() {
    await this.expectSaveEnabled();
    await this.saveButton.click();
    await expect(this.page.getByText("Changes saved", { exact: true }).first()).toBeVisible({ timeout: 15000 });
    await this.expectSaveEnabled(false);
  }

  private get unsavedNotice(): Locator {
    return this.page.getByRole("alert").filter({ hasText: "Unsaved Changes" });
  }

  async expectUnsavedNotice() {
    await expect(this.unsavedNotice).toBeVisible({ timeout: 5000 });
    await expect(this.unsavedNotice).toContainText("Please save your changes before leaving this page.");
  }

  async expectNoUnsavedNotice() {
    await expect(this.unsavedNotice).toHaveCount(0, { timeout: 5000 });
  }

  private get previewIframe(): Locator {
    return this.panel.locator("iframe");
  }

  private get preview() {
    return this.previewIframe.contentFrame();
  }

  async expectLivePreview(handle: string) {
    await expect(this.previewIframe).toHaveAttribute("src", new RegExp(`/${handle}/preview$`));
    await expect(this.preview.locator("body")).toBeVisible({ timeout: 15000 });
  }

  /**
   * Computed background of the preview page body as `rgb(r, g, b)`. Themes may hand the browser a
   * `lab()` colour, so it is painted on a 1×1 canvas and read back as sRGB.
   */
  async previewBackground(): Promise<string> {
    return this.preview.locator("body").evaluate((body) => {
      const g = globalThis as any;
      const ctx = g.document.createElement("canvas").getContext("2d");
      ctx.fillStyle = g.getComputedStyle(body).backgroundColor;
      ctx.fillRect(0, 0, 1, 1);
      const [r, gr, b] = ctx.getImageData(0, 0, 1, 1).data;
      return `rgb(${r}, ${gr}, ${b})`;
    });
  }

  async expectPreviewBackground(hex: string) {
    await expect.poll(() => this.previewBackground(), { timeout: 10000 }).toBe(hexToRgb(hex));
  }

  async expectPreviewText(text: string) {
    await expect(this.preview.getByText(text).first()).toBeAttached({ timeout: 10000 });
  }

  async expectPreviewWithoutText(text: string) {
    await expect(this.preview.getByText(text)).toHaveCount(0, { timeout: 10000 });
  }

  /**
   * The two layouts render different chrome in the preview: Simple has a top "Menu" button and
   * Links/Products tabs; Default has the Shops tab and no Menu button.
   */
  async expectPreviewLayout(layout: "Default" | "Simple") {
    const menu = this.preview.getByRole("button", { name: "Menu" });
    if (layout === "Simple") {
      await expect(menu).toBeVisible({ timeout: 10000 });
      await expect(this.preview.getByText("Shops", { exact: true })).toHaveCount(0);
    } else {
      await expect(menu).toHaveCount(0, { timeout: 10000 });
      await expect(this.preview.getByText("Shops", { exact: true }).first()).toBeVisible();
    }
  }

  /** How many preview elements paint `hex` as text, background or border colour. */
  async previewElementsUsing(hex: string): Promise<number> {
    const rgb = hexToRgb(hex);
    return this.preview.locator("body").evaluate((body, color) => {
      return [body, ...body.querySelectorAll("*")].filter((el) => {
        const cs = (globalThis as any).getComputedStyle(el);
        return cs.color === color || cs.backgroundColor === color || cs.borderTopColor === color || cs.backgroundImage.includes(color);
      }).length;
    }, rgb);
  }

  async expectPreviewUsesColor(hex: string) {
    await expect.poll(() => this.previewElementsUsing(hex), { timeout: 10000 }).toBeGreaterThan(0);
  }

  /** The inline device toggle in the side panel, named for the mode it switches to. */
  async togglePreviewDevice() {
    await this.panel.getByRole("button", { name: /^Switch preview to / }).click();
  }

  async previewWidth(): Promise<number> {
    return (await this.previewIframe.boundingBox())?.width ?? 0;
  }

  private get previewDialog(): Locator {
    return this.page.getByRole("dialog");
  }

  async openPreviewDialog() {
    await this.panel.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(this.previewDialog.locator("iframe")).toBeVisible({ timeout: 10000 });
  }

  /** The dialog's controls: icon-only device buttons (no accessible name) plus Close. */
  previewDialogModeButtons(): Locator {
    return this.previewDialog.getByRole("button").filter({ hasNotText: "Close" });
  }

  async previewDialogModeNames(): Promise<string[]> {
    return this.previewDialogModeButtons().evaluateAll((buttons) =>
      buttons.map((b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim()),
    );
  }

  async expectPreviewDialogClose() {
    await expect(this.previewDialog.getByRole("button", { name: "Close" })).toBeVisible();
  }

  async previewDialogWidth(): Promise<number> {
    return (await this.previewDialog.locator("iframe").boundingBox())?.width ?? 0;
  }

  async closePreviewDialog() {
    await this.previewDialog.getByRole("button", { name: "Close" }).click();
    await expect(this.previewDialog).toHaveCount(0);
  }

  // ── Theme ──

  private get themeGroup(): Locator {
    return this.workspace.getByRole("radiogroup", { name: "Theme" });
  }

  private themeRadio(name: string): Locator {
    return this.themeGroup.getByRole("radio", { name, exact: true });
  }

  async expectThemePresets(names: readonly string[]) {
    await expect(this.themeGroup.getByRole("radio")).toHaveCount(names.length);
    for (const name of names) await expect(this.themeRadio(name)).toBeVisible();
  }

  async selectThemePreset(name: string) {
    await this.themeRadio(name).click();
    await expect(this.themeRadio(name)).toBeChecked();
  }

  /** Exactly `name` is checked among the presets (or none, when custom colours are in use). */
  async expectOnlyThemeChecked(name: string | null, names: readonly string[]) {
    for (const preset of names) {
      if (preset === name) await expect(this.themeRadio(preset)).toBeChecked();
      else await expect(this.themeRadio(preset)).not.toBeChecked();
    }
  }

  /** The `Custom` entry in the preset row: plain text, neither a radio nor a button. */
  async expectCustomEntryIsIndicatorOnly() {
    await expect(this.workspace.getByText("Custom", { exact: true }).first()).toBeVisible();
    await expect(this.workspace.getByRole("radio", { name: "Custom" })).toHaveCount(0);
    await expect(this.workspace.getByRole("button", { name: "Custom", exact: true })).toHaveCount(0);
  }

  colorInput(field: ThemeColorField | TipColorField): Locator {
    return this.workspace.getByRole("textbox", { name: field, exact: true });
  }

  /**
   * Type a colour and leave the field. The field keeps whatever was typed; the app applies it only
   * when it is a valid hex far enough from the other two theme colours — otherwise it is ignored
   * silently (no preview change, Save stays disabled, no message).
   */
  async setColor(field: ThemeColorField | TipColorField, value: string) {
    await this.colorInput(field).fill(value);
    await this.colorInput(field).blur();
  }

  /**
   * Apply a full custom theme in an order each step accepts from any preset: primary first (far from
   * every preset background), then the background, then the secondary.
   */
  async applyCustomTheme(colors: { background: string; primary: string; secondary: string }) {
    await this.setColor("Primary", colors.primary);
    await this.setColor("Background Color", colors.background);
    await this.setColor("Secondary", colors.secondary);
  }

  async readThemeColors(): Promise<Record<ThemeColorField, string>> {
    return {
      "Background Color": await this.colorInput("Background Color").inputValue(),
      Primary: await this.colorInput("Primary").inputValue(),
      Secondary: await this.colorInput("Secondary").inputValue(),
    };
  }

  async expectColor(field: ThemeColorField | TipColorField, value: string) {
    await expect(this.colorInput(field)).toHaveValue(value);
  }

  async expectColorFieldsFreeText() {
    for (const field of ["Background Color", "Primary", "Secondary"] as const) {
      await expect(this.colorInput(field)).toHaveAttribute("type", "text");
      await expect(this.colorInput(field)).not.toHaveAttribute("maxlength", /.*/);
    }
  }

  /** No validation copy anywhere in the workspace — rejected colours are silent. */
  async expectNoColorError() {
    await expect(this.workspace.getByText(/invalid|valid hex|must be/i)).toHaveCount(0);
  }

  private get layoutGroup(): Locator {
    return this.workspace.getByRole("radiogroup", { name: "Profile layout" });
  }

  async expectLayoutOptions(names: readonly string[]) {
    await expect(this.layoutGroup.getByRole("radio")).toHaveCount(names.length);
    for (const name of names) await expect(this.layoutGroup.getByRole("radio", { name, exact: true })).toBeVisible();
  }

  async selectLayout(name: string) {
    await this.layoutGroup.getByRole("radio", { name, exact: true }).click();
    await expect(this.layoutGroup.getByRole("radio", { name, exact: true })).toBeChecked();
  }

  async expectOnlyLayoutChecked(name: string, names: readonly string[]) {
    for (const option of names) {
      const radio = this.layoutGroup.getByRole("radio", { name: option, exact: true });
      if (option === name) await expect(radio).toBeChecked();
      else await expect(radio).not.toBeChecked();
    }
  }

  // ── Profile: header media ──

  private get bannerButton(): Locator {
    return locatorChain(this.page, { role: "button", name: "Change profile banner", selector: '[aria-label="Change profile banner"]' });
  }

  private get pictureButton(): Locator {
    return locatorChain(this.page, { role: "button", name: "Change profile picture", selector: '[aria-label="Change profile picture"]' });
  }

  async expectHeaderControls() {
    await expect(this.bannerButton).toBeVisible({ timeout: 10000 });
    await expect(this.pictureButton).toBeVisible({ timeout: 10000 });
  }

  /** `src` of the banner image inside its button — a `data:` URL while a new image is staged. */
  async bannerImageSrc(): Promise<string> {
    return (await this.bannerButton.locator("img").first().getAttribute("src")) ?? "";
  }

  async pictureImageSrc(): Promise<string> {
    return (await this.pictureButton.locator("img").first().getAttribute("src")) ?? "";
  }

  private dialog(name: string | RegExp): Locator {
    return this.page.getByRole("dialog", { name });
  }

  async openPictureUpload() {
    await this.pictureButton.click();
    await expect(this.dialog("Upload Profile Picture")).toBeVisible({ timeout: 10000 });
  }

  async openBannerDialog() {
    await this.bannerButton.click();
    await expect(this.dialog("Header Background")).toBeVisible({ timeout: 10000 });
  }

  async expectBannerModes() {
    const dialog = this.dialog("Header Background");
    await expect(dialog.getByRole("tab", { name: "Gallery" })).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "Upload" })).toBeVisible();
  }

  async expectBannerGalleryCount(count: number) {
    await expect(this.dialog("Header Background").getByRole("tabpanel", { name: "Gallery" }).getByRole("button", { name: /^Option \d+$/ })).toHaveCount(count);
  }

  async chooseBannerGallery(option: number) {
    await this.dialog("Header Background").getByRole("button", { name: `Option ${option}`, exact: true }).click();
    await expect(this.dialog("Header Background")).toHaveCount(0);
  }

  async openBannerUploadTab() {
    await this.dialog("Header Background").getByRole("tab", { name: "Upload" }).click();
    await expect(this.dialog("Header Background").locator('input[type="file"]')).toBeAttached();
  }

  /** "For Best Results" guidance lines of an upload dialog. */
  async uploadGuidance(dialogName: "Upload Profile Picture" | "Header Background"): Promise<string[]> {
    return this.dialog(dialogName).getByRole("listitem").allInnerTexts();
  }

  async expectFileInput(dialogName: "Upload Profile Picture" | "Header Background") {
    const input = this.dialog(dialogName).locator('input[type="file"]');
    await expect(input).toBeAttached();
    await expect(input).toHaveAttribute("accept", "image/*");
  }

  /** Pick a file in an open upload dialog; returns once its crop dialog is up. */
  async chooseImageFile(dialogName: "Upload Profile Picture" | "Header Background", filePath: string, cropDialog: "Crop Profile Picture" | "Crop Header") {
    await this.dialog(dialogName).locator('input[type="file"]').setInputFiles(filePath);
    await expect(this.dialog(cropDialog)).toBeVisible({ timeout: 15000 });
  }

  async expectCropControls(cropDialog: "Crop Profile Picture" | "Crop Header") {
    const dialog = this.dialog(cropDialog);
    await expect(dialog.getByRole("img", { name: "Crop target" })).toBeVisible();
    await expect(dialog.getByRole("slider")).toBeVisible();
    for (const action of ["Go back", "Cancel", "Apply"]) await expect(dialog.getByRole("button", { name: action })).toBeVisible();
  }

  /** Escape does not close these dialogs: Cancel the crop, then close the upload dialog if it stayed. */
  async cancelCrop(cropDialog: "Crop Profile Picture" | "Crop Header") {
    await this.dialog(cropDialog).getByRole("button", { name: "Cancel" }).click();
    await expect(this.dialog(cropDialog)).toHaveCount(0);
    await this.closeDialogs();
  }

  /** Close whatever upload dialog is still open through its own Close button. */
  async closeDialogs() {
    const open = this.page.getByRole("dialog");
    for (let attempt = 0; attempt < 3 && (await open.count()); attempt++) {
      await open.first().getByRole("button", { name: "Close" }).click({ timeout: 5000 }).catch(() => undefined);
      await expect(open).toHaveCount(0, { timeout: 5000 }).catch(() => undefined);
    }
    await expect(open).toHaveCount(0, { timeout: 5000 });
  }

  async applyCrop(cropDialog: "Crop Profile Picture" | "Crop Header") {
    await this.dialog(cropDialog).getByRole("button", { name: "Apply" }).click();
    await expect(this.dialog(cropDialog)).toHaveCount(0);
  }

  async uploadProfilePicture(filePath: string) {
    await this.openPictureUpload();
    await this.chooseImageFile("Upload Profile Picture", filePath, "Crop Profile Picture");
    await this.applyCrop("Crop Profile Picture");
  }

  async uploadBanner(filePath: string) {
    await this.openBannerDialog();
    await this.openBannerUploadTab();
    await this.chooseImageFile("Header Background", filePath, "Crop Header");
    await this.applyCrop("Crop Header");
  }

  /** Natural size of the staged (cropped) image in a header control. */
  async stagedImageSize(control: "banner" | "picture"): Promise<{ width: number; height: number }> {
    const img = (control === "banner" ? this.bannerButton : this.pictureButton).locator("img").first();
    await expect(img).toHaveAttribute("src", /^data:image\//, { timeout: 10000 });
    return img.evaluate((el) => ({ width: (el as any).naturalWidth, height: (el as any).naturalHeight }));
  }

  // ── Profile: text fields ──

  get nameInput(): Locator {
    return locatorChain(this.page, { role: "textbox", name: "Your Name", selector: "#design-profile-name" });
  }

  get linkInput(): Locator {
    return locatorChain(this.page, { role: "textbox", name: "Link", selector: "#design-profile-username" });
  }

  get bioInput(): Locator {
    return locatorChain(this.page, { role: "textbox", name: "Bio", selector: "#design-profile-bio" });
  }

  async expectLinkPrefix() {
    await expect(this.workspace.getByText("yapp.ink/", { exact: true })).toBeVisible();
  }

  async fillName(value: string) {
    await this.nameInput.fill(value);
  }

  async fillLink(value: string) {
    await this.linkInput.fill(value);
  }

  async fillBio(value: string) {
    await this.bioInput.fill(value);
  }

  async expectProfileValues(values: { name?: string; link?: string; bio?: string }) {
    if (values.name !== undefined) await expect(this.nameInput).toHaveValue(values.name);
    if (values.link !== undefined) await expect(this.linkInput).toHaveValue(values.link);
    if (values.bio !== undefined) await expect(this.bioInput).toHaveValue(values.bio);
  }

  async expectBioCounter(text: string) {
    await expect(this.workspace.getByText(text, { exact: true })).toBeVisible();
  }

  async expectNoLengthLimit(field: "name" | "link") {
    const input = field === "name" ? this.nameInput : this.linkInput;
    await expect(input).not.toHaveAttribute("maxlength", /.*/);
  }

  async expectBioLimit(max: number) {
    await expect(this.bioInput).toHaveAttribute("maxlength", String(max));
  }

  /** Counters on this tab look like `n/200`; Your Name and Link carry none. */
  async counterTexts(): Promise<string[]> {
    return this.workspace.getByText(/^\d+\/\d+$/).allInnerTexts();
  }

  /** No inline validation message under the profile fields. */
  async expectNoFieldError() {
    await expect(this.workspace.getByText(/required|cannot be empty|must be|invalid/i)).toHaveCount(0);
  }

  // ── Profile: role and interests ──

  private get roleSelect(): Locator {
    return this.workspace.getByRole("combobox");
  }

  async openRoleOptions() {
    await this.roleSelect.click();
    await expect(this.page.getByRole("option").first()).toBeVisible({ timeout: 5000 });
  }

  async roleOptionNames(): Promise<string[]> {
    return this.page.getByRole("option").allInnerTexts();
  }

  /** The option marked as current: `data-state=checked` plus a check icon. */
  async expectRoleOptionMarked(role: string) {
    const option = this.page.getByRole("option", { name: role, exact: true });
    await expect(option).toHaveAttribute("data-state", "checked");
    await expect(option.locator("svg")).toHaveCount(1);
    await expect(this.page.getByRole("option").and(this.page.locator('[data-state="checked"]'))).toHaveCount(1);
  }

  async chooseRoleOption(role: string) {
    await this.page.getByRole("option", { name: role, exact: true }).click();
    await expect(this.roleSelect).toHaveText(role);
  }

  async closeRoleOptions() {
    await this.page.keyboard.press("Escape");
    await expect(this.page.getByRole("option")).toHaveCount(0);
  }

  async expectRole(role: string) {
    await expect(this.roleSelect).toHaveText(role);
  }

  private interestChip(name: string): Locator {
    return this.workspace.getByRole("button", { name, exact: true });
  }

  async interestState(name: string): Promise<{ className: string; ariaPressed: string | null; dataState: string | null }> {
    const chip = this.interestChip(name);
    return {
      className: (await chip.getAttribute("class")) ?? "",
      ariaPressed: await chip.getAttribute("aria-pressed"),
      dataState: await chip.getAttribute("data-state"),
    };
  }

  async toggleInterest(name: string) {
    await this.interestChip(name).click();
  }

  /** Selected chips switch to the solid `bg-primary` fill; unselected ones use `bg-primary-background`. */
  async expectInterestSelected(name: string, selected = true) {
    const chip = this.interestChip(name);
    if (selected) await expect(chip).toHaveClass(/(^|\s)bg-primary(\s|$)/);
    else await expect(chip).toHaveClass(/bg-primary-background/);
  }

  // ── Profile: social links ──

  private get socialSection(): Locator {
    return this.workspace.locator("section").filter({ has: this.page.getByRole("heading", { name: "Social Links", level: 2 }) });
  }

  /** The platform's icon button — unnamed, so addressed by its slot in the API order. */
  private socialButton(platform: SocialPlatform): Locator {
    return this.socialSection.locator("form > div").nth(SOCIAL_ORDER.indexOf(platform)).getByRole("button").first();
  }

  async updateSocialLink(platform: SocialPlatform, handle: string) {
    await this.socialButton(platform).click();
    const dialog = this.dialog(`Update social link for ${platform}`);
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByRole("textbox", { name: "@username" }).fill(handle);
    await dialog.getByRole("button", { name: "Update" }).click();
    await expect(dialog).toHaveCount(0);
  }

  async expectSocialHandle(handle: string) {
    await expect(this.socialSection.getByText(`@${handle}`, { exact: true })).toBeVisible();
  }

  // ── Tip Button ──

  get tipSwitch(): Locator {
    return this.workspace.getByRole("switch").first();
  }

  async setTipButtonShown(shown: boolean) {
    if ((await this.tipSwitch.getAttribute("aria-checked")) !== String(shown)) await this.tipSwitch.click();
    await expect(this.tipSwitch).toHaveAttribute("aria-checked", String(shown));
  }

  /** Show Tip Button is the section's only switch — quick amounts have no toggle of their own. */
  async expectOnlyTipSwitch() {
    await expect(this.workspace.getByRole("switch")).toHaveCount(1);
  }

  get tipLabelInput(): Locator {
    return locatorChain(this.page, { role: "textbox", name: "Button Text", selector: "#tip-button-label" });
  }

  async expectTipControls() {
    await expect(this.workspace.getByText("Show Tip Button", { exact: true })).toBeVisible();
    await expect(this.tipLabelInput).toBeVisible();
    for (const field of ["Text Color", "Button Left", "Button Right"] as const) await expect(this.colorInput(field)).toBeVisible();
    await expect(this.quickAmounts("IDR")).toHaveCount(3);
    await expect(this.quickAmounts("USDT")).toHaveCount(3);
    await expect(this.saveButton).toBeVisible();
    await expect(this.panel.getByRole("button", { name: "Preview", exact: true })).toBeVisible();
  }

  async expectTipControlsHidden() {
    await expect(this.tipLabelInput).toHaveCount(0);
    await expect(this.quickAmounts("IDR")).toHaveCount(0);
  }

  async fillTipLabel(value: string) {
    await this.tipLabelInput.fill(value);
  }

  async expectTipLabel(value: string) {
    await expect(this.tipLabelInput).toHaveValue(value);
  }

  async expectTipLabelCounter(text: string) {
    await expect(this.workspace.getByText(text, { exact: true })).toBeVisible();
  }

  /** The inline preview chip above the tip fields: "Preview" followed by the current label. */
  async expectInlineTipPreview(label: string) {
    await expect(this.workspace.getByText(label, { exact: true }).first()).toBeVisible();
  }

  /** Text colour and gradient of the inline tip preview chip carrying `label`. */
  async inlineTipPreviewStyle(label: string): Promise<{ color: string; background: string }> {
    const chip = this.workspace.getByText(label, { exact: true }).first();
    await expect(chip).toBeVisible();
    return chip.evaluate((el) => {
      let node: any = el;
      let background = "";
      while (node && !background.includes("gradient")) {
        background = (globalThis as any).getComputedStyle(node).backgroundImage;
        node = node.parentElement;
      }
      return { color: (globalThis as any).getComputedStyle(el).color, background };
    });
  }

  rgb(hex: string): string {
    return hexToRgb(hex);
  }

  quickAmounts(currency: "IDR" | "USDT"): Locator {
    return this.workspace.getByRole("textbox", { name: `${currency} quick amount` });
  }

  async fillQuickAmounts(currency: "IDR" | "USDT", values: readonly string[]) {
    for (const [i, value] of values.entries()) await this.quickAmounts(currency).nth(i).fill(value);
  }

  /** The tip colours and IDR quick amounts the retain-while-hidden checks read back. */
  async fillTipColorsAndAmounts(colors: { text: string; left: string; right: string }, idr: readonly string[]) {
    await this.setColor("Text Color", colors.text);
    await this.setColor("Button Left", colors.left);
    await this.setColor("Button Right", colors.right);
    await this.fillQuickAmounts("IDR", idr);
  }

  async expectQuickAmounts(currency: "IDR" | "USDT", values: readonly string[]) {
    for (const [i, value] of values.entries()) await expect(this.quickAmounts(currency).nth(i)).toHaveValue(value);
  }

  // ── First run ──

  /** Home (`/profile`) greets a creator with "Welcome to Yapp!" until they press Let's Get Started. */
  async expectWelcomeDialog() {
    await this.page.goto(new URL("profile", this.baseURL).toString());
    const welcome = this.page.getByRole("dialog").filter({ hasText: "Welcome to Yapp!" });
    await expect(welcome).toBeVisible({ timeout: 20000 });
    await expect(welcome).toContainText("All in one platform to become more closer and interact with your fans");
    await expect(welcome.getByRole("button", { name: /Let.s Get Started!/ })).toBeVisible();
  }

  // ── My Page: block tabs and the Text block ──

  myPageTab(tab: MyPageTab): Locator {
    return this.workspace.getByRole("tab", { name: tab });
  }

  async expectMyPageTabs(tabs: readonly MyPageTab[]) {
    for (const tab of tabs) await expect(this.myPageTab(tab)).toBeVisible({ timeout: 15000 });
    await expect(this.workspace.getByRole("tab")).toHaveCount(tabs.length);
  }

  /** Quick-action buttons under the header: one per tool chosen at onboarding. */
  async expectQuickActions(labels: readonly string[]) {
    for (const label of labels) await expect(this.workspace.getByRole("button", { name: label, exact: true })).toBeVisible({ timeout: 15000 });
    await expect(this.workspace.getByRole("button", { name: "Edit quick actions" })).toBeVisible();
  }

  async openMyPageTab(tab: MyPageTab) {
    await this.myPageTab(tab).click();
    await expect(this.myPageTab(tab)).toHaveAttribute("aria-selected", "true");
  }

  private get linksPanel(): Locator {
    return this.workspace.getByRole("tabpanel", { name: "Links" });
  }

  async expectLinksEmptyState() {
    await expect(this.linksPanel.getByRole("button", { name: "Add Block" })).toBeVisible();
    await expect(this.linksPanel.getByText("Add your first link", { exact: true })).toBeVisible();
  }

  private get addBlockDialog(): Locator {
    return this.dialog("Add Block");
  }

  async openAddBlock() {
    await this.linksPanel.getByRole("button", { name: "Add Block" }).click();
    await expect(this.addBlockDialog).toBeVisible({ timeout: 10000 });
  }

  /** The tile labels of the first "Suggested" row (Folder, Link, Campaign, Text…). */
  async suggestedBlockTiles(): Promise<string[]> {
    const texts = await this.addBlockDialog.getByRole("paragraph").allInnerTexts();
    const second = texts.indexOf("Suggested", 1);
    return texts.slice(1, second > 0 ? second : undefined);
  }

  private get textDialog(): Locator {
    return this.dialog(/^(Add|Edit) Text$/);
  }

  async chooseTextBlock() {
    await this.addBlockDialog.getByText("Text", { exact: true }).click();
    await expect(this.dialog("Add Text")).toBeVisible({ timeout: 10000 });
  }

  private get textEditor(): Locator {
    return this.textDialog.locator(".tiptap.ProseMirror");
  }

  get addTextButton(): Locator {
    return this.textDialog.getByRole("button", { name: "Add Text" });
  }

  async expectTextToolbar(buttons: readonly string[]) {
    await expect(this.textDialog.getByRole("combobox", { name: "Paragraph style" })).toHaveText("Normal");
    for (const name of buttons) await expect(this.textDialog.getByRole("button", { name, exact: true })).toBeVisible();
  }

  async expectNoTextControls(names: readonly string[]) {
    for (const name of names) await expect(this.textDialog.getByRole("button", { name: new RegExp(name, "i") })).toHaveCount(0);
  }

  async typeInTextEditor(text: string) {
    await this.textEditor.click();
    await this.page.keyboard.type(text);
  }

  async clearTextEditor() {
    await this.textEditor.click();
    await this.page.keyboard.press("ControlOrMeta+a");
    await this.page.keyboard.press("Backspace");
  }

  async selectAllInTextEditor() {
    await this.textEditor.click();
    await this.page.keyboard.press("ControlOrMeta+a");
  }

  alignButton(name: "Align left" | "Align center" | "Align right" | "Justify"): Locator {
    return this.textDialog.getByRole("button", { name, exact: true });
  }

  async pressTextToolbar(name: string) {
    await this.textDialog.getByRole("button", { name, exact: true }).click();
  }

  /**
   * Pick a paragraph style for the caret's block. Choosing an option leaves focus on the select —
   * keys typed next would reopen it — so the caret goes back to the end of the editor. TipTap keeps
   * an empty Normal paragraph after a heading, so typing continues there.
   */
  async setParagraphStyle(style: string) {
    await this.textDialog.getByRole("combobox", { name: "Paragraph style" }).click();
    await this.page.getByRole("option", { name: style, exact: true }).click();
    await expect(this.textDialog.getByRole("combobox", { name: "Paragraph style" })).toHaveText(style);
    await this.focusEditorEnd();
  }

  async focusEditorEnd() {
    await this.textEditor.click();
    await this.page.keyboard.press("ControlOrMeta+End");
  }

  async editorHtml(): Promise<string> {
    return this.textEditor.innerHTML();
  }

  async openCodeView() {
    await this.textDialog.getByRole("button", { name: "HTML code view" }).click();
    await expect(this.textDialog.getByRole("textbox", { name: "HTML source" })).toBeVisible();
    await expect(this.textDialog.getByText("Tables are supported. Links, images, video and scripts are removed on save.")).toBeVisible();
  }

  async fillHtmlSource(html: string) {
    await this.textDialog.getByRole("textbox", { name: "HTML source" }).fill(html);
  }

  async backToEditor() {
    await this.textDialog.getByRole("button", { name: "Back to editor" }).click();
    await expect(this.textEditor).toBeVisible();
  }

  async expectEditorTable(cells: readonly string[]) {
    for (const cell of cells) await expect(this.textEditor.getByRole("cell", { name: cell }).or(this.textEditor.getByRole("columnheader", { name: cell }))).toBeVisible();
  }

  async submitTextBlock() {
    await this.addTextButton.click();
    await expect(this.textDialog).toHaveCount(0, { timeout: 10000 });
  }

  textBlockRow(text: string): Locator {
    return this.linksPanel.getByRole("listitem").filter({ hasText: text });
  }

  async expectTextBlockRow(text: string) {
    await expect(this.textBlockRow(text)).toHaveCount(1, { timeout: 15000 });
  }

  async setTextBlockShown(text: string, shown: boolean) {
    const toggle = this.textBlockRow(text).getByRole("switch");
    if ((await toggle.getAttribute("aria-checked")) !== String(shown)) await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", String(shown));
  }

  async deleteTextBlock(text: string) {
    await this.textBlockRow(text).getByRole("button", { name: "Delete text" }).click();
    const confirm = this.page.getByRole("alertdialog", { name: "Delete this text?" });
    await expect(confirm).toContainText("This removes the text block from your page. This can't be undone.");
    await confirm.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(this.textBlockRow(text)).toHaveCount(0, { timeout: 15000 });
  }
}

function hexToRgb(hex: string): string {
  const v = hex.replace("#", "");
  return `rgb(${parseInt(v.slice(0, 2), 16)}, ${parseInt(v.slice(2, 4), 16)}, ${parseInt(v.slice(4, 6), 16)})`;
}
