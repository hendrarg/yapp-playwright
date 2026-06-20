import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class StreamingPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto() {
    await this.page.goto(new URL("streaming", this.baseURL).toString());
    await this.page.waitForLoadState("networkidle");
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/streaming/);
    expect(this.page.url()).not.toContain("/auth");
  }
}
