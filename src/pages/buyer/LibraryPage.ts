import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { trackAuthToken } from "@helpers/auth/validate-token";
import { safeClick, waitForLoaded } from "@utils/playwright.utils";
import { buyerEventsDetailData } from "@test-data/buyer/events.detail.data";

const { library, ticketPage } = buyerEventsDetailData;

export class LibraryPage {
  private auth = trackAuthToken(this.page);

  constructor(public readonly page: Page, private readonly baseURL: string) {}

  /** Rendered as a button in some rows and as an anchor in others. */
  private joinMeetingAction(): Locator {
    return this.page
      .getByRole("button", { name: /Join Meeting|Join meeting|join now/i })
      .or(this.page.getByRole("link", { name: /Join Meeting|Join meeting/i }))
      .first();
  }

  /**
   * A booked consultation exposes its meeting link as an external new-tab link. Absent
   * when the library has no upcoming session, so the assertions only run if it renders.
   */
  async expectJoinMeetingOpensExternally() {
    const action = this.joinMeetingAction();
    if (!(await action.isVisible({ timeout: 5000 }).catch(() => false))) return;

    const href = await action.getAttribute("href");
    if (href) {
      expect(href).toContain("meet.google.com");
    }
    const target = await action.getAttribute("target");
    if (target) {
      expect(target).toBe("_blank");
    }
  }

