import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { safeClick, waitForLoaded } from "@utils/playwright.utils";
import { smartLocator } from "@utils/heal-utils";
import { accountSettingsLabels as labels } from "@test-data/buyer/profile.data";

/**
 * Buyer `/profile/settings` → "Profile and Account": banner, profile picture, Username, Your Name,
 * read-only Email and Save. Reached from the pencil badge on the own-profile avatar.
 */
export class AccountSettingsPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  readonly usernameInput = smartLocator(this.page, { placeholder: labels.usernamePlaceholder });
  readonly nameInput = smartLocator(this.page, { placeholder: labels.namePlaceholder });
  readonly saveButton = this.page.getByRole("button", { name: labels.save, exact: true });

  // The custom modals here are plain fixed overlays, not role="dialog".
  private overlay(title: string): Locator {
    return this.page.locator("div.fixed.inset-0").filter({ hasText: title }).last();
  }

  /** The small unnamed badge on the avatar that opens "Upload Profile Picture". */
  private get pictureBadge(): Locator {
    return this.page.getByRole("main").locator("div.group > button").last();
  }

  async expectLoaded(username: string) {
    await expect(this.page).toHaveURL(/\/profile\/settings/, { timeout: 15000 });
    await expect(this.page.getByRole("button", { name: labels.profileTab, exact: true })).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByPlaceholder(labels.usernamePlaceholder)).toHaveValue(username, { timeout: 15000 });
    await expect(this.page.getByPlaceholder(labels.emailPlaceholder)).toBeDisabled();
  }

  async reload() {
    await this.page.reload();
    await waitForLoaded(this.page);
  }

  /** Upload a picture: Upload Profile Picture → Crop → Apply saves it at once and confirms. */
  async uploadProfilePicture(filePath: string) {
    await safeClick(this.pictureBadge);
    await expect(this.overlay(labels.uploadPictureTitle)).toBeVisible({ timeout: 10000 });
    await this.page.locator('input[type="file"][accept="image/*"]').last().setInputFiles(filePath);
    await expect(this.overlay(labels.cropTitle)).toBeVisible({ timeout: 15000 });
    await safeClick(this.page.getByRole("button", { name: labels.apply, exact: true }));
    const confirmation = this.overlay(labels.pictureUpdated);
    await expect(confirmation).toBeVisible({ timeout: 20000 });
    await safeClick(confirmation.getByRole("button", { name: labels.gotIt, exact: true }));
    await expect(confirmation).toBeHidden({ timeout: 10000 });
  }

  /** The identity fields still hold these values (after a reload). */
  async expectIdentity(username: string, displayName: string) {
    await expect(this.page.getByPlaceholder(labels.usernamePlaceholder)).toHaveValue(username, { timeout: 15000 });
    await expect(this.page.getByPlaceholder(labels.namePlaceholder)).toHaveValue(displayName, { timeout: 15000 });
  }

  /** The avatar on the settings card renders the uploaded image instead of the initial. */
  async expectProfilePictureSet() {
    await expect(this.page.getByRole("main").locator("div.group img").first()).toBeVisible({ timeout: 15000 });
  }

  async changeUsername(username: string) {
    await this.usernameInput.fill(username);
    await safeClick(this.saveButton);
  }

  /** Saving lands on /profile with "Looking good, <username>!"; Got It! closes it. */
  async expectUsernameSaved(username: string) {
    const confirmation = this.overlay(labels.usernameChanged);
    await expect(confirmation).toBeVisible({ timeout: 15000 });
    await expect(confirmation).toContainText(`Looking good, ${username}!`);
    await safeClick(confirmation.getByRole("button", { name: labels.gotIt, exact: true }));
    await expect(confirmation).toBeHidden({ timeout: 10000 });
  }

  /** Save is rejected with this toast and, after a reload, the old username is still in place. */
  async expectUsernameRejected(message: string, previous: string) {
    await expect(this.page.getByText(message, { exact: true }).first()).toBeVisible({ timeout: 15000 });
    await this.reload();
    await expect(this.page.getByPlaceholder(labels.usernamePlaceholder)).toHaveValue(previous, { timeout: 15000 });
  }

  /** An empty username cannot be submitted at all: Save turns disabled. */
  async expectEmptyUsernameBlocked() {
    await this.usernameInput.fill("");
    await expect(this.saveButton).toBeDisabled({ timeout: 5000 });
  }

}
