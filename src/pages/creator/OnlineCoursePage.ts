import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { smartLocator } from "@utils/heal-utils";
import { expectVersionHistory } from "@helpers/creator/product-editor";
import { onlineCourseAfterSalesData, onlineCoursePricingData, onlineCourseValidationData, type OnlineCourseContentType } from "@test-data/creator/products.creation.data";

export class OnlineCoursePage {
  constructor(
    public readonly page: Page,
    private readonly baseURL: string,
  ) {}

  readonly addChapterButton = smartLocator(this.page, {
    role: "button",
    name: "Chapter",
    exact: true,
    text: "Chapter",
    selector: 'button:text-is("Chapter"):visible',
  });

  readonly addPageButton = smartLocator(this.page, {
    role: "button",
    name: "Page",
    exact: true,
    text: "Page",
    selector: 'button:text-is("Page"):visible',
  });

  readonly nextSetDetailsButton = smartLocator(this.page, {
    role: "button",
    name: "Next: Set Details",
    text: "Next: Set Details",
    selector: 'button:text-is("Next: Set Details"):visible',
  });

  readonly nextEditDetailsButton = smartLocator(this.page, {
    role: "button",
    name: "Next: Edit Details",
    text: "Next: Edit Details",
    selector: 'button:text-is("Next: Edit Details"):visible',
  });

  readonly nextPublishButton = smartLocator(this.page, {
    role: "button",
    name: "Next: Publish",
    text: "Next: Publish",
    selector: 'button:text-is("Next: Publish"):visible',
  });

  private readonly addPricingSwitch = smartLocator(this.page, {
    role: "switch",
    name: "Add Pricing",
    text: "Add Pricing",
    selector: "#enable-pricing",
  });

  private readonly priceInput = smartLocator(this.page, {
    role: "textbox",
    name: "Price",
    placeholder: "10,000",
    selector: 'input[placeholder="10,000"]:visible',
  });

  readonly publishButton = smartLocator(this.page, {
    role: "button",
    name: "Publish",
    exact: true,
    text: "Publish",
    selector: 'button:text-is("Publish"):visible',
  });

  private readonly membershipBenefitsHeading = smartLocator(this.page, {
    text: "Set benefits for membership",
    selector: ':has-text("Set benefits for membership")',
  });

  private readonly saveChangesButton = smartLocator(this.page, {
    role: "button",
    name: "Save",
    exact: true,
    text: "Save",
    selector: 'button:text-is("Save"):visible',
  });

  private readonly afterSalesHeading = smartLocator(this.page, {
    text: "After Sales",
    selector: 'p:has-text("After Sales")',
  });

  private readonly afterSalesCustomizeSwitch = smartLocator(this.page, {
    selector: 'div.border.rounded-2xl:has-text("Customize Message") button[role="switch"]',
  });

  private readonly afterSalesPreviewDialog = smartLocator(this.page, {
    role: "dialog",
    text: "After Sales",
    selector: '[role="dialog"]:has-text("After Sales")',
  });

  private readonly noImagePlaceholder = smartLocator(this.page, {
    text: "No Image",
    selector: 'text="No Image"',
  });

  /** Blocks are added from the editor's `Insert` menu (Video, Attachment, Image, Carousel, Product). */
  private async insertBlock(name: "Video" | "Attachment") {
    await this.page.getByRole("button", { name: "Insert", exact: true }).locator("visible=true").first().click({ timeout: 10000 });
    await this.page.getByRole("menuitem", { name, exact: true }).click({ timeout: 10000 });
  }

  private chapterCards(): Locator {
    return this.page.locator("div.border-2.rounded-2xl").locator("visible=true");
  }

  private episodeCards(): Locator {
    return this.page
      .locator("div.rounded-2xl.px-2.py-4.border")
      .locator("visible=true");
  }

  private selectedEpisodeCard(): Locator {
    return this.page
      .locator("div.rounded-2xl.px-2.py-4.border.border-primary")
      .locator("visible=true")
      .first();
  }

  private freeTextEditor(): Locator {
    return this.page
      .locator('div.bn-container [contenteditable="true"]')
      .locator("visible=true")
      .first();
  }

  private async blockNoteText(): Promise<string> {
    return this.page.locator("div.blocknote-container").first().innerText().catch(() => "");
  }

