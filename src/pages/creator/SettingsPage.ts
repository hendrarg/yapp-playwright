import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain } from "@utils/heal-utils";

export class SettingsPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  // ── Navigation & Tabs ─────────────────────────────────────────────
  readonly paymentAndFeeTab = locatorChain(this.page, {
    role: "tab",
    name: "Payment & Fee",
    exact: true,
    selector: 'button[role="tab"]:has-text("Payment & Fee")',
  });

  readonly integrationsTab = locatorChain(this.page, {
    role: "tab",
    name: "Integrations",
    exact: true,
    selector: 'button[role="tab"]:has-text("Integrations")',
  });

  readonly tabList = locatorChain(this.page, {
    role: "tablist",
    selector: 'div[role="tablist"]',
  });

  // ── Bank Account Section ──────────────────────────────────────────
  readonly bankAccountEmptyHeading = locatorChain(this.page, {
    text: "Add Bank Account",
    selector: 'main h2:has-text("Add Bank Account"), main div:has-text("Add Bank Account")',
  });

  readonly addBankAccountButton = locatorChain(this.page, {
    role: "button",
    name: "Add Bank Account",
    exact: true,
    selector: 'button:has-text("Add Bank Account")',
  });

  readonly bankAccountDialog = locatorChain(this.page, {
    role: "dialog",
    selector: 'div[role="dialog"]',
  });

  readonly bankSelect = this.page.getByRole("dialog").locator("select");

  readonly accountNameInput = this.page.getByRole("dialog").locator(
    'input[name="bankAccountName"], input[placeholder*="account name" i]',
  );

  readonly accountNumberInput = this.page.getByRole("dialog").locator(
    'input[name="bankAccountNumber"], input[placeholder*="account number" i]',
  );

  readonly cancelBankModalButton = this.page.getByRole("dialog").getByRole("button", {
    name: /cancel|batal/i,
  });

  readonly submitBankAccountButton = this.page.getByRole("dialog").getByRole("button", {
    name: "Add Bank Account",
  });

  readonly closeBankModalButton = this.page.getByRole("dialog").getByRole("button", {
    name: "Close",
  });

  // ── Fee Settings Section ──────────────────────────────────────────
  readonly feeSettingsSection = locatorChain(this.page, {
    text: "Fee Settings",
    selector: 'div:has-text("Fee Settings")',
  });

  // ── Integrations Section ──────────────────────────────────────────
  readonly facebookPixelCard = this.page
    .locator('[data-slot="card"]')
    .filter({ hasText: "Facebook Pixel" });

  readonly pixelDisconnectButton = this.facebookPixelCard.getByRole("button", {
    name: "Disconnect",
  });

  readonly pixelSetUpButton = this.facebookPixelCard
    .getByRole("button", { name: "Set Up" })
    .filter({ visible: true });

  readonly seeWhatWeTrackButton = this.facebookPixelCard
    .getByRole("button", { name: "See what we track" })
    .filter({ visible: true });

  readonly genericDialog = locatorChain(this.page, {
    role: "dialog",
    selector: 'div[role="dialog"]',
  });

  async goto(tab?: string) {
    const url = new URL("settings", this.baseURL);
    if (tab) {
      url.searchParams.set("tab", tab);
    }
    await this.page.goto(url.toString());
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/settings/);
    expect(this.page.url()).not.toContain("/auth");
  }

  async switchToPaymentTab() {
    await this.paymentAndFeeTab.click();
    await expect(this.paymentAndFeeTab).toHaveAttribute("aria-selected", "true");
  }

  async switchToIntegrationsTab() {
    await this.integrationsTab.click();
    await expect(this.integrationsTab).toHaveAttribute("aria-selected", "true");
  }

  getMonetizationCard(category: string): Locator {
    return this.page.locator('[data-slot="card"]').filter({ hasText: category }).first();
  }

  getIntegrationCard(name: string): Locator {
    return this.page.locator('[data-slot="card"]').filter({ hasText: name }).first();
  }
}
