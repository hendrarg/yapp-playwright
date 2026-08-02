import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { smartLocator } from "@utils/heal-utils";
import {
  onlineCourseStructureData,
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

  readonly boldButton = smartLocator(this.page, {
    selector: 'button[aria-label="Bold"]:visible',
  });

  readonly italicButton = smartLocator(this.page, {
    selector: 'button[aria-label="Italic"]:visible',
  });

  readonly underlineButton = smartLocator(this.page, {
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

  async goto() {
    await this.page.goto(new URL("products/create/online-course", this.baseURL).toString(), {
      waitUntil: "domcontentloaded",
    });
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(productsCreationData.onlineCourseCreatePath, {
      timeout: 30000,
    });
    expect(this.page.url()).not.toContain("/auth");
    await this.addChapterButton.text({ timeout: 15000 });
    await this.addEpisodeButton.text({ timeout: 15000 });
    await expect(this.chapterCards().first()).toBeVisible({ timeout: 15000 });
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
    const titleSpan = this.chapterCards().nth(index).locator("span.cursor-pointer").first();
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

  async expectFreeTextContent(text: string) {
    await expect(this.freeTextEditor()).toContainText(text, { timeout: 10000 });
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
    await this.nextSetDetailsButton.click({ timeout: 10000 });
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
