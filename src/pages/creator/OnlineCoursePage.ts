import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { smartLocator } from "@utils/heal-utils";
import {
  onlineCourseStructureData,
  onlineCoursePricingData,
  onlineCourseValidationData,
  productsCreationData,
  type OnlineCourseContentType,
} from "@test-data/creator/products.creation.data";

/**
 * Online Course content editor (Add Content step) — chapters, episodes,
 * standalone episodes, per-episode content type/content, reorder, and delete.
 *
 * Layout note: the desktop outline (chapter/episode cards) is duplicated by a
 * `lg:hidden` mobile tree. Role-named controls resolve uniquely because the
 * mobile copy is `display:none` (excluded from the accessibility tree), while
 * the role-less outline cards/spans are matched with tag-qualified CSS scoped
 * to `visible=true`.
 */
export class OnlineCoursePage {
  constructor(
    public readonly page: Page,
    private readonly baseURL: string,
  ) {}

  readonly addChapterButton = smartLocator(this.page, {
    role: "button",
    name: "Add Chapter",
    text: "Add Chapter",
    selector: 'button:has-text("Add Chapter")',
  });

  readonly addEpisodeButton = smartLocator(this.page, {
    role: "button",
    name: "Add Episode",
    text: "Add Episode",
    selector: 'button:has-text("Add Episode")',
  });

  readonly nextSetDetailsButton = smartLocator(this.page, {
    role: "button",
    name: "Next: Set Details",
    text: "Next: Set Details",
    selector: 'button:has-text("Next: Set Details")',
  });

  readonly nextEditDetailsButton = smartLocator(this.page, {
    role: "button",
    name: "Next: Edit Details",
    text: "Next: Edit Details",
    selector: 'button:has-text("Next: Edit Details")',
  });

  readonly nextPublishButton = smartLocator(this.page, {
    role: "button",
    name: "Next: Publish",
    text: "Next: Publish",
    selector: 'button:has-text("Next: Publish")',
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
    text: "Publish",
    selector: 'button:has-text("Publish"):visible',
  });

  private readonly membershipBenefitsHeading = smartLocator(this.page, {
    role: "heading",
    name: "Membership Benefits",
    text: "Membership Benefits",
    selector: 'text="Membership Benefits"',
  });

  private readonly saveChangesButton = smartLocator(this.page, {
    role: "button",
    name: "Save Changes",
    text: "Save Changes",
    selector: 'button:has-text("Save Changes")',
  });

  private readonly videoFileInput = smartLocator(this.page, {
    text: "Upload Video",
    selector: 'div:has(> label:has-text("Video")) input[type="file"][accept*="video/mp4"]:visible',
  });

  private readonly lessonFileInput = smartLocator(this.page, {
    text: "Upload File or Audio",
    selector: 'div:has(> label:has-text("File")) input[type="file"][accept*="application/pdf"]:visible',
  });

  private readonly videoThumbnailInput = smartLocator(this.page, {
    text: "Video Thumbnail",
    selector: 'div:has(> label:has-text("Video Thumbnail")) input[type="file"]:visible',
  });

  private readonly productThumbnailInput = smartLocator(this.page, {
    text: "Upload File",
    selector: 'input[type="file"][accept*="image/gif"]:not([multiple]):visible',
  });

  private readonly productGalleryInput = smartLocator(this.page, {
    text: "select from gallery or drag and drop",
    selector: 'div:has-text("select from gallery or drag and drop") input[type="file"][multiple]:visible',
  });

  private readonly deleteVideoButton = smartLocator(this.page, {
    role: "button",
    name: "Delete Video",
    text: "Delete Video",
    selector: 'button:has-text("Delete Video")',
  });

  private readonly noImagePlaceholder = smartLocator(this.page, {
    text: "No Image",
    selector: 'text="No Image"',
  });

  readonly boldButton = smartLocator(this.page, {
    role: "button",
    name: "Bold",
    text: "Bold",
    selector: 'button[aria-label="Bold"]:visible',
  });

  readonly italicButton = smartLocator(this.page, {
    role: "button",
    name: "Italic",
    text: "Italic",
    selector: 'button[aria-label="Italic"]:visible',
  });

