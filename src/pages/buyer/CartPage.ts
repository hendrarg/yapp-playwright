import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { trackAuthToken } from "@helpers/auth/validate-token";
import { locatorChain } from "@utils/heal-utils";

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
}

