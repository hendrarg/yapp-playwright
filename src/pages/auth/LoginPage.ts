import type { Page } from "@playwright/test";
import { signInWithEmailOtp, type OtpLoginResult } from "@helpers/auth/otp-login";
import { testAccounts, type TestAccount } from "@test-data/users";

export class LoginPage {
  constructor(public readonly page: Page) {}

  async loginViaOtp(
    baseURL: string,
    account: TestAccount = testAccounts.qa,
  ): Promise<OtpLoginResult> {
    return signInWithEmailOtp(this.page, baseURL, account);
  }

  async logout(baseURL: string) {
    await this.page.goto(new URL("logout", baseURL).toString());
    await this.page.waitForURL(/auth/, { timeout: 15000 });
  }
}
