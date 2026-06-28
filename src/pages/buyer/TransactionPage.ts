import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { waitForLoaded } from "@utils/playwright.utils";

export class TransactionPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto(orderId: string) {
    await this.page.goto(new URL(`transaction/${orderId}`, this.baseURL).toString());
    await this.page.waitForLoadState("networkidle");
    await waitForLoaded(this.page);
  }

  async expectLoaded() {
    expect(this.page.url()).not.toContain("/auth");
  }

  // ── Transaction page ──
  readonly orderId = this.page.getByText(/Order ID : /).first();
  readonly amount = this.page.getByText("Rp50.506").last();
  readonly tipTo = this.page.getByRole("textbox").first();
  readonly checkStatusButton = this.page.getByRole("button", { name: "Check Status" });

  async expectPageLoaded(creatorName: string) {
    await expect(this.page).toHaveURL(/\/transaction\//, { timeout: 10000 });
    await expect(this.amount).toBeVisible({ timeout: 5000 });
    await expect(this.checkStatusButton).toBeVisible({ timeout: 5000 });
    await expect(this.orderId).toBeVisible({ timeout: 5000 });
    expect((await this.tipTo.inputValue())).toContain(creatorName);
    await expect(this.page.getByText("Payment Method")).toBeVisible({ timeout: 5000 });
  }

  async getOrderId(): Promise<string> {
    const text = (await this.orderId.textContent()) ?? "";
    return text.replace("Order ID : ", "").trim();
  }

  // ── Payment success dialog (appears after webhook) ──
  readonly successDialog = this.page.getByRole("dialog", { name: "Payment Successful" });
  readonly successHeading = this.successDialog.getByRole("heading", { name: "Payment Successful!" });
  readonly successCardCreator = this.successDialog.getByText(/./).first();
  readonly successAmount = this.successDialog.getByText("IDR 50,000");
  readonly backToProfileButton = this.successDialog.getByRole("button", { name: "Back to Profile" });

  async expectPaymentSuccess() {
    await expect(this.successDialog).toBeVisible({ timeout: 15000 });
    await expect(this.successHeading).toBeVisible({ timeout: 5000 });
    await expect(this.successAmount).toBeVisible({ timeout: 5000 });
    await expect(this.backToProfileButton).toBeVisible({ timeout: 5000 });
  }
}
