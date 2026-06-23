import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { trackAuthToken } from "@helpers/auth/validate-token";

export class ProfilePage {
  private auth = trackAuthToken(this.page);

  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto() {
    await this.page.goto(new URL("profile", this.baseURL).toString());
    await this.page.waitForLoadState("networkidle");
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/profile/);
    expect(this.page.url()).not.toContain("/auth");
  }

  async expectAuthenticated() {
    await this.auth.expectValid();
  }
}
