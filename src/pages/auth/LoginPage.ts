import type { Page } from "@playwright/test";
import { signInWithEmailOtp, type OtpLoginResult } from "@helpers/auth/otp-login";
import { testAccounts, type TestAccount } from "@test-data/users";
import { expect } from "@playwright/test";
import { humanClick } from "@utils/playwright.utils";
import { fetchOtpCodeFromDb } from "@helpers/otp/db-otp";

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

  /**
   * On the auth page a protected link redirected to: sign in with this email and the login OTP
   * (read from `otp_codes`), then land back on the original page.
   */
  async signInFromRedirect(email: string, landing: RegExp) {
    await expect(this.page).toHaveURL(/\/auth\?redirect_url=/, { timeout: 15000 });
    const sentAtMs = Date.now();
    await this.page.getByPlaceholder("Enter your email").filter({ visible: true }).first().fill(email);
    const continueButton = this.page.getByRole("button", { name: "Continue", exact: true });
    await humanClick(this.page, continueButton);
    try {
      await this.page.waitForURL(/step=input-otp/, { timeout: 20000 });
    } catch {
      await humanClick(this.page, continueButton);
      await this.page.waitForURL(/step=input-otp/, { timeout: 20000 });
    }
    const otp = await fetchOtpCodeFromDb(email, sentAtMs);
    await this.page.locator('input[data-input-otp="true"]').pressSequentially(otp);
    await this.page.waitForURL(landing, { timeout: 30000 });
  }
}