  private readBodyText(): Promise<string> {
    return this.page.evaluate(() => {
      const root = globalThis as unknown as { document: { body: { innerText: string } } };
      return root.document.body.innerText;
    });
  }

  private readUploadedImageCount(): Promise<number> {
    return this.page.evaluate(() => {
      type ImageElement = { getAttribute: (name: string) => string | null };
      const root = globalThis as unknown as {
        document: { querySelectorAll: (selector: string) => ArrayLike<ImageElement> };
      };
      return Array.from(root.document.querySelectorAll("img")).filter((image) => {
        const src = image.getAttribute("src");
        return src?.startsWith("blob:") === true || src?.startsWith("data:image/") === true;
      }).length;
    });
  }

  async goto() {
    await this.page.goto(new URL("products/create/online-course", this.baseURL).toString(), {
      waitUntil: "domcontentloaded",
    });
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/products\/(?:create|update)\/online-course(?:\/[^/?#]+)?/, {
      timeout: 30000,
    });
    expect(this.page.url()).not.toContain("/auth");
    await this.addChapterButton.text({ timeout: 15000 });
    await this.addPageButton.text({ timeout: 15000 });
    await expect(this.chapterCards().first()).toBeVisible({ timeout: 15000 });
  }

  async useMobileViewport() {
    await this.page.setViewportSize({ width: 390, height: 844 });
  }

  async useDesktopViewport() {
    await this.page.setViewportSize({ width: 1280, height: 900 });
  }

