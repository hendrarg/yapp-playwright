import type { Page } from "@playwright/test";
import { signInWithEmailOtp } from "@helpers/auth/otp-login";

export class LoginPage {
  constructor(public readonly page: Page) {}

  async loginViaOtp(baseURL: string): Promise<{ email: string }> {
    return signInWithEmailOtp(this.page, baseURL);
  }

  async logout(baseURL: string) {
    await this.page.goto(new URL("logout", baseURL).toString());
    await this.page.waitForURL(/auth/, { timeout: 15000 });
  }
}
