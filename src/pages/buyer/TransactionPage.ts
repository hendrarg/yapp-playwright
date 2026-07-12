import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { safeClick, waitForLoaded } from "@utils/playwright.utils";

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
  readonly refreshStatusButton = this.page.getByRole("button", { name: /Refresh to Check Status|Check Status/ });

  async expectPageLoaded(creatorName: string) {
    await expect(this.page).toHaveURL(/\/transaction\//, { timeout: 10000 });
    await expect(this.amount).toBeVisible({ timeout: 5000 });
    await expect(this.checkStatusButton).toBeVisible({ timeout: 5000 });
    await expect(this.orderId).toBeVisible({ timeout: 5000 });
    expect((await this.tipTo.inputValue())).toContain(creatorName);
    await expect(this.page.getByText("Payment Method")).toBeVisible({ timeout: 5000 });
  }

  async expectExclusivePostTransaction(priceText: string) {
    await expect(this.page).toHaveURL(/\/transaction\//, { timeout: 10000 });
    await expect(this.page.locator("main").getByText(/Order ID/i).last()).toBeVisible({ timeout: 5000 });
    await expect(this.refreshStatusButton).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText("Payment Method")).toBeVisible({ timeout: 5000 });
    await expect(this.page.locator("main").getByText(/Detail Transactions|Product/).last()).toBeVisible({
      timeout: 10000,
    });
    await expect(this.page.locator("main").getByText(priceText).last()).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator("canvas, svg, img").first()).toBeVisible({ timeout: 10000 });
  }

  // ── Payment success dialog (appears after webhook) ──
  readonly successDialog = this.page.getByRole("dialog", { name: "Payment Successful" });
  readonly successHeading = this.successDialog.getByRole("heading", { name: "Payment Successful!" });
  readonly backToProfileButton = this.successDialog.getByRole("button", { name: "Back to Profile" });

  async expectPaymentSuccess() {
    await expect(this.successDialog).toBeVisible({ timeout: 15000 });
    await expect(this.successHeading).toBeVisible({ timeout: 5000 });
    await expect(this.backToProfileButton).toBeVisible({ timeout: 5000 });
  }

  async expectUnlockPaymentSuccess() {
    const dialog = this.page.getByRole("dialog").filter({ hasText: /Payment Successful|payment was successful/i }).first();
    await expect(dialog).toBeVisible({ timeout: 20000 });
    await expect(dialog.getByText(/Your payment was successful|Payment Successful/i).first()).toBeVisible({
      timeout: 5000,
    });
    await expect(dialog.getByRole("button", { name: /View Product|View product/i })).toBeVisible({ timeout: 5000 });
  }

  async viewUnlockedProduct() {
    const dialog = this.page.getByRole("dialog").filter({ hasText: /Payment Successful|payment was successful/i }).first();
    await safeClick(dialog.getByRole("button", { name: /View Product|View product/i }));
    await this.page.waitForURL(/\/post\//, { timeout: 20000 });
    await waitForLoaded(this.page);
  }
}
