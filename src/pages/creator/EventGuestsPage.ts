import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain } from "@utils/heal-utils";
import { safeClick } from "@utils/playwright.utils";
import { eventsGuestsData } from "@test-data/creator/events.guests.data";

type GuestStatusFilter = (typeof eventsGuestsData.filterStatusOptions)[number];

export class EventGuestsPage {
  constructor(
    public readonly page: Page,
    private readonly creatorsBaseURL: string,
  ) {}

  readonly headerCheckInGuestButton = locatorChain(this.page, {
    role: "button",
    name: "Check in Guest",
    exact: true,
    selector: 'button:has-text("Check in Guest")',
  }).first();

  readonly filterButton = locatorChain(this.page, {
    role: "button",
    name: "Filter",
    exact: true,
    selector: 'button:has-text("Filter")',
  });

  readonly filterDialog = locatorChain(this.page, {
    role: "dialog",
    name: "Filter",
  });

  readonly nextGuestPageButton = locatorChain(this.page, {
    role: "button",
    name: "Next",
    exact: true,
    selector: 'button:has-text("Next")',
  });

  readonly closeScannerButton = locatorChain(this.page, {
    role: "button",
    name: "Close scanner",
    exact: true,
    selector: 'button:has-text("Close scanner")',
  });

  readonly scannerDescription = locatorChain(this.page, {
    text: "Scan the QR code here to check in attendees.",
    selector: 'p:has-text("Scan the QR code here to check in attendees.")',
  });

  // No accessible-name/testid strategy exists on the app for a bare <video>
  // camera-preview surface — this is the exception in `.agents/rules/code-style.md`
  // (video element, no role/text/testid available).
  private readonly scannerVideo = this.page.locator("video");

  private guestTable(): Locator {
    return this.page.getByRole("table");
  }

  private guestTableBodyRows(): Locator {
    return this.guestTable().getByRole("rowgroup").nth(1).getByRole("row");
  }

  private guestSummaryPanel(): Locator {
    return this.page
      .locator("div")
      .filter({ has: this.page.getByRole("button", { name: "Invite Guest" }) })
      .filter({ hasText: /capacity/i })
      .last();
  }

  private paginationContainer(): Locator {
    return this.page
      .locator("div")
      .filter({ has: this.nextGuestPageButton })
      .last();
  }

  private guestPageButton(pageNumber: number): Locator {
    return this.paginationContainer().getByRole("button", { name: String(pageNumber), exact: true });
  }

  private filterStatusCheckbox(status: GuestStatusFilter): Locator {
    return this.filterDialog.getByRole("checkbox", { name: status });
  }

  // Scoped to the Filter dialog to disambiguate from other "Reset"/"Use
  // Filter"/"Close" controls elsewhere on the page (dialog scoping is the
  // strategy here, matching the existing `productActionMenu()` pattern).
  private resetFilterButton(): Locator {
    return this.filterDialog.getByRole("button", { name: "Reset", exact: true });
  }

  private useFilterButton(): Locator {
    return this.filterDialog.getByRole("button", { name: "Use Filter" });
  }

  private closeFilterButton(): Locator {
    return this.filterDialog.getByRole("button", { name: "Close", exact: true });
  }

  async goto(productUuid: string = eventsGuestsData.seededEventProductUuid) {
    await this.page.goto(
      new URL(`products/detail/events-ticket/${productUuid}`, this.creatorsBaseURL).toString(),
      { waitUntil: "domcontentloaded" },
    );
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/products\/detail\/events-ticket\//, { timeout: 15000 });
    expect(this.page.url()).not.toContain("/auth");
    await expect(this.guestTable()).toBeVisible({ timeout: 15000 });
    await expect(this.guestTableBodyRows().first()).toBeVisible({ timeout: 15000 });
  }

  async expectGuestTableColumns() {
    for (const column of eventsGuestsData.guestTableColumns) {
      await expect(this.guestTable().getByRole("columnheader", { name: column })).toBeVisible({
        timeout: 10000,
      });
    }
  }

