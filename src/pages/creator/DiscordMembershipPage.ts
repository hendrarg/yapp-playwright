import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { smartClick, smartLocator } from "@utils/heal-utils";
import { expectDescriptionContains, expectProductCompleteModal, expectTitleValue, readProductCompleteSharePath } from "@helpers/creator/product-editor";
import { boldAction, italicAction, italicApplied, nextSetDetailsAction, productCompleteDialog, textFeedback, titleInput, underlineAction, underlineApplied } from "@pages/shared/locators";
import { discordMembershipValidationData } from "@test-data/creator/membership.data";
import { productsCreationData } from "@test-data/creator/products.creation.data";

export class DiscordMembershipPage {
  constructor(
    public readonly page: Page,
    private readonly baseURL: string,
  ) {}

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

  async goto() {
    await this.page.goto(
      new URL("products/create/discord-membership", this.baseURL).toString(),
      { waitUntil: "domcontentloaded" },
    );
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/products\/(?:create|update)\/discord-membership\//, {
      timeout: 30000,
    });
    await expect(titleInput(this.page)).toBeVisible({ timeout: 30000 });
    await expect(this.page.getByRole("button", { name: "Next: Set Details" })).toBeVisible({
      timeout: 10000,
    });
  }

  async expectDiscordMembershipCreateFlow() {
    await expect(this.page).toHaveURL(productsCreationData.discordMembershipCreatePath);
    await nextSetDetailsAction(this.page).text();
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
    await nextSetDetailsAction(this.page).click({ timeout: 10000 });
  }

  async expectDiscordMembershipRequiredFeedback() {
    for (const error of discordMembershipValidationData.requiredErrors) {
      await expect(textFeedback(this.page, error)).toBeVisible({ timeout: 10000 });
    }
  }

  async expectDiscordFeedback(message: string) {
    await expect(textFeedback(this.page, message)).toBeVisible({ timeout: 10000 });
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
    await boldAction(this.page).click({ timeout: 10000 });
    await italicAction(this.page).click({ timeout: 10000 });
    await underlineAction(this.page).click({ timeout: 10000 });
    await italicApplied(this.page).text();
    await underlineApplied(this.page).text();
  }

  private afterSalesMessageEditor(): Locator {
    return this.afterSalesScope().getByRole("textbox", { name: "editable markdown" }).locator("visible=true");
  }

  /** Bold, italic, and underline stay on the After Sales message. */
  async applyDiscordAfterSalesFormatting() {
    const editor = this.afterSalesMessageEditor();
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    const scope = this.afterSalesScope();
    await scope.getByRole("radio", { name: "Bold", exact: true }).locator("visible=true").click({ timeout: 10000 });
    await scope.getByRole("radio", { name: "Italic", exact: true }).locator("visible=true").click({ timeout: 10000 });
    await scope.getByRole("radio", { name: "Underline", exact: true }).locator("visible=true").click({ timeout: 10000 });
    await expect.poll(() => editor.innerHTML(), { timeout: 10000 }).toMatch(/<(strong|b|em|i|u)\b/i);
  }

  async expectDiscordMembershipDescriptionCounter(expected: string = discordMembershipValidationData.descriptionLimit) {
    const counter = smartLocator(this.page, {
      text: expected,
      selector: `p:has-text("${expected}")`,
    });
    await expect(await counter.text()).toBe(expected);
  }

  /** Soft check so a wrong counter does not skip the later known-bug steps. */
  async expectDiscordDescriptionCounter(expected: string) {
    await expect.soft(this.page.getByText(expected, { exact: true }).locator("visible=true")).toBeVisible({ timeout: 10000 });
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
    await expectTitleValue(this.page, options.title);
    await expectDescriptionContains(this.page, options.description);
    await this.expectDiscordMembershipServerAndRole(options.serverName, options.roleName);
  }

  async continueToDiscordMembershipDetails() {
    await nextSetDetailsAction(this.page).click({ timeout: 10000 });
    await this.discordMembershipNextPublishAction.text();
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
    const editor = this.afterSalesMessageEditor();
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    if (message) {
      await this.page.keyboard.insertText(message);
      await expect(editor).toContainText(message, { timeout: 10000 });
    } else {
      await expect(this.afterSalesScope().getByText("0/1000 characters", { exact: true })).toBeVisible({ timeout: 10000 });
    }
  }

  async expectDiscordMembershipAfterSalesMessage(message: string) {
    expect(await this.discordMembershipCustomizeMessageSwitch.getAttribute("aria-checked")).toBe("true");
    await expect(this.afterSalesMessageEditor()).toContainText(message, { timeout: 10000 });
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
    await expectProductCompleteModal(this.page);
    return readProductCompleteSharePath(this.page);
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
  }

  async readDiscordMembershipProductUuidFromUrl(): Promise<string> {
    const match = this.page.url().match(/\/products\/update\/discord-membership\/([^/?#]+)/);
    expect(match?.[1], "expected Discord Membership product uuid in URL").toBeTruthy();
    return match![1];
  }

  async openDiscordMembershipEdit(productUuid: string) {
    await this.page.goto(
      new URL(`products/update/discord-membership/${productUuid}`, this.baseURL).toString(),
      { waitUntil: "domcontentloaded" },
    );
    await this.expectLoaded();
  }

  async expectDiscordOnFirstStep() {
    await expect(this.page.getByRole("button", { name: "Next: Set Details" })).toBeVisible({ timeout: 10000 });
    await expect.poll(async () => this.page.locator("body").innerText()).toMatch(/1\s*\/\s*2/);
  }

  /** The duration unit menu. Live labels are Days, Month, Years. */
  async expectDiscordDurationUnitLabels(labels: readonly string[] = discordMembershipValidationData.durationUnits) {
    await smartClick(this.page, {
      role: "combobox",
      name: "Month",
      text: "Month",
      selector: 'button[role="combobox"]',
    });
    for (const label of labels) {
      await expect(this.page.getByRole("option", { name: label, exact: true })).toBeVisible({ timeout: 10000 });
    }
    await this.page.keyboard.press("Escape");
  }

  async readDiscordMembershipTitle(): Promise<string> {
    return (await this.discordMembershipTitleInput.getAttribute("value")) ?? "";
  }

  /** A documented title limit is the input maxlength. */
  async expectDiscordMembershipTitleLimited() {
    const maxLength = await this.discordMembershipTitleInput.getAttribute("maxlength");
    expect(maxLength ?? "").toMatch(/^\d+$/);
  }

  async readDiscordMembershipDurationValue(): Promise<string> {
    return (await this.discordMembershipDurationValueInput.getAttribute("value")) ?? "";
  }

  async readDiscordDurationUnit(): Promise<string> {
    const combo = this.page.getByRole("combobox").filter({ hasText: /^(Days|Month|Years)$/ });
    await expect(combo).toHaveCount(1, { timeout: 10000 });
    return ((await combo.innerText()) ?? "").trim();
  }

  async expectDiscordPublishEnabled(enabled: boolean) {
    const button = this.page.getByRole("button", { name: "Next: Publish" });
    if (enabled) await expect(button).toBeEnabled({ timeout: 10000 });
    else await expect(button).toBeDisabled({ timeout: 10000 });
  }

  /** Zero is not a duration: the form stays on step 1 and says the field is required. */
  async expectDiscordZeroDurationBlocked() {
    await this.discordMembershipDurationValueInput.fill("0", { timeout: 10000 });
    await this.submitDiscordMembershipDetails();
    await expect(textFeedback(this.page, "Duration is required")).toBeVisible({ timeout: 10000 });
    await this.expectDiscordOnFirstStep();
  }

  async expectDiscordServerMenu(serverName: string) {
    await this.discordMembershipServerSelect.click({ timeout: 10000 });
    await expect(this.page.getByRole("option", { name: serverName, exact: true })).toBeVisible({ timeout: 10000 });
    await expect(
      this.page.getByRole("option", { name: discordMembershipValidationData.connectServerOption, exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await this.page.keyboard.press("Escape");
  }

  async expectDiscordRoleRequired() {
    await this.submitDiscordMembershipDetails();
    await expect(textFeedback(this.page, "Discord Role cannot be empty")).toBeVisible({ timeout: 10000 });
  }

  async expectDiscordRoleOption(roleName: string) {
    await this.discordMembershipRoleSelect.click({ timeout: 10000 });
    await expect(this.page.getByRole("option", { name: roleName, exact: true })).toBeVisible({ timeout: 10000 });
    await this.page.keyboard.press("Escape");
  }

  async expectDiscordPrimaryThumbnail() {
    await expect(this.page.getByRole("button", { name: /Uploaded image Thumbnail/i })).toBeVisible({ timeout: 10000 });
  }

  private afterSalesScope(): Locator {
    return this.page
      .getByRole("main")
      .locator("div")
      .filter({ has: this.page.getByText("After Sales", { exact: true }) })
      .filter({ has: this.page.getByText("Customize Message", { exact: true }) })
      .last();
  }

  async readDiscordCustomizeMessage(): Promise<boolean> {
    return (await this.discordMembershipCustomizeMessageSwitch.getAttribute("aria-checked")) === "true";
  }

  async setDiscordCustomizeMessage(enabled: boolean) {
    const toggle = this.discordMembershipCustomizeMessageSwitch;
    if ((await toggle.getAttribute("aria-checked")) !== String(enabled)) {
      await toggle.click({ timeout: 10000 });
    }
    expect(await toggle.getAttribute("aria-checked")).toBe(String(enabled));
  }

  async expectDiscordAfterSalesDefaultOn(purposeCopy: string, emptyCounter: string) {
    expect(await this.discordMembershipCustomizeMessageSwitch.getAttribute("aria-checked")).toBe("true");
    await expect(this.page.getByText(purposeCopy, { exact: true }).locator("visible=true")).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(emptyCounter, { exact: true }).locator("visible=true")).toBeVisible({ timeout: 10000 });
  }

  /** Switch off hides the editor. The purpose sentence stays; there is no separate default-email line. */
  async expectDiscordAfterSalesOff(purposeCopy: string, emptyCounter: string) {
    expect(await this.readDiscordCustomizeMessage()).toBe(false);
    await expect(this.page.getByText(purposeCopy, { exact: true }).locator("visible=true")).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(emptyCounter, { exact: true })).toHaveCount(0);
  }

  async expectDiscordAfterSalesCounter(counter: string) {
    await expect(this.afterSalesScope().getByText(counter, { exact: true })).toBeVisible({ timeout: 10000 });
  }

  private afterSalesPreviewButton(): Locator {
    return this.afterSalesScope().getByRole("button", { name: "Preview", exact: true });
  }

  async expectDiscordAfterSalesPreviewEnabled(enabled: boolean) {
    const button = this.afterSalesPreviewButton();
    await expect(button).toBeVisible({ timeout: 10000 });
    if (enabled) await expect(button).toBeEnabled();
    else await expect(button).toBeDisabled();
  }

  async openDiscordAfterSalesPreview() {
    await this.afterSalesPreviewButton().click({ timeout: 10000 });
    await expect(this.page.getByRole("dialog").locator("visible=true")).toBeVisible({ timeout: 10000 });
  }

  async expectDiscordAfterSalesPreviewReadOnly(message: string, linkLabel?: string) {
    const dialog = this.page.getByRole("dialog").locator("visible=true");
    await expect(dialog.getByText(message, { exact: false })).toBeVisible({ timeout: 10000 });
    if (linkLabel) await expect(dialog.getByText(linkLabel, { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(dialog.locator('[contenteditable="true"]')).toHaveCount(0);
    await expect(dialog.getByRole("textbox")).toHaveCount(0);
  }

  async closeDiscordAfterSalesPreview() {
    await this.page.keyboard.press("Escape");
    await expect(this.page.getByRole("dialog").locator("visible=true")).toBeHidden({ timeout: 10000 });
  }

  async expectDiscordNamedSwitch(name: string) {
    await expect(this.page.getByRole("switch", { name, exact: true })).toBeVisible({ timeout: 10000 });
  }

  /** Correct behaviour: the switch has an accessible name. Soft so a later page can be checked too. */
  async expectDiscordCustomizeMessageNamed() {
    await expect.soft(this.page.getByRole("switch", { name: "Customize Message", exact: true })).toBeVisible({ timeout: 5000 });
  }

  /** An edit confirmation talks about an update, not a newly created product. */
  async expectDiscordUpdateConfirmation() {
    const dialog = productCompleteDialog(this.page);
    await expect(dialog).toBeVisible({ timeout: 60000 });
    await expect(dialog).not.toContainText(/successfully created/i);
    await expect(dialog).toContainText(/updated|saved|changes/i);
  }

  /** The first-run tour must not sit on top of the form. */
  async expectDiscordFormUsable() {
    await expect(this.page.locator(".driver-overlay, .driver-popover")).toHaveCount(0, { timeout: 5000 });
    await expect(this.page.locator("body")).not.toHaveClass(/\bdriver-active\b/);
    await this.submitDiscordMembershipDetails();
  }

}
