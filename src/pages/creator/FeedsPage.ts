import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { safeClick } from "@utils/playwright.utils";
import { smartLocator } from "@utils/heal-utils";
import { creatorFeedsLabels as labels } from "@test-data/creator/post.data";

export interface ComposerPost {
  content: string;
  imagePath?: string;
  /** Set a Pay per view price; omit for a Public post. */
  price?: number;
}

export class FeedsPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto() {
    await this.page.goto(new URL("feeds", this.baseURL).toString());
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/feeds/);
    expect(this.page.url()).not.toContain("/auth");
  }

  // ── Composer (dialog "Create Post") ──
  readonly composerTrigger = smartLocator(this.page, { text: labels.composerPlaceholder });
  readonly composer = this.page.getByRole("dialog", { name: labels.composerTitle });
  readonly priceDialog = this.page.getByRole("dialog").filter({ hasText: labels.priceDialogHeading });

  async openComposer() {
    await this.composerTrigger.click();
    await expect(this.composer).toBeVisible({ timeout: 15000 });
  }

  /** Visibility dropdown → Pay per view opens the Price dialog straight away. */
  async choosePayPerView() {
    await safeClick(this.composer.getByRole("button", { name: labels.visibilityPublic }));
    await safeClick(this.page.getByRole("menu").getByText(labels.payPerView, { exact: true }));
    await expect(this.priceDialog).toBeVisible({ timeout: 10000 });
  }

  /** Type a price; Confirm is enabled only from the minimum up. Returns whether it is enabled. */
  async typePrice(price: number): Promise<boolean> {
    await this.priceDialog.locator("input").first().fill(String(price));
    return this.priceDialog.getByRole("button", { name: labels.confirmPrice }).isEnabled();
  }

  /**
   * Confirm the price. The visibility menu stays open afterwards and keeps the composer
   * aria-hidden (Radix), so close it before touching the composer again.
   */
  async confirmPrice(price: number) {
    await expect(this.priceDialog.getByRole("button", { name: labels.confirmPrice })).toBeEnabled({ timeout: 5000 });
    await safeClick(this.priceDialog.getByRole("button", { name: labels.confirmPrice }));
    await expect(this.priceDialog).toBeHidden({ timeout: 10000 });
    const menu = this.page.getByRole("menu");
    await expect(async () => {
      if (await menu.isVisible()) await this.page.keyboard.press("Escape");
      await expect(menu).toBeHidden({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
    await expect(this.composer).toBeVisible({ timeout: 10000 });
    await expect(this.composer.getByRole("button", { name: new RegExp(`Exclusive\\s*Rp${new Intl.NumberFormat("id-ID").format(price)}`) })).toBeVisible({ timeout: 10000 });
  }

  /** Compose and publish a post through the UI; returns the new post uuid from POST /api/v1/posts. */
  async publishPost(post: ComposerPost): Promise<string> {
    await this.goto();
    await this.openComposer();
    await this.composer.locator("textarea").fill(post.content);
    if (post.imagePath) {
      await this.composer.locator('input[type="file"]').setInputFiles(post.imagePath);
      await expect(this.composer.getByRole("img").first()).toBeVisible({ timeout: 20000 });
    }
    if (post.price !== undefined) {
      await this.choosePayPerView();
      expect(await this.typePrice(post.price), `Confirm should accept Rp${post.price}`).toBe(true);
      await this.confirmPrice(post.price);
    }
    const created = this.page.waitForResponse(
      (r) => /\/api\/v1\/posts$/.test(r.url()) && r.request().method() === "POST",
      { timeout: 30000 },
    );
    await safeClick(this.composer.getByRole("button", { name: labels.publish, exact: true }));
    const response = await created;
    expect(response.status(), "publishing the post").toBe(200);
    const body = await response.json();
    await expect(this.composer).toBeHidden({ timeout: 15000 });
    return body.data?.uuid ?? body.uuid;
  }
}
