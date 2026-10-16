import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain } from "@utils/heal-utils";
import { safeClick, waitForLoaded } from "@utils/playwright.utils";

export class MembershipPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto() {
    await this.page.goto(new URL("membership", this.baseURL).toString());
    await waitForLoaded(this.page);
  }

  async gotoCreateTier() {
    await this.page.goto(new URL("membership/create", this.baseURL).toString());
    await waitForLoaded(this.page);
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/membership/);
    expect(this.page.url()).not.toContain("/auth");
  }

  get directMessageSection(): Locator {
    return this.page.locator("div").filter({ hasText: "Enable Direct Message" }).filter({ has: this.page.getByRole("switch") }).last();
  }

  get enableDirectMessageSwitch(): Locator {
    return this.directMessageSection.getByRole("switch");
  }

  get groupChatSection(): Locator {
    return this.page.locator("div").filter({ hasText: "Enable Group Chat" }).filter({ has: this.page.getByRole("switch") }).last();
  }

  get enableGroupChatSwitch(): Locator {
    return this.groupChatSection.getByRole("switch");
  }

  readonly newBadge = locatorChain(this.page, {
    text: "NEW",
    selector: 'span:has-text("NEW")',
  });

  readonly groupChatHelper = locatorChain(this.page, {
    text: "Give members of this tier a shared room with you and each other — independent from Direct Message",
    selector: 'p:has-text("Give members of this tier a shared room")',
  });

  readonly turnOffGroupChatDialog = this.page.getByRole("dialog").filter({ hasText: /Turn off Group Chat\?/i });
  readonly turnOffCancelButton = this.turnOffGroupChatDialog.getByRole("button", { name: "Cancel" });
  readonly turnOffConfirmButton = this.turnOffGroupChatDialog.getByRole("button", { name: /Turn off and save/i });

  async expectMessagingTogglesVisible() {
    await expect(this.enableDirectMessageSwitch).toBeVisible({ timeout: 10000 });
    await expect(this.enableGroupChatSwitch).toBeVisible({ timeout: 10000 });
    await expect(this.newBadge.first()).toBeVisible({ timeout: 10000 });
    await expect(this.groupChatHelper.first()).toBeVisible({ timeout: 10000 });
  }

  async expectGroupChatState(checked: boolean) {
    await expect(this.enableGroupChatSwitch).toHaveAttribute("aria-checked", String(checked), { timeout: 10000 });
  }

  async expectDirectMessageState(checked: boolean) {
    await expect(this.enableDirectMessageSwitch).toHaveAttribute("aria-checked", String(checked), { timeout: 10000 });
  }

  async toggleGroupChat() {
    await safeClick(this.enableGroupChatSwitch);
  }

  async toggleDirectMessage() {
    await safeClick(this.enableDirectMessageSwitch);
  }

  async expectTurnOffDialogVisible() {
    await expect(this.turnOffGroupChatDialog).toBeVisible({ timeout: 10000 });
    await expect(this.turnOffCancelButton).toBeVisible({ timeout: 10000 });
    await expect(this.turnOffConfirmButton).toBeVisible({ timeout: 10000 });
  }

  async cancelTurnOffDialog() {
    await safeClick(this.turnOffCancelButton);
    await expect(this.turnOffGroupChatDialog).toBeHidden({ timeout: 10000 });
  }
}
