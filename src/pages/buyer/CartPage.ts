import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { trackAuthToken } from "@helpers/auth/validate-token";
import { locatorChain } from "@utils/heal-utils";
import { safeClick, waitForLoaded } from "@utils/playwright.utils";
import { buyerEventsDetailData } from "@test-data/buyer/events.detail.data";

export class CartPage {
  private auth = trackAuthToken(this.page);

  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto() {
    await this.page.goto(new URL("cart", this.baseURL).toString());
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/cart/);
    expect(this.page.url()).not.toContain("/auth");
  }

  async expectAuthenticated() {
    await this.auth.expectValid();
  }

  get main() {
    return locatorChain(this.page, {
      role: "main",
      selector: "main",
    });
  }

  get selectAllCheckbox() {
    return this.main.getByRole("checkbox", { name: "Select All" });
  }

  get checkoutButton() {
    return this.main.getByRole("button", { name: buyerEventsDetailData.cartCheckout.checkOut });
  }

  async selectAll() {
    await safeClick(this.selectAllCheckbox);
  }

  async expectEmptyCart() {
    await expect(this.main.getByText("Your cart is empty")).toBeVisible({ timeout: 10000 });
    await expect(this.main.getByText("Total Amount")).toBeVisible({ timeout: 10000 });
    await expect(this.main.getByText("Rp0", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(this.checkoutButton).toBeDisabled({ timeout: 10000 });
  }

  get cartSummaryCard(): Locator {
    return this.main
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { name: 'Cart Summary', exact: true }) })
      .filter({ hasText: 'Total Amount' })
      .last();
  }

  async expectCartSummary(options: { count: number; totalAmount: string }) {
    await expect(this.cartSummaryCard).toBeVisible({ timeout: 10000 });
    await expect(this.cartSummaryCard.getByText("Total Amount")).toBeVisible({ timeout: 10000 });
    await expect(this.cartSummaryCard.getByText(options.totalAmount, { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(this.cartSummaryCard.getByText(String(options.count), { exact: true })).toBeVisible({ timeout: 10000 });
  }

  async expectCartItem(options: {
    title: string;
    type?: string;
    creator?: string;
    price?: string;
  }) {
    await expect(this.main).toBeVisible({ timeout: 15000 });
    const item = this.main.locator("div").filter({ hasText: options.title }).filter({ has: this.page.getByRole("checkbox") }).last();
    await expect(item).toBeVisible({ timeout: 15000 });
    if (options.type) await expect(item.getByText(options.type, { exact: true })).toBeVisible({ timeout: 5000 });
    if (options.creator) await expect(this.main.getByText(options.creator, { exact: true })).toBeVisible({ timeout: 5000 });
    if (options.price) await expect(item.getByText(options.price, { exact: true })).toBeVisible({ timeout: 5000 });
  }

  async expectEventTicketItem(options: {
    title: string;
    creator: string;
    badge: string;
    schedule: string;
    venue: string;
    address: string;
    platform: string;
    tierName: string;
    tierPrice: string;
    quantityLabel: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeePhone: string;
    totalAmount: string;
  }) {
    const cart = locatorChain(this.page, {
      role: "main",
      selector: "main",
    });
    await expect(cart).toBeVisible({ timeout: 15000 });

    const eventHeading = locatorChain(this.page, {
      role: "heading",
      name: options.title,
      text: options.title,
      exact: true,
    }).filter({ visible: true }).first();
    await expect(eventHeading).toBeVisible({ timeout: 15000 });

    const cartText = await cart.innerText({ timeout: 15000 });
    expect(cartText).toContain(options.creator);
    expect(cartText).toContain(options.badge);
    expect(cartText).toContain(options.title);
    expect(cartText).toContain(options.schedule);
    expect(cartText).toContain(`${options.venue} • ${options.address}`);
    expect(cartText).toContain(options.platform);
    expect(cartText).toContain(options.tierName);
    expect(cartText).toContain(options.tierPrice);
    expect(cartText).toContain(options.quantityLabel);
    expect(cartText).toContain(options.attendeeName);
    expect(cartText).toContain(options.attendeeEmail);
    expect(cartText).toContain(options.attendeePhone);
    expect(cartText).toContain("Total Amount");
    expect(cartText).toContain(options.totalAmount);
    await expect(eventHeading).toBeVisible({ timeout: 10000 });
  }

  /** Tick only this product's line and press "Check out"; lands on /cart/checkout. */
  async checkoutItem(title: string) {
    const line = this.page.getByRole("main").locator("div").filter({ hasText: title }).filter({ has: this.page.getByRole("checkbox") }).last();
    await line.getByRole("checkbox").first().check();
    await safeClick(this.page.getByRole("button", { name: buyerEventsDetailData.cartCheckout.checkOut }).last());
    await this.page.waitForURL(/\/cart\/checkout/, { timeout: 20000 });
    await waitForLoaded(this.page);
  }

  /** On /cart/checkout: fill a blank phone, press Pay and return the order id from /cart/transaction/<id>. */
  async payCheckout(phone: string): Promise<string> {
    const phoneInput = this.page.getByPlaceholder(buyerEventsDetailData.checkout.phonePlaceholder);
    if ((await phoneInput.count()) && !(await phoneInput.first().inputValue())) await phoneInput.first().fill(phone);
    await safeClick(this.page.getByRole("button", { name: buyerEventsDetailData.cartCheckout.pay }).first());
    await this.page.waitForURL(/\/transaction\//, { timeout: 20000 });
    return this.page.url().split("/transaction/")[1];
  }

  async expectPaymentSuccess() {
    const dialog = this.page.getByRole("dialog").filter({ hasText: buyerEventsDetailData.cartCheckout.paymentSuccess }).first();
    await expect(dialog).toBeVisible({ timeout: 30000 });
  }
}
