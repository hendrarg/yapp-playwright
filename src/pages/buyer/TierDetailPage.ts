import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { waitForLoaded } from "@utils/playwright.utils";

export class TierDetailPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto(handle: string, tierId: string) {
    await this.page.goto(new URL(`${handle}/membership/${tierId}`, this.baseURL).toString());
    await waitForLoaded(this.page);
  }

  async expectLoaded() {
    expect(this.page.url()).not.toContain("/auth");
  }

  // ── Tier detail page ──
  /**
   * Each detail is a row holding two children: a `<p>` label and its value. Naming the
   * row that way replaces the previous `locator("..")` parent step, and lets the creator
   * value be reached as the row's own child instead of by a Tailwind class.
   */
  private detailRow(label: string): Locator {
    return this.page.locator(`div:has(> p:text-is("${label}"))`);
  }

  readonly tierName = this.detailRow("Tier Name").locator("p").last();
  readonly billing = this.detailRow("Billing").getByText(/Rp/);
  readonly creator = this.detailRow("Creator").locator("> div");
  readonly subscribeButton = this.page.getByRole("button", { name: "Subscribe" });

  async expectPageLoaded() {
    await expect(this.page).toHaveURL(/\/membership\/[a-f0-9-]+/, { timeout: 10000 });
    await expect(this.tierName).toBeVisible({ timeout: 5000 });
    await expect(this.billing).toBeVisible({ timeout: 5000 });
    await expect(this.creator).toBeVisible({ timeout: 5000 });
    await expect(this.subscribeButton).toBeVisible({ timeout: 5000 });
  }
}

