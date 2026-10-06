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
  /** Titles of the creator's products to attach through "Select Product". */
  productTitles?: string[];
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

  async fillComposer(content: string) {
    await this.composer.locator("textarea").fill(content);
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
    // Before the image: an attached image adds its own × button and shifts the toolbar buttons.
    if (post.productTitles?.length) await this.attachProducts(post.productTitles);
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

  // ── Price dialog details ──
  async expectMinimumPriceHint() {
    await expect(this.priceDialog).toContainText(labels.minPriceHint);
  }

  /** The value the price field actually kept after typing (letters are stripped, separators added). */
  async typedPriceValue(raw: string): Promise<{ value: string; enabled: boolean }> {
    const input = this.priceDialog.locator("input").first();
    await input.fill("");
    await input.pressSequentially(raw);
    return {
      value: await input.inputValue(),
      enabled: await this.priceDialog.getByRole("button", { name: labels.confirmPrice }).isEnabled(),
    };
  }

  /** Close the Price dialog without confirming, so the pill stays at Rp0. */
  async dismissPriceDialog() {
    await safeClick(this.priceDialog.getByRole("button", { name: "Close" }));
    await expect(this.priceDialog).toBeHidden({ timeout: 10000 });
    const menu = this.page.getByRole("menu");
    await expect(async () => {
      if (await menu.isVisible()) await this.page.keyboard.press("Escape");
      await expect(menu).toBeHidden({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
  }

  /** With a Rp0 PPV price, Post sends nothing and a toast names the price as the problem. */
  async expectZeroPricePublishBlocked() {
    let posted = false;
    const listener = (r: { url(): string; method(): string }) => {
      if (/\/api\/v1\/posts$/.test(r.url()) && r.method() === "POST") posted = true;
    };
    this.page.on("request", listener);
    await safeClick(this.composer.getByRole("button", { name: labels.publish, exact: true }));
    await expect(this.page.getByText(labels.zeroPriceToast).first()).toBeVisible({ timeout: 10000 });
    await expect(this.composer).toBeVisible();
    this.page.off("request", listener);
    expect(posted, "no post request is sent at Rp0").toBe(false);
  }

  // ── Linked products ──
  readonly selectProductDialog = this.page.getByRole("dialog").filter({ hasText: labels.selectProductDialog });

  /** Composer toolbar: the product picker is the button whose icon follows the image picker. */
  async attachProducts(titles: string[]) {
    await safeClick(this.composer.getByRole("button").filter({ has: this.page.locator("svg") }).nth(2));
    await expect(this.selectProductDialog).toBeVisible({ timeout: 10000 });
    for (const title of titles) {
      const row = this.selectProductDialog.locator("label").filter({ has: this.page.getByRole("img", { name: title, exact: true }) });
      await safeClick(row.getByRole("checkbox"));
    }
    await safeClick(this.selectProductDialog.getByRole("button", { name: labels.addProducts }));
    await expect(this.selectProductDialog).toBeHidden({ timeout: 10000 });
    for (const title of titles) await expect(this.composer).toContainText(title);
  }

  // ── Editing a published post ──
  readonly editDialog = this.page.getByRole("dialog", { name: labels.editDialog });

  async openEditPost(content: string) {
    await this.goto();
    const card = this.page.getByRole("main").locator("div").filter({ hasText: content }).filter({ has: this.page.locator("svg.lucide-ellipsis") }).last();
    await safeClick(card.locator("button:has(svg.lucide-ellipsis)").first());
    await safeClick(this.page.getByRole("menuitem", { name: labels.postMenuEdit, exact: true }));
    await expect(this.editDialog).toBeVisible({ timeout: 10000 });
  }

  /** Open the Price dialog of a published PPV post through Edit Post → pill → Edit Price. */
  async openEditPrice(content: string) {
    await this.openEditPost(content);
    await safeClick(this.editDialog.getByRole("button", { name: /Exclusive/ }));
    await safeClick(this.page.getByRole("menuitem", { name: labels.editPrice }));
    await expect(this.priceDialog).toBeVisible({ timeout: 10000 });
  }

  /** Change the description and/or the PPV price of a published post, then Save. */
  async editPost(content: string, change: { content?: string; price?: number }) {
    await this.openEditPost(content);
    if (change.content !== undefined) await this.editDialog.locator("textarea").fill(change.content);
    if (change.price !== undefined) {
      await safeClick(this.editDialog.getByRole("button", { name: /Exclusive/ }));
      await safeClick(this.page.getByRole("menuitem", { name: labels.editPrice }));
      await expect(this.priceDialog).toBeVisible({ timeout: 10000 });
      await this.priceDialog.locator("input").first().fill(String(change.price));
      await safeClick(this.priceDialog.getByRole("button", { name: labels.confirmPrice }));
      await expect(this.priceDialog).toBeHidden({ timeout: 10000 });
      const menu = this.page.getByRole("menu");
      await expect(async () => {
        if (await menu.isVisible()) await this.page.keyboard.press("Escape");
        await expect(menu).toBeHidden({ timeout: 2000 });
      }).toPass({ timeout: 15000 });
    }
    const saved = this.page.waitForResponse((r) => /\/api\/v1\/posts\/[^/]+$/.test(r.url()) && r.request().method() === "PUT", { timeout: 20000 });
    await safeClick(this.editDialog.getByRole("button", { name: labels.save, exact: true }));
    expect((await saved).status(), "saving the edited post").toBe(200);
    await expect(this.editDialog).toBeHidden({ timeout: 10000 });
  }

  // ── Lifetime (Unlock All) configuration ──
  readonly lifetimeDialog = this.page.getByRole("dialog", { name: labels.lifetimeDialog });

  async openLifetimeConfiguration() {
    await this.goto();
    await safeClick(this.page.getByRole("button", { name: labels.configureLifetime }));
    await expect(this.lifetimeDialog).toBeVisible({ timeout: 10000 });
    await expect(this.lifetimeDialog).toContainText(labels.lifetimePriceLabel);
  }

  private get lifetimeSwitch() {
    return this.lifetimeDialog.getByRole("switch");
  }

  private get lifetimeSave() {
    return this.lifetimeDialog.getByRole("button", { name: labels.save, exact: true });
  }

  async setLifetimeSwitch(on: boolean) {
    if ((await this.lifetimeSwitch.getAttribute("aria-checked")) !== String(on)) await safeClick(this.lifetimeSwitch);
    await expect(this.lifetimeSwitch).toHaveAttribute("aria-checked", String(on));
  }

  /** With the switch on, the price field is editable and states the minimum. */
  async expectLifetimePriceAvailable() {
    await expect(this.lifetimeDialog.locator("input").first()).toBeEditable();
    await expect(this.lifetimeDialog).toContainText(labels.minPriceHint);
  }

  /** The reopened dialog still holds the last saved lifetime price. */
  async expectSavedLifetimePrice(price: RegExp) {
    await expect(this.lifetimeDialog.locator("input").first()).toHaveValue(price);
  }

  /** Whether Save accepts this typed lifetime price, and the value the field kept. */
  async lifetimePriceAccepted(raw: string): Promise<{ value: string; enabled: boolean }> {
    const input = this.lifetimeDialog.locator("input").first();
    await input.fill("");
    await input.pressSequentially(raw);
    return { value: await input.inputValue(), enabled: await this.lifetimeSave.isEnabled() };
  }

  /** Save the dialog; returns the price the request carried (PUT /posts/lifetime-prices/me). */
  async saveLifetime(): Promise<number> {
    const saved = this.page.waitForResponse((r) => /lifetime-prices\/me/.test(r.url()) && r.request().method() === "PUT", { timeout: 20000 });
    await safeClick(this.lifetimeSave);
    const response = await saved;
    expect(response.status(), "saving the lifetime configuration").toBe(200);
    await expect(this.lifetimeDialog).toBeHidden({ timeout: 10000 });
    return Number(JSON.parse(response.request().postData() ?? "{}").priceIDR);
  }

  /** Configure Unlock All through the UI: on with a price, or off (which stores price 0). */
  async configureLifetime(price: number | null): Promise<number> {
    await this.openLifetimeConfiguration();
    await this.setLifetimeSwitch(price !== null);
    if (price !== null) {
      const { enabled } = await this.lifetimePriceAccepted(String(price));
      expect(enabled, `Save should accept Rp${price}`).toBe(true);
    }
    return this.saveLifetime();
  }
}
