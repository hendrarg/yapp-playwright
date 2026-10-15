import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartLocator, type SmartHealable } from "@utils/heal-utils";
import { safeClick } from "@utils/playwright.utils";

export type WalletStatusTab = "All" | "Pending" | "Settled";
export type WalletTransactionType = "All" | "Tips" | "Withdraw" | "Convert" | "Order" | "Referrer Fees";

export class WalletPage {
  readonly allStatusTab: Locator;
  readonly pendingStatusTab: Locator;
  readonly settledStatusTab: Locator;
  readonly typeFilterTrigger: SmartHealable;
  readonly activeBalanceCard: Locator;
  readonly pendingBalanceCard: Locator;
  readonly withdrawButton: Locator;
  readonly refreshPendingButton: Locator;
  readonly yourAssetsTable: Locator;
  readonly withdrawDialog: Locator;

  constructor(public readonly page: Page, private readonly baseURL: string) {
    this.allStatusTab = page.getByRole("tab", { name: "All", exact: true });
    this.pendingStatusTab = page.getByRole("tab", { name: "Pending", exact: true });
    this.settledStatusTab = page.getByRole("tab", { name: "Settled", exact: true });
    this.typeFilterTrigger = smartLocator(page, {
      role: "combobox",
      selector: 'div:has(> button[role="combobox"]) button[role="combobox"]',
    });
    this.withdrawButton = locatorChain(page, {
      role: "button",
      name: "Withdraw",
      exact: true,
      text: "Withdraw",
    });
    this.refreshPendingButton = locatorChain(page, {
      role: "button",
      name: "Refresh",
      exact: true,
      text: "Refresh",
    });
    this.activeBalanceCard = locatorChain(page, {
      selector: 'div[data-slot="card"]:has-text("Active Balance")',
    });
    this.pendingBalanceCard = locatorChain(page, {
      selector: 'div[data-slot="card"]:has-text("Pending Balance")',
    });
    this.yourAssetsTable = locatorChain(page, {
      selector: 'table:has-text("ASSET")',
    });
    this.withdrawDialog = locatorChain(page, {
      role: "dialog",
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

  async expectOverviewSectionsVisible() {
    await expect(this.page.getByRole("heading", { name: "Wallet" })).toBeVisible({ timeout: 10000 });
    await expect(this.activeBalanceCard).toBeVisible({ timeout: 10000 });
    await expect(this.pendingBalanceCard).toBeVisible({ timeout: 10000 });
    await expect(this.yourAssetsTable).toBeVisible({ timeout: 10000 });
    await this.expectStatusTabsVisible();
  }

  async expectActiveAndPendingBalances() {
    await expect(this.activeBalanceCard).toBeVisible();
    await expect(this.activeBalanceCard).toContainText("Rp");
    await expect(this.pendingBalanceCard).toBeVisible();
    await expect(this.pendingBalanceCard).toContainText("Rp");
  }

  async expectAssetSummaryVisible() {
    await expect(this.yourAssetsTable).toBeVisible();
    await expect(this.yourAssetsTable).toContainText("ASSET");
    await expect(this.yourAssetsTable).toContainText("ACTIVE");
    await expect(this.yourAssetsTable).toContainText("PENDING");
    await expect(this.yourAssetsTable).toContainText("TOTAL");
    await expect(this.yourAssetsTable).toContainText("Rupiah");
  }

  async openAndCloseWithdrawDialog() {
    await safeClick(this.withdrawButton);
    await expect(this.withdrawDialog).toBeVisible({ timeout: 10000 });
    // Dismiss dialog via Escape key or Close/Cancel button
    const closeBtn = this.withdrawDialog.locator('button[aria-label="Close"], button:has-text("Close"), button:has-text("Cancel")').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await safeClick(closeBtn);
    } else {
      await this.page.keyboard.press("Escape");
    }
    await expect(this.withdrawDialog).toBeHidden({ timeout: 10000 });
  }

  async refreshPendingBalance() {
    await expect(this.refreshPendingButton).toBeVisible();
    await safeClick(this.refreshPendingButton);
    await expect(this.refreshPendingButton).toBeEnabled({ timeout: 10000 });
  }

  async expectTypeFilterSelected(typeName: WalletTransactionType) {
    const trigger = this.page.locator('button[role="combobox"]').first();
    await expect(trigger).toContainText(typeName, { timeout: 10000 });
  }

  async expectTransactionHistoryTableStructure() {
    const table = this.page.locator('table:has-text("TYPE")');
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(table).toContainText("TYPE");
    await expect(table).toContainText("AMOUNT");
    await expect(table).toContainText("STATUS");
    await expect(table).toContainText("DATE");
  }

  async selectSortOption(sortOption: "Recent" | "Oldest") {
    const trigger = this.page.locator('button[role="combobox"]').nth(1);
    await safeClick(trigger);
    const option = this.page.getByRole("option", { name: sortOption, exact: true });
    await expect(option).toBeVisible({ timeout: 10000 });
    await safeClick(option);
    await expect(trigger).toContainText(sortOption, { timeout: 10000 });
  }

  async expectRowsSelectorOptions() {
    const trigger = this.page.locator('button[role="combobox"]').nth(2);
    await safeClick(trigger);
    const options = ["10", "20", "30", "40", "50"];
    for (const opt of options) {
      await expect(this.page.getByRole("option", { name: opt, exact: true })).toBeVisible({ timeout: 5000 });
    }
    // Re-select 10 to close dropdown
    await safeClick(this.page.getByRole("option", { name: "10", exact: true }));
    await expect(trigger).toContainText("10", { timeout: 10000 });
  }

  async expectPaginationControls() {
    const firstBtn = this.page.getByRole("button", { name: "Go to first page" });
    const prevBtn = this.page.getByRole("button", { name: "Go to previous page" });
    const nextBtn = this.page.getByRole("button", { name: "Go to next page" });
    const lastBtn = this.page.getByRole("button", { name: "Go to last page" });

    await expect(firstBtn).toBeVisible({ timeout: 10000 });
    await expect(prevBtn).toBeVisible({ timeout: 10000 });
    // On page 1, first and previous buttons are disabled
    await expect(firstBtn).toBeDisabled();
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeVisible();
    await expect(lastBtn).toBeVisible();
  }
}