  private async readVisibleNextSetDetailsCta() {
    return this.page.evaluate(() => {
      type Button = {
        getBoundingClientRect: () => { width: number; height: number; y: number };
        textContent: string | null;
      };
      const root = globalThis as unknown as {
        document: { querySelectorAll: (selector: string) => ArrayLike<Button> };
      };
      const button = Array.from(root.document.querySelectorAll("button")).find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return candidate.textContent?.trim() === "Next: Set Details"
          && rect.width > 0
          && rect.height > 0;
      });
      if (!button) return null;
      const rect = button.getBoundingClientRect();
      return { y: rect.y, height: rect.height };
    });
  }

  async expectNextSetDetailsCtaStickyAfterScroll() {
    await this.nextSetDetailsButton.text({ timeout: 10000 });
    const before = await this.readVisibleNextSetDetailsCta();
    expect(before, "expected Next: Set Details CTA before scroll").toBeTruthy();

    await this.page.evaluate(() => {
      const root = globalThis as unknown as {
        scrollBy: (x: number, y: number) => void;
      };
      root.scrollBy(0, 1500);
    });
    await this.page.waitForTimeout(400);

    const after = await this.readVisibleNextSetDetailsCta();
    expect(after, "expected Next: Set Details CTA after scroll").toBeTruthy();
    expect(after!.y).toBeGreaterThanOrEqual(0);
    expect(after!.y).toBeLessThan(844);
    // The mobile header compacts on scroll, so the CTA shifts up to ~80px — sticky means it stays on screen near the top.
    expect(Math.abs(after!.y - before!.y)).toBeLessThan(120);
  }

  async scrollToTop() {
    await this.page.evaluate(() => {
      const root = globalThis as unknown as {
        scrollTo: (x: number, y: number) => void;
      };
      root.scrollTo(0, 0);
    });
    await this.page.waitForTimeout(300);
  }

  async navigateAwayFromContent() {
    const dialogPromise = this.page.waitForEvent("dialog", { timeout: 10000 });
    const navigationPromise = this.page
      .goBack({ waitUntil: "commit", timeout: 10000 })
      .catch(() => undefined);
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe("beforeunload");
    expect(dialog.message()).toMatch(/unsaved|leave|discard|save your changes|are you sure|lose your changes/i);
    await dialog.dismiss();
    await navigationPromise;
  }

  async getChapterCount(): Promise<number> {
    return this.chapterCards().count();
  }

  async expectChapterCount(count: number) {
    await expect(this.chapterCards()).toHaveCount(count, { timeout: 10000 });
  }

  async getEpisodeCount(): Promise<number> {
    return this.episodeCards().count();
  }

  async getStandaloneEpisodeCount(): Promise<number> {
    return this.page.evaluate(() => {
      type DomEl = {
        getBoundingClientRect: () => { width: number; height: number };
        closest: (selector: string) => DomEl | null;
      };
      const root = globalThis as unknown as {
        document: { querySelectorAll: (selector: string) => ArrayLike<DomEl> };
      };
      const visible = (el: DomEl) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      return Array.from(root.document.querySelectorAll("div.rounded-2xl.px-2.py-4.border"))
        .filter(visible)
        .filter((card) => !card.closest("div.border-2.rounded-2xl")).length;
    });
  }

  async addChapter() {
    const before = await this.getChapterCount();
    await this.addChapterButton.click({ timeout: 10000 });
    await expect(this.chapterCards()).toHaveCount(before + 1, { timeout: 10000 });
  }

  async addStandaloneEpisode() {
    const before = await this.getStandaloneEpisodeCount();
    await this.addPageButton.click({ timeout: 10000 });
    await expect
      .poll(() => this.getStandaloneEpisodeCount(), { timeout: 10000 })
      .toBe(before + 1);
  }

  async renameChapter(index: number, name: string) {
    const chapter = this.chapterCards().nth(index);
    await chapter.scrollIntoViewIfNeeded({ timeout: 10000 });
    const titleSpan = chapter.locator("span.cursor-pointer").first();
    await titleSpan.click();
    const input = this.page.locator("input:focus");
    await input.fill(name);
    await input.press("Enter");
    await expect(
      this.chapterCards().nth(index).locator("span.cursor-pointer").first(),
    ).toHaveText(name, { timeout: 10000 });
  }

  async getChapterNames(): Promise<string[]> {
    const count = await this.getChapterCount();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      names.push(
        (await this.chapterCards().nth(i).locator("span.cursor-pointer").first().innerText()).trim(),
      );
    }
    return names;
  }

  async expectChapterNames(names: string[]) {
    await expect.poll(() => this.getChapterNames(), { timeout: 10000 }).toEqual(names);
  }

  private async isEpisodeSelected(index: number): Promise<boolean> {
    return this.episodeCards()
      .nth(index)
      .evaluate((el) => el.className.includes("border-primary"));
  }

  async openEpisode(index: number) {
    if (!(await this.isEpisodeSelected(index))) {
      await this.episodeCards().nth(index).locator("span.cursor-pointer").first().click();
      await expect
        .poll(() => this.isEpisodeSelected(index), { timeout: 10000 })
        .toBe(true);
    }
  }

  async renameSelectedEpisode(name: string) {
    await this.selectedEpisodeCard().locator("span.cursor-pointer").first().click();
    const input = this.page.locator("input:focus");
    await input.fill(name);
    await input.press("Enter");
    await expect(this.page.getByText(name, { exact: true }).locator("visible=true").first())
      .toBeVisible({ timeout: 10000 });
  }

  async selectContentType(type: OnlineCourseContentType) {
    if (type === "Text") return;
    if ((await this.getSelectedContentType()) === type) return;

    await this.insertBlock(type);
    await expect.poll(() => this.getSelectedContentType(), { timeout: 10000 }).toBe(type);
  }

  async getSelectedContentType(): Promise<string> {
    const text = await this.blockNoteText();
    if (/upload attachment/i.test(text)) return "Attachment";
    if (/upload video|delete video/i.test(text)) return "Video";
    return "Text";
  }

  async expectSelectedContentType(type: OnlineCourseContentType) {
    await expect.poll(() => this.getSelectedContentType(), { timeout: 10000 }).toBe(type);
  }

  async setFreeTextContent(text: string) {
    await this.selectContentType("Text");
    const editor = this.freeTextEditor();
    await editor.click();
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    await this.page.keyboard.insertText(text);
    await expect(editor).toContainText(text, { timeout: 10000 });
  }

  private videoFileInput(): Locator {
    return this.page
      .locator('div.blocknote-container input[type="file"][accept*="video/mp4"]')
      .first();
  }

  private deleteVideoButton(): Locator {
    return this.page
      .locator('div.blocknote-container button:has-text("Delete Video")')
      .first();
  }

  async uploadVideo(filePath: string) {
    await this.selectContentType("Video");
    await this.videoFileInput().setInputFiles(filePath, { timeout: 15000 });
    await expect.poll(() => this.blockNoteText(), { timeout: 60000 })
      .toContain("Delete Video");
  }

  async deleteVideo() {
    await this.deleteVideoButton().click({ timeout: 10000 });
    await expect.poll(() => this.blockNoteText(), { timeout: 15000 })
      .not.toContain("Delete Video");
  }

  async uploadLessonFiles(filePaths: readonly string[]) {
    for (const filePath of filePaths) {
      const emptyBlockInput = this.page.locator(
        'div.blocknote-container .bn-block:has-text("Upload attachment") input[type="file"]',
      );
      if ((await emptyBlockInput.count()) === 0) {
        await this.insertBlock("Attachment");
      }
      await emptyBlockInput.last().setInputFiles(filePath, { timeout: 15000 });
      await this.page.waitForTimeout(400);
    }
    await this.expectLessonFiles(filePaths.map((filePath) => filePath.split(/[\\/]/).pop()!));
  }

  async expectLessonFiles(fileNames: readonly string[]) {
    const bodyText = await this.readBodyText();
    for (const fileName of fileNames) {
      expect(bodyText).toContain(fileName);
    }
  }

  private productThumbnailInput(): Locator {
    return this.page
      .locator('input[type="file"][accept*="image/gif"]:not([multiple])')
      .locator("visible=true")
      .first();
  }

  private productGalleryInput(): Locator {
    return this.page
      .locator('div:has-text("select from gallery or drag and drop") input[type="file"][multiple]')
      .locator("visible=true")
      .first();
  }

  async uploadProductThumbnail(filePath: string) {
    await this.productThumbnailInput().setInputFiles(filePath, { timeout: 15000 });
    await expect.poll(() => this.readUploadedImageCount(), {
      timeout: 30000,
    }).toBeGreaterThan(0);
  }

  async uploadThumbnailForValidation(filePath: string) {
    await this.productThumbnailInput().setInputFiles(filePath, { timeout: 15000 });
  }

  async uploadProductGallery(filePaths: readonly string[]) {
    await this.productGalleryInput().setInputFiles([...filePaths], { timeout: 15000 });
    await expect.poll(() => this.noImagePlaceholder.visibleCount(), { timeout: 60000 }).toBeLessThan(9);
  }

  async expectProductThumbnailLimit() {
    await expect.poll(() => this.noImagePlaceholder.visibleCount(), { timeout: 30000 }).toBe(0);
  }

  async expectThumbnailTooSmall() {
    await expect.poll(() => this.readBodyText(), { timeout: 15000 })
      .toMatch(/too small|at least 500/i);
  }

  async expectThumbnailTooLarge() {
    await expect.poll(() => this.readBodyText(), { timeout: 15000 })
      .toMatch(/larger than 524288000|500 MB/i);
  }

  async readOnlineCoursePricingEnabled(): Promise<boolean> {
    return (await this.addPricingSwitch.getAttribute("aria-checked")) === "true";
  }

  async enableOnlineCoursePricing() {
    if (!(await this.readOnlineCoursePricingEnabled())) {
      await this.addPricingSwitch.click({ timeout: 10000 });
    }
    await expect.poll(() => this.addPricingSwitch.getAttribute("aria-checked"), { timeout: 10000 })
      .toBe("true");
    await this.priceInput.text({ timeout: 10000 });
  }

  async disableOnlineCoursePricing() {
    if (await this.readOnlineCoursePricingEnabled()) {
      await this.addPricingSwitch.click({ timeout: 10000 });
    }
    await expect.poll(() => this.addPricingSwitch.getAttribute("aria-checked"), { timeout: 10000 })
      .toBe("false");
  }

  async fillOnlineCoursePrice(price: string) {
    await this.priceInput.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.insertText(price);
  }

  async expectOnlineCourseFreePreview() {
    await expect.poll(() => this.readBodyText(), { timeout: 10000 })
      .toMatch(onlineCoursePricingData.idrZeroPattern);
  }

  async expectOnlineCoursePrice(price: string) {
    await expect.poll(() => this.readOnlineCoursePrice(), { timeout: 10000 })
      .toBe(price);
  }

  private async readOnlineCoursePrice(): Promise<string> {
    return this.page.evaluate(() => {
      type Input = { value: string; offsetParent: unknown };
      const root = globalThis as unknown as {
        document: { querySelectorAll: (selector: string) => ArrayLike<Input> };
      };
      const inputs = Array.from(root.document.querySelectorAll('input[placeholder="10,000"]'));
      return ((inputs.find((input) => input.offsetParent !== null) ?? inputs[0])?.value ?? "")
        .replace(/,/g, "");
    });
  }

  async attemptOnlineCoursePricingContinue() {
    await this.nextPublishButton.click({ timeout: 10000 });
  }

  async isOnlineCourseBelowMinimumPriceRejected(): Promise<boolean> {
    return onlineCoursePricingData.invalidPriceErrorPattern.test(await this.readBodyText());
  }

  private afterSalesCard(): Locator {
    return this.page.locator('div.border.rounded-2xl:has-text("Customize Message")').first();
  }

  private afterSalesMessageEditor(): Locator {
    return this.afterSalesCard().locator('[contenteditable="true"]').first();
  }

  private afterSalesLinksCheckbox(): Locator {
    return this.afterSalesCard().locator('button[role="checkbox"]').first();
  }

  private afterSalesAddLinkButton(): Locator {
    return this.afterSalesCard().locator('button:has-text("Add Link")').first();
  }

  private afterSalesPreviewButton(): Locator {
    return this.page
      .locator('div.bg-muted.rounded-2xl:has-text("Customize Message") button:has-text("Preview")')
      .first();
  }

  async expectAfterSalesLoaded() {
    await this.afterSalesHeading.text({ timeout: 15000 });
  }

  async readAfterSalesMessageEnabled(): Promise<boolean> {
    return (await this.afterSalesCustomizeSwitch.getAttribute("aria-checked")) === "true";
  }

  async setAfterSalesMessageEnabled(enabled: boolean) {
    if ((await this.readAfterSalesMessageEnabled()) !== enabled) {
      await this.afterSalesCustomizeSwitch.click({ timeout: 10000 });
    }
    await expect.poll(() => this.afterSalesCustomizeSwitch.getAttribute("aria-checked"), { timeout: 10000 })
      .toBe(enabled ? "true" : "false");
  }

  async expectAfterSalesDisabledCopy() {
    await expect.poll(() => this.readBodyText(), { timeout: 10000 })
      .toMatch(onlineCourseAfterSalesData.defaultOffCopyPattern);
  }

  async fillAfterSalesMessage(message: string) {
    await this.setAfterSalesMessageEnabled(true);
    await this.afterSalesMessageEditor().click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    if (message) await this.page.keyboard.insertText(message);
  }

  async expectAfterSalesMessage(message: string) {
    await expect(this.afterSalesMessageEditor().innerText({ timeout: 10000 })).resolves.toContain(message);
  }

  async applyAfterSalesMessageFormatting(message: string) {
    await this.fillAfterSalesMessage(message);
    await this.page.keyboard.press("Control+A");
    const { bold, italic, underline } = this.formatButtons(this.afterSalesCard());
    await bold.click({ timeout: 10000 });
    await italic.click({ timeout: 10000 });
    await underline.click({ timeout: 10000 });
    await expect.poll(() => this.afterSalesMessageEditor().innerHTML(), { timeout: 10000 })
      .toMatch(/strong|em|u/i);
  }

  async attemptAfterSalesPublish() {
    await this.publishButton.click({ timeout: 15000 });
  }

  async enableAfterSalesLinks() {
    if ((await this.afterSalesLinksCheckbox().getAttribute("aria-checked")) !== "true") {
      await this.afterSalesLinksCheckbox().click({ timeout: 10000 });
    }
    await expect.poll(() => this.afterSalesLinksCheckbox().getAttribute("aria-checked"), { timeout: 10000 })
      .toBe("true");
    await expect(this.afterSalesAddLinkButton()).toBeVisible({ timeout: 10000 });
  }

  async openAfterSalesPreview() {
    await this.afterSalesPreviewButton().click({ timeout: 10000 });
    await expect.poll(() => this.readBodyText(), { timeout: 10000 })
      .toMatch(onlineCourseAfterSalesData.previewDialogPattern);
  }

  async expectAfterSalesPreviewReadOnly(message: string, linkLabel: string) {
    const preview = await this.page.evaluate(({ message: expectedMessage, linkLabel: expectedLink }) => {
      type Dialog = {
        textContent?: string | null;
        querySelectorAll: (selector: string) => { length: number };
      };
      const root = globalThis as unknown as {
        document: { querySelectorAll: (selector: string) => ArrayLike<Dialog> };
      };
      const dialog = Array.from(root.document.querySelectorAll('[role="dialog"]'))
        .find((element) => /after sales|preview|links/i.test(element.textContent ?? ""));
      return {
        text: dialog?.textContent ?? "",
        editableCount: dialog?.querySelectorAll('[contenteditable="true"]').length ?? 0,
        textboxCount: dialog?.querySelectorAll('input, textarea, [role="textbox"]').length ?? 0,
        messageFound: (dialog?.textContent ?? "").includes(expectedMessage),
        linkFound: (dialog?.textContent ?? "").includes(expectedLink),
      };
    }, { message, linkLabel });

    expect(preview.messageFound, "After Sales preview should contain the staged message").toBe(true);
    expect(preview.linkFound, "After Sales preview should contain the staged link").toBe(true);
    expect(preview.editableCount, "After Sales preview should be read-only").toBe(0);
    expect(preview.textboxCount, "After Sales preview should not expose input controls").toBe(0);
  }

  async closeAfterSalesPreview() {
    await this.page.keyboard.press("Escape");
    await expect.poll(() => this.afterSalesPreviewDialog.visibleCount(), { timeout: 10000 })
      .toBe(0);
  }

  private detailsCard(): Locator {
    return this.page
      .locator("div.border.rounded-2xl")
      .filter({ has: this.page.locator('input[placeholder="Enter title"]') })
      .locator("visible=true")
      .first();
  }

  private detailsTitleInput(): Locator {
    return this.detailsCard().locator('input[placeholder="Enter title"]').first();
  }

  private detailsDescriptionEditor(): Locator {
    return this.detailsCard().locator('div[contenteditable="true"]').first();
  }

  private detailsDescriptionCounter(): Locator {
    return this.detailsCard().locator("p").filter({ hasText: /\d+\s*\/\s*500/ }).first();
  }

  async fillTitle(title: string) {
    const input = this.detailsTitleInput();
    await input.click({ timeout: 10000 });
    await input.fill(title);
  }

  async clearTitle() {
    const input = this.detailsTitleInput();
    await input.click({ timeout: 10000 });
    await input.fill("");
  }

  async fillDescription(text: string) {
    const editor = this.detailsDescriptionEditor();
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    await this.page.keyboard.insertText(text);
  }

  async expectDescriptionCounter(expectedText: string) {
    await expect(this.detailsDescriptionCounter()).toContainText(expectedText, { timeout: 10000 });
  }

  async applyRichTextFormatting() {
    const editor = this.detailsDescriptionEditor();
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");

    const { bold, italic, underline } = this.formatButtons(this.detailsCard());
    await bold.click({ timeout: 10000 });
    await italic.click({ timeout: 10000 });
    await underline.click({ timeout: 10000 });
  }

  async expectDescriptionFormatted() {
    const html = await this.detailsDescriptionEditor().innerHTML();
    expect(html).toMatch(/_bold_|_italic_|_underline_|strong|em|u/i);
  }

  private formatButtons(scope: Locator) {
    const button = (label: string) => scope.locator(`button[aria-label="${label}"]`).first();
    return {
      bold: button("Bold"),
      italic: button("Italic"),
      underline: button("Underline"),
    };
  }

  async expectFreeTextContent(text: string) {
    await expect(this.freeTextEditor()).toContainText(text, { timeout: 10000 });
  }

  async applyEpisodeRichTextFormatting(text: string) {
    await this.setFreeTextContent(text);
    await this.page.keyboard.press("Control+A");
    // The page editor toolbar offers Bold, Italic and Strikethrough (no Underline, unlike the description editor).
    for (const name of ["Bold", "Italic", "Strikethrough"]) {
      await this.page.getByRole("button", { name, exact: true }).locator("visible=true").first().click({ timeout: 10000 });
    }
    await expect.poll(() => this.freeTextEditor().innerHTML()).toMatch(/<strong|<em|<s>|<del/i);
  }

  async expectEpisodeRichTextContent(text: string) {
    await this.expectFreeTextContent(text);
    await expect.poll(() => this.freeTextEditor().innerHTML()).toMatch(/<strong|<em|<s>|<del/i);
  }

  async expectOnlineCourseMembershipBenefitsState() {
    await this.membershipBenefitsHeading.text({ timeout: 15000 });
    await expect.poll(() => this.readBodyText(), { timeout: 15000 })
      .toMatch(/Set benefits for membership|Membership tiers are still loading\. You can enable this once the data is ready\.|Choose benefits for specific membership tiers\./i);
  }

  async expectTitleValue(title: string) {
    await expect(this.detailsTitleInput()).toHaveValue(title, { timeout: 10000 });
  }

  async expectDescriptionContains(text: string) {
    await expect(this.detailsDescriptionEditor()).toContainText(text, { timeout: 10000 });
  }

  async saveOnlineCourseChanges() {
    await this.saveChangesButton.click({ timeout: 15000 });
  }

  async reorderChapterDown(index: number) {
    const handle = this.chapterCards()
      .nth(index)
      .locator('[aria-roledescription="sortable"]')
      .first();
    await handle.focus();
    await this.page.keyboard.press("Space");
    await this.page.waitForTimeout(300);
    await this.page.keyboard.press("ArrowDown");
    await this.page.waitForTimeout(300);
    await this.page.keyboard.press("Space");
    await this.page.waitForTimeout(400);
  }

  async deleteChapter(index: number) {
    const before = await this.getChapterCount();
    await this.chapterCards()
      .nth(index)
      .locator('button[aria-haspopup="menu"]')
      .first()
      .click();
    await this.page
      .getByRole("menuitem", { name: "Delete" })
      .locator("visible=true")
      .first()
      .click();
    await expect(this.chapterCards()).toHaveCount(before - 1, { timeout: 10000 });
  }

  async attemptNextSetDetails() {
    await this.submitContentDetails();
  }

  async submitContentDetails() {
    const cta = this.page
      .locator('button:text-is("Next: Edit Details"), button:text-is("Next: Set Details")')
      .locator("visible=true")
      .first();
    await cta.click({ timeout: 10000 });
  }

  async submitNextPublish() {
    await this.nextPublishButton.click({ timeout: 15000 });
  }

  async submitPublish() {
    const publishCta = this.page
      .locator('button:text-is("Publish"), button:text-is("Next: Publish")')
      .locator("visible=true")
      .first();
    await publishCta.click({ timeout: 15000 });
  }

  async expectRequiredFieldsError() {
    await expect.poll(() => this.readBodyText(), { timeout: 10000 })
      .toContain(onlineCourseValidationData.requiredErrors.summary);
  }

  /**
   * Header `Save`. On the create flow it creates the course as a **draft** and lands on its
   * edit route; on an existing course it saves in place without changing the status.
   */
  async saveCourse(): Promise<string> {
    const response = this.page.waitForResponse(
      (r) => /\/api\/v1\/shop\/products(\/[0-9a-f-]{36})?$/.test(new URL(r.url()).pathname) && ["POST", "PUT"].includes(r.request().method()),
      { timeout: 20000 },
    );
    await this.page.getByRole("button", { name: "Save", exact: true }).locator("visible=true").first().click({ timeout: 10000 });
    const saved = await response;
    expect(saved.ok(), await saved.text()).toBe(true);
    // Shared by every product form: the edit route is /products/update/<type>/<uuid>.
    await expect(this.page).toHaveURL(/\/products\/update\/[\w-]+\/[0-9a-f-]{36}/, { timeout: 20000 });
    return this.page.url().match(/\/products\/update\/[\w-]+\/([0-9a-f-]{36})/)![1];
  }

  /** Characters the After Sales message editor actually holds. */
  async readAfterSalesMessageLength(): Promise<number> {
    return ((await this.afterSalesMessageEditor().innerText()) ?? "").replace(/\n/g, "").length;
  }

  async openEdit(productUuid: string) {
    await this.page.goto(new URL(`products/update/online-course/${productUuid}`, this.baseURL).toString(), { waitUntil: "domcontentloaded" });
    await this.expectLoaded();
  }

  /** Edit header: `Edit <title>`, `Next: Edit Details`, Save, Preview, and the active-status stamp. */
  async expectEditHeader(title: string) {
    await expect(this.page.getByRole("heading", { name: `Edit ${title}`, level: 1 })).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByRole("button", { name: "Next: Edit Details" })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Preview" })).toBeVisible();
    await expect(this.page.getByText(/^This product is active and was last updated \d{1,2} \w{3} \d{4}, \d{2}:\d{2}\.$/)).toBeVisible();
  }

  /** The icon-only `Version history` button opens the retention rule and timestamped entries. */
  async expectVersionHistory() {
    await expectVersionHistory(this.page);
  }

  private membershipSwitch(): Locator {
    return this.page.getByRole("switch", { name: "Set benefits for membership" });
  }

  /** A creator with no tiers gets a disabled switch that says why. */
  async expectMembershipBenefitsUnavailable() {
    await expect(this.membershipSwitch()).toBeDisabled({ timeout: 15000 });
    await expect(this.page.getByText("You do not have any membership tiers yet, so this option is disabled.")).toBeVisible();
  }

  /** With tiers, switching benefits on lists every tier with its own Add Benefit. */
  async expectMembershipTiersSelectable(tierNames: readonly string[]) {
    await expect(this.membershipSwitch()).toBeEnabled({ timeout: 15000 });
    if ((await this.membershipSwitch().getAttribute("aria-checked")) !== "true") await this.membershipSwitch().click();
    await expect(this.membershipSwitch()).toHaveAttribute("aria-checked", "true");
    const main = this.page.getByRole("main");
    for (const name of tierNames) {
      await expect(main.locator("div").filter({ hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}Add Benefit$`) }).first()).toBeVisible({ timeout: 10000 });
    }
    await this.membershipSwitch().click();
  }

  /** The uploaded video renders as a playable <video> whose first frame is its preview. */
  async expectVideoPreviewLoaded() {
    const video = this.page.locator("div.blocknote-container video").first();
    await expect(video).toBeVisible({ timeout: 30000 });
    await expect.poll(() => video.evaluate((v) => (v as unknown as { readyState: number }).readyState), { timeout: 30000 }).toBeGreaterThan(0);
    await expect(this.page.getByRole("button", { name: "Play" }).first()).toBeVisible();
  }

  /** Every file shows in its own block and none reports `Upload failed`. */
  async expectLessonFilesUploaded(fileNames: readonly string[]) {
    const editor = this.page.locator("div.blocknote-container").first();
    for (const name of fileNames) await expect(editor.getByText(name, { exact: false }).first()).toBeVisible({ timeout: 30000 });
    // A block reads "Uploading..." until the transfer settles; judge only the settled state.
    await expect.poll(async () => {
      const text = (await editor.innerText()).replace(/\s+/g, " ");
      return /Uploading\.\.\.|Upload failed/i.test(text) ? text : "settled";
    }, { timeout: 90000, message: "every lesson file should finish uploading without errors" }).toBe("settled");
  }

  /**
   * Page content is not part of `Save`: each page autosaves on edit (`PUT …/pages/{id}`).
   * Start waiting before the edit, await after it, so a save/reload does not outrun it.
   */
  waitForPageAutosave(): Promise<unknown> {
    return this.page.waitForResponse(
      (r) => /\/api\/v1\/shop\/products\/[0-9a-f-]{36}\/pages\/[0-9a-f-]{36}$/.test(new URL(r.url()).pathname) && r.request().method() === "PUT" && r.ok(),
      { timeout: 30000 },
    );
  }

  /** Delete a filled attachment block through its block menu. */
  async removeLessonFile(fileName: string) {
    const block = this.page.locator("div.blocknote-container .bn-block").filter({ hasText: fileName }).last();
    await block.hover();
    await this.page.getByRole("button", { name: "Open block menu" }).locator("visible=true").first().click({ timeout: 10000 });
    await this.page.getByRole("menuitem", { name: "Delete" }).locator("visible=true").first().click({ timeout: 10000 });
    await expect(this.page.locator("div.blocknote-container").first().getByText(fileName)).toHaveCount(0, { timeout: 10000 });
  }

  async expectLessonFileAbsent(fileName: string) {
    await expect(this.page.locator("div.blocknote-container").first()).toBeVisible({ timeout: 20000 });
    await expect(this.page.locator("div.blocknote-container").first().getByText(fileName)).toHaveCount(0, { timeout: 10000 });
  }

  /** A save or publish of an existing course should confirm itself with a toast. */
  async expectSaveConfirmation() {
    await expect(this.page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10000 });
  }

  /** Title / description validation on step 2. */
  async expectTitleRequiredError() {
    await expect(this.page.getByText(/Title is required/i).first()).toBeVisible({ timeout: 10000 });
  }

  async readTitleValue(): Promise<string> {
    return this.detailsTitleInput().inputValue();
  }

  /** A documented title limit shows up as the input's maxlength. */
  async expectTitleLimited() {
    await expect(this.detailsTitleInput()).toHaveAttribute("maxlength", /^\d+$/, { timeout: 5000 });
  }

  async deleteAllChapters() {
    const count = await this.getChapterCount();
    for (let i = 0; i < count; i++) {
      await this.deleteChapter(0);
    }
    await this.expectChapterCount(0);
  }

}