  async readGuestSummary(): Promise<{ attendeeLabelText: string; registered: number; capacity: number }> {
    const panelText = (await this.guestSummaryPanel().innerText()).replace(/\s+/g, " ");
    const attendeeLabelMatch = panelText.match(/Att[ae]ndee/i);
    const registeredMatch = panelText.match(/(\d+)\s*Registered/i);
    const capacityMatch = panelText.match(/(\d+)\s*capacity/i);
    expect(attendeeLabelMatch, `expected an Attendee/Attandee label in "${panelText}"`).toBeTruthy();
    expect(registeredMatch, `expected a "N Registered" figure in "${panelText}"`).toBeTruthy();
    expect(capacityMatch, `expected a "N capacity" figure in "${panelText}"`).toBeTruthy();
    return {
      attendeeLabelText: attendeeLabelMatch![0],
      registered: Number(registeredMatch![1]),
      capacity: Number(capacityMatch![1]),
    };
  }

  async readGuestRowCountOnCurrentPage(): Promise<number> {
    return this.guestTableBodyRows().count();
  }

  /** Sums guest rows across every pagination page, restoring page 1 first. */
  async readTotalGuestRowCountAcrossPages(): Promise<number> {
    await this.goToGuestPage(1);
    let total = await this.readGuestRowCountOnCurrentPage();
    for (let guard = 0; guard < 20; guard++) {
      if (!(await this.nextGuestPageButton.isEnabled().catch(() => false))) break;
      await safeClick(this.nextGuestPageButton);
      await this.page.waitForTimeout(500);
      total += await this.readGuestRowCountOnCurrentPage();
    }
    return total;
  }

  async goToGuestPage(pageNumber: number) {
    const button = this.guestPageButton(pageNumber);
    if (await button.isVisible().catch(() => false)) {
      await safeClick(button);
      await this.page.waitForTimeout(500);
    }
  }

  async expectGuestRowStatusesAllEqual(status: string) {
    const rows = this.guestTableBodyRows();
    const count = await rows.count();
    expect(count, "expected at least one guest row to assert status against").toBeGreaterThan(0);
    for (let index = 0; index < count; index++) {
      await expect(rows.nth(index).getByText(status, { exact: true })).toBeVisible({ timeout: 5000 });
    }
  }

  async openFilterPanel() {
    await safeClick(this.filterButton);
    await expect(this.filterDialog).toBeVisible({ timeout: 10000 });
  }

  async expectFilterStatusOptions() {
    for (const status of eventsGuestsData.filterStatusOptions) {
      await expect(this.filterStatusCheckbox(status)).toBeVisible({ timeout: 10000 });
    }
    await expect(this.resetFilterButton()).toBeVisible();
    await expect(this.useFilterButton()).toBeVisible();
  }

  async setStatusFilterChecked(status: GuestStatusFilter, checked: boolean) {
    const checkbox = this.filterStatusCheckbox(status);
    const isChecked = await checkbox.isChecked();
    if (isChecked !== checked) {
      await safeClick(checkbox);
    }
  }

  async applyFilter() {
    await safeClick(this.useFilterButton());
    await expect(this.filterDialog).toBeHidden({ timeout: 10000 });
  }

  async resetFilter() {
    await safeClick(this.resetFilterButton());
  }

  async closeFilterPanel() {
    await safeClick(this.closeFilterButton());
    await expect(this.filterDialog).toBeHidden({ timeout: 10000 });
  }

  async openCheckInScanner() {
    await safeClick(this.headerCheckInGuestButton);
    await expect(this.scannerDescription).toBeVisible({ timeout: 15000 });
  }

  async expectQrScannerMounted() {
    await expect(this.scannerVideo).toHaveCount(1, { timeout: 15000 });
    await expect(this.scannerDescription).toBeVisible();
  }

  async closeCheckInScanner() {
    await safeClick(this.closeScannerButton);
    await expect(this.scannerDescription).toBeHidden({ timeout: 10000 });
  }
}
