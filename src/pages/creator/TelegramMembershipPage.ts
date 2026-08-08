import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class TelegramMembershipPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto() {
    await this.page.goto(
      new URL("products/create/telegram-membership", this.baseURL).toString(),
      { waitUntil: "domcontentloaded" },
    );
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/products/, { timeout: 30000 });
    expect(this.page.url()).not.toContain("/auth");
  }
}
