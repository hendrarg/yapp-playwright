import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartClick, smartLocator } from "@utils/heal-utils";
import { productsHideFromProfileData } from "@test-data/creator/products.hide-from-profile.data";
import { safeClick, safeFill } from "@utils/playwright.utils";
import { flakyClick } from "@utils/flaky-utils";
import { productsSearchData } from "@test-data/creator/products.search.data";
import { consultationConfigData } from "@test-data/creator/consultation.config.data";
import { consultationLifecycleData, consultationWeekdayLabel } from "@test-data/creator/consultation.lifecycle.data";
import { consultationMediaData } from "@test-data/creator/consultation.media.data";
import { consultationNavigationData } from "@test-data/creator/consultation.navigation.data";
import { consultationPricingData } from "@test-data/creator/consultation.pricing.data";
import { consultationValidationData } from "@test-data/creator/consultation.validation.data";
import { discordMembershipValidationData } from "@test-data/creator/membership.data";
import {
  digitalProductValidationData,
  productsCreationData,
} from "@test-data/creator/products.creation.data";
import {
  productsStatusData,
  type ProductStatusTab,
} from "@test-data/creator/products.status.data";

export class ProductsPage {
  constructor(
    public readonly page: Page,
    private readonly baseURL: string,
  ) {}

  readonly addProductButton = locatorChain(this.page, {
    role: "button",
    name: "Add Product",
    text: "Add Product",
    exact: true,
  });

  readonly searchInput = locatorChain(this.page, {
    role: "textbox",
    placeholder: "Search",
    selector: 'input[placeholder="Search"]',
  });

  readonly emptyHeading = locatorChain(this.page, {
    text: productsSearchData.emptyHeading,
    selector: `text=${productsSearchData.emptyHeading}`,
  });

  readonly emptyHint = locatorChain(this.page, {
    text: productsSearchData.emptyHint,
    selector: `text=${productsSearchData.emptyHint}`,
  });

  readonly createProductCta = locatorChain(this.page, {
    role: "button",
    name: "Create Product",
    text: "Create Product",
    exact: true,
  });

  readonly addNewProductHeading = locatorChain(this.page, {
    role: "heading",
    name: "Add New Product",
    text: "Add New Product",
  });

  readonly digitalProductTitleInput = locatorChain(this.page, {
    role: "textbox",
    name: "Enter title",
    exact: true,
    placeholder: "Enter title",
    selector: 'input[placeholder="Enter title"]',
  });

  private readonly digitalProductThumbnailInput = smartLocator(this.page, {
    label: "Upload File",
    selector: 'input[type="file"][accept*="image/jpeg"]:not([multiple]):visible',
  });

  readonly embedLinkUrlInput = locatorChain(this.page, {
    role: "textbox",
    name: "https://placeyourlinkhere",
    exact: true,
    placeholder: "https://placeyourlinkhere",
    selector: 'input[type="url"]',
  });

  readonly embedLinkLabelInput = locatorChain(this.page, {
    role: "textbox",
    name: "Get My Latest Product",
    exact: true,
    placeholder: "Get My Latest Product",
    selector: 'input[placeholder="Get My Latest Product"]',
  });

  readonly embedLinkDoneButton = locatorChain(this.page, {
    role: "button",
    name: "Done",
    text: "Done",
    selector: 'button:has-text("Done")',
  });

  readonly contentDetailsHeading = locatorChain(this.page, {
    text: "Content Details",
    selector: 'text="Content Details"',
  });

  // Keep smartLocator live for locator audit + interaction helpers
  private readonly searchAction = smartLocator(this.page, {
    role: "textbox",
    placeholder: "Search",
    selector: 'input[placeholder="Search"]',
  });

  private readonly activeStatusTabAction = smartLocator(this.page, {
    role: "tab",
    name: "Active",
    selector: 'button[role="tab"]',
  });

  private readonly shareAction = smartLocator(this.page, {
    role: "menuitem",
    name: "Share",
    text: "Share",
    selector: '[role="menuitem"]',
  });

  private readonly shareDialog = smartLocator(this.page, {
    role: "dialog",
    text: "Share",
    selector: '[role="dialog"]',
  });

  private readonly copyProductUrlAction = smartLocator(this.page, {
    role: "button",
    name: "Copy link",
    selector: '[role="dialog"] input#link + button',
  });

  private readonly deleteProductAction = smartLocator(this.page, {
    role: "menuitem",
    name: "Delete",
    text: "Delete",
    selector: '[role="menuitem"]',
  });

  private readonly setInactiveSwitchAction = smartLocator(this.page, {
    role: "switch",
    name: "Set Inactive",
    selector: '[role="menuitem"]:has-text("Set Inactive") [role="switch"]',
  });

  private readonly nextSetDetailsAction = smartLocator(this.page, {
    role: "button",
    name: "Next: Set Details",
    text: "Next: Set Details",
    selector: 'button:has-text("Next: Set Details")',
  });

  private readonly discordMembershipTitleInput = smartLocator(this.page, {
    role: "textbox",
    name: "Enter title",
    placeholder: "Enter title",
    selector: 'input[placeholder="Enter title"]',
  });

  private readonly discordMembershipDescriptionEditor = smartLocator(this.page, {
    role: "textbox",
    name: "editable markdown",
    selector: '[contenteditable="true"][role="textbox"]',
  });

  private readonly discordMembershipDurationValueInput = smartLocator(this.page, {
    placeholder: "0",
    selector: 'input[placeholder="0"]',
  });

  private readonly discordMembershipServerSelect = smartLocator(this.page, {
    text: "Select a server",
    selector: 'button[role="combobox"]:has-text("Select a server")',
  });

  private readonly discordMembershipRoleSelect = smartLocator(this.page, {
    text: "Select a role",
    selector: 'button[role="combobox"]:has-text("Select a role")',
  });

  private readonly discordMembershipBoldAction = smartLocator(this.page, {
    role: "radio",
    name: "Bold",
    selector: '[role="radio"][aria-label="Bold"]',
  });

  private readonly discordMembershipItalicAction = smartLocator(this.page, {
    role: "radio",
    name: "Italic",
    selector: '[role="radio"][aria-label="Italic"]',
  });

  private readonly discordMembershipUnderlineAction = smartLocator(this.page, {
    role: "radio",
    name: "Underline",
    selector: '[role="radio"][aria-label="Underline"]',
  });

  private readonly discordMembershipItalicApplied = smartLocator(this.page, {
    role: "radio",
    name: "Remove italic",
    selector: '[role="radio"][aria-label="Remove italic"]',
  });

  private readonly discordMembershipUnderlineApplied = smartLocator(this.page, {
    role: "radio",
    name: "Remove underline",
    selector: '[role="radio"][aria-label="Remove underline"]',
  });

  private readonly discordMembershipNextPublishAction = smartLocator(this.page, {
    role: "button",
    name: "Next: Publish",
    text: "Next: Publish",
    selector: 'button:has-text("Next: Publish")',
  });

  private readonly discordMembershipSaveChangesAction = smartLocator(this.page, {
    role: "button",
    name: "Save Changes",
    text: "Save Changes",
    selector: 'button:has-text("Save Changes")',
  });

  private readonly discordMembershipSettingsPriceInput = smartLocator(this.page, {
    placeholder: "10,000",
    selector: 'input[placeholder="10,000"]',
  });

  private readonly discordMembershipCustomizeMessageSwitch = smartLocator(this.page, {
    role: "switch",
    name: "Customize Message",
    selector: 'button[role="switch"]:has(+ label:has-text("Customize Message"))',
  });

  private readonly discordMembershipAfterSalesEditor = smartLocator(this.page, {
    role: "textbox",
    name: "editable markdown",
    selector: '[contenteditable="true"][role="textbox"]',
  });

  private readonly discordMembershipHideFromExploreSwitch = smartLocator(this.page, {
    role: "switch",
    name: "Hide from Explore",
    selector: "#hide-from-explore",
  });

