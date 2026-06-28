import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { waitForLoaded } from "@utils/playwright.utils";

export class TierDetailPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto(handle: string, tierId: string) {
    await this.page.goto(new URL(`${handle}/membership/${tierId}`, this.baseURL).toString());
    await this.page.waitForLoadState("networkidle");
    await waitForLoaded(this.page);
  }

  async expectLoaded() {
    expect(this.page.url()).not.toContain("/auth");
  }

  // ── Tier detail page ──
  readonly tierName = this.page.getByText("Tier Name").locator("..").getByText(/.+/).last();
  readonly billing = this.page.getByText("Billing").locator("..").getByText(/Rp/);
  readonly creator = this.page.getByText("Creator").locator("..").locator('[class*="cursor-pointer"]');
  readonly subscribeButton = this.page.getByRole("button", { name: "Subscribe" });

  async expectPageLoaded() {
    await expect(this.page).toHaveURL(/\/membership\/[a-f0-9-]+/, { timeout: 10000 });
    await expect(this.tierName).toBeVisible({ timeout: 5000 });
    await expect(this.billing).toBeVisible({ timeout: 5000 });
    await expect(this.creator).toBeVisible({ timeout: 5000 });
    await expect(this.subscribeButton).toBeVisible({ timeout: 5000 });
  }
}
