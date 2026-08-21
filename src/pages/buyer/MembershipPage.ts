import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { safeClick, waitForLoaded } from "@utils/playwright.utils";

export class MembershipPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto(handle: string) {
    await this.page.goto(new URL(`${handle}/membership`, this.baseURL).toString());
    await waitForLoaded(this.page);
  }

  async expectLoaded() {
    expect(this.page.url()).not.toContain("/auth");
  }

  // ── Membership page ──
  readonly pageHeading = this.page.getByRole("heading", { name: "Go beyond the public feed!" });
  readonly subscribeButtons = this.page.getByRole("button", { name: "Subscribe" });

  async expectPageLoaded() {
    await expect(this.page).toHaveURL(/\/membership\b/, { timeout: 10000 });
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
    await expect(this.subscribeButtons.first()).toBeVisible({ timeout: 10000 });
    const subscribeCount = await this.subscribeButtons.count();
    expect(subscribeCount, "should have at least 2 tiers with Subscribe buttons").toBeGreaterThanOrEqual(2);
  }

  async clickFirstTier() {
    // Browser-verified: the Subscribe button itself opens that tier's detail page, so
    // the old `xpath=../..` walk up to the surrounding card was never needed.
    await safeClick(this.subscribeButtons.first());
    await this.page.waitForURL(/\/membership\/[a-f0-9-]+/, { timeout: 15000 });
    await waitForLoaded(this.page);
  }
}

