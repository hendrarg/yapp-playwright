import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { smartLocator, type SmartHealable } from "@utils/heal-utils";
import { safeClick } from "@utils/playwright.utils";

export type WalletStatusTab = "All" | "Pending" | "Settled";
export type WalletTransactionType = "All" | "Tips" | "Withdraw" | "Convert" | "Order" | "Referrer Fees";

export class WalletPage {
  readonly allStatusTab: Locator;
  readonly pendingStatusTab: Locator;
  readonly settledStatusTab: Locator;
  readonly typeFilterTrigger: SmartHealable;

  constructor(public readonly page: Page, private readonly baseURL: string) {
    this.allStatusTab = page.getByRole("tab", { name: "All", exact: true });
    this.pendingStatusTab = page.getByRole("tab", { name: "Pending", exact: true });
    this.settledStatusTab = page.getByRole("tab", { name: "Settled", exact: true });
    this.typeFilterTrigger = smartLocator(page, {
      role: "combobox",
      selector: 'div:has(> button[role="combobox"]) button[role="combobox"]',
    });
  }

  async goto() {
    await this.page.goto(new URL("wallet", this.baseURL).toString());
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/wallet/);
    expect(this.page.url()).not.toContain("/auth");
    await expect(this.allStatusTab).toBeVisible({ timeout: 15000 });
  }

  async expectStatusTabsVisible() {
    await expect(this.allStatusTab).toBeVisible();
    await expect(this.pendingStatusTab).toBeVisible();
    await expect(this.settledStatusTab).toBeVisible();
  }

  async selectStatusTab(tab: WalletStatusTab) {
    const tabLocator = tab === "All" ? this.allStatusTab : tab === "Pending" ? this.pendingStatusTab : this.settledStatusTab;
    await safeClick(tabLocator);
    await expect(tabLocator).toHaveAttribute("aria-selected", "true", { timeout: 10000 });
  }

  async expectHistoryRowsStatus(expectedStatus: "pending" | "settled") {
    const tabName = expectedStatus === "pending" ? "Pending" : "Settled";
    const rows = this.page.getByRole("tabpanel", { name: tabName }).locator("table tbody tr");
    await expect.poll(async () => rows.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(0);
    const count = await rows.count();
    if (count > 0 && !(await rows.first().innerText()).includes("No results")) {
      const statuses = await rows.locator("td:nth-child(3)").allInnerTexts();
      for (const s of statuses) {
        expect(s.trim().toLowerCase()).toBe(expectedStatus);
      }
    }
  }

  async selectTypeFilter(typeName: WalletTransactionType) {
    const trigger = this.page.locator('button[role="combobox"]').first();
    await safeClick(trigger);
    const option = this.page.getByRole("option", { name: typeName, exact: true });
    await expect(option).toBeVisible({ timeout: 10000 });
    await safeClick(option);
    await expect(trigger).toContainText(typeName, { timeout: 10000 });
  }

  async expectTypeFilterSelected(typeName: WalletTransactionType) {
    const trigger = this.page.locator('button[role="combobox"]').first();
    await expect(trigger).toContainText(typeName, { timeout: 10000 });
  }
}
