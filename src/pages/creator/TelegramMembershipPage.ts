import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain } from "@utils/heal-utils";
import { safeClick, safeFill } from "@utils/playwright.utils";

export class TelegramMembershipPage {
  constructor(
    public readonly page: Page,
    private readonly baseURL: string,
  ) {}

  readonly titleInput = locatorChain(this.page, {
    role: "textbox",
    name: "Enter title",
    placeholder: "Enter title",
    selector: 'input[placeholder="Enter title"]',
  });

  readonly descriptionEditor = locatorChain(this.page, {
    role: "textbox",
    name: "editable markdown",
    selector: '[contenteditable="true"][role="textbox"]',
  });

  readonly nextSetDetailsButton = locatorChain(this.page, {
    role: "button",
    name: "Next: Set Details",
    text: "Next: Set Details",
    selector: 'button:has-text("Next: Set Details")',
  }).first();

  readonly planConfigurationHeading = locatorChain(this.page, {
    text: "Plan Configuration",
    selector: 'text="Plan Configuration"',
  }).first();

  readonly addAnotherPlanButton = locatorChain(this.page, {
    role: "button",
    name: "Add Another Plan",
    text: "Add Another Plan",
    selector: 'button:has-text("Add Another Plan")',
  }).first();

  private planCollapsibles() {
    return this.page.locator('div[data-slot="collapsible"]');
  }

  private planCard(index: number) {
    return this.planCollapsibles().nth(index);
  }

  async goto() {
    await this.page.goto(
      new URL("products/create/telegram-membership", this.baseURL).toString(),
      { waitUntil: "domcontentloaded" },
    );
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/products/, { timeout: 30000 });
    expect(this.page.url()).not.toContain("/auth");
  }

  async fillStep1Details(title: string, description: string) {
    await safeFill(this.titleInput, title);
    if (await this.descriptionEditor.isVisible()) {
      await safeFill(this.descriptionEditor, description);
    }
  }

  async proceedToStep2() {
    await safeClick(this.nextSetDetailsButton);
    await expect(this.planConfigurationHeading).toBeVisible({ timeout: 15000 });
  }

  async expectPlanConfigurationLoaded() {
    await expect(this.planConfigurationHeading).toBeVisible({ timeout: 15000 });
  }

  async getDurationPresets(planIndex = 0): Promise<string[]> {
    const card = this.planCard(planIndex);
    const durationCombobox = card.locator('button[role="combobox"]').nth(1);
    await safeClick(durationCombobox);
    await this.page.waitForTimeout(500);
    const options = await this.page.getByRole("option").allInnerTexts();
    await this.page.keyboard.press("Escape");
    return options;
  }

  async selectDuration(planIndex = 0, durationName: string) {
    const card = this.planCard(planIndex);
    const durationCombobox = card.locator('button[role="combobox"]').nth(1);
    await safeClick(durationCombobox);
    await this.page.waitForTimeout(500);
    const option = this.page.getByRole("option", { name: durationName });
    await safeClick(option);
    await expect(durationCombobox).toContainText(durationName, { timeout: 5000 });
  }

  async expectSelectedGroup(planIndex = 0, expectedGroup: string | RegExp) {
    const card = this.planCard(planIndex);
    const groupCombobox = card.locator('button[role="combobox"]').nth(0);
    await expect(groupCombobox).toContainText(expectedGroup, { timeout: 10000 });
  }

  async editPlanTitle(planIndex = 0, newTitle: string) {
    const card = this.planCard(planIndex);
    const pencilButton = card.locator('button:has(svg.lucide-pencil)').first();
    await safeClick(pencilButton);
    const titleInput = card.locator('input[data-slot="input"]').first();
    await safeFill(titleInput, newTitle);
    await titleInput.press("Enter");
    await expect(card).toContainText(newTitle, { timeout: 5000 });
  }

  async fillPlanDescription(planIndex = 0, description: string) {
    const card = this.planCard(planIndex);
    const descTextarea = card.locator(`textarea[name="plans.${planIndex}.description"]`);
    await safeFill(descTextarea, description);
  }

  async fillPlanPrice(planIndex = 0, price: string) {
    const card = this.planCard(planIndex);
    const priceInput = card.locator('input[placeholder="0"]').first();
    await safeFill(priceInput, price);
  }

  async addAnotherPlan() {
    await safeClick(this.addAnotherPlanButton);
    await this.page.waitForTimeout(500);
  }

  async expectPlanCount(count: number) {
    await expect(this.planCollapsibles()).toHaveCount(count, { timeout: 10000 });
  }

  async expectNoPlanDisableToggle(planIndex = 1) {
    const card = this.planCard(planIndex);
    const headerToggles = card.locator(".flex.items-center.justify-between button[role=\"switch\"]");
    await expect(headerToggles).toHaveCount(0);
    const trashButton = card.locator("button:has(svg.lucide-trash-2)").first();
    await expect(trashButton).toBeVisible({ timeout: 5000 });
  }

  async removePlan(planIndex = 1) {
    const card = this.planCard(planIndex);
    const trashButton = card.locator("button:has(svg.lucide-trash-2)").first();
    await safeClick(trashButton);
    await this.page.waitForTimeout(500);
  }
}
