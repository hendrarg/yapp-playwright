import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartLocator } from "@utils/heal-utils";
import { safeClick, safeFill } from "@utils/playwright.utils";
import type { PromotionValidationFormData } from "@test-data/creator/promotions.validation.data";
import { promotionsScopeData } from "@test-data/creator/promotions.scope.data";

export type PromotionCreateResponse = {
  status: number;
  message: string;
  data: {
    uuid?: string;
    id?: string;
    name: string;
    maxUsed: number | null;
  };
};

export class PromotionsPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  readonly promotionsHeading = locatorChain(this.page, {
    role: "heading",
    name: "Promotions",
    text: "Promotions",
  });

  readonly searchInput = locatorChain(this.page, {
    placeholder: "Find promotions",
    selector: 'input[placeholder="Find promotions"]',
  });

  readonly createNewPromoButton = smartLocator(this.page, {
    role: "button",
    name: "Create New Promo",
    text: "Create New Promo",
    selector: 'div.ml-auto.shrink-0 a.hidden.md\\:block button',
  });

  readonly createFormHeading = locatorChain(this.page, {
    role: "heading",
    name: "Create New Promo Code",
    text: "Create New Promo Code",
  });

  readonly nameInput = locatorChain(this.page, {
    label: "Name",
    placeholder: "Enter your promo name",
    selector: 'input[name="name"]',
  });

  readonly discountTypeCombobox = locatorChain(this.page, {
    role: "combobox",
    text: "Percentage",
    selector: 'label:has-text("Discount Type") + button[role="combobox"]',
  });

  readonly discountAmountInput = locatorChain(this.page, {
    placeholder: "0",
    selector: 'input[placeholder="0"]',
  });

  readonly discountCodeInput = locatorChain(this.page, {
    placeholder: "Discount code",
    selector: 'input[name="code"]',
  });

  readonly maximumUsageInput = locatorChain(this.page, {
    label: "Maximum Usage",
    placeholder: "Unlimited if not set",
    selector: 'input[placeholder="Unlimited if not set"]',
  });

  readonly productTypeCombobox = this.page.locator('label:has-text("Product Type") + button[role="combobox"]');

  readonly findProductCombobox = locatorChain(this.page, {
    role: "combobox",
    name: promotionsScopeData.findProductComboboxLabel,
    text: promotionsScopeData.findProductComboboxLabel,
    selector: 'button[role="combobox"]:has-text("Find Product")',
  });

  private productTypeDropdown(): Locator {
    return this.page.locator('[data-slot="select-content"]:visible');
  }

  private productScopePopover(): Locator {
    return this.page.locator('[data-slot="popover-content"]:visible').last();
  }

  private productScopeSearchInput(): Locator {
    return this.productScopePopover().locator(
      `input[placeholder="${promotionsScopeData.searchPlaceholder}"]`,
    );
  }

  private productScopeOption(productName: string): Locator {
    return this.productScopePopover()
      .getByRole("option", { name: new RegExp(productName) })
      .or(
        this.productScopePopover()
          .locator('[cmdk-item], [data-slot="command-item"]')
          .filter({ hasText: productName }),
      )
      .first();
  }

  private selectedProductChip(productName: string): Locator {
    return this.page
      .locator('label:has-text("Product Type")')
      .locator("xpath=ancestor::div[contains(@class,'space')][1]")
      .getByText(productName, { exact: true });
  }

  readonly startDateTrigger = this.page.locator(
    'label:has-text("Start Date") + div[data-slot="popover-trigger"]',
  );

  readonly endDateTrigger = this.page.locator(
    'label:has-text("End Date") + div[data-slot="popover-trigger"]',
  );

  readonly createPromoCodeButton = this.page
    .getByRole("button", { name: "Create Promo Code" })
    .last();

  readonly requiredMessage = locatorChain(this.page, {
    text: "Required",
    selector: '[data-slot="form-message"]',
  });

  async goto() {
    await this.page.goto(new URL("promotions", this.baseURL).toString());
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/(?:\/promotions(?:\/?|\?.*)?|\/products\?tab=promotions)$/);
    expect(this.page.url()).not.toContain("/auth");
    await expect(this.promotionsHeading).toBeVisible({ timeout: 15000 });
    await expect(this.searchInput).toBeVisible({ timeout: 15000 });
  }

  async openCreatePromotionForm() {
    await this.createNewPromoButton.click();
    await this.expectCreateFormLoaded();
  }

  async expectCreateFormLoaded() {
    await expect(this.page).toHaveURL(/\/promotions\/create/);
    expect(this.page.url()).not.toContain("/auth");
    await expect(this.createFormHeading).toBeVisible({ timeout: 15000 });
    await expect(this.nameInput).toBeVisible({ timeout: 15000 });
    await expect(this.discountAmountInput).toBeVisible({ timeout: 15000 });
    await expect(this.discountCodeInput).toBeVisible({ timeout: 15000 });
    await expect(this.maximumUsageInput).toBeVisible({ timeout: 15000 });
    await expect(this.startDateTrigger).toBeVisible({ timeout: 15000 });
    await expect(this.endDateTrigger).toBeVisible({ timeout: 15000 });
  }

  private datePopover(): Locator {
    return this.page.locator('[data-slot="popover-content"]:visible').last();
  }

  private dateDayButton(dayValue: string): Locator {
    return this.datePopover().locator(`button[data-day="${dayValue}"]`).first();
  }

  private async selectDate(trigger: Locator, dayValue: string) {
    await safeClick(trigger);
    const popover = this.datePopover();
    await expect(popover).toBeVisible({ timeout: 10000 });
    await safeClick(this.dateDayButton(dayValue));
    await this.page.keyboard.press("Escape");
    await expect(popover).toBeHidden({ timeout: 2000 });
  }

  async fillPromotionForm(input: PromotionValidationFormData) {
    await safeFill(this.nameInput, input.name);
    await safeFill(this.discountAmountInput, String(input.discount));
    await safeFill(this.discountCodeInput, input.code);

    if (typeof input.maximumUsage === "number") {
      await safeFill(this.maximumUsageInput, String(input.maximumUsage));
    }

    await this.selectDate(this.startDateTrigger, input.startDateDay);
    await this.selectDate(this.endDateTrigger, input.endDateDay);
  }

  async submitEmptyPromotionForm() {
    await safeClick(this.createPromoCodeButton);
  }

  async expectRequiredFieldFeedback() {
    await expect(this.requiredMessage).toHaveCount(4, { timeout: 15000 });
  }

  async submitPromotionForm(): Promise<PromotionCreateResponse> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/promos") && response.request().method() === "POST",
      { timeout: 15000 },
    );

    await safeClick(this.createPromoCodeButton);

    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    return (await response.json()) as PromotionCreateResponse;
  }

  async selectProductScope(scope: "all_product" | "selected_products") {
    await safeClick(this.productTypeCombobox);
    const dropdown = this.productTypeDropdown();
    await expect(dropdown).toBeVisible({ timeout: 10000 });

    if (scope === "selected_products") {
      await safeClick(
        dropdown.getByRole("option", { name: promotionsScopeData.productScopeOption, exact: true }),
      );
    } else {
      await safeClick(dropdown.getByRole("option", { name: "All Product", exact: true }));
    }
  }

  async selectSelectedProductsScope() {
    await this.selectProductScope("selected_products");
    await expect(this.findProductCombobox).toBeVisible({ timeout: 10000 });
  }

  async searchProductsInScope(query: string) {
    await safeClick(this.findProductCombobox);
    await expect(this.productScopePopover()).toBeVisible({ timeout: 10000 });
    await safeFill(this.productScopeSearchInput(), query);
  }

  async selectProductInScope(productName: string) {
    await safeClick(this.productScopeOption(productName));
    await expect(this.selectedProductChip(productName)).toBeVisible({ timeout: 10000 });
  }

  async expectProductVisibleInScope(productName: string) {
    await expect(this.productScopeOption(productName)).toBeVisible({ timeout: 10000 });
  }

  async expectProductSelectableInScope(productName: string) {
    await expect(this.productScopeOption(productName)).toBeVisible({ timeout: 10000 });
  }

  async searchPromotions(query: string) {
    await safeFill(this.searchInput, query);
  }

  private promotionRow(query: string): Locator {
    return this.page.getByRole("row").filter({ hasText: query });
  }

  private promotionActionsTrigger(rowQuery: string): Locator {
    return this.promotionRow(rowQuery).locator('[data-slot="dropdown-menu-trigger"]');
  }

  async openPromotionActions(rowQuery: string) {
    await safeClick(this.promotionActionsTrigger(rowQuery));
    await expect(this.page.getByRole("menu")).toBeVisible({ timeout: 10000 });
  }

  async openPromotionEdit(rowQuery: string, promotionName: string) {
    await this.openPromotionActions(rowQuery);
    await safeClick(this.page.getByRole("menuitem", { name: "Edit", exact: true }));
    await expect(this.page).toHaveURL(/\/promotions\/[^/]+\/update/, { timeout: 15000 });
    await expect(this.page.getByRole("heading", { name: promotionName, exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(this.nameInput).toBeVisible({ timeout: 15000 });
  }

  async setPromotionInactive(rowQuery: string) {
    await this.openPromotionActions(rowQuery);
    const toggle = this.page.locator("#set-inactive");
    await expect(toggle).toBeVisible({ timeout: 10000 });
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/promos/") &&
        response.url().includes("/status") &&
        response.request().method() === "PUT",
      { timeout: 15000 },
    );
    await safeClick(toggle);
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await this.page.keyboard.press("Escape");
  }

  async setPromotionActive(rowQuery: string) {
    await this.openPromotionActions(rowQuery);
    const toggle = this.page.locator("#set-inactive");
    await expect(toggle).toBeVisible({ timeout: 10000 });
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/promos/") &&
        response.url().includes("/status") &&
        response.request().method() === "PUT",
      { timeout: 15000 },
    );
    await safeClick(toggle);
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await this.page.keyboard.press("Escape");
  }

  async deletePromotionFromList(rowQuery: string) {
    await this.openPromotionActions(rowQuery);
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" && response.url().includes("/promos/"),
      { timeout: 15000 },
    );
    await safeClick(this.page.getByRole("menuitem", { name: "Delete", exact: true }));
    await safeClick(this.page.getByRole("button", { name: "Confirm", exact: true }));
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
  }

  async expectPromotionRowFields(
    rowQuery: string,
    fields: {
      name: string;
      code: string;
      discountLabel: string;
      status: string;
      redeemCount: string;
    },
  ) {
    const row = this.promotionRow(rowQuery);
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText(fields.name);
    await expect(row).toContainText(fields.code);
    await expect(row).toContainText(fields.discountLabel);
    await expect(row).toContainText(fields.status);
    await expect(row).toContainText(fields.redeemCount);
  }

  async expectPromotionPeriodInList(rowQuery: string, startDate: string, endDate: string) {
    const row = this.promotionRow(rowQuery);
    await expect(row).toContainText(startDate);
    await expect(row).toContainText(endDate);
  }

  async expectPromotionStatus(rowQuery: string, status: string) {
    await expect(this.promotionRow(rowQuery)).toContainText(status, { timeout: 10000 });
  }

  async expectPromotionAbsent(rowQuery: string) {
    await expect(this.promotionRow(rowQuery)).toHaveCount(0, { timeout: 10000 });
  }

  async expectSelectedProductsOnEdit(productNames: readonly string[]) {
    for (const productName of productNames) {
      await expect(this.selectedProductChip(productName)).toBeVisible({ timeout: 10000 });
    }
  }

  async fillSelectedProductsPromotion(
    input: PromotionValidationFormData,
    productNames: readonly string[],
  ) {
    await this.selectSelectedProductsScope();
    for (const productName of productNames) {
      await this.searchProductsInScope(productName);
      await this.selectProductInScope(productName);
    }
    await safeFill(this.nameInput, input.name);
    await safeFill(this.discountAmountInput, String(input.discount));
    await safeFill(this.discountCodeInput, input.code);
    if (typeof input.maximumUsage === "number") {
      await safeFill(this.maximumUsageInput, String(input.maximumUsage));
    }
    await this.selectDate(this.startDateTrigger, input.startDateDay);
    await this.selectDate(this.endDateTrigger, input.endDateDay);
  }
}