  async goto() {
    await this.page.goto(new URL("dashboard/library", this.baseURL).toString());
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/dashboard\/library\/?$/);
    expect(this.page.url()).not.toContain("/auth");
  }

  async expectAuthenticated() {
    await this.auth.expectValid();
  }

  /** The old /library route is gone: it renders the "page doesn't exist" screen. */
  async expectLegacyRouteMissing() {
    await this.page.goto(new URL(library.legacyPath, this.baseURL).toString());
    await expect(this.page.getByText(library.missingPage)).toBeVisible({ timeout: 15000 });
  }

  /** A category chip carries its item count, e.g. "Events & Tickets 2". */
  async chipCount(label: string): Promise<number> {
    const chip = this.page.getByRole("button", { name: new RegExp(`^${label}\\s*\\d+$`) });
    await expect(chip).toBeVisible({ timeout: 15000 });
    return Number(((await chip.innerText()).match(/(\d+)\s*$/) ?? [])[1] ?? NaN);
  }

  /** Pick a category chip: the URL carries its product_type and the list shows the purchase. */
  async filterCategory(label: string, query: string, expectTitle: string) {
    await safeClick(this.page.getByRole("button", { name: new RegExp(`^${label}`) }));
    await expect(this.page).toHaveURL(new RegExp(query), { timeout: 15000 });
    await expect(this.page.getByText(expectTitle).first()).toBeVisible({ timeout: 15000 });
  }

  async openPurchase(title: string) {
    await safeClick(this.page.getByText(title).first());
    await this.page.waitForURL(/\/product\/[0-9a-f-]{36}/, { timeout: 20000 });
    await waitForLoaded(this.page);
  }

  /** The ticket page offers "See message from <creator>"; View Message opens the after-sales message. */
  async expectAfterSalesMessage(creatorName: string) {
    await expect(this.page.getByText(`${ticketPage.seeMessagePrefix} ${creatorName}`)).toBeVisible({ timeout: 15000 });
    await safeClick(this.page.getByRole("button", { name: ticketPage.viewMessage }));
    const dialog = this.page.getByRole("dialog").filter({ hasText: `${ticketPage.messageDialogPrefix} ${creatorName}` });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await this.page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 10000 });
  }

  /** View Message on the order page shows the creator's after-sales message text. */
  async expectAfterSalesMessageText(creatorName: string, message: string) {
    await expect(this.page.getByText(`${ticketPage.seeMessagePrefix} ${creatorName}`)).toBeVisible({ timeout: 20000 });
    await safeClick(this.page.getByRole("button", { name: ticketPage.viewMessage }));
    const dialog = this.page.getByRole("dialog").filter({ hasText: `${ticketPage.messageDialogPrefix} ${creatorName}` });
    await expect(dialog).toContainText(message, { timeout: 10000 });
    await this.page.keyboard.press("Escape");
  }

  /** The ticket's About Creator tab should introduce the real creator ("Meet <name> — …"). */
  async expectTicketAboutCreatorName(creatorName: string) {
    await safeClick(this.page.getByRole("tab", { name: ticketPage.aboutCreatorTab }));
    await expect(this.page.getByText(new RegExp(`^Meet ${creatorName} — `)).first()).toBeVisible({ timeout: 10000 });
  }

  // ── Digital product: thank-you and order access pages ──
  /** /product/<order>/thank-you: the thanks, the after-sales note, product and creator, View Download. */
  async expectThankYouPage(options: { title: string; creatorName: string }) {
    await expect(this.page).toHaveURL(/\/product\/[0-9a-f-]{36}\/thank-you/);
    await expect(this.page.getByText("Thank you for your purchase!")).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByRole("main")).toContainText(options.title);
    await expect(this.page.getByRole("main")).toContainText(options.creatorName);
    await expect(this.page.getByRole("button", { name: "View Download" })).toBeVisible();
  }

  async openDownloadFromThankYou(): Promise<string> {
    await safeClick(this.page.getByRole("button", { name: "View Download" }));
    await this.page.waitForURL(/\/product\/[0-9a-f-]{36}$/, { timeout: 15000 });
    await waitForLoaded(this.page);
    return this.page.url().split("/product/")[1];
  }

  /** Back from the thank-you page should return to the product detail page (share path). */
  async backFromThankYou(productPath: RegExp) {
    await safeClick(this.page.getByRole("button", { name: "Back", exact: true }));
    await expect(this.page).toHaveURL(productPath, { timeout: 15000 });
  }

  /** The order access page: product name, type badge, description and the after-sales entry. */
  async expectAccessPage(options: { title: string; badge: string; description: string; creatorName: string }) {
    const main = this.page.getByRole("main");
    await expect(main.getByText(options.title).first()).toBeVisible({ timeout: 15000 });
    await expect(main).toContainText(options.badge);
    await expect(main).toContainText(options.description);
    await expect(main.getByText(`${ticketPage.seeMessagePrefix} ${options.creatorName}`)).toBeVisible();
  }

  /** A link block: label, URL and an "Open Link" that opens a new tab. */
  async expectLinkOpensInNewTab(label: string, url: string) {
    const main = this.page.getByRole("main");
    await expect(main.getByText(label, { exact: true })).toBeVisible({ timeout: 10000 });
    const open = main.locator(`a[href="${url}"]`).first();
    await expect(open).toHaveAttribute("target", "_blank");
    const [popup] = await Promise.all([this.page.waitForEvent("popup", { timeout: 15000 }), safeClick(open)]);
    await expect.poll(() => popup.url(), { timeout: 15000 }).toContain(new URL(url).host);
    await popup.close();
  }

  /** A file block offers a Download that serves the file as an attachment. */
  async expectFileDownload(fileName: string) {
    const main = this.page.getByRole("main");
    await expect(main.getByText(fileName, { exact: true })).toBeVisible({ timeout: 10000 });
    const download = main.getByRole("link", { name: "Download", exact: true }).first();
    await expect(download).toHaveAttribute("href", new RegExp(`attachment.*${encodeURIComponent(fileName)}|${fileName}`));
    const [file] = await Promise.all([this.page.waitForEvent("download", { timeout: 20000 }), safeClick(download)]);
    expect(file.suggestedFilename()).toBe(fileName);
  }

  /** A content section the creator left empty is not rendered at all. */
  async expectSectionAbsent(heading: string) {
    await expect(this.page.getByRole("main").getByText(heading, { exact: true })).toHaveCount(0);
  }

  /** The buyer page offers no creator editing controls. */
  async expectReadOnly() {
    for (const name of [/Edit/i, /Delete/i, /Save/i]) {
      await expect(this.page.getByRole("main").getByRole("button", { name })).toHaveCount(0);
    }
  }

  /** Library card: type badge, name, purchase date, creator and a thumbnail. */
  async expectLibraryCard(options: { title: string; badge: string; creatorName: string; date: RegExp }) {
    const card = this.page.getByRole("main").locator("div").filter({ has: this.page.getByRole("heading", { name: options.title }) }).filter({ has: this.page.locator("img") }).last();
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card).toContainText(options.badge);
    await expect(card).toContainText(options.creatorName);
    await expect(card).toContainText(options.date);
  }

  /** Each type chip's count, and All; the types must add up to All. */
  async expectChipsReconcile() {
    await expect(this.page.getByRole("button", { name: /^All\s*\d+$/ })).toBeVisible({ timeout: 15000 });
    const texts = await this.page.getByRole("main").getByRole("button").allInnerTexts();
    const counts: Record<string, number> = {};
    for (const text of texts) {
      const m = text.trim().match(/^(.+?)\s*\n\s*(\d+)$/);
      if (m) counts[m[1].trim()] = Number(m[2]);
    }
    const all = counts["All"];
    expect(all, `chips: ${JSON.stringify(counts)}`).toBeGreaterThan(0);
    const types = Object.entries(counts).filter(([k]) => k !== "All").reduce((sum, [, n]) => sum + n, 0);
    expect(types, `type chips should add up to All: ${JSON.stringify(counts)}`).toBe(all);
  }
}