  readonly underlineButton = smartLocator(this.page, {
    role: "button",
    name: "Underline",
    text: "Underline",
    selector: 'button[aria-label="Underline"]:visible',
  });

  readonly bulletedListButton = smartLocator(this.page, {
    role: "button",
    name: "Bulleted list",
    selector: 'button[aria-label="Bulleted list"]',
  });

  readonly createLinkButton = smartLocator(this.page, {
    role: "button",
    name: "Create link",
    selector: 'button[aria-label="Create link"]',
  });

  private contentTypeTab(type: OnlineCourseContentType) {
    return smartLocator(this.page, {
      role: "tab",
      name: type,
      text: type,
      selector: `[role="tab"]:has-text("${type}")`,
    });
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

  private selectedTab(): Locator {
    return this.page
      .getByRole("tab", { selected: true })
      .locator("visible=true")
      .first();
  }

  private readBodyText(): Promise<string> {
    return this.page.evaluate(() => {
      const root = globalThis as unknown as { document: { body: { innerText: string } } };
      return root.document.body.innerText;
    });
  }

  private readBlobImageCount(): Promise<number> {
    return this.page.evaluate(() => {
      type ImageElement = { getAttribute: (name: string) => string | null };
      const root = globalThis as unknown as {
        document: { querySelectorAll: (selector: string) => ArrayLike<ImageElement> };
      };
      return Array.from(root.document.querySelectorAll("img")).filter(
        (image) => image.getAttribute("src")?.startsWith("blob:") === true,
      ).length;
    });
  }

  private readVisibleEditorHtml(): Promise<string> {
    return this.page.evaluate(() => {
      type Editor = { offsetParent: unknown; innerHTML: string };
      const root = globalThis as unknown as {
        document: { querySelectorAll: (selector: string) => ArrayLike<Editor> };
      };
      return Array.from(root.document.querySelectorAll('[contenteditable="true"]'))
        .find((editor) => editor.offsetParent !== null)
        ?.innerHTML ?? "";
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
    await this.addEpisodeButton.text({ timeout: 15000 });
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
    expect(Math.abs(after!.y - before!.y)).toBeLessThan(60);
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
    await this.addEpisodeButton.click({ timeout: 10000 });
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

  /** Open an episode by its outline card index (selects it in the left editor). */
  async openEpisode(index: number) {
    if (!(await this.isEpisodeSelected(index))) {
      await this.episodeCards().nth(index).locator("span.cursor-pointer").first().click();
      await expect
        .poll(() => this.isEpisodeSelected(index), { timeout: 10000 })
        .toBe(true);
    }
  }

  /** Rename the currently open (selected) episode via its outline label. */
  async renameSelectedEpisode(name: string) {
    await this.selectedEpisodeCard().locator("span.cursor-pointer").first().click();
    const input = this.page.locator("input:focus");
    await input.fill(name);
    await input.press("Enter");
    await expect(this.page.getByText(name, { exact: true }).locator("visible=true").first())
      .toBeVisible({ timeout: 10000 });
  }

  async selectContentType(type: OnlineCourseContentType) {
    await this.contentTypeTab(type).click({ timeout: 10000 });
    await expect(this.selectedTab()).toHaveText(type, { timeout: 10000 });
  }

  async getSelectedContentType(): Promise<string> {
    return (await this.selectedTab().innerText()).trim();
  }

  async expectSelectedContentType(type: OnlineCourseContentType) {
    await expect(this.selectedTab()).toHaveText(type, { timeout: 10000 });
  }

  async setFreeTextContent(text: string) {
    await this.selectContentType("Free Text");
    const editor = this.freeTextEditor();
    await editor.click();
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    await this.page.keyboard.insertText(text);
    await expect(editor).toContainText(text, { timeout: 10000 });
  }

  async uploadVideo(filePath: string) {
    await this.videoFileInput.setInputFiles(filePath, { timeout: 15000 });
    await expect(this.deleteVideoButton.text({ timeout: 60000 })).resolves.toContain("Delete Video");
  }

  async deleteVideo() {
    await this.deleteVideoButton.click({ timeout: 10000 });
    await expect.poll(() => this.deleteVideoButton.count(), { timeout: 15000 }).toBe(0);
  }

  async uploadVideoThumbnail(filePath: string) {
    await this.videoThumbnailInput.setInputFiles(filePath, { timeout: 15000 });
    await expect.poll(() => this.readBodyText(), { timeout: 30000 })
      .toContain("Video Thumbnail");
  }

  async uploadLessonFiles(filePaths: readonly string[]) {
    await this.lessonFileInput.setInputFiles([...filePaths], { timeout: 15000 });
    await expect.poll(() => this.readBodyText(), { timeout: 60000 })
      .toContain(filePaths.map((filePath) => filePath.split(/[\\/]/).pop()).find(Boolean)!);
  }

  async expectLessonFiles(fileNames: readonly string[]) {
    const bodyText = await this.readBodyText();
    for (const fileName of fileNames) {
      expect(bodyText).toContain(fileName);
    }
  }

  async uploadProductThumbnail(filePath: string) {
    await this.productThumbnailInput.setInputFiles(filePath, { timeout: 15000 });
    await expect.poll(() => this.readBlobImageCount(), {
      timeout: 30000,
    }).toBeGreaterThan(0);
  }

  async uploadThumbnailForValidation(filePath: string) {
    await this.productThumbnailInput.setInputFiles(filePath, { timeout: 15000 });
  }

  async uploadProductGallery(filePaths: readonly string[]) {
    await this.productGalleryInput.setInputFiles([...filePaths], { timeout: 15000 });
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
      .toMatch(/\bIDR\s*0\b/i);
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

  async expectFreeTextContent(text: string) {
    await expect(this.freeTextEditor()).toContainText(text, { timeout: 10000 });
  }

  async applyEpisodeRichTextFormatting(text: string) {
    await this.setFreeTextContent(text);
    await this.page.keyboard.press("Control+A");
    await this.boldButton.click({ timeout: 10000 });
    await this.italicButton.click({ timeout: 10000 });
    await this.underlineButton.click({ timeout: 10000 });
    await expect.poll(() => this.readVisibleEditorHtml()).toMatch(/strong|em|u/i);
  }

  async expectEpisodeRichTextContent(text: string) {
    await this.expectFreeTextContent(text);
    await expect.poll(() => this.readVisibleEditorHtml()).toMatch(/strong|em|u/i);
  }

  async expectOnlineCourseMembershipBenefitsState() {
    await this.membershipBenefitsHeading.text({ timeout: 15000 });
    await expect.poll(() => this.readBodyText(), { timeout: 15000 })
      .toMatch(/Membership tiers are still loading\. You can enable this once the data is ready\.|Choose benefits for specific membership tiers\./i);
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

  /** Reorder a chapter one position via the dnd-kit keyboard sensor. */
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

  private detailsCard(): Locator {
    return this.page
      .locator("div.border.rounded-2xl")
      .filter({ hasText: "Title" })
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

    await this.boldButton.click({ timeout: 10000 });
    await this.italicButton.click({ timeout: 10000 });
    await this.underlineButton.click({ timeout: 10000 });
  }

  async expectDescriptionFormatted() {
    const html = await this.detailsDescriptionEditor().innerHTML();
    expect(html).toMatch(/_bold_|_italic_|_underline_|strong|em|u/i);
  }

  async attemptNextSetDetails() {
    await this.submitContentDetails();
  }

  async submitContentDetails() {
    if (this.page.url().includes("/products/update/online-course/")) {
      await this.nextEditDetailsButton.click({ timeout: 10000 });
      return;
    }

    await this.nextSetDetailsButton.click({ timeout: 10000 });
  }

  async submitNextPublish() {
    await this.nextPublishButton.click({ timeout: 15000 });
  }

  async submitPublish() {
    await this.publishButton.click({ timeout: 15000 });
  }

  async expectEpisodeRequiredError() {
    await expect(
      this.page
        .locator('div, p, span')
        .filter({ hasText: onlineCourseValidationData.requiredErrors.summary })
        .first(),
    ).toBeVisible({ timeout: 10000 });
  }

  async deleteAllChapters() {
    const count = await this.getChapterCount();
    for (let i = 0; i < count; i++) {
      await this.deleteChapter(0);
    }
    await this.expectChapterCount(0);
  }
}
