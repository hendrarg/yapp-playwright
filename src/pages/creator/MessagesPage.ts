import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartLocator, type SmartHealable } from "@utils/heal-utils";
import { safeClick, waitForLoaded } from "@utils/playwright.utils";

export class MessagesPage {
  readonly chatTab: Locator;
  readonly broadcastTab: Locator;
  readonly settingsButton: SmartHealable;
  readonly settingsDialog: Locator;
  readonly subscribersOnlySwitch: Locator;

  constructor(public readonly page: Page, private readonly baseURL: string) {
    this.chatTab = page.getByRole("tab", { name: "Chat" });
    this.broadcastTab = page.getByRole("tab", { name: "Broadcast" });
    this.settingsButton = smartLocator(page, {
      role: "button",
      selector: 'button:has(svg.lucide-settings), button:has(svg[class*="lucide-settings"]), header button:has(svg)',
    });
    this.settingsDialog = locatorChain(page, {
      role: "dialog",
    });
    this.subscribersOnlySwitch = page.getByRole("switch");
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

  async expectConversationOptionsMenu() {
    const moreBtn = this.page.locator('button:has(svg.lucide-ellipsis-vertical), button:has(svg.lucide-more-vertical), button:has(svg[class*="lucide-ellipsis"]), button[aria-label*="more" i], button[aria-label*="options" i]').first();
    await expect(moreBtn).toBeVisible({ timeout: 10000 });
    await safeClick(moreBtn);
    await expect(this.page.getByText("Add Mark Badge")).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText("Report User")).toBeVisible();
    await expect(this.page.getByText("Block User")).toBeVisible();
    await expect(this.page.getByText("Delete")).toBeVisible();
    await this.page.keyboard.press("Escape");
  }
}

