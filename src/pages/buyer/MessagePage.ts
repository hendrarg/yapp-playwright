import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class MessagePage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto() {
    await this.page.goto(new URL("direct", this.baseURL).toString());
    await this.page.waitForLoadState("networkidle");
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/direct/);
    expect(this.page.url()).not.toContain("/auth");
  }
}
