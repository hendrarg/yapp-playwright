import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { smartClick, smartLocator } from "@utils/heal-utils";
import {
  expectDescriptionContains,
  expectProductCompleteModal,
  expectTitleValue,
  readProductCompleteSharePath,
} from "@helpers/creator/product-editor";
import {
  boldAction,
  italicAction,
  italicApplied,
  nextSetDetailsAction,
  textFeedback,
  titleInput,
  underlineAction,
  underlineApplied,
} from "@pages/shared/locators";
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

}
