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
  readonly tipTo = this.page.getByRole("textbox").first();
  readonly checkStatusButton = this.page.getByRole("button", { name: "Check Status" });
  readonly refreshStatusButton = this.page.getByRole("button", { name: /Refresh to Check Status|Check Status/ });

  async expectPageLoaded(creatorName: string, expectedTotal = "Rp50.506") {
    await expect(this.page).toHaveURL(/\/transaction\//, { timeout: 10000 });
    await expect(this.checkStatusButton).toBeVisible({ timeout: 5000 });
    await expect(this.orderId).toBeVisible({ timeout: 5000 });
    expect((await this.tipTo.inputValue())).toContain(creatorName);
    await expect(this.page.getByText("Payment Method")).toBeVisible({ timeout: 5000 });
    const totalRow = this.page.getByText("Total", { exact: true }).filter({ visible: true }).locator("..");
    await expect(totalRow.getByText(expectedTotal, { exact: true })).toBeVisible();
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
    const completedPageHeading = this.page.getByRole("heading", { name: "Payment Success", exact: true });
    await expect.poll(async () => (
      await this.successDialog.isVisible() || await completedPageHeading.isVisible()
    ), { timeout: 15000 }).toBe(true);

    if (await this.successDialog.isVisible()) {
      await expect(this.successHeading).toBeVisible();
      await expect(this.backToProfileButton).toBeVisible();
      return;
    }

    await expect(completedPageHeading).toBeVisible();
    await expect(this.page.getByRole("button", { name: /Back to profile/i })).toBeVisible();
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

  async expectTipPaymentInstructions(data: {
    paymentMethod: string;
    subtotal: string;
    total: string;
  }) {
    await expect(this.page.getByRole("button", { name: "Download QR", exact: true })).toBeVisible();
    await expect(this.checkStatusButton).toBeVisible();
    await this.expectTipTransactionSummary(data.paymentMethod, data.subtotal, data.total);
  }

  async reload() {
    await this.page.reload({ waitUntil: "domcontentloaded" });
    await waitForLoaded(this.page);
    await this.page.waitForLoadState("networkidle").catch(() => {});
  }

  async expectSameTipTransaction(orderId: string, total: string) {
    await expect(this.page).toHaveURL(new RegExp(`/transaction/${orderId}$`));
    await expect(this.page.getByText(`Order ID : ${orderId}`, { exact: true })).toBeVisible();
    const totalRow = this.page.getByText("Total", { exact: true }).filter({ visible: true }).locator("..");
    await expect(totalRow.getByText(total, { exact: true })).toBeVisible();
  }

  private async expectTipTransactionSummary(paymentMethod: string, subtotal: string, total: string) {
    const subtotalLabel = this.page.getByText("Subtotal", { exact: true }).filter({ visible: true });
    if (!await subtotalLabel.isVisible()) {
      await safeClick(this.page.getByText("Detail Transactions", { exact: true }).filter({ visible: true }));
    }

    const paymentMethodRow = this.page
      .getByText("Payment Method", { exact: true })
      .filter({ visible: true })
      .locator("..");
    const subtotalRow = subtotalLabel.locator("..");
    const totalRow = this.page.getByText("Total", { exact: true }).filter({ visible: true }).locator("..");
    await expect(paymentMethodRow.getByText(paymentMethod, { exact: false })).toBeVisible();
    await expect(subtotalRow.getByText(subtotal, { exact: true })).toBeVisible();
    await expect(totalRow.getByText(total, { exact: true })).toBeVisible();
  }
}
