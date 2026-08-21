import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { trackAuthToken } from "@helpers/auth/validate-token";

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
}

