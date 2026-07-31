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
    discountType?: string;
    discount?: number;
    code?: string;
    isSetAffiliate?: boolean;
    affiliatorCommissionPercentage?: number;
    affiliator?: {
      username?: string;
    };
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
    name: "Discount Type",
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

  readonly productTypeCombobox = locatorChain(this.page, {
    role: "combobox",
    name: "Product Type",
    selector: 'label:has-text("Product Type") + button[role="combobox"]',
  });

  readonly affiliateSwitch = locatorChain(this.page, {
    role: "switch",
    selector: 'button[role="switch"]',
  });

  readonly findCreatorCombobox = locatorChain(this.page, {
    role: "combobox",
    name: "Find Creator",
    text: "Find Creator",
    selector: 'button[role="combobox"]:has-text("Find Creator")',
  });

  readonly findProductCombobox = locatorChain(this.page, {
    role: "combobox",
    name: promotionsScopeData.findProductComboboxLabel,
    text: promotionsScopeData.findProductComboboxLabel,
    selector: 'button[role="combobox"]:has-text("Find Product")',
  });

  private productTypeDropdown(): Locator {
    return this.page.locator('[data-slot="select-content"]:visible');
  }

  private discountTypeDropdown(): Locator {
    return this.productTypeDropdown();
  }

  readonly refreshVoucherCodeButton = this.discountCodeInput.locator(
    "xpath=ancestor::div[1]//button",
  ).first();

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

  async fillPromotionFormWithAutoCode(input: Omit<PromotionValidationFormData, "code">) {
    await safeFill(this.nameInput, input.name);
    await safeFill(this.discountAmountInput, String(input.discount));

    if (typeof input.maximumUsage === "number") {
      await safeFill(this.maximumUsageInput, String(input.maximumUsage));
    }

    await this.selectDate(this.startDateTrigger, input.startDateDay);
    await this.selectDate(this.endDateTrigger, input.endDateDay);
  }

  async selectDiscountType(type: "percentage" | "fixed") {
    await safeClick(this.discountTypeCombobox);
    const dropdown = this.discountTypeDropdown();
    await expect(dropdown).toBeVisible({ timeout: 10000 });
    const label = type === "percentage" ? "Percentage" : "Fixed";
    await safeClick(dropdown.getByRole("option", { name: label, exact: true }));
    await expect(this.discountTypeCombobox).toContainText(label, { timeout: 10000 });
  }

  async expectAutoGeneratedVoucherCode(pattern = /^[A-Z0-9]{6,}$/) {
    await expect(this.discountCodeInput).toBeVisible({ timeout: 10000 });
    const code = await this.discountCodeInput.inputValue();
    expect(code.length).toBeGreaterThan(0);
    expect(code).toMatch(pattern);
    return code;
  }

  async refreshVoucherCode() {
    const before = await this.discountCodeInput.inputValue();
    await safeClick(this.refreshVoucherCodeButton);
    await expect.poll(async () => this.discountCodeInput.inputValue()).not.toBe(before);
    const after = await this.discountCodeInput.inputValue();
    expect(after).not.toBe(before);
    return after;
  }

  expectDiscountTypeSaved(response: PromotionCreateResponse, discountType: string) {
    expect(response.data.discountType).toBe(discountType);
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

  async createDiscountPromotion(
    type: "percentage" | "fixed",
    input: Omit<PromotionValidationFormData, "code">,
    options?: { voucherPattern?: RegExp },
  ): Promise<PromotionCreateResponse> {
    await this.selectDiscountType(type);
    await this.fillPromotionFormWithAutoCode(input);
    if (options?.voucherPattern) {
      await this.expectAutoGeneratedVoucherCode(options.voucherPattern);
    }
    return this.submitPromotionForm();
  }

  async createAffiliatePromotion(
    input: PromotionValidationFormData,
    affiliate: { commission: number; search: string; handle: string },
  ): Promise<PromotionCreateResponse> {
    await this.fillPromotionForm(input);
    await this.enableAffiliateCommission(affiliate.commission);
    await this.assignAffiliateCreator(affiliate.search);
    await this.expectAssignedAffiliateCreator(affiliate.handle);
    return this.submitPromotionForm();
  }

  async createAndSavePromotion(input: PromotionValidationFormData): Promise<PromotionCreateResponse> {
    await this.fillPromotionForm(input);
    return this.submitPromotionForm();
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

  async expectDefaultAllProductsScope() {
    await expect(this.productTypeCombobox).toContainText("All Product", { timeout: 10000 });
    await expect(this.findProductCombobox).toBeHidden({ timeout: 5000 });
  }

  async expectDefaultAffiliateDisabled() {
    await expect(this.affiliateSwitch).toHaveAttribute("aria-checked", "false", { timeout: 10000 });
    await expect(this.affiliateCommissionInput()).toBeHidden({ timeout: 5000 });
    await expect(this.findCreatorCombobox).toBeHidden({ timeout: 5000 });
  }

  private affiliateCommissionInput(): Locator {
    return this.page
      .locator('label:has-text("Affiliate Commission")')
      .locator("xpath=following::input[1]");
  }

  private creatorAssignmentPopover(): Locator {
    return this.page.locator('[data-slot="popover-content"]:visible').last();
  }

  async enableAffiliateCommission(percent: number) {
    if ((await this.affiliateSwitch.getAttribute("aria-checked")) !== "true") {
      await safeClick(this.affiliateSwitch);
    }
    await expect(this.affiliateCommissionInput()).toBeVisible({ timeout: 10000 });
    await safeFill(this.affiliateCommissionInput(), String(percent));
    await expect(this.findCreatorCombobox).toBeVisible({ timeout: 10000 });
  }

  async assignAffiliateCreator(searchTerm: string) {
    await safeClick(this.findCreatorCombobox);
    const popover = this.creatorAssignmentPopover();
    await expect(popover).toBeVisible({ timeout: 10000 });
    await safeFill(popover.locator("input").first(), searchTerm);
    const option = popover
      .getByRole("option", { name: new RegExp(searchTerm) })
      .or(popover.locator('[cmdk-item], [data-slot="command-item"]').filter({ hasText: searchTerm }))
      .first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await safeClick(option);
  }

  async expectAssignedAffiliateCreator(handle: string) {
    await expect(this.page.getByText(`@${handle}`, { exact: true })).toBeVisible({ timeout: 10000 });
  }

  expectAffiliateAssignmentSaved(
    response: PromotionCreateResponse,
    expected: { commission: number; username: string },
  ) {
    expect(response.data.isSetAffiliate).toBe(true);
    expect(response.data.affiliatorCommissionPercentage).toBe(expected.commission);
    expect(response.data.affiliator?.username).toBe(expected.username);
  }

  async expectAffiliateBadgeInList(rowQuery: string) {
    await expect(this.promotionRow(rowQuery)).toContainText("Affiliate", { timeout: 10000 });
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

  /** Creator list search filters by promotion name; promo code disambiguates duplicate names. */
  async searchPromotions(promotionName: string, promoCode?: string) {
    await this.searchInput.clear();
    await safeFill(this.searchInput, promotionName);
    await expect(this.promotionRow(promoCode ?? promotionName)).toBeVisible({ timeout: 30000 });
  }

  private promotionRow(rowQuery: string): Locator {
    return this.page.getByRole("row").filter({ hasText: rowQuery });
  }

  private promotionActionsTrigger(rowQuery: string): Locator {
    return this.promotionRow(rowQuery).locator('[data-slot="dropdown-menu-trigger"]');
  }

  private promotionActionCell(rowQuery: string): Locator {
    return this.promotionRow(rowQuery).locator("td").last();
  }

  private promotionCopyButton(rowQuery: string): Locator {
    return this.promotionActionCell(rowQuery).locator("button:has(svg.lucide-copy)");
  }

  private promotionCopyConfirmationIcon(rowQuery: string): Locator {
    return this.promotionActionCell(rowQuery).locator("svg.lucide-circle-check");
  }

  private deleteConfirmationDialog(): Locator {
    return this.page
      .getByRole("alertdialog")
      .or(this.page.getByRole("dialog"))
      .filter({ hasText: /delete|hapus|confirm|confirmation/i })
      .first();
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

  async trySetPromotionInactive(rowQuery: string): Promise<boolean> {
    try {
      await this.setPromotionInactive(rowQuery);
      return true;
    } catch {
      await this.page.keyboard.press("Escape").catch(() => undefined);
      return false;
    }
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

  async openDeleteConfirmation(rowQuery: string) {
    await this.openPromotionActions(rowQuery);
    await safeClick(this.page.getByRole("menuitem", { name: "Delete", exact: true }));
    await expect(this.deleteConfirmationDialog()).toBeVisible({ timeout: 10000 });
  }

  async expectDeleteConfirmationVisible() {
    const dialog = this.deleteConfirmationDialog();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole("heading", { name: /delete promotion/i })).toBeVisible();
    await expect(dialog).toContainText(/are you sure you want to delete this promotion\?/i);
    await expect(dialog.getByRole("button", { name: /cancel/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /confirm/i })).toBeVisible();
  }

  async dismissDeleteConfirmation() {
    const dialog = this.deleteConfirmationDialog();
    await safeClick(dialog.getByRole("button", { name: "Cancel", exact: true }));
    await expect(dialog).toBeHidden({ timeout: 10000 });
  }

  async confirmDeletePromotion() {
    await safeClick(this.deleteConfirmationDialog().getByRole("button", { name: /confirm/i }));
  }

  async deletePromotionFromList(rowQuery: string) {
    await this.openDeleteConfirmation(rowQuery);
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" && response.url().includes("/promos/"),
      { timeout: 15000 },
    );
    await this.confirmDeletePromotion();
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

  async expectPromotionListed(rowQuery: string) {
    await expect(this.promotionRow(rowQuery)).toBeVisible({ timeout: 30000 });
  }

  async copyPromotionCode(rowQuery: string) {
    await safeClick(this.promotionCopyButton(rowQuery));
  }

  async expectPromotionCodeCopied(expectedCode: string) {
    const copiedCode = await this.page.evaluate(() =>
      (navigator as Navigator & { clipboard: { readText(): Promise<string> } }).clipboard.readText(),
    );
    expect(copiedCode).toBe(expectedCode);
  }

  async expectCopyConfirmationFeedback(rowQuery: string) {
    await expect(this.promotionCopyConfirmationIcon(rowQuery)).toBeVisible({ timeout: 5000 });
  }

  async expectPromotionFormPrefilled(input: PromotionValidationFormData) {
    await expect(this.nameInput).toHaveValue(input.name);
    await expect(this.discountAmountInput).toHaveValue(String(input.discount));
    await expect(this.discountCodeInput).toHaveValue(input.code);
  }

  async updatePromotionDiscount(discount: number) {
    await safeFill(this.discountAmountInput, String(discount));
  }

  async savePromotionEdit(): Promise<PromotionCreateResponse> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/promos/") && response.request().method() === "PUT",
      { timeout: 15000 },
    );
    await safeClick(this.page.getByRole("button", { name: "Save" }));
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    return (await response.json()) as PromotionCreateResponse;
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