  private readonly discordMembershipAdvancedSettingsHeading = smartLocator(this.page, {
    role: "heading",
    name: "Advanced Settings",
    text: "Advanced Settings",
  });

  private readonly discordMembershipBuyerFormHeading = smartLocator(this.page, {
    text: "Buyer form",
    selector: 'text="Buyer form"',
  });

  private readonly discordMembershipAfterSalesHeading = smartLocator(this.page, {
    text: "After Sales",
    selector: 'text="After Sales"',
  });

  private readonly consultationPricingSwitchAction = smartLocator(this.page, {
    role: "switch",
    name: "Add Pricing",
    selector: "#enable-pricing",
  });

  private readonly nextSetAvailabilityAction = smartLocator(this.page, {
    role: "button",
    name: "Next: Set Availability",
    text: "Next: Set Availability",
    selector: 'button:has-text("Next: Set Availability")',
  });

  private readonly consultationBackAction = smartLocator(this.page, {
    role: "button",
    name: "Back",
    text: "Back",
    selector: 'button:has-text("Back")',
  });

  private readonly digitalProductBackAction = smartLocator(this.page, {
    role: "button",
    name: "",
    exact: true,
    selector: 'button:has(svg.lucide-arrow-left)',
  });

  private readonly digitalProductUnsavedChangesDialog = smartLocator(this.page, {
    role: "dialog",
    text: "Unsaved changes",
    selector: '[role="dialog"], [role="alertdialog"]',
  });

  private readonly addQuestionsAction = smartLocator(this.page, {
    role: "button",
    name: "Add Questions",
    text: "Add Questions",
    selector: 'button:has-text("Add Questions")',
  });

  private readonly createQuestionAction = smartLocator(this.page, {
    role: "button",
    name: "Create Question",
    text: "Create Question",
    selector: 'button:has-text("Create Question")',
  });

  private readonly createConsultationAction = smartLocator(this.page, {
    role: "button",
    name: "Create Consultation",
    text: "Create Consultation",
    selector: 'button:has-text("Create Consultation")',
  });

  private readonly saveAndPublishAction = smartLocator(this.page, {
    role: "button",
    name: "Save and Publish",
    text: "Save and Publish",
    selector: 'button:has-text("Save and Publish")',
  });

  private readonly saveAsDraftAction = smartLocator(this.page, {
    role: "button",
    name: "Save as Draft",
    text: "Save as Draft",
    selector: 'button:has-text("Save as Draft")',
  });

  private readonly editProductAction = smartLocator(this.page, {
    role: "menuitem",
    name: "Edit",
    text: "Edit",
    selector: '[role="menuitem"]:has-text("Edit")',
  });

  private readonly linksContentTypeAction = smartLocator(this.page, {
    text: "Links",
    selector: "#content-type-links",
  });

  private readonly addEmbedLinkAction = smartLocator(this.page, {
    role: "button",
    name: "Add Link",
    text: "Add Link",
    selector: 'button:has-text("Add Link")',
  });

  private readonly embedLinkUrlAction = smartLocator(this.page, {
    role: "textbox",
    name: "https://placeyourlinkhere",
    exact: true,
    placeholder: "https://placeyourlinkhere",
    selector: 'input[type="url"]',
  });

  private readonly embedLinkLabelAction = smartLocator(this.page, {
    role: "textbox",
    name: "Get My Latest Product",
    exact: true,
    placeholder: "Get My Latest Product",
    selector: 'input[placeholder="Get My Latest Product"]',
  });

  private addProductSheet(): Locator {
    return this.page.getByRole("dialog", { name: "Add New Product" });
  }

  private productTypeButton(buttonName: RegExp): Locator {
    return this.addProductSheet().getByRole("button", { name: buttonName });
  }

  private linksContentTypeCheckbox(): Locator {
    return this.page.locator("#content-type-links");
  }

  private embedLinksSection(): Locator {
    return locatorChain(this.page, {
      text: "Embed Links",
      selector: 'text="Embed Links"',
    });
  }

  private textFeedback(message: string): Locator {
    return locatorChain(this.page, {
      text: message,
      selector: `text="${message}"`,
    });
  }

  private productRows(productName: string): Locator {
    return this.page
      .getByRole("row", { name: productName })
      .or(this.page.locator("tr").filter({ hasText: productName }));
  }

  private productRow(productName: string): Locator {
    return this.productRows(productName).first();
  }

  private productActionsTrigger(productName: string): Locator {
    return this.productRow(productName).getByRole("button").last();
  }

  private statusTab(status: ProductStatusTab): Locator {
    const pattern = new RegExp(`^${status} \\(\\d+\\)$`);
    return this.page
      .getByRole("tab", { name: pattern })
      .or(this.page.locator('button[role="tab"]').filter({ hasText: pattern }));
  }

