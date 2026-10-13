import fs from "fs";
import path from "path";
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { safeClick } from "@utils/playwright.utils";
import { nextSetDetailsAction, textFeedback } from "@pages/shared/locators";
import { digitalProductPricingData, digitalProductValidationData, productsCreationData } from "@test-data/creator/products.creation.data";

export type DigitalContentType = "media" | "links" | "digital";

/** Content-type cards on step 1: label and the format hint under it. */
export const digitalContentTypes: Record<DigitalContentType, { label: string; hint: string; section: string }> = {
  media: { label: "Media", hint: "MP4, MOV, MP3, JPG, PNG, etc", section: "Upload Your Media Files" },
  links: { label: "Links", hint: "GDrive, Notion, Youtube, etc", section: "Embed Links" },
  digital: { label: "Digital Files", hint: "PDF, ZIP, DOCX, XLS, etc.", section: "Upload Files" },
};

/**
 * Digital Download create/edit (`/products/create/digital-downloads`). Step 1 is Content
 * (content-type cards + buyer-only description); Title, Description, Thumbnail, pricing and the
 * rest of the shared product form are on step 2 (`Next: Set Details`). Step 2 controls shared with
 * other product types are driven through OnlineCoursePage / product-editor helpers.
 */
export class DigitalProductPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  private get main(): Locator {
    return this.page.getByRole("main");
  }

  async goto() {
    await this.page.goto(new URL("products/create/digital-downloads", this.baseURL).toString(), { waitUntil: "domcontentloaded" });
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/products\/(?:create|update)\/digital-downloads/, { timeout: 30000 });
    await expect(this.main.getByText("Content Details", { exact: true }).locator("visible=true").first()).toBeVisible({ timeout: 20000 });
  }

  async expectDigitalProductCreateFlow() {
    await expect(this.page).toHaveURL(productsCreationData.digitalProductCreatePath);
    await expect(this.page.getByRole("heading", { name: "New Digital Download" })).toBeVisible({ timeout: 20000 });
    await expect(this.main.getByText("Content Details", { exact: true })).toBeVisible();
  }

  /** The header Back arrow; with unsaved edits an "Unsaved changes" confirmation should stop it. */
  async leaveViaBack() {
    await safeClick(this.page.getByRole("button", { name: "Back", exact: true }));
  }

  async expectUnsavedChangesPrompt() {
    const dialog = this.page.getByRole("dialog").or(this.page.getByRole("alertdialog")).filter({ hasText: /unsaved|leave|discard|lose your changes|are you sure/i });
    await expect(dialog.first()).toBeVisible({ timeout: 10000 });
  }

  /** Next: Set Details stays reachable at the top while the step scrolls. */
  async expectNextStaysVisibleAfterScroll() {
    await this.page.mouse.wheel(0, 2000);
    await expect(this.page.getByRole("button", { name: "Next: Set Details" })).toBeInViewport({ timeout: 10000 });
  }

  // ── Step 1: content types ──
  /**
   * The card checkboxes have no accessible name, and a hidden duplicate shares the id.
   * State is read from the visible checkbox; the visible card title is what toggles it.
   */
  private contentTypeCheckbox(type: DigitalContentType): Locator {
    return this.page.locator(`#content-type-${type}`).locator("visible=true");
  }



  async expectContentTypeOptions() {
    for (const [type, card] of Object.entries(digitalContentTypes) as Array<[DigitalContentType, (typeof digitalContentTypes)[DigitalContentType]]>) {
      await expect(this.main.getByText(card.label, { exact: true }).first()).toBeVisible({ timeout: 15000 });
      await expect(this.main.getByText(card.hint, { exact: true })).toBeVisible();
      await expect(this.contentTypeCheckbox(type)).toHaveAttribute("aria-checked", "false");
    }
  }

  async setContentType(type: DigitalContentType, checked: boolean) {
    const box = this.contentTypeCheckbox(type);
    await expect(async () => {
      if (((await box.getAttribute("aria-checked")) === "true") !== checked) await box.click({ timeout: 3000 });
      await expect(box).toHaveAttribute("aria-checked", String(checked), { timeout: 2000 });
    }).toPass({ timeout: 15000 });
  }

  async expectContentSection(type: DigitalContentType, visible: boolean) {
    const heading = this.main.getByText(digitalContentTypes[type].section, { exact: false }).first();
    if (visible) await expect(heading).toBeVisible({ timeout: 10000 });
    else await expect(this.main.getByText(digitalContentTypes[type].section, { exact: false })).toHaveCount(0, { timeout: 10000 });
  }

  /** Unticking a card drops its section at once — no confirmation dialog of any kind. */
  async expectUntickWithoutConfirmation(type: DigitalContentType) {
    await this.setContentType(type, false);
    await expect(this.page.getByRole("dialog").or(this.page.getByRole("alertdialog"))).toHaveCount(0);
    await this.expectContentSection(type, false);
  }

  async enableLinksContentType() {
    await this.setContentType("links", true);
    await this.expectContentSection("links", true);
  }

  private mediaInput(): Locator {
    return this.page.locator('input[type="file"][accept*=".mp4"]').first();
  }

  private digitalFilesInput(): Locator {
    return this.page.locator('input[type="file"][accept*="application/pdf"]').first();
  }

  async uploadMedia(filePaths: readonly string[]) {
    await this.mediaInput().setInputFiles([...filePaths]);
  }

  async uploadDigitalFiles(filePaths: readonly string[]) {
    await this.digitalFilesInput().setInputFiles([...filePaths]);
  }

  /** Videos list as `<name> <size>`; images only as preview tiles (no name — M-40). */
  async readMediaImageCount(): Promise<number> {
    return this.main.locator('img[src^="blob:"]').count();
  }

  async expectMediaItems(options: { videoNames: readonly string[]; imageCount: number }) {
    for (const name of options.videoNames) await expect(this.main.getByText(name, { exact: true })).toBeVisible({ timeout: 20000 });
    await expect.poll(() => this.main.locator('img[src^="blob:"]').count(), { timeout: 20000 }).toBeGreaterThanOrEqual(options.imageCount);
  }

  async expectDigitalFileNames(names: readonly string[]) {
    for (const name of names) await expect(this.main.getByText(name, { exact: true })).toBeVisible({ timeout: 20000 });
  }

  /** A file outside the advertised list must not join the media list, and the creator is told why. */
  async expectMediaRejected(fileName: string) {
    await expect(this.main.getByText(fileName, { exact: true })).toHaveCount(0, { timeout: 5000 });
    await expect(this.page.getByText(/not supported|allowed|format/i).first()).toBeVisible({ timeout: 5000 });
  }

  async expectMediaListEmpty() {
    await expect(this.main.locator('img[src^="blob:"]')).toHaveCount(0);
    await expect(this.main.getByText(/\d+(\.\d+)? (KB|MB)/)).toHaveCount(0);
  }

  async submitEmptyDigitalProductAddContent() {
    await nextSetDetailsAction(this.page).click({ timeout: 10000 });
  }

  /** Next with no content type: the inline requirement and the summary toast. */
  async expectContentTypeRequired() {
    const { requiredErrors } = digitalProductValidationData;
    await expect(textFeedback(this.page, requiredErrors.content)).toBeVisible({ timeout: 10000 });
    await expect(textFeedback(this.page, requiredErrors.summary)).toBeVisible({ timeout: 10000 });
    await expect(this.page).toHaveURL(productsCreationData.digitalProductCreatePath);
    await expect(this.page.getByRole("button", { name: "Next: Publish" })).toHaveCount(0);
  }

  /** The requirement should name every card the creator can pick, Media included. */
  async expectContentTypeMessageNamesAllTypes() {
    await expect.soft(this.page.getByText(/At least one of .*Media/i).first()).toBeVisible({ timeout: 5000 });
  }

  async goToDetails() {
    const next = this.page.getByRole("button", { name: /Next: (?:Set|Edit) Details/ }).locator("visible=true").first();
    await next.click({ timeout: 10000 });
    await this.expectDigitalProductSetDetailsLoaded();
  }

  async expectDigitalProductSetDetailsLoaded() {
    await expect(this.page.getByRole("button", { name: /^(?:Next: Publish|Save and Publish)$/ }).locator("visible=true").first()).toBeVisible({ timeout: 15000 });
  }

  // ── Buyer-only content description (step 1) ──
  private contentDescriptionEditor(): Locator {
    return this.page.getByRole("textbox", { name: "editable markdown" }).first();
  }

  private contentDescriptionCounter(): Locator {
    return this.main.getByText(/^\d+\s*\/\s*500$/).first();
  }

  async fillDigitalProductContentDescription(text: string) {
    await this.contentDescriptionEditor().click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    if (text) await this.page.keyboard.insertText(text);
  }

  async readContentDescriptionCounter(): Promise<string> {
    return ((await this.contentDescriptionCounter().textContent()) ?? "").trim();
  }

  async expectDigitalProductContentDescriptionCounter(expectedText: string) {
    await expect(this.contentDescriptionCounter()).toHaveText(expectedText, { timeout: 10000 });
  }

  /** Soft variant so a word-count bug does not skip the later known-bug steps. */
  async expectDigitalProductContentDescriptionCounterSoft(expectedText: string) {
    await expect.soft(this.contentDescriptionCounter()).toHaveText(expectedText, { timeout: 10000 });
  }

  async applyDigitalProductContentDescriptionFormatting() {
    await this.contentDescriptionEditor().click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    const toolbar = this.page.getByRole("toolbar").first();
    for (const name of ["Bold", "Italic", "Underline"]) await toolbar.getByRole("radio", { name }).click({ timeout: 10000 });
  }

  async expectDigitalProductContentDescriptionFormatted() {
    await expect.poll(() => this.contentDescriptionEditor().innerHTML()).toMatch(/<strong|<em|<u>/i);
  }

  async expectBuyerOnlyHint() {
    await expect(this.main.getByText("This description will only be shown to the buyer after they have purchased the product.")).toBeVisible();
  }

  // ── Step 2: Digital Download–specific controls ──
  private downloadableSwitch(): Locator {
    return this.page.getByRole("switch", { name: "Downloadable File" });
  }

  async expectDownloadable(on: boolean) {
    await expect(this.downloadableSwitch()).toHaveAttribute("aria-checked", String(on), { timeout: 15000 });
  }

  async setDownloadable(on: boolean) {
    if (((await this.downloadableSwitch().getAttribute("aria-checked")) === "true") !== on) await safeClick(this.downloadableSwitch());
    await this.expectDownloadable(on);
  }

  private detailsPanel(): Locator {
    return this.page.getByRole("tabpanel", { name: "Details" });
  }

  /**
   * Slot limit lives on Details. Edit from the list opens Content, and Next stays there
   * until the Links card (`#content-type-links`) is checked. The label is rendered twice.
   */
  async openLimitedSlotStep() {
    const label = this.detailsPanel().getByText("Limit available slots", { exact: true });
    if (await label.isVisible().catch(() => false)) return;
    const linksBox = this.page.locator("#content-type-links").locator("visible=true");
    await expect(async () => {
      if ((await linksBox.getAttribute("aria-checked")) !== "true") await linksBox.click({ timeout: 2000 });
      await expect(linksBox).toHaveAttribute("aria-checked", "true", { timeout: 2000 });
    }).toPass({ timeout: 15000 });
    await nextSetDetailsAction(this.page).click({ timeout: 10000 });
    await expect(label).toBeVisible({ timeout: 15000 });
  }

  /** Limited Slot: the switch has no name. The innermost row that contains the label holds it. */
  private limitSlotsSwitch(): Locator {
    return this.detailsPanel().locator("div").filter({ hasText: "Limit available slots" }).last().getByRole("switch");
  }

  async enableLimitedSlots(slots: number) {
    const panel = this.detailsPanel();
    const toggle = this.limitSlotsSwitch();
    await toggle.scrollIntoViewIfNeeded();
    if ((await toggle.getAttribute("aria-checked")) !== "true") await safeClick(toggle);
    const input = panel.getByRole("textbox", { name: "Available slots" });
    await expect(input).toBeVisible({ timeout: 10000 });
    await expect(panel.getByRole("button", { name: "Decrease slots" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Increase slots" })).toBeVisible();
    await expect(panel.getByText("Show remaining count to buyers")).toBeVisible();
    await input.fill(String(slots));
    await expect(input).toHaveValue(String(slots));
  }

  /** Header control on the digital-download editor. Keeps an active product published. */
  async saveAndPublish() {
    const response = this.page.waitForResponse(
      (candidate) => /\/api\/v1\/shop\/products\/[0-9a-f-]{36}$/.test(new URL(candidate.url()).pathname) && ["PUT", "POST"].includes(candidate.request().method()),
      { timeout: 20000 },
    );
    await safeClick(this.page.getByRole("button", { name: "Save and Publish", exact: true }).locator("visible=true"));
    const saved = await response;
    expect(saved.ok(), await saved.text()).toBe(true);
  }

  /** Give one membership tier free access to the product (Everyone active → Free Access → Confirm). */
  async addFreeAccessBenefit(tierName: string) {
    const toggle = this.page.getByRole("switch", { name: "Set benefits for membership" });
    if ((await toggle.getAttribute("aria-checked")) !== "true") await safeClick(toggle);
    const escaped = tierName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await safeClick(this.main.locator("div").filter({ hasText: new RegExp(`^${escaped}Add Benefit$`) }).getByRole("button", { name: "Add Benefit" }));
    await safeClick(this.page.getByRole("button", { name: /^Everyone active/ }));
    await safeClick(this.page.getByRole("button", { name: /^Free Access/ }));
    await safeClick(this.page.getByRole("button", { name: "Confirm", exact: true }));
    await expect(this.main.locator("div").filter({ hasText: new RegExp(`^${escaped}Free Access`) }).first()).toBeVisible({ timeout: 10000 });
  }

  // ── After Sales section (step 2) ──
  private afterSalesSection(): Locator {
    return this.main.locator("div")
      .filter({ has: this.page.getByText("After Sales", { exact: true }) })
      .filter({ has: this.page.getByText("Customize Message", { exact: true }) })
      .filter({ hasNot: this.page.getByText("Limited Slot", { exact: true }) })
      .last();
  }

  /** Only the message toggle, its rich-text editor with a 1000 counter, and up to 3 links — no file upload. */
  async expectAfterSalesScope() {
    const section = this.afterSalesSection();
    await expect(section.getByRole("switch")).toHaveCount(1);
    await expect(section.getByRole("textbox", { name: "editable markdown" })).toBeVisible();
    await expect(section.getByText("0/1000 characters")).toBeVisible();
    await expect(section.getByText("max. 3 links")).toBeVisible();
    // The message editor's own "Insert image" keeps a hidden image/* input — inline images, not a file delivery.
    await expect(section.locator('input[type="file"]:not([accept="image/*"])')).toHaveCount(0);
    await expect(section.getByRole("button", { name: /attach|upload|choose file/i })).toHaveCount(0);
    await expect(section.getByText(/drag and drop/i)).toHaveCount(0);
  }

  /** Every switch on the form should carry an accessible name, Customize Message included. */
  async expectAfterSalesSwitchNamed() {
    await expect.soft(this.page.getByRole("switch", { name: "Customize Message" })).toBeVisible({ timeout: 5000 });
  }

  async openEdit(productUuid: string) {
    await this.page.goto(new URL(`products/update/digital-downloads/${productUuid}`, this.baseURL).toString(), { waitUntil: "domcontentloaded" });
    await this.expectLoaded();
  }

  /** First visit should leave the form clickable, with no driver.js tour on top. */
  async expectFormReadyWithoutTour() {
    await expect(this.page.locator(".driver-overlay, .driver-popover")).toHaveCount(0);
    await expect(this.page.locator("body")).not.toHaveClass(/driver-active/);
    await this.setContentType("media", true);
    await expect(this.page.getByRole("button", { name: "Next: Set Details" })).toBeEnabled();
  }

  /** The Media card advertises audio as well as images and video. */
  async expectMediaAdvertisesAudio() {
    const accept = ((await this.mediaInput().getAttribute("accept")) ?? "").toLowerCase();
    for (const extension of [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]) {
      expect(accept, accept).toContain(extension);
    }
    await expect(this.main.getByText(digitalContentTypes.media.hint, { exact: true })).toBeVisible();
  }

  /** Each content-type checkbox should expose its card label as its accessible name. */
  async expectContentTypeCheckboxesNamed() {
    for (const card of Object.values(digitalContentTypes)) {
      await expect.soft(this.page.getByRole("checkbox", { name: card.label, exact: true }).first()).toBeVisible({ timeout: 5000 });
    }
  }

  /** Image and video rows should both show the file name and its size. */
  async expectMediaFileListedWithSize(fileName: string) {
    await expect.soft(this.main.getByText(fileName, { exact: true })).toBeVisible({ timeout: 15000 });
    await expect.soft(
      this.main.locator("div").filter({ hasText: fileName }).filter({ hasText: /\d+(\.\d+)?\s*(KB|MB)/ }).first(),
    ).toBeVisible({ timeout: 5000 });
  }

  async dropMedia(filePaths: readonly string[]) {
    await this.dropFiles(digitalContentTypes.media.section, filePaths);
  }

  async dropDigitalFiles(filePaths: readonly string[]) {
    await this.dropFiles(digitalContentTypes.digital.section, filePaths);
  }

  async removeNamedFile(fileName: string) {
    const name = this.main.getByText(fileName, { exact: true });
    const row = this.main.locator("div").filter({ hasText: fileName }).filter({ has: this.page.getByRole("button") }).last();
    const named = row.getByRole("button", { name: /remove|delete|close/i });
    if (await named.count()) await named.first().click({ timeout: 10000 });
    else await row.getByRole("button").last().click({ timeout: 10000 });
    await expect(name).toHaveCount(0, { timeout: 10000 });
  }

  /** A count or size past the stated media limit names the problem. */
  async expectUploadLimitMessage() {
    await expect(this.page.getByText(/limit|maximum|too many|exceed|up to \d+|only \d+/i).first()).toBeVisible({ timeout: 8000 });
  }

  async expectDigitalFileRejected(fileName: string) {
    const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await expect(this.page.getByText(new RegExp(`${escaped}.*File type must be one of|not supported|invalid format`, "i")).first()).toBeVisible({ timeout: 8000 });
    await expect(this.main.getByText(fileName, { exact: true })).toHaveCount(0);
  }

  /** Ask to untick a filled card. The confirmation has to appear before the files disappear. */
  async requestContentTypeOff(type: DigitalContentType) {
    await this.contentTypeCheckbox(type).click({ timeout: 10000 });
  }

  async expectDiscardConfirmation() {
    const dialog = this.page.getByRole("dialog").or(this.page.getByRole("alertdialog"));
    await expect(dialog.first()).toBeVisible({ timeout: 5000 });
  }

  private async dropFiles(sectionTitle: string, filePaths: readonly string[]) {
    const hint = sectionTitle === digitalContentTypes.media.section ? ".mp4" : ".pdf";
    const zone = this.main.locator("div.border-dashed").filter({ hasText: hint }).locator("visible=true");
    const payload = filePaths.map((filePath) => ({
      name: path.basename(filePath),
      mime: mimeFor(filePath),
      base64: fs.readFileSync(filePath).toString("base64"),
    }));
    const dataTransfer = await this.page.evaluateHandle((files) => {
      const scope = globalThis as any;
      const transfer = new scope.DataTransfer();
      for (const file of files) {
        const binary = scope.atob(file.base64) as string;
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        transfer.items.add(new scope.File([bytes], file.name, { type: file.mime }));
      }
      return transfer;
    }, payload);
    await zone.dispatchEvent("dragenter", { dataTransfer });
    await zone.dispatchEvent("dragover", { dataTransfer });
    await zone.dispatchEvent("drop", { dataTransfer });
    await dataTransfer.dispose();
  }

  // ── Pricing (step 2, shared UI) ──
  async expectDigitalProductPricingFreeDefault() {
    await expect.poll(() => this.main.innerText(), { timeout: 10000 }).toMatch(digitalProductPricingData.idrZeroPattern);
  }

  async expectDigitalProductInvalidPriceFeedback() {
    await expect.poll(() => this.main.innerText(), { timeout: 10000 }).toMatch(digitalProductPricingData.invalidPriceErrorPattern);
  }

  async expectDigitalProductValidPrice() {
    await expect.poll(() => this.main.innerText(), { timeout: 10000 }).not.toMatch(digitalProductPricingData.invalidPriceErrorPattern);
  }
}

function mimeFor(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".mp4" || extension === ".mov" || extension === ".webm") return "video/mp4";
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".txt") return "text/plain";
  return "image/png";
}
