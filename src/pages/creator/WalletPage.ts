import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class WalletPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto() {
    await this.page.goto(new URL("wallet", this.baseURL).toString());
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/wallet/);
    expect(this.page.url()).not.toContain("/auth");
  }
}

