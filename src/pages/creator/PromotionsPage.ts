import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class PromotionsPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto() {
    await this.page.goto(new URL("promotions", this.baseURL).toString());
    await this.page.waitForLoadState("networkidle");
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/promotions/);
    expect(this.page.url()).not.toContain("/auth");
  }
}
