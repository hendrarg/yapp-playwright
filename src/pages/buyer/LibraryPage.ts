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

  /** The ticket's About Creator tab should introduce the real creator ("Meet <name> — …"). */
  async expectTicketAboutCreatorName(creatorName: string) {
    await safeClick(this.page.getByRole("tab", { name: ticketPage.aboutCreatorTab }));
    await expect(this.page.getByText(new RegExp(`^Meet ${creatorName} — `)).first()).toBeVisible({ timeout: 10000 });
  }
}
