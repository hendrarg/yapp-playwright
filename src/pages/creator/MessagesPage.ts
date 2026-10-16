import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartLocator, type SmartHealable } from "@utils/heal-utils";
import { safeClick, safeFill, waitForLoaded } from "@utils/playwright.utils";

export class MessagesPage {
  readonly chatTab: Locator;
  readonly broadcastTab: Locator;
  readonly settingsButton: SmartHealable;
  readonly settingsDialog: Locator;
  readonly subscribersOnlySwitch: Locator;
  readonly searchInput: SmartHealable;

  constructor(public readonly page: Page, private readonly baseURL: string) {
    this.chatTab = page.getByRole("tab", { name: "Chat" });
    this.broadcastTab = page.getByRole("tab", { name: "Broadcast" });
    this.settingsButton = smartLocator(page, {
      role: "button",
      selector: '#messages-settings-button, button#messages-settings-button',
    });
    this.settingsDialog = locatorChain(page, {
      role: "dialog",
    });
    this.subscribersOnlySwitch = page.getByRole("switch");
    this.searchInput = smartLocator(page, {
      role: "textbox",
      placeholder: "Search by name",
      selector: 'input[placeholder="Search by name"]',
    });
  }

  async goto() {
    await this.page.goto(new URL("messages", this.baseURL).toString());
    await waitForLoaded(this.page);
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/messages/);
    expect(this.page.url()).not.toContain("/auth");
    await expect(this.chatTab).toBeVisible({ timeout: 15000 });
  }

  async expectDefaultTabs() {
    await expect(this.chatTab).toBeVisible({ timeout: 10000 });
    await expect(this.broadcastTab).toBeVisible({ timeout: 10000 });
    await expect(this.chatTab).toHaveAttribute("data-state", "active");
    const settingsBtn = this.page.locator('#messages-settings-button').first();
    await expect(settingsBtn).toBeVisible({ timeout: 10000 });
  }

  async expectConversationListMetadata() {
    const listContainer = this.page.locator('.overflow-y-auto > div:not(.h-px), [role="tabpanel"] .overflow-y-auto > *');
    await expect(listContainer.first()).toBeVisible({ timeout: 15000 });
    const count = await listContainer.count();
    expect(count).toBeGreaterThan(0);
    // Check first conversation row shows avatar and text
    const firstRow = listContainer.first();
    await expect(firstRow.locator('img, [data-slot="avatar"], div:has-text("")').first()).toBeVisible();
  }

  async search(query: string) {
    const input = this.page.getByPlaceholder("Search by name").or(this.page.locator('input[placeholder="Search by name"]')).first();
    await safeFill(input, query);
    await this.page.waitForTimeout(500);
  }

  async clearSearch() {
    const input = this.page.getByPlaceholder("Search by name").or(this.page.locator('input[placeholder="Search by name"]')).first();
    await safeFill(input, "");
    await this.page.waitForTimeout(500);
  }

  async expectEmptySearch() {
    await expect(this.page.getByText("No conversations found")).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText("Try a different name.")).toBeVisible({ timeout: 5000 });
  }

  async expectConversationVisible(name: string) {
    await expect(this.page.getByText(name).first()).toBeVisible({ timeout: 10000 });
  }

  async handleCoachMarkIfPresent(): Promise<boolean> {
    const coachDialog = this.page.getByRole("dialog").filter({ hasText: "Control who can message you" });
    if (await coachDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      const openSettingsBtn = coachDialog.getByRole("button", { name: "Open Settings" });
      if (await openSettingsBtn.isVisible()) {
        await safeClick(openSettingsBtn);
        return true;
      }
    }
    return false;
  }

  async openSettings() {
    const coachHandled = await this.handleCoachMarkIfPresent();
    if (coachHandled) return;

    const btn = this.page.locator('#messages-settings-button').first();
    await safeClick(btn);
    await expect(this.settingsDialog).toBeVisible({ timeout: 10000 });
  }

  async expectSettingsModal() {
    const dialog = this.settingsDialog;
    await expect(dialog.getByRole("heading", { name: "Messaging Settings" })).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText("Who is allowed to message you?")).toBeVisible();
    await expect(dialog.getByText("Everyone can message you.")).toBeVisible();
    await expect(dialog.getByText("Subscribers only.")).toBeVisible();
    await expect(dialog.getByText("No one can message you.")).toBeVisible();
  }

  async selectPolicy(optionText: string) {
    const dialog = this.settingsDialog;
    const option = dialog.getByText(optionText).first();
    await safeClick(option);
  }

  async closeSettingsModal() {
    await this.page.keyboard.press("Escape");
    await expect(this.settingsDialog).toBeHidden({ timeout: 5000 });
  }

  async toggleSubscribersOnlySwitch() {
    await safeClick(this.subscribersOnlySwitch);
  }

  async openFirstConversation() {
    const item = this.page.locator('.overflow-y-auto > div:not(.h-px), [role="tabpanel"] .overflow-y-auto > *').first();
    await expect(item).toBeVisible({ timeout: 15000 });
    await safeClick(item);
    await waitForLoaded(this.page);
  }

  async openFirstDirectConversation() {
    const directRow = this.page
      .locator('.overflow-y-auto > div:not(.h-px)')
      .filter({ hasNotText: 'GROUP' })
      .first();
    await expect(directRow).toBeVisible({ timeout: 15000 });
    await safeClick(directRow);
    await waitForLoaded(this.page);
  }

  private get threadOptionsButton(): Locator {
    return this.page.locator('div.flex-1 button[data-slot="dropdown-menu-trigger"]').first();
  }

  async expectConversationOptionsMenu() {
    await this.threadOptionsButton.click({ force: true });
    await expect(this.page.getByText(/Add Mark Badge|Edit Mark Badge/)).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText("Report User")).toBeVisible();
    await expect(this.page.getByText("Block User")).toBeVisible();
    await expect(this.page.getByText("Delete")).toBeVisible();
    await this.page.keyboard.press("Escape");
  }

  async expectEmptyThreadPane() {
    await expect(this.page.getByText("Start The Conversation")).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText("Start a chat with your member to interact closely with them")).toBeVisible({ timeout: 5000 });
  }

  async expectComposerValidation() {
    const composer = this.page.getByPlaceholder("Write a message...").or(this.page.locator('textarea[placeholder*="message" i]')).first();
    await expect(composer).toBeVisible({ timeout: 10000 });

    const sendBtn = this.page.locator('button:has(svg.lucide-send), button:has(svg[class*="lucide-send"]), button[type="submit"], button:has(svg)').last();
    // Initially empty -> Send is disabled
    await expect(sendBtn).toBeDisabled({ timeout: 5000 });

    // No client maxlength
    const maxlength = await composer.getAttribute("maxlength");
    expect(maxlength).toBeNull();

    // Type complex characters including emoji, html-like tags, quotes
    const testInput = 'Testing 🚀 <b>bold</b> "quotes" \\path/to';
    await safeFill(composer, testInput);
    await expect(sendBtn).toBeEnabled({ timeout: 5000 });

    // Clearing restores disabled
    await safeFill(composer, "");
    await expect(sendBtn).toBeDisabled({ timeout: 5000 });
  }

  async openBlockUserDialog() {
    await this.threadOptionsButton.click({ force: true });
    const blockOption = this.page.getByText("Block User").first();
    await safeClick(blockOption);

    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText(/You won't be able to see or receive messages from/i)).toBeVisible();
  }

  async cancelBlockUser() {
    const dialog = this.page.getByRole("dialog");
    const cancelBtn = dialog.getByRole("button", { name: /cancel/i }).first();
    await safeClick(cancelBtn);
    await expect(dialog).toBeHidden({ timeout: 5000 });
  }

  async openMarkBadgeDialog() {
    await this.threadOptionsButton.click({ force: true });
    const badgeOption = this.page.getByText(/Add Mark Badge|Edit Mark Badge/).first();
    await safeClick(badgeOption);

    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
  }

  async verifyBadgeLengthBoundary() {
    const dialog = this.page.getByRole("dialog");
    const labelInput = dialog.locator('input[placeholder*="label" i], input[placeholder*="badge" i], input[type="text"]').first();
    if (await labelInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 26 characters: no Create option
      await safeFill(labelInput, "A".repeat(26));
      await expect(dialog.getByText(new RegExp(`Create "${"A".repeat(26)}"`))).toHaveCount(0);

      // 25 characters
      await safeFill(labelInput, "A".repeat(25));
    }
    await this.page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 5000 });
  }

  async expectGroupTabsStructure() {
    const tabs = await this.page.getByRole("tab").allInnerTexts();
    expect(tabs.map((t) => t.trim())).toEqual(["Chat", "Broadcast"]);
    await expect(this.chatTab).toHaveAttribute("data-state", "active");
  }

  groupRow(tierName: string): Locator {
    return this.page
      .locator('.overflow-y-auto > div:not(.h-px)')
      .filter({ hasText: tierName })
      .filter({ hasText: "GROUP" })
      .first();
  }

  async expectGroupRowVisible(tierName: string, expectedMemberCount?: number | string) {
    const row = this.groupRow(tierName);
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row).toContainText("GROUP");
    if (expectedMemberCount !== undefined) {
      await expect(row).toContainText(String(expectedMemberCount));
    }
  }

  async openGroupConversation(tierName: string) {
    const row = this.groupRow(tierName);
    await expect(row).toBeVisible({ timeout: 15000 });
    await safeClick(row);
    await waitForLoaded(this.page);
    await expect(this.page).toHaveURL(/\/messages\/group\/[0-9a-f-]+/, { timeout: 10000 });
  }

  async expectGroupChatHeader(tierName: string) {
    await expect(this.page).toHaveURL(/\/messages\/group\/[0-9a-f-]+/);
    const header = this.page.locator("div.flex-1.flex.flex-col > div.border-b").filter({ hasText: "— Group Chat" });
    await expect(header).toContainText(`${tierName} — Group Chat`, { timeout: 10000 });
    await expect(header).toContainText(/Creator \+ \d+ member/i);
    const memberButton = header.locator("button").filter({ hasText: /Member/i });
    await expect(memberButton).toBeVisible({ timeout: 10000 });
  }

  async openMembersPanel() {
    const header = this.page.locator("div.flex-1.flex.flex-col > div.border-b").filter({ hasText: "— Group Chat" });
    const memberButton = header.locator("button").filter({ hasText: /Member/i });
    await safeClick(memberButton);
    await expect(this.page.getByText(/Members \(\d+\)/).first()).toBeVisible({ timeout: 10000 });
  }

  async expectMemberPanelCreator(creatorUsername: string) {
    await expect(this.page.getByText(/Members \(\d+\)/).first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText("Creator", { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(`@${creatorUsername}`).first()).toBeVisible({ timeout: 10000 });
  }

  async expectNoDirectMessageInMembersPanel() {
    const panel = this.page.locator("div").filter({ has: this.page.getByText(/Members \(\d+\)/) }).last();
    const dmButtons = panel.locator('button:has-text("Message"), button:has-text("Chat"), button:has-text("DM")');
    await expect(dmButtons).toHaveCount(0);
  }
}

