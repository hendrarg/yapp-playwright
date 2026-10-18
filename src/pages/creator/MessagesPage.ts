import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartLocator, type SmartHealable } from "@utils/heal-utils";
import { safeClick, safeFill, waitForLoaded } from "@utils/playwright.utils";
import { creatorThreadLabels as thread } from "@test-data/creator/messages.data";

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

  // ── One DM thread, by conversation (verified 2026-10-16) ──
  private readonly threadComposer = locatorChain(this.page, {
    role: "textbox",
    name: thread.composer,
    placeholder: thread.composer,
  });

  /** A DM thread lives at `/messages/chat/<conversationUuid>` (plain `/messages/<uuid>` crashes the page). */
  async gotoChat(conversationUuid: string) {
    await this.page.goto(new URL(`messages/chat/${conversationUuid}`, this.baseURL).toString());
    // A read-only thread has no composer, but it still has its header menu.
    const headerMenu = this.page.getByRole("main").locator('button[data-slot="dropdown-menu-trigger"]:not([aria-label])').filter({ hasNotText: "Message actions" });
    await expect(this.threadComposer.or(headerMenu).first()).toBeVisible({ timeout: 20000 });
  }

  /**
   * The thread header's ⋮ has no name and no test id; of the unnamed menu triggers in the page, it is the
   * one whose menu holds Report User.
   */
  async openThreadActions() {
    const report = this.page.getByRole("menuitem", { name: thread.actions.report, exact: true });
    const triggers = this.page.getByRole("main").locator('button[data-slot="dropdown-menu-trigger"]:not([aria-label])').filter({ hasNotText: "Message actions" });
    await expect(async () => {
      if (await report.isVisible()) return;
      for (let i = (await triggers.count()) - 1; i >= 0; i -= 1) {
        await triggers.nth(i).click({ timeout: 3000 });
        if (await report.isVisible({ timeout: 1000 }).catch(() => false)) return;
        await this.page.keyboard.press("Escape");
      }
      throw new Error("thread actions menu not found");
    }).toPass({ timeout: 20000 });
  }

  async threadActionItems(): Promise<string[]> {
    await this.openThreadActions();
    const items = (await this.page.getByRole("menuitem").allInnerTexts()).map((s) => s.trim());
    await this.page.keyboard.press("Escape");
    return items;
  }

  private async chooseThreadAction(name: string | RegExp) {
    await this.openThreadActions();
    const item = this.page.getByRole("menuitem", { name, exact: typeof name === "string" });
    // Fail with the menu's real items instead of waiting forever on one that is not offered.
    await expect(item, `"${name}" in the thread menu`).toBeVisible({ timeout: 5000 });
    await safeClick(item);
  }

  private toast(text: string) {
    return locatorChain(this.page, { testId: "toast", selector: "[data-sonner-toast]" }).filter({ hasText: text }).first();
  }

  // Report User
  readonly reportDialog = this.page.getByRole("dialog", { name: /^Report / });

  /** Report User → `Report ‘<name>’` with six reasons; the submit button reads `Select at least one` until one is picked. */
  async openReport(counterpartyName: string) {
    await this.chooseThreadAction(thread.actions.report);
    await expect(this.reportDialog).toBeVisible({ timeout: 10000 });
    await expect(this.reportDialog.getByRole("heading", { name: new RegExp(`Report .${counterpartyName}.`) })).toBeVisible();
    await expect(this.reportDialog).toContainText(thread.report.helpHeading);
    await expect(this.reportDialog.getByRole("radio")).toHaveCount(thread.report.reasons.length);
    for (const reason of thread.report.reasons) await expect(this.reportDialog.getByRole("radio", { name: reason, exact: true })).toBeVisible();
    await expect(this.reportDialog.getByRole("button", { name: thread.report.pickFirst })).toBeDisabled();
  }

  /** Other needs its details: Report stays disabled until the details field is filled. Returns the request body. */
  async submitOtherReport(details: string): Promise<{ category: string; reason: string }> {
    await safeClick(this.reportDialog.getByRole("radio", { name: "Other", exact: true }));
    const submit = this.reportDialog.getByRole("button", { name: thread.report.submit, exact: true });
    const field = this.reportDialog.getByPlaceholder(thread.report.detailsPlaceholder);
    await expect(field).toBeVisible({ timeout: 5000 });
    await expect(submit).toBeDisabled();
    await field.fill(details);
    await expect(submit).toBeEnabled();
    const sent = this.page.waitForResponse((r) => /\/api\/v1\/users\/report\//.test(r.url()) && r.request().method() === "POST", { timeout: 20000 });
    await safeClick(submit);
    const response = await sent;
    expect(response.status(), "submitting the report").toBe(200);
    await expect(this.toast(thread.report.submittedToast)).toBeVisible({ timeout: 10000 });
    await expect(this.reportDialog).toBeHidden({ timeout: 10000 });
    return JSON.parse(response.request().postData() ?? "{}");
  }

  // Delete chat
  /** Unlike Report and Mark Member, this dialog has no accessible name — find it by its heading. */
  readonly deleteChatDialog = this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: thread.deleteChat.dialog, exact: true }) });

  async openDeleteChat() {
    await this.chooseThreadAction(thread.actions.delete);
    await expect(this.deleteChatDialog).toBeVisible({ timeout: 10000 });
    await expect(this.deleteChatDialog).toContainText(thread.deleteChat.body);
  }

  async cancelDeleteChat() {
    await safeClick(this.deleteChatDialog.getByRole("button", { name: thread.deleteChat.cancel, exact: true }));
    await expect(this.deleteChatDialog).toBeHidden({ timeout: 10000 });
    await expect(this.threadComposer.first()).toBeVisible();
  }

  /** Confirm Delete: the thread goes away and the creator lands back on `/messages`. */
  async confirmDeleteChat() {
    const deleted = this.page.waitForResponse((r) => /\/api\/v1\/dm\/conversations\/[^/]+$/.test(r.url()) && r.request().method() === "DELETE", { timeout: 20000 });
    await safeClick(this.deleteChatDialog.getByRole("button", { name: thread.deleteChat.confirm, exact: true }));
    expect((await deleted).ok(), "deleting the chat").toBe(true);
    await expect(this.deleteChatDialog).toBeHidden({ timeout: 10000 });
    await expect(this.page).toHaveURL(/\/messages\/?$/, { timeout: 15000 });
  }

  // Mark badges
  readonly markDialog = this.page.getByRole("dialog", { name: thread.mark.dialog });

  private get labelPicker() {
    return this.page.locator('[data-slot="popover-content"]').filter({ has: this.page.getByPlaceholder(thread.mark.labelSearch) }).filter({ visible: true }).last();
  }

  private async openLabelPicker() {
    await safeClick(this.markDialog.getByRole("combobox"));
    await expect(this.labelPicker).toBeVisible({ timeout: 10000 });
  }

  /** Create a new label from the picker, colour it and Done. Returns the label uuid from POST /dm/labels. */
  async markWithNewLabel(label: string, colorHex: string): Promise<string> {
    await this.chooseThreadAction(new RegExp(thread.actions.markAdd));
    await expect(this.markDialog).toBeVisible({ timeout: 10000 });
    await expect(this.markDialog.getByRole("button", { name: thread.mark.done, exact: true })).toBeDisabled();
    await this.openLabelPicker();
    await this.labelPicker.getByPlaceholder(thread.mark.labelSearch).fill(label);
    // "Create" is its own span beside the typed name; the modal's label text confirms which one was made.
    const create = this.labelPicker.getByText("Create", { exact: true }).first();
    await expect(create, `the picker offers to create "${label}"`).toBeVisible({ timeout: 10000 });
    await safeClick(create);
    await expect(this.markDialog).toContainText(label);
    const created = this.page.waitForResponse((r) => /\/api\/v1\/dm\/labels$/.test(r.url()) && r.request().method() === "POST", { timeout: 20000 });
    const assigned = this.page.waitForResponse((r) => /\/api\/v1\/dm\/buyers\/[^/]+\/labels\/[^/]+$/.test(r.url()) && r.request().method() === "POST", { timeout: 20000 });
    await safeClick(this.markDialog.getByRole("button", { name: `Select color ${colorHex}` }));
    await safeClick(this.markDialog.getByRole("button", { name: thread.mark.done, exact: true }));
    const uuid = (await (await created).json()).data.uuid as string;
    expect((await assigned).ok(), "assigning the label").toBe(true);
    await expect(this.toast(thread.mark.markedToast)).toBeVisible({ timeout: 10000 });
    return uuid;
  }

  /** The thread shows the buyer's badge next to their name (inbox row and header). */
  async expectBuyerBadge(label: string) {
    await expect(this.page.getByRole("main").getByText(label, { exact: true }).first()).toBeVisible({ timeout: 15000 });
  }

  async expectNoBuyerBadge(label: string) {
    await expect(this.page.getByRole("main").getByText(label, { exact: true })).toHaveCount(0, { timeout: 15000 });
  }

  /** Saved labels the picker suggests, each with the colour it was saved with. Leaves the dialog closed. */
  async labelSuggestions(): Promise<Array<{ name: string; color: string }>> {
    await this.chooseThreadAction(new RegExp(`${thread.actions.markAdd}|${thread.actions.markEdit}`));
    await expect(this.markDialog).toBeVisible({ timeout: 10000 });
    await this.openLabelPicker();
    const rows = await this.labelPicker.getByRole("listbox").locator("span").evaluateAll((spans) => spans
      .filter((s) => (s as unknown as { style: { backgroundColor: string } }).style.backgroundColor)
      .map((s) => ({ name: (s.textContent ?? "").trim(), color: (s as unknown as { style: { backgroundColor: string } }).style.backgroundColor })));
    await this.closeMarkDialog();
    return rows;
  }

  /** Escape closes the label picker first; the modal itself then closes from its own close button. */
  private async closeMarkDialog() {
    await expect(async () => {
      if (await this.labelPicker.isVisible()) await this.page.keyboard.press("Escape");
      else if (await this.markDialog.isVisible()) await safeClick(this.markDialog.locator('[data-slot="dialog-close"]').first());
      await expect(this.markDialog).toBeHidden({ timeout: 1500 });
    }).toPass({ timeout: 15000 });
  }

  /** Edit Mark Badge opens prefilled with the label and a Remove button; Remove clears the badge. */
  async removeBuyerBadge(label: string) {
    await this.chooseThreadAction(thread.actions.markEdit);
    await expect(this.markDialog).toBeVisible({ timeout: 10000 });
    await expect(this.markDialog).toContainText(label);
    const removed = this.page.waitForResponse((r) => /\/api\/v1\/dm\/buyers\/[^/]+\/labels\/[^/]+$/.test(r.url()) && r.request().method() === "DELETE", { timeout: 20000 });
    await safeClick(this.markDialog.getByRole("button", { name: thread.mark.remove, exact: true }));
    expect((await removed).ok(), "removing the badge").toBe(true);
    await expect(this.toast(thread.mark.removedToast)).toBeVisible({ timeout: 10000 });
  }

  /** Each saved label in the picker has `Delete <name>`, confirmed in an alertdialog. */
  async deleteSavedLabel(label: string) {
    await this.chooseThreadAction(new RegExp(`${thread.actions.markAdd}|${thread.actions.markEdit}`));
    await expect(this.markDialog).toBeVisible({ timeout: 10000 });
    await this.openLabelPicker();
    await safeClick(this.labelPicker.getByRole("button", { name: `Delete ${label}`, exact: true }));
    const confirm = this.page.getByRole("alertdialog").filter({ hasText: thread.mark.deleteLabelDialog });
    await expect(confirm).toBeVisible({ timeout: 10000 });
    await expect(confirm).toContainText(thread.mark.deleteLabelBody);
    const deleted = this.page.waitForResponse((r) => /\/api\/v1\/dm\/labels\/[^/]+$/.test(r.url()) && r.request().method() === "DELETE", { timeout: 20000 });
    await safeClick(confirm.getByRole("button", { name: thread.deleteChat.confirm, exact: true }));
    expect((await deleted).ok(), "deleting the label").toBe(true);
    await expect(this.toast(thread.mark.deletedToast)).toBeVisible({ timeout: 10000 });
  }

  async expectNoDirectMessageInMembersPanel() {
    const panel = this.page.locator("div").filter({ has: this.page.getByText(/Members \(\d+\)/) }).last();
    const dmButtons = panel.locator('button:has-text("Message"), button:has-text("Chat"), button:has-text("DM")');
    await expect(dmButtons).toHaveCount(0);
  }
}