  async goto() {
    await this.page.goto(new URL("products", this.baseURL).toString(), {
      waitUntil: "domcontentloaded",
    });
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/products/);
    expect(this.page.url()).not.toContain("/auth");
    await expect(this.addProductButton).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByText("PRODUCT NAME", { exact: true }).first()).toBeVisible({
      timeout: 15000,
    });
  }

  async expectSearchFieldUsable() {
    await expect(this.searchInput).toBeVisible({ timeout: 10000 });
    await expect(this.searchInput).toBeEnabled();
    await this.searchInput.click();
    await expect(this.searchInput).toBeFocused();
    void this.searchAction;
  }

  async searchProducts(query: string) {
    await safeFill(this.searchInput, query);
    await this.page.waitForTimeout(1200);
  }

  async searchProductsUntilVisible(query: string) {
    const responsePromise = this.page.waitForResponse(
      (response) => {
        if (!response.url().includes("/api/v1/shop/products") || response.request().method() !== "GET") {
          return false;
        }
        return new URL(response.url()).searchParams.get("title") === query;
      },
      { timeout: 15000 },
    );
    await safeFill(this.searchInput, query);
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    await expect(this.productRow(query)).toBeVisible({ timeout: 10000 });
  }

  async clearSearch() {
    await safeFill(this.searchInput, "");
    await this.page.waitForTimeout(1200);
  }

  async expectActiveCount(count: number | RegExp) {
    const pattern = count instanceof RegExp ? count : new RegExp(`Active \\(${count}\\)`);
    await expect(this.page.getByText(pattern).first()).toBeVisible({ timeout: 10000 });
  }

  async expectProductVisible(productName: string) {
    await expect(this.productRow(productName)).toBeVisible({
      timeout: 10000,
    });
  }

  async expectProductHidden(productName: string) {
    await expect(this.productRows(productName)).toHaveCount(0, {
      timeout: 10000,
    });
  }

  async expectNameSearchResults(matchedName: string, excludedName: string) {
    await this.expectActiveCount(1);
    await this.expectProductVisible(matchedName);
    await this.expectProductHidden(excludedName);
  }

  async expectEmptySearchState() {
    await this.expectActiveCount(0);
    await expect(this.emptyHeading).toBeVisible({ timeout: 10000 });
    await expect(this.emptyHint).toBeVisible({ timeout: 5000 });
    await expect(this.createProductCta).toBeVisible({ timeout: 5000 });
  }

  async expectRestoredProductList(productNames: readonly string[]) {
    await this.expectActiveCount(/Active \([1-9]\d*\)/);
    for (const name of productNames) {
      await this.expectProductVisible(name);
    }
  }

  /** After a name search that yields a single match, read that product's share URL. */
  async readMatchedProductUrl(): Promise<string> {
    const link = this.page.getByRole("link", { name: /\/s\/[A-Za-z0-9_-]+/ }).first();
    await expect(link).toBeVisible({ timeout: 10000 });
    const href = await link.getAttribute("href");
    expect(href, "expected a visible product share URL").toBeTruthy();
    return href!;
  }

  async selectStatusTab(status: ProductStatusTab, options: { waitForRender?: boolean } = {}) {
    void this.activeStatusTabAction;
    await safeClick(this.statusTab(status));
    await expect(this.statusTab(status)).toHaveAttribute("aria-selected", "true", {
      timeout: 10000,
    });
    if (options.waitForRender !== false) {
      await this.page.waitForTimeout(1000);
    }
  }

  async expectStatusTabSelected(status: ProductStatusTab) {
    await expect(this.statusTab(status)).toBeVisible({ timeout: 10000 });
    await expect(this.statusTab(status)).toHaveAttribute("aria-selected", "true");
  }

  async expectStatusTabHasProducts(status: ProductStatusTab) {
    await expect(this.statusTab(status)).toHaveText(new RegExp(`^${status} \\([1-9]\\d*\\)$`), {
      timeout: 10000,
    });
  }

  async expectListShowsOnlyRowStatus(rowStatus: "ACTIVE" | "INACTIVE" | "DRAFT") {
    const body = await this.page.locator("body").innerText();
    const statuses = [...body.matchAll(/\b(ACTIVE|INACTIVE|DRAFT)\b/g)].map((match) => match[1]);
    expect(statuses.length, `expected ${rowStatus} rows in the product list`).toBeGreaterThan(0);
    for (const status of statuses) {
      expect(status).toBe(rowStatus);
    }
  }

  async openAddProductSheet() {
    await safeClick(this.addProductButton);
    await expect(this.addNewProductHeading).toBeVisible({ timeout: 10000 });
  }

  async expectProductTypesAvailable(
    types: readonly (typeof productsCreationData.productTypes)[number][] = productsCreationData.productTypes,
  ) {
    for (const type of types) {
      await expect(this.productTypeButton(type.buttonName)).toBeVisible({ timeout: 10000 });
    }
  }

  async selectProductType(buttonName: RegExp) {
    await safeClick(this.productTypeButton(buttonName));
  }

  private productActionMenu(): Locator {
    return this.page.getByRole("menu");
  }

  private deleteConfirmationDialog(): Locator {
    return this.page
      .getByRole("alertdialog")
      .or(this.page.getByRole("dialog"))
      .filter({ hasText: /delete|hapus|confirm|confirmation/i })
      .first();
  }

  private statusChangeConfirmationDialog(): Locator {
    return this.page
      .getByRole("alertdialog")
      .or(this.page.getByRole("dialog"))
      .filter({ has: this.page.getByRole("button", { name: /confirm/i }) })
      .first();
  }

  private hideFromProfileSwitch(): Locator {
    return this.productActionMenu().locator(
      `#${productsHideFromProfileData.hideFromProfileButtonId}`,
    );
  }

  async openProductActionsMenu(productName: string) {
    // FLAKY_FIX: product rows can re-render once after the filtered list response settles.
    await flakyClick(this.productActionsTrigger(productName), { retries: 3, timeout: 5000 });
    await expect(this.productActionMenu()).toBeVisible({ timeout: 10000 });
  }

  async openShareDialog(productName: string) {
    await this.openProductActionsMenu(productName);
    await this.shareAction.click();
  }

  async openDeleteConfirmation(productName: string) {
    await this.openProductActionsMenu(productName);
    await this.deleteProductAction.click({ timeout: 10000 });
    await expect(this.deleteConfirmationDialog()).toBeVisible({ timeout: 10000 });
  }

  async expectDeleteConfirmationVisible() {
    const dialog = this.deleteConfirmationDialog();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole("heading", { name: /delete product/i })).toBeVisible();
    await expect(dialog).toContainText(/are you sure you want to delete this product\?/i);
    await expect(dialog.getByRole("button", { name: /cancel/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /confirm/i })).toBeVisible();
  }

  async dismissDeleteConfirmation() {
    const dialog = this.deleteConfirmationDialog();
    const cancelButton = dialog
      .getByRole("button", { name: /cancel|batal|close|no/i })
      .first();

    if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await safeClick(cancelButton);
    } else {
      await this.page.keyboard.press("Escape");
    }

    await expect(dialog).toBeHidden({ timeout: 10000 });
  }

  async setProductInactive(productName: string) {
    await this.openProductActionsMenu(productName);

    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/shop/products") &&
        !response.url().includes("/hide-from-profile") &&
        ["PATCH", "POST", "PUT"].includes(response.request().method()),
      { timeout: 15000 },
    );

    await this.setInactiveSwitchAction.click({ timeout: 10000 });

    const dialog = this.statusChangeConfirmationDialog();
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      const confirmButton = dialog
        .getByRole("button", { name: /confirm|set inactive|yes/i })
        .first();
      await safeClick(confirmButton);
      await expect(dialog).toBeHidden({ timeout: 10000 });
    }

    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    await this.page.keyboard.press("Escape");
    await expect(this.productActionMenu()).toBeHidden({ timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(1200);
  }

  async expectShareDialogVisible() {
    expect(await this.shareDialog.text()).toMatch(/share/i);
  }

  async copyProductUrl() {
    await this.copyProductUrlAction.click({ timeout: 3000 });
  }

  async expectProductUrlCopied(expectedProductPath: string) {
    const copiedUrl = await this.page.evaluate(() =>
      (navigator as Navigator & { clipboard: { readText(): Promise<string> } }).clipboard.readText(),
    );
    const productSlug = expectedProductPath.split("/").pop();
    expect(productSlug).toBeTruthy();
    expect(copiedUrl).toContain(productSlug);
  }

  async expectHideFromProfileActionAvailable(productName: string) {
    await this.openProductActionsMenu(productName);
    await expect(
      this.productActionMenu().getByText(
        productsHideFromProfileData.hideFromProfileAction,
        { exact: true },
      ),
    ).toBeVisible({ timeout: 10000 });
    await expect(this.hideFromProfileSwitch()).toBeVisible({ timeout: 10000 });
    await expect(this.hideFromProfileSwitch()).toHaveAttribute("role", "switch");
    await this.page.keyboard.press("Escape");
  }

  async selectHideFromProfileAction(productName: string) {
    await this.openProductActionsMenu(productName);
    const toggle = this.hideFromProfileSwitch();
    await expect(toggle).toBeVisible({ timeout: 10000 });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/hide-from-profile") &&
        response.request().method() === "PUT",
      { timeout: 15000 },
    );
    await safeClick(toggle);
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
  }

  async selectRestoreVisibilityAction(productName: string) {
    await this.openProductActionsMenu(productName);
    const toggle = this.hideFromProfileSwitch();
    await expect(toggle).toBeVisible({ timeout: 10000 });
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/hide-from-profile") &&
        response.request().method() === "PUT",
      { timeout: 15000 },
    );
    await safeClick(toggle);
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    await this.openProductActionsMenu(productName);
    await expect(this.hideFromProfileSwitch()).toHaveAttribute("aria-checked", "false");
  }

  async expectDiscordMembershipCreateFlow() {
    await expect(this.page).toHaveURL(productsCreationData.discordMembershipCreatePath);
    await this.nextSetDetailsAction.text();
    await smartLocator(this.page, {
      text: "Membership Information",
      selector: 'text="Membership Information"',
    }).text();
    await smartLocator(this.page, {
      text: "Discord Set Up",
      selector: 'text="Discord Set Up"',
    }).text();
    await this.discordMembershipTitleInput.text();
  }

  async submitDiscordMembershipDetails() {
    await this.nextSetDetailsAction.click({ timeout: 10000 });
  }

  async expectDiscordMembershipRequiredFeedback() {
    for (const error of discordMembershipValidationData.requiredErrors) {
      await expect(this.textFeedback(error)).toBeVisible({ timeout: 10000 });
    }
  }

  async fillDiscordMembershipTitle(title: string) {
    await this.discordMembershipTitleInput.fill(title, { timeout: 10000 });
  }

  async prepareDiscordMembershipDetails(options: {
    title: string;
    description: string;
    serverName: string;
    roleName: string;
    durationValue?: string;
    durationUnit?: string;
  }) {
    const durationValue = options.durationValue ?? "1";
    const durationUnit = options.durationUnit ?? "Month";
    await this.fillDiscordMembershipTitle(options.title);
    await this.fillDiscordMembershipDescription(options.description);
    await this.selectDiscordMembershipDuration(durationValue, durationUnit, durationUnit);
    await this.selectDiscordMembershipServer(options.serverName);
    await this.selectDiscordMembershipRole(options.roleName);
    await this.continueToDiscordMembershipDetails();
  }

  async fillDiscordMembershipDescription(text: string) {
    await this.discordMembershipDescriptionEditor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    await this.page.keyboard.insertText(text);
  }

  async appendDiscordMembershipDescription(text: string) {
    await this.discordMembershipDescriptionEditor.click({ timeout: 10000 });
    await this.page.keyboard.press("End");
    await this.page.keyboard.insertText(text);
  }

  async applyDiscordMembershipDescriptionFormatting() {
    await this.discordMembershipDescriptionEditor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.discordMembershipBoldAction.click({ timeout: 10000 });
    await this.discordMembershipItalicAction.click({ timeout: 10000 });
    await this.discordMembershipUnderlineAction.click({ timeout: 10000 });
    await this.discordMembershipItalicApplied.text();
    await this.discordMembershipUnderlineApplied.text();
  }

  async expectDiscordMembershipDescriptionCounter(expected = discordMembershipValidationData.descriptionLimit) {
    const counter = smartLocator(this.page, {
      text: expected,
      selector: `p:has-text("${expected}")`,
    });
    await expect(await counter.text()).toBe(expected);
  }

  async selectDiscordMembershipDuration(value: string, currentUnit: string, unit: string) {
    await this.discordMembershipDurationValueInput.fill(value, { timeout: 10000 });
    await smartClick(this.page, {
      text: currentUnit,
      selector: 'button[role="combobox"]',
    });
    await smartClick(this.page, {
      role: "option",
      name: unit,
      text: unit,
      selector: '[role="option"]',
    });
    const selectedUnit = smartLocator(this.page, {
      text: unit,
      selector: 'button[role="combobox"]',
    });
    await expect(await selectedUnit.text()).toContain(unit);
  }

  async expectDiscordMembershipServerRequirement() {
    const requirement = smartLocator(this.page, {
      text: "Select a server first",
      selector: 'button[role="combobox"]',
    });
    await expect(await requirement.text()).toContain("Select a server first");
  }

  async expectDiscordMembershipConnectionControl() {
    await this.discordMembershipServerSelect.click({ timeout: 10000 });
    const connectOption = smartLocator(this.page, {
      text: "+ Connect new server",
      selector: '[role="option"]',
    });
    await expect(await connectOption.text()).toContain(
      discordMembershipValidationData.connectServerOption,
    );
    await this.page.keyboard.press("Escape");
  }

  async selectDiscordMembershipServer(serverName: string) {
    const serverSelect = smartLocator(this.page, {
      text: serverName,
      selector: 'button[role="combobox"]',
    });
    try {
      await serverSelect.click({ timeout: 1500 });
    } catch {
      await this.discordMembershipServerSelect.click({ timeout: 10000 });
    }
    await smartClick(this.page, {
      role: "option",
      name: serverName,
      text: serverName,
      selector: '[role="option"]',
    });
  }

  async selectDiscordMembershipRole(roleName: string) {
    const roleSelect = smartLocator(this.page, {
      text: roleName,
      selector: 'button[role="combobox"]',
    });
    try {
      await roleSelect.click({ timeout: 1500 });
    } catch {
      await this.discordMembershipRoleSelect.click({ timeout: 10000 });
    }
    await smartClick(this.page, {
      role: "option",
      name: roleName,
      text: roleName,
      selector: '[role="option"]',
    });
  }

  async expectDiscordMembershipServerAndRole(serverName: string, roleName: string) {
    const selectedServer = smartLocator(this.page, {
      text: serverName,
      selector: 'button[role="combobox"]',
    });
    const selectedRole = smartLocator(this.page, {
      text: roleName,
      selector: 'button[role="combobox"]',
    });
    await expect(await selectedServer.text()).toContain(serverName);
    await expect(await selectedRole.text()).toContain(roleName);
  }

  async expectDiscordMembershipEditorValues(options: {
    title: string;
    description: string;
    serverName: string;
    roleName: string;
  }) {
    await this.expectConsultationTitleValue(options.title);
    await this.expectConsultationDescriptionContains(options.description);
    await this.expectDiscordMembershipServerAndRole(options.serverName, options.roleName);
  }

  async continueToDiscordMembershipDetails() {
    await this.nextSetDetailsAction.click({ timeout: 10000 });
    await this.discordMembershipNextPublishAction.text();
  }

  async readConsultationPricingEnabled(): Promise<boolean> {
    return (await this.consultationPricingSwitchAction.getAttribute("aria-checked")) === "true";
  }

  async submitDiscordMembershipPricing() {
    await this.discordMembershipNextPublishAction.click({ timeout: 10000 });
  }

  async fillDiscordMembershipSettingsPrice(amount: string) {
    await this.discordMembershipSettingsPriceInput.fill(amount, { timeout: 10000 });
  }

  async expectDiscordMembershipSettingsPrice(amount: string) {
    const value = await this.discordMembershipSettingsPriceInput.getAttribute("value");
    expect(value?.replace(/,/g, "")).toBe(amount);
  }

  async fillDiscordMembershipAfterSalesMessage(message: string) {
    if ((await this.discordMembershipCustomizeMessageSwitch.getAttribute("aria-checked")) !== "true") {
      await this.discordMembershipCustomizeMessageSwitch.click({ timeout: 10000 });
    }
    await this.discordMembershipAfterSalesEditor.text({ timeout: 10000 });
    await this.discordMembershipAfterSalesEditor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.insertText(message);
  }

  async expectDiscordMembershipAfterSalesMessage(message: string) {
    expect(await this.discordMembershipCustomizeMessageSwitch.getAttribute("aria-checked")).toBe("true");
    expect(await this.discordMembershipAfterSalesEditor.text()).toContain(message);
  }

  async setDiscordMembershipHideFromExplore(enabled: boolean) {
    const switchState = this.discordMembershipHideFromExploreSwitch;
    if ((await switchState.getAttribute("aria-checked")) !== String(enabled)) {
      await switchState.click({ timeout: 10000 });
    }
    expect(await switchState.getAttribute("aria-checked")).toBe(String(enabled));
  }

  async expectDiscordMembershipHideFromExplore(enabled: boolean) {
    expect(await this.discordMembershipHideFromExploreSwitch.getAttribute("aria-checked")).toBe(String(enabled));
  }

  async expectDiscordMembershipSettingsSections() {
    expect(await this.discordMembershipAdvancedSettingsHeading.text()).toContain("Advanced Settings");
    expect(await this.discordMembershipBuyerFormHeading.text()).toContain("Buyer form");
    expect(await this.discordMembershipAfterSalesHeading.text()).toContain("After Sales");
  }

  async addDiscordMembershipBuyerQuestion(label: string) {
    await this.addCustomBuyerQuestion(label);
  }

  async isDiscordMembershipBuyerQuestionVisible(label: string): Promise<boolean> {
    const question = smartLocator(this.page, {
      text: label,
      selector: `[role="main"] >> text="${label}"`,
    });
    try {
      await question.text({ timeout: 1500 });
      return true;
    } catch {
      return false;
    }
  }

  async publishDiscordMembershipAndReadSharePath(): Promise<string> {
    await this.submitDiscordMembershipPricing();
    await this.expectProductCompleteModal();
    return this.readProductCompleteSharePath();
  }

  async isDiscordMembershipZeroPriceRejected(): Promise<boolean> {
    return this.page.evaluate(() => {
      const root = globalThis as unknown as {
        document: {
          body: { innerText: string };
          querySelectorAll: (selector: string) => ArrayLike<{
            textContent?: string;
            disabled?: boolean;
          }>;
        };
      };
      const bodyText = root.document.body.innerText;
      const hasPriceError = /greater than zero|must be greater|positive|cannot be zero|invalid price/i.test(
        bodyText,
      );
      const publishButtons = Array.from(root.document.querySelectorAll("button"))
        .filter((button) => button.textContent?.trim() === "Next: Publish");
      return hasPriceError || publishButtons.length === 0 || publishButtons.every((button) => button.disabled);
    });
  }

  async navigateAwayFromDiscordMembershipViaBack() {
    await this.page.evaluate(() => {
      const root = globalThis as unknown as {
        document: {
          querySelectorAll: (selector: string) => ArrayLike<{
            textContent?: string;
            click: () => void;
          }>;
        };
      };
      const backButton = Array.from(root.document.querySelectorAll("button"))
        .find((button) => button.textContent?.trim() === "Back");
      if (!backButton) {
        throw new Error("Discord Membership Back button was not found");
      }
      backButton.click();
    });
  }

  async expectDiscordMembershipUnsavedChangesDialog() {
    const dialog = smartLocator(this.page, {
      role: "dialog",
      text: "Unsaved changes",
      selector: '[role="dialog"]',
    });
    const dialogText = await dialog.text();
    expect(dialogText).toMatch(/unsaved|leave|discard|lose your changes|are you sure/i);
  }

  async saveDiscordMembershipChangesFromUnsavedDialog() {
    await this.discordMembershipSaveChangesAction.click({ timeout: 10000 });
    await expect(this.page).toHaveURL(/\/products(?:\?|$)/, { timeout: 60000 });
    await this.expectLoaded();
  }

  async expectDigitalProductCreateFlow() {
    await expect(this.page).toHaveURL(productsCreationData.digitalProductCreatePath);
    await expect(this.digitalProductTitleInput).toBeVisible({ timeout: 10000 });
    await expect(this.contentDetailsHeading).toBeVisible({ timeout: 10000 });
  }

  async uploadDigitalProductThumbnail(filePath: string) {
    await this.digitalProductThumbnailInput.setInputFiles(filePath, { timeout: 15000 });
  }

  async navigateAwayFromDigitalProductViaBack() {
    await this.digitalProductBackAction.click({ timeout: 10000 });
  }

  async expectDigitalProductUnsavedChangesDialog() {
    const dialogText = await this.digitalProductUnsavedChangesDialog.text({ timeout: 10000 });
    expect(dialogText).toMatch(/unsaved|leave|discard|lose your changes|are you sure/i);
  }

  async submitEmptyDigitalProductAddContent() {
    await this.nextSetDetailsAction.click({ timeout: 10000 });
  }

  async expectDigitalProductRequiredFeedback() {
    const { requiredErrors } = digitalProductValidationData;
    await expect(this.textFeedback(requiredErrors.title)).toBeVisible({ timeout: 10000 });
    await expect(this.textFeedback(requiredErrors.description)).toBeVisible({ timeout: 10000 });
    await expect(this.textFeedback(requiredErrors.content)).toBeVisible({ timeout: 10000 });
    await expect(this.textFeedback(requiredErrors.thumbnail)).toBeVisible({ timeout: 10000 });
    await expect(this.textFeedback(requiredErrors.summary)).toBeVisible({ timeout: 10000 });
  }

  async enableLinksContentType() {
    const checkbox = this.linksContentTypeCheckbox();
    await this.linksContentTypeAction.click({ timeout: 10000 });

    if ((await checkbox.getAttribute("aria-checked")) !== "true") {
      await safeClick(this.page.locator("#content-type-links"));
    }

    await expect(checkbox).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
    await expect(this.embedLinksSection()).toBeVisible({ timeout: 10000 });
  }

  async openEmbedLinkDialog() {
    await this.addEmbedLinkAction.click({ timeout: 10000 });
    await expect(this.embedLinkUrlInput).toBeVisible({ timeout: 10000 });
    await expect(this.embedLinkLabelInput).toBeVisible({ timeout: 10000 });
  }

  async fillEmbedLink(label: string, url: string) {
    await this.embedLinkUrlAction.fill(url, { timeout: 10000 });
    await this.embedLinkLabelAction.fill(label, { timeout: 10000 });
  }

  async expectInvalidEmbedLinkFeedback() {
    const { linkValidation } = digitalProductValidationData;
    await expect(this.textFeedback(linkValidation.invalidUrlError)).toBeVisible({
      timeout: 10000,
    });
    await expect(this.embedLinkLabelInput).toHaveValue(linkValidation.truncatedLongLabel);
    await expect(this.textFeedback(linkValidation.maxLabelCounter)).toBeVisible({
      timeout: 10000,
    });
    await expect(this.embedLinkDoneButton).toBeDisabled();
  }

  async saveCurrentEmbedLink() {
    await expect(this.embedLinkDoneButton).toBeEnabled({ timeout: 10000 });
    await safeClick(this.embedLinkDoneButton);
    await expect(this.embedLinkUrlInput).toBeHidden({ timeout: 10000 });
  }

  async expectEmbedLinksSaved(labels: readonly string[]) {
    for (const label of labels) {
      await expect(this.textFeedback(label)).toBeVisible({ timeout: 10000 });
    }
  }

  async expectStatusTabList(status: ProductStatusTab) {
    const rowStatus = productsStatusData.rowStatusByTab[status];
    const sample = productsStatusData.sampleProductByTab[status];
    await this.expectStatusTabSelected(status);
    await this.expectStatusTabHasProducts(status);
    await this.expectListShowsOnlyRowStatus(rowStatus);
    await this.expectProductVisible(sample);

    for (const other of productsStatusData.tabs) {
      if (other === status) continue;
      await this.expectProductHidden(productsStatusData.sampleProductByTab[other]);
    }
  }

  private consultationDescriptionEditor(): Locator {
    return locatorChain(this.page, {
      role: "textbox",
      name: "editable markdown",
      selector: '[contenteditable="true"][role="textbox"]',
    }).first();
  }

  private addQuestionDialog(): Locator {
    return this.page.getByRole("dialog", { name: "Add New Question" });
  }

  private questionLabelInput(): Locator {
    return locatorChain(this.page, {
      role: "textbox",
      name: "Question Label",
      placeholder: "Enter your question...",
      selector: '[role="dialog"] input[placeholder="Enter your question..."]',
    });
  }

  private afterSalesSection(): Locator {
    const details = this.page.getByLabel("Details");
    return details.or(this.page.locator("body"));
  }

  private afterSalesLinksCheckbox(): Locator {
    return this.afterSalesSection()
      .getByText(consultationValidationData.afterSalesLinksLabel)
      .first()
      .locator("xpath=preceding::*[@role='checkbox'][1]");
  }

  async expectConsultationCreateFlow() {
    await expect(this.page).toHaveURL(productsCreationData.consultationCreatePath);
    await expect(this.digitalProductTitleInput).toBeVisible({ timeout: 10000 });
    await expect(
      this.page.getByRole("button", { name: "Next: Set Availability" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText("Buyer Form")).toBeVisible({ timeout: 10000 });
  }

  async fillConsultationDescription(text: string) {
    const editor = this.consultationDescriptionEditor();
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    await this.page.keyboard.insertText(text);
  }

  async appendConsultationDescription(text: string) {
    const editor = this.consultationDescriptionEditor();
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("End");
    await this.page.keyboard.insertText(text);
  }

  async expectConsultationDescriptionCounter(expected: string) {
    await expect(
      locatorChain(this.page, {
        text: expected,
        selector: `p:has-text("${expected}")`,
      }),
    ).toBeVisible({ timeout: 10000 });
  }

  async submitConsultationDetails() {
    await this.nextSetAvailabilityAction.click({ timeout: 10000 });
  }

  async expectConsultationTitleRequired() {
    await expect(this.textFeedback(consultationValidationData.titleRequiredError)).toBeVisible({
      timeout: 10000,
    });
  }

  async expectMandatoryBuyerFieldsProtected() {
    for (const label of consultationValidationData.mandatoryFields) {
      await expect(this.page.getByText(label, { exact: false }).first()).toBeVisible({
        timeout: 10000,
      });
    }
    await expect(this.page.getByText("Mandatory", { exact: true })).toHaveCount(3, {
      timeout: 10000,
    });

    for (const label of consultationValidationData.mandatoryFields) {
      const row = this.page.getByText(label, { exact: false }).first().locator("xpath=ancestor::div[2]");
      await expect(row.getByRole("button", { name: "Remove" })).toHaveCount(0);
    }
  }

  async addCustomBuyerQuestion(label: string) {
    await this.addQuestionsAction.click({ timeout: 10000 });
    const dialog = this.addQuestionDialog();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await safeFill(this.questionLabelInput(), label);
    await this.createQuestionAction.click({ timeout: 10000 });
    await expect(dialog).toBeHidden({ timeout: 10000 });
    await expect(this.page.getByText(label, { exact: true })).toBeVisible({ timeout: 10000 });
  }

  async expectAddQuestionsEnabled() {
    await expect(this.page.getByRole("button", { name: "Add Questions" })).toBeEnabled({
      timeout: 10000,
    });
  }

  async expectAddQuestionsDisabled() {
    await expect(this.page.getByRole("button", { name: "Add Questions" })).toBeDisabled({
      timeout: 10000,
    });
  }

  async removeCustomBuyerQuestion(label: string) {
    const questionCard = this.page
      .locator("div")
      .filter({ has: this.page.getByText(label, { exact: true }) })
      .filter({ has: this.page.getByRole("button", { name: "Remove", exact: true }) })
      .last();
    const removeButton = questionCard.getByRole("button", { name: "Remove", exact: true });
    await removeButton.scrollIntoViewIfNeeded();
    await expect(removeButton).toBeVisible({ timeout: 10000 });
    await removeButton.click({ timeout: 10000, force: true });

    const confirm = this.page
      .getByRole("alertdialog")
      .or(this.page.getByRole("dialog"))
      .filter({ hasText: /delete|remove|sure/i })
      .first();
    if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
      await safeClick(
        confirm.getByRole("button", { name: /confirm|delete|remove|yes/i }).last(),
      );
    }

    await expect(this.page.getByText(label, { exact: true })).toHaveCount(0, { timeout: 10000 });
  }

  async enableAfterSalesLinks() {
    const checkbox = this.afterSalesLinksCheckbox();
    await this.afterSalesSection()
      .getByText(consultationValidationData.afterSalesLinksLabel)
      .first()
      .scrollIntoViewIfNeeded();
    if ((await checkbox.getAttribute("aria-checked")) !== "true") {
      await safeClick(checkbox);
    }
    await expect(checkbox).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
    await expect(
      this.afterSalesSection().getByRole("button", { name: "Add Link" }).first(),
    ).toBeVisible({
      timeout: 10000,
    });
  }

  private consultationAfterSalesPreviewButton(): Locator {
    return this.afterSalesSection()
      .getByRole("button", { name: "Preview", exact: true })
      .or(this.page.getByRole("button", { name: "Preview", exact: true }))
      .filter({ visible: true })
      .first();
  }

  private consultationAfterSalesPreviewDialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ hasText: consultationConfigData.previewDialogHeadingPattern })
      .or(this.page.getByRole("dialog").filter({ hasText: /Links/i }))
      .last();
  }

  async openConsultationAfterSalesPreview() {
    const preview = this.consultationAfterSalesPreviewButton();
    await expect(preview).toBeEnabled({ timeout: 10000 });
    await safeClick(preview);
    await expect(this.consultationAfterSalesPreviewDialog()).toBeVisible({ timeout: 15000 });
  }

  async expectConsultationAfterSalesPreviewReadOnly(options: {
    message: string;
    linkLabel: string;
  }) {
    const dialog = this.consultationAfterSalesPreviewDialog();
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByText(options.message, { exact: false })).toBeVisible({
      timeout: 10000,
    });
    await expect(
      dialog
        .getByRole("link", { name: options.linkLabel })
        .or(dialog.getByText(options.linkLabel, { exact: true }))
        .first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(dialog.locator('[contenteditable="true"]')).toHaveCount(0, { timeout: 10000 });
    await expect(dialog.getByRole("textbox")).toHaveCount(0, { timeout: 10000 });
  }

  private consultationHeroInput(): Locator {
    return this.page.locator('input[type="file"][accept*="image/jpeg"]:not([multiple])');
  }

  private consultationGalleryInput(): Locator {
    return this.page.locator('input[type="file"][multiple]');
  }

  private productCompleteDialog(): Locator {
    return this.page.getByRole("dialog").filter({ hasText: /Product Complete|consultation is live/i });
  }

  async fillConsultationTitle(title: string) {
    await safeFill(
      this.page.getByRole("textbox", { name: "Enter title", exact: true }).first(),
      title,
    );
  }

  async applyConsultationRichTextFormatting(text: string) {
    const editor = this.consultationDescriptionEditor();
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    await this.page.keyboard.insertText(text);
    await this.page.keyboard.press("Control+A");
    await this.page.getByRole("radio", { name: "Bold" }).first().click();
    await this.page.getByRole("radio", { name: "Italic" }).first().click();
    await this.page.getByRole("radio", { name: "Underline" }).first().click();
    await expect(editor.locator("strong")).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByRole("radio", { name: "Remove italic" })).toBeVisible({
      timeout: 10000,
    });
    await expect(this.page.getByRole("radio", { name: "Remove underline" })).toBeVisible({
      timeout: 10000,
    });
  }

  async expectConsultationHeroRequired() {
    await expect(this.textFeedback(consultationMediaData.errors.heroRequired)).toBeVisible({
      timeout: 10000,
    });
  }

  async chooseConsultationHeroFile(filePath: string) {
    await this.consultationHeroInput().setInputFiles(filePath);
  }

  async chooseConsultationGalleryFiles(filePaths: readonly string[]) {
    await this.consultationGalleryInput().setInputFiles([...filePaths]);
  }

  async uploadConsultationHero(filePath: string) {
    await this.chooseConsultationHeroFile(filePath);
    await expect(
      this.page.getByRole("button", { name: /Uploaded image Thumbnail/i }),
    ).toBeVisible({ timeout: 30000 });
  }

  async uploadConsultationGallery(filePaths: readonly string[]) {
    await this.chooseConsultationGalleryFiles(filePaths);
    await expect(
      this.page.getByRole("button", { name: "Uploaded image 1", exact: true }),
    ).toBeVisible({ timeout: 60000 });
  }

  async expectConsultationHeroNotUploaded() {
    await expect(
      this.page.getByRole("button", { name: /Uploaded image Thumbnail/i }),
    ).toHaveCount(0, { timeout: 10000 });
  }

  async expectConsultationGalleryCount(count: number) {
    for (let i = 1; i <= count; i++) {
      await expect(
        this.page.getByRole("button", { name: `Uploaded image ${i}`, exact: true }),
      ).toBeVisible({ timeout: 15000 });
    }
    await expect(this.page.getByText("No Image")).toHaveCount(0, { timeout: 10000 });
  }

  async expectConsultationGalleryInputUnavailable() {
    await expect(this.consultationGalleryInput()).toHaveCount(0, { timeout: 10000 });
  }

  async expectConsultationImageTooSmall(fileName: string) {
    const pattern = new RegExp(
      `${fileName.replace(".", "\\.")} is too small\\. Image must be at least 500 × 500 pixels\\.`,
      "i",
    );
    await expect(this.page.getByText(pattern)).toBeVisible({ timeout: 10000 });
  }

  async expectConsultationImageTooLarge() {
    await expect(this.page.getByText(consultationMediaData.errors.tooLarge)).toBeVisible({
      timeout: 10000,
    });
  }

  async expectConsultationAvailabilityStep() {
    await expect(this.page.getByRole("heading", { name: "Availability*" })).toBeVisible({
      timeout: 30000,
    });
    await expect(this.page.getByRole("button", { name: "Create Consultation" })).toBeVisible({
      timeout: 10000,
    });
  }

  async addConsultationWeekdayTimeSlot(day: string = "Mon") {
    await this.page.getByRole("button", { name: `Add time slot for ${day}` }).click();
    await expect(this.page.getByRole("combobox", { name: `Start time for ${day}` })).toBeVisible({
      timeout: 10000,
    });
  }

  async createConsultation() {
    await this.createConsultationAction.click({ timeout: 10000 });
  }

  async expectProductCompleteModal() {
    const dialog = this.productCompleteDialog();
    await expect(dialog).toBeVisible({ timeout: 60000 });
    await expect(dialog.getByRole("heading", { name: /Product Complete|live/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "View Product Page" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Copy Link/i }).first()).toBeVisible();
    await expect(dialog.getByRole("img", { name: /Product Complete|consultation/i }).first()).toBeVisible();
  }

  async readProductCompleteSharePath(): Promise<string> {
    const dialog = this.productCompleteDialog();
    await expect(dialog).toBeVisible({ timeout: 60000 });
    const text = await dialog.innerText();
    const match = text.match(/\/s\/[A-Za-z0-9_-]+/);
    expect(match?.[0], "expected share path in Product Complete modal").toBeTruthy();
    return match![0];
  }

  async copyProductCompleteLink(): Promise<string> {
    const dialog = this.productCompleteDialog();
    await dialog.getByRole("button", { name: /Copy Link/i }).first().click();
    const copied = await this.page.evaluate(() =>
      (navigator as Navigator & { clipboard: { readText(): Promise<string> } }).clipboard.readText(),
    );
    expect(copied).toMatch(/\/s\/[A-Za-z0-9_-]+/);
    return copied;
  }

  async closeProductCompleteModal() {
    const dialog = this.productCompleteDialog();
    await safeClick(dialog.getByRole("button", { name: "Close" }));
    await expect(dialog).toBeHidden({ timeout: 15000 });
  }

  async openEditProduct(productName: string) {
    await this.openProductActionsMenu(productName);
    await this.editProductAction.text({ timeout: 10000 });
    await this.editProductAction.click({ timeout: 10000 });
    await expect(this.page).toHaveURL(
      /\/products\/update\/(?:appointment|discord-membership|online-course)\//,
      { timeout: 30000 },
    );
  }

  async readAppointmentProductUuidFromUrl(): Promise<string> {
    const match = this.page.url().match(/\/products\/update\/appointment\/([^/?#]+)/);
    expect(match?.[1], "expected appointment product uuid in URL").toBeTruthy();
    return match![1];
  }

  async readDiscordMembershipProductUuidFromUrl(): Promise<string> {
    const match = this.page.url().match(/\/products\/update\/discord-membership\/([^/?#]+)/);
    expect(match?.[1], "expected Discord Membership product uuid in URL").toBeTruthy();
    return match![1];
  }

  async saveAndPublishConsultation() {
    await this.expectConsultationPublishReady();
    const publish = this.page
      .getByRole("button", { name: /Save and Publish|Create Consultation/i })
      .filter({ visible: true })
      .first();
    await safeClick(publish);
  }

  async expectConsultationLiveModalWithSharePath(sharePath: string) {
    const dialog = this.productCompleteDialog();
    await expect(dialog).toBeVisible({ timeout: 60000 });
    await expect(dialog).toContainText(consultationMediaData.republishLiveHeading);
    await expect(dialog).toContainText(sharePath);
    await expect(dialog.getByRole("button", { name: "View Product Page" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Copy Link/i }).first()).toBeVisible();
  }

  private visibleConsultationNextCta(): Locator {
    return this.page
      .getByRole("button", { name: consultationNavigationData.nextCtaName, exact: true })
      .filter({ visible: true })
      .first();
  }

  async useConsultationMobileViewport() {
    await this.page.setViewportSize(consultationNavigationData.mobileViewport);
  }

  async makeConsultationUnsavedChanges(title: string, description: string) {
    await this.fillConsultationTitle(title);
    await this.fillConsultationDescription(description);
  }

  async expectConsultationNextCtaStickyAfterScroll() {
    const next = this.visibleConsultationNextCta();
    await expect(next).toBeVisible({ timeout: 10000 });
    const before = await next.boundingBox();
    expect(before, "expected Next CTA box before scroll").toBeTruthy();

    await this.page.evaluate(() => {
      const w = globalThis as unknown as { scrollBy: (x: number, y: number) => void };
      w.scrollBy(0, 1500);
    });
    await this.page.waitForTimeout(400);

    await expect(next).toBeVisible({ timeout: 10000 });
    const after = await next.boundingBox();
    expect(after, "expected Next CTA box after scroll").toBeTruthy();
    expect(after!.y).toBeGreaterThanOrEqual(0);
    expect(after!.y).toBeLessThan(consultationNavigationData.mobileViewport.height);
    // Sticky bottom CTA should stay near the same viewport Y after scroll.
    expect(Math.abs(after!.y - before!.y)).toBeLessThan(40);
  }

  async navigateAwayFromConsultationViaBack() {
    await this.consultationBackAction.click({ timeout: 10000 });
  }

  async expectConsultationUnsavedChangesDialog() {
    const dialog = this.page
      .getByRole("alertdialog")
      .or(this.page.getByRole("dialog"))
      .filter({ hasText: consultationNavigationData.unsavedDialogPattern })
      .first();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(this.page).toHaveURL(productsCreationData.consultationCreatePath);
  }

  async fillConsultationPrice(amount: string) {
    await safeFill(this.consultationPriceInput(), amount);
  }

  private consultationPriceInput(): Locator {
    return locatorChain(this.page, {
      placeholder: "10,000",
      selector: 'input[placeholder="10,000"]',
    });
  }

  private consultationLivePreviewCard(): Locator {
    return this.page.getByRole("heading", { level: 3 }).locator("xpath=..");
  }

  async setConsultationPricingEnabled(enabled: boolean) {
    const checked = await this.consultationPricingSwitchAction.getAttribute("aria-checked");
    if ((checked === "true") !== enabled) {
      await this.consultationPricingSwitchAction.click();
    }
    await expect(
      await this.consultationPricingSwitchAction.getAttribute("aria-checked"),
    ).toBe(enabled ? "true" : "false");
  }

  async expectConsultationPreviewWithoutPaidPrice() {
    const preview = this.consultationLivePreviewCard();
    await expect(preview).toBeVisible({ timeout: 10000 });
    await expect(preview.getByText(/Rp[\d.,]+/)).toHaveCount(0, { timeout: 10000 });
  }

  async expectConsultationPreviewPaidPrice(pattern: RegExp) {
    const preview = this.consultationLivePreviewCard();
    await expect(preview).toBeVisible({ timeout: 10000 });
    await expect(preview.getByText(pattern)).toBeVisible({ timeout: 10000 });
  }

  async prepareConsultationDetailsWithoutSubmit(title: string, description: string) {
    await this.fillConsultationTitle(title);
    await this.fillConsultationDescription(description);
    await this.uploadConsultationHero(consultationMediaData.heroImagePath);
    await this.uploadConsultationGallery(consultationMediaData.additionalImagePaths);
  }

  async expectConsultationZeroPriceRejected() {
    await expect(this.page).toHaveURL(productsCreationData.consultationCreatePath);
    await expect(this.page.getByRole("heading", { name: "Availability*" })).toHaveCount(0, {
      timeout: 10000,
    });
    const error = this.page.getByText(consultationPricingData.zeroPriceErrorPattern);
    if (await error.isVisible().catch(() => false)) {
      await expect(error).toBeVisible();
      return;
    }
    await expect(this.consultationPriceInput()).toBeVisible({ timeout: 10000 });
    await expect(
      this.page.getByRole("button", { name: "Next: Set Availability" }),
    ).toBeVisible({ timeout: 10000 });
  }

  async configureConsultationWeekdaySlotRange(day: string, startTime: string, endTime: string) {
    const starts = this.page
      .getByRole("combobox", { name: `Start time for ${day}` })
      .filter({ visible: true });
    if ((await starts.count()) === 0) {
      await this.addConsultationWeekdayTimeSlot(day);
    }

    const start = starts.first();
    await start.click({ timeout: 10000 });
    await this.page.getByRole("option", { name: startTime, exact: true }).click();

    const end = this.page
      .getByRole("combobox", { name: `End time for ${day}` })
      .filter({ visible: true })
      .first();
    await end.click({ timeout: 10000 });
    await this.page.getByRole("option", { name: endTime, exact: true }).click();
  }

  async publishConsultationWithMinimumNotice(
    title: string,
    description: string,
    options: {
      minimumNoticeHours: number;
      price?: string;
      pricingEnabled?: boolean;
      weekday?: string;
      startTime?: string;
      endTime?: string;
    },
  ): Promise<string> {
    await this.prepareConsultationDetailsWithoutSubmit(title, description);

    if (options.pricingEnabled === false) {
      await this.setConsultationPricingEnabled(false);
    } else {
      await this.setConsultationPricingEnabled(true);
      await this.fillConsultationPrice(options.price ?? consultationPricingData.validPrice);
    }

    await this.submitConsultationDetails();
    await this.expectConsultationAvailabilityStep();
    await this.setConsultationMinimumNoticeHours(options.minimumNoticeHours);

    const weekday = options.weekday ?? consultationWeekdayLabel();
    await this.configureConsultationWeekdaySlotRange(
      weekday,
      options.startTime ?? consultationPricingData.slotStartTime,
      options.endTime ?? consultationPricingData.slotEndTime,
    );
    await this.saveAndPublishConsultation();
    await this.expectProductCompleteModal();
    const sharePath = await this.readProductCompleteSharePath();
    await this.closeProductCompleteModal();
    return sharePath;
  }

  async prepareConsultationDetailsForAvailability(title: string, description: string) {
    await this.fillConsultationTitle(title);
    await this.fillConsultationDescription(description);
    await this.uploadConsultationHero(consultationMediaData.heroImagePath);
    await this.uploadConsultationGallery(consultationMediaData.additionalImagePaths);
    await this.fillConsultationPrice(consultationLifecycleData.price);
    await this.submitConsultationDetails();
    await this.expectConsultationAvailabilityStep();
  }

  async setConsultationMinimumNoticeHours(hours: number) {
    const notice = this.page
      .getByLabel("Minimum notice value")
      .or(this.page.getByRole("spinbutton", { name: /Minimum notice/i }))
      .filter({ visible: true })
      .first();
    await safeFill(notice, String(hours));
  }

  async configureConsultationWeekdaySlot(day: string) {
    const starts = this.page
      .getByRole("combobox", { name: `Start time for ${day}` })
      .filter({ visible: true });
    if ((await starts.count()) === 0) {
      await this.addConsultationWeekdayTimeSlot(day);
    }

    const start = this.page
      .getByRole("combobox", { name: `Start time for ${day}` })
      .filter({ visible: true })
      .first();
    await start.click({ timeout: 10000 });
    await this.page.getByRole("option").first().click();

    const end = this.page
      .getByRole("combobox", { name: `End time for ${day}` })
      .filter({ visible: true })
      .first();
    await end.click({ timeout: 10000 });
    await this.page.getByRole("option").last().click();
  }

  async expectConsultationPublishReady() {
    const publish = this.page
      .getByRole("button", { name: /Save and Publish|Create Consultation/i })
      .filter({ visible: true })
      .first();
    await expect(publish).toBeEnabled({ timeout: 15000 });
  }

  async saveConsultationAsDraft() {
    await safeClick(this.page.getByRole("button", { name: "Save as Draft", exact: true }));
    await expect(this.page).toHaveURL(/\/products(?:\?|$)/, { timeout: 60000 });
    await this.expectLoaded();
  }

  async saveAsDraft() {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/shop/products") &&
        !response.url().includes("/hide-from-profile") &&
        ["PATCH", "POST", "PUT"].includes(response.request().method()),
      { timeout: 15000 },
    );

    await this.saveAsDraftAction.click({ timeout: 15000 });
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
  }

  async expectProductRowStatus(
    productName: string,
    status: "ACTIVE" | "INACTIVE" | "DRAFT",
  ) {
    await expect(this.productRow(productName).getByText(status, { exact: true })).toBeVisible({
      timeout: 10000,
    });
  }

  async readProductSharePath(productName: string): Promise<string> {
    const link = this.productRow(productName).getByRole("link", { name: /\/s\// });
    await expect(link).toBeVisible({ timeout: 10000 });
    const href = await link.getAttribute("href");
    expect(href, "expected product share URL").toMatch(/\/s\//);
    const match = href!.match(/\/s\/[A-Za-z0-9_-]+/);
    expect(match?.[0], "expected share path").toBeTruthy();
    return match![0];
  }

  async openConsultationEditTab(tab: "Details" | "Availability") {
    await this.page.getByRole("tab", { name: tab }).click({ timeout: 10000 });
    await expect(this.page.getByRole("tab", { name: tab })).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 10000 },
    );
  }

  async expectConsultationTitleValue(title: string) {
    await expect(this.page.getByRole("textbox", { name: "Enter title", exact: true }).first()).toHaveValue(
      title,
      { timeout: 10000 },
    );
  }

  async expectConsultationDescriptionContains(text: string) {
    await expect(this.consultationDescriptionEditor()).toContainText(text, { timeout: 10000 });
  }

  async expectConsultationWeekdaySlotConfigured(day: string) {
    await expect(
      this.page.getByRole("combobox", { name: `Start time for ${day}` }),
    ).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByRole("combobox", { name: `End time for ${day}` })).toBeVisible({
      timeout: 10000,
    });
  }

  async reloadConsultationEditor() {
    await this.page.reload({ waitUntil: "domcontentloaded" });
    await expect(this.page).toHaveURL(/\/products\/(?:create|update)\/consultation|\/products\/update\/appointment\//, {
      timeout: 30000,
    });
    await expect(this.page.getByRole("textbox", { name: "Enter title", exact: true }).first()).toBeVisible({
      timeout: 30000,
    });
  }

  private afterSalesCustomizeSwitch(): Locator {
    return this.page
      .getByLabel("Details")
      .getByText("Customize Message")
      .locator("xpath=preceding::*[@role='switch'][1]");
  }

  private afterSalesMessageEditor(): Locator {
    return this.page
      .getByLabel("Details")
      .locator('[contenteditable="true"][role="textbox"]')
      .nth(1);
  }

  async enableConsultationAfterSalesMessage() {
    const toggle = this.afterSalesCustomizeSwitch();
    if ((await toggle.getAttribute("aria-checked")) !== "true") {
      await toggle.click({ timeout: 10000 });
    }
    await expect(this.afterSalesMessageEditor()).toBeVisible({ timeout: 10000 });
  }

  async fillConsultationAfterSalesMessage(message: string) {
    await this.enableConsultationAfterSalesMessage();
    const editor = this.afterSalesMessageEditor();
    await editor.scrollIntoViewIfNeeded();
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.insertText(message);
  }

  async expectConsultationAfterSalesMessage(message: string) {
    await this.openConsultationEditTab("Details");
    await this.enableConsultationAfterSalesMessage();
    await expect(this.afterSalesMessageEditor()).toContainText(message, { timeout: 10000 });
  }

  async saveAndPublishConsultationFromEdit() {
    await this.saveAndPublishConsultation();
    const dialog = this.productCompleteDialog();
    if (await dialog.isVisible().catch(() => false)) {
      await this.closeProductCompleteModal();
    }
    await expect(this.page).toHaveURL(/\/products(?:\?|$)|\/products\/update\/appointment\//, {
      timeout: 30000,
    });
  }
}
