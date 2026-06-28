import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { safeClick, waitForLoaded } from "@utils/playwright.utils";

export class TipPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto(handle: string, amount?: string) {
    const path = amount ? `${handle}/tip?amount=${amount}` : `${handle}/tip`;
    await this.page.goto(new URL(path, this.baseURL).toString());
    await this.page.waitForLoadState("networkidle");
    await waitForLoaded(this.page);
  }

  async expectLoaded() {
    expect(this.page.url()).not.toContain("/auth");
  }

  // ── Tip page form ──
  readonly title = this.page.locator("span").filter({ hasText: "Send Tip" }).first();
  readonly amountInput = this.page.getByRole("textbox", { name: "Input Amount" });
  readonly paymentMethod = this.page.getByRole("combobox");
  readonly backButton = this.page.getByRole("button", { name: "Back" });
  readonly nameInput = this.page.getByRole("textbox", { name: "Your Name or Nickname" });
  readonly emailInput = this.page.getByRole("textbox", { name: "Your Email" });
  readonly anonymousCheckbox = this.page.getByRole("checkbox").first();
  readonly sendButton = this.page.getByRole("button", { name: "Send Tip" }).last();

  async expectPageLoaded() {
    await expect(this.title).toBeVisible({ timeout: 10000 });
    await expect(this.amountInput).toBeVisible({ timeout: 10000 });
    await expect(this.paymentMethod).toBeVisible({ timeout: 10000 });
  }

  async expectFormAutoFilled() {
    await expect(this.nameInput).toBeVisible({ timeout: 10000 });
    expect((await this.nameInput.inputValue()).length).toBeGreaterThan(0);
    await expect(this.emailInput).toBeVisible({ timeout: 5000 });
    expect((await this.emailInput.inputValue()).length).toBeGreaterThan(0);
    await expect(this.anonymousCheckbox).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(this.paymentMethod).toBeVisible({ timeout: 5000 });
  }

  async submit(): Promise<string> {
    await safeClick(this.sendButton);
    await this.page.waitForURL(/\/transaction\//, { timeout: 15000 });
    await waitForLoaded(this.page);
    await this.page.waitForLoadState("networkidle").catch(() => {});
    return this.page.url().split("/transaction/")[1];
  }
}
