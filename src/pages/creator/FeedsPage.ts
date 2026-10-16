import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { safeClick } from "@utils/playwright.utils";
import { locatorChain, smartLocator } from "@utils/heal-utils";
import { creatorFeedsLabels as labels, formatScheduleLabel as scheduleLabel } from "@test-data/creator/post.data";

export type FeedsTab = keyof typeof labels.tabs;

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

  async openEditPost(content: string, tab: FeedsTab = "published") {
    await this.goto();
    await this.openTab(tab);
    await this.choosePostAction(content, labels.menu.edit);
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

  // ── Visibility selector ──
  /** The pill opens a menu holding a radio group: one radio per visibility, each with a one-line description. */
  async openVisibilityMenu() {
    await safeClick(this.composer.getByRole("button", { name: new RegExp(`^(${labels.visibilityPublic}|Exclusive|${labels.memberOnly})`) }));
    await expect(this.page.getByRole("menu").getByRole("radiogroup")).toBeVisible({ timeout: 10000 });
  }

  async visibilityOptions(): Promise<Array<{ text: string; checked: boolean }>> {
    await this.openVisibilityMenu();
    const options = this.page.getByRole("menu").locator("label").filter({ has: this.page.getByRole("radio") });
    const read = await options.evaluateAll((labelsEls) => labelsEls.map((l) => ({
      // innerText keeps the line break between the label and its description; textContent glues them.
      text: ((l as unknown as { innerText: string }).innerText ?? "").replace(/\s+/g, " ").trim(),
      checked: l.querySelector('[role="radio"]')?.getAttribute("aria-checked") === "true",
    })));
    await this.closeMenu();
    return read;
  }

  private async closeMenu() {
    const menu = this.page.getByRole("menu");
    await expect(async () => {
      if (await menu.isVisible()) await this.page.keyboard.press("Escape");
      await expect(menu).toBeHidden({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
    await expect(this.composer).toBeVisible({ timeout: 10000 });
  }

  /** Member only opens `Select Membership Tier`; pick a tier and Confirm. */
  async chooseMemberOnly(tierName: string) {
    await this.openVisibilityMenu();
    await safeClick(this.page.getByRole("menu").getByRole("radio", { name: new RegExp(labels.memberOnly) }).or(this.page.getByRole("menu").getByText(labels.memberOnly, { exact: true })).first());
    const tiers = this.page.getByRole("dialog", { name: labels.selectTierDialog });
    await expect(tiers).toBeVisible({ timeout: 10000 });
    await safeClick(tiers.getByText(tierName, { exact: true }));
    await safeClick(tiers.getByRole("button", { name: labels.confirm, exact: true }));
    await expect(tiers).toBeHidden({ timeout: 10000 });
    await this.closeMenu();
  }

  async choosePublic() {
    await this.openVisibilityMenu();
    await safeClick(this.page.getByRole("menu").getByText(labels.visibilityPublic, { exact: true }));
    await this.closeMenu();
  }

  /** The composer pill reads the current visibility, e.g. `Public`, `Exclusive Rp10.000`, `Member only`. */
  async expectVisibilityPill(text: string | RegExp) {
    await expect(this.composer.getByRole("button", { name: text })).toBeVisible({ timeout: 10000 });
  }

  /** Schedule Post with a time already gone: refused in the client with a toast, nothing is sent. */
  async expectPastScheduleRefused(content: string, when: Date) {
    await this.goto();
    await this.openComposer();
    await this.fillComposer(content);
    await this.pickSchedule(this.composer, this.composer.getByRole("button").filter({ has: this.page.locator('svg[class~="size-5.5"]') }), when);
    let posted = false;
    const listener = (r: { url(): string; method(): string }) => {
      if (/\/api\/v1\/posts$/.test(r.url()) && r.method() === "POST") posted = true;
    };
    this.page.on("request", listener);
    try {
      await safeClick(this.composer.getByRole("button", { name: labels.schedulePost, exact: true }));
      await expect(this.toast(labels.pastScheduleToast)).toBeVisible({ timeout: 10000 });
      await expect(this.composer).toBeVisible();
      expect(posted, "no post is created for a past schedule").toBe(false);
    } finally {
      this.page.off("request", listener);
    }
  }

  // ── Composer state ──
  private get composerPostButton() {
    return this.composer.getByRole("button", { name: labels.publish, exact: true });
  }

  async expectPublishEnabled(enabled: boolean) {
    if (enabled) await expect(this.composerPostButton).toBeEnabled({ timeout: 10000 });
    else await expect(this.composerPostButton).toBeDisabled({ timeout: 10000 });
  }

  /** What the composer offers: the media input's accept list, the body's limits, and its form fields. */
  async composerConstraints(): Promise<{ accept: string; multiple: boolean; maxLength: string | null; fields: number; titleField: number }> {
    const media = this.composer.locator('input[type="file"]').first();
    const body = this.composer.getByRole("textbox");
    return {
      accept: (await media.getAttribute("accept")) ?? "",
      multiple: (await media.getAttribute("multiple")) !== null,
      maxLength: await body.getAttribute("maxlength"),
      fields: await this.composer.locator("textarea, input:not([type=file])").count(),
      titleField: await this.composer.getByRole("textbox", { name: /title/i }).count(),
    };
  }

  /** Close the composer with content in it and keep it: `Save to Draft?` → `Save Draft`. Returns the draft uuid. */
  async closeComposerAsDraft(): Promise<string> {
    await safeClick(this.composer.getByRole("button", { name: labels.close, exact: true }));
    const ask = this.page.getByRole("dialog", { name: labels.saveDraftDialog });
    await expect(ask).toBeVisible({ timeout: 10000 });
    const created = this.page.waitForResponse((r) => /\/api\/v1\/posts$/.test(r.url()) && r.request().method() === "POST", { timeout: 30000 });
    await safeClick(ask.getByRole("button", { name: labels.saveDraft, exact: true }));
    const response = await created;
    expect(response.status(), "saving the draft").toBe(200);
    expect(JSON.parse(response.request().postData() ?? "{}").status).toBe("draft");
    await expect(this.toast(labels.draftSavedToast)).toBeVisible({ timeout: 10000 });
    return (await response.json()).data.uuid;
  }

  /** Compose text (plus products and an image) and close the composer into a draft. Returns the draft uuid. */
  async saveDraft(post: ComposerPost): Promise<string> {
    await this.goto();
    await this.openComposer();
    await this.fillComposer(post.content);
    // Before the image: an attached image adds its own × button and shifts the toolbar buttons.
    if (post.productTitles?.length) await this.attachProducts(post.productTitles);
    if (post.imagePath) {
      await this.composer.locator('input[type="file"][multiple]').setInputFiles(post.imagePath);
      await expect(this.composer.getByRole("img").first()).toBeVisible({ timeout: 20000 });
    }
    return this.closeComposerAsDraft();
  }

  /** Composer toolbar → Draft Posts → the draft; it reopens as `Publish Post` with everything that was saved. */
  async resumeDraft(content: string) {
    await this.goto();
    await this.openComposer();
    // The toolbar icons have no accessible names; the drafts one is the file-text icon.
    await safeClick(this.composer.getByRole("button").filter({ has: this.page.locator("svg.lucide-file-text") }));
    const drafts = this.page.getByRole("dialog", { name: labels.draftPostsDialog });
    await expect(drafts).toBeVisible({ timeout: 10000 });
    await safeClick(drafts.getByRole("button").filter({ hasText: content }).first());
    await expect(this.publishDraftDialog).toBeVisible({ timeout: 10000 });
  }

  readonly publishDraftDialog = this.page.getByRole("dialog", { name: labels.publishDraftDialog });

  async expectDraftContent(content: string) {
    await expect(this.publishDraftDialog.getByRole("textbox")).toHaveValue(content);
  }

  async expectResumedDraft(content: string, productTitle: string, images: number) {
    await expect(this.publishDraftDialog.getByRole("textbox")).toHaveValue(content);
    await expect(this.publishDraftDialog).toContainText(productTitle);
    // The product chip brings its own thumbnail (alt = product title) next to the media images.
    await expect(this.publishDraftDialog.getByRole("img", { name: productTitle, exact: true })).toBeVisible();
    await expect(this.publishDraftDialog.getByRole("img")).toHaveCount(images + 1);
  }

  // ── Scheduling ──
  /** The clock icon in a composer toolbar opens the date + 12-hour time picker. */
  private async pickSchedule(dialog: Locator, trigger: Locator, when: Date) {
    await safeClick(trigger);
    const picker = this.page.locator('[data-slot="popover-content"]:visible').last();
    await expect(picker).toBeVisible({ timeout: 10000 });
    await safeClick(picker.locator(`button[data-day="${when.getMonth() + 1}/${when.getDate()}/${when.getFullYear()}"]`));
    // Controlled inputs: fill() is reset on re-render, real keystrokes stick.
    const hour = String(((when.getHours() + 11) % 12) + 1).padStart(2, "0");
    for (const [name, value] of [["12hours", hour], ["minutes", String(when.getMinutes()).padStart(2, "0")]] as const) {
      const input = picker.locator(`input[name="${name}"]`);
      await input.click();
      await input.press("ControlOrMeta+a");
      await input.pressSequentially(value, { delay: 50 });
      await expect(input).toHaveValue(value);
    }
    const meridiem = when.getHours() >= 12 ? "PM" : "AM";
    if ((await picker.getByRole("combobox").innerText()).trim() !== meridiem) {
      await safeClick(picker.getByRole("combobox"));
      await safeClick(this.page.getByRole("option", { name: meridiem, exact: true }));
    }
    // One Escape can be spent closing the AM/PM list; press again only while the picker is still up,
    // because an extra Escape would close the composer itself.
    await expect(async () => {
      if (await picker.isVisible()) await this.page.keyboard.press("Escape");
      await expect(picker).toBeHidden({ timeout: 1500 });
    }).toPass({ timeout: 10000 });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(`${labels.postingOn} ${scheduleLabel(when)}`);
  }

  /** Compose a public post and schedule it; returns the new uuid and the `scheduledAt` the request carried. */
  async schedulePost(content: string, when: Date): Promise<{ uuid: string; scheduledAt: string }> {
    await this.goto();
    await this.openComposer();
    await this.fillComposer(content);
    // The clock button has no name, no lucide class and no test id — its icon's size class is the only hook (needs a data-testid).
    await this.pickSchedule(this.composer, this.composer.getByRole("button").filter({ has: this.page.locator('svg[class~="size-5.5"]') }), when);
    const created = this.page.waitForResponse((r) => /\/api\/v1\/posts$/.test(r.url()) && r.request().method() === "POST", { timeout: 30000 });
    await safeClick(this.composer.getByRole("button", { name: labels.schedulePost, exact: true }));
    const response = await created;
    expect(response.status(), "scheduling the post").toBe(200);
    await expect(this.toast(labels.scheduledToast)).toBeVisible({ timeout: 10000 });
    await expect(this.composer).toBeHidden({ timeout: 10000 });
    return { uuid: (await response.json()).data.uuid, scheduledAt: JSON.parse(response.request().postData() ?? "{}").scheduledAt };
  }

  /** Scheduled tab → Edit → the `Posting on …` chip → a new time → Save. Returns the saved `scheduledAt`. */
  async reschedulePost(content: string, when: Date): Promise<string> {
    await this.openEditPost(content, "scheduled");
    await this.pickSchedule(this.editDialog, this.editDialog.getByRole("button", { name: new RegExp(`^${labels.postingOn}`) }), when);
    const saved = this.page.waitForResponse((r) => /\/api\/v1\/posts\/[^/]+$/.test(r.url()) && r.request().method() === "PUT", { timeout: 20000 });
    await safeClick(this.editDialog.getByRole("button", { name: labels.save, exact: true }));
    const response = await saved;
    expect(response.status(), "saving the new schedule").toBe(200);
    await expect(this.editDialog).toBeHidden({ timeout: 10000 });
    return (await response.json()).data.scheduledAt;
  }

  /** The Scheduled tab card names the upcoming time with `Posting on …` (L-15: it says `Posted on`). */
  async expectScheduledCardLabel(content: string, when: Date) {
    await this.goto();
    await this.openTab("scheduled");
    // The schedule line sits below the post body, outside the inner card that postCard() returns.
    const card = this.page.getByRole("main").locator("div").filter({ hasText: content }).filter({ hasText: new RegExp(`Post(ed|ing) on ${scheduleLabel(when)}`) }).last();
    await expect(card).toBeVisible({ timeout: 10000 });
    await expect(card).toContainText(`${labels.postingOn} ${scheduleLabel(when)}`);
  }

  // ── Post list, tabs and the per-post menu ──
  async openTab(tab: FeedsTab) {
    const tabButton = smartLocator(this.page, { role: "tab", name: labels.tabs[tab], exact: true, text: labels.tabs[tab] });
    await tabButton.click();
    await expect(this.page.getByRole("tab", { name: labels.tabs[tab], exact: true })).toHaveAttribute("aria-selected", "true");
  }

  /** The innermost element holding both the post text and its `Post options` button — one post card. */
  private postCard(content: string): Locator {
    return this.page.getByRole("main").locator("div").filter({ has: this.page.getByRole("button", { name: labels.postOptions }) }).filter({ hasText: content }).last();
  }

  async expectPostListed(content: string, tab: FeedsTab = "published") {
    await this.openTab(tab);
    await expect(this.postCard(content)).toBeVisible({ timeout: 15000 });
  }

  async expectPostNotListed(content: string, tab: FeedsTab = "published") {
    await this.openTab(tab);
    await expect(this.page.getByRole("main").getByText(content, { exact: true })).toHaveCount(0, { timeout: 15000 });
  }

  async openPostMenu(content: string) {
    const menu = this.page.getByRole("menu");
    await expect(async () => {
      if (!(await menu.isVisible())) await this.postCard(content).getByRole("button", { name: labels.postOptions }).click({ timeout: 3000 });
      await expect(menu).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20000 });
  }

  async postMenuItems(content: string): Promise<string[]> {
    await this.openPostMenu(content);
    const items = (await this.page.getByRole("menuitem").allInnerTexts()).map((s) => s.trim());
    await this.page.keyboard.press("Escape");
    await expect(this.page.getByRole("menu")).toBeHidden({ timeout: 5000 });
    return items;
  }

  async choosePostAction(content: string, item: string) {
    await this.openPostMenu(content);
    const menuItem = this.page.getByRole("menuitem", { name: item, exact: true });
    // Fail with the menu's real items rather than waiting forever on one that is not offered.
    await expect(menuItem, `"${item}" in the post menu`).toBeVisible({ timeout: 5000 });
    await safeClick(menuItem);
  }

  /** Card texts of the Published list, top to bottom. */
  async publishedOrder(): Promise<string[]> {
    await this.openTab("published");
    return this.page.getByRole("main").getByRole("button", { name: labels.postOptions })
      .evaluateAll((buttons) => buttons.map((b) => (b.parentElement?.textContent ?? "").replace(/\s+/g, " ").trim()));
  }

  // ── Pinning ──
  readonly replacePinDialog = this.page.getByRole("dialog", { name: labels.replacePinDialog });

  /** Pin to top with no pin in place: toast `Post pinned`, the card moves first with the `Pinned` label. */
  async pinPost(content: string) {
    await this.choosePostAction(content, labels.menu.pin);
    await expect(this.toast(labels.pinnedToast)).toBeVisible({ timeout: 10000 });
    await this.expectPinnedFirst(content);
  }

  /** Pin to top while another post is pinned: the replace dialog quotes the opening words of the pinned post. */
  async requestPinReplacing(content: string, pinnedContent: string) {
    await this.choosePostAction(content, labels.menu.pin);
    await expect(this.replacePinDialog).toBeVisible({ timeout: 10000 });
    // Long posts are cut to their opening words and end with an ellipsis.
    const quoted = ((await this.replacePinDialog.innerText()).match(/“([^”]+)”/)?.[1] ?? "").replace(/(…|\.\.\.)$/, "").trim();
    expect(quoted.length, "the dialog quotes the pinned post").toBeGreaterThan(0);
    expect(pinnedContent.startsWith(quoted), `"${quoted}" opens the pinned post`).toBe(true);
    await expect(this.replacePinDialog.getByRole("button", { name: labels.cancel, exact: true })).toBeVisible();
    await expect(this.replacePinDialog.getByRole("button", { name: labels.replace, exact: true })).toBeVisible();
  }

  async answerReplaceDialog(choice: "cancel" | "replace") {
    await safeClick(this.replacePinDialog.getByRole("button", { name: choice === "cancel" ? labels.cancel : labels.replace, exact: true }));
    await expect(this.replacePinDialog).toBeHidden({ timeout: 10000 });
  }

  async unpinPost(content: string) {
    await this.choosePostAction(content, labels.menu.unpin);
    await expect(this.replacePinDialog).toBeHidden();
    await expect(this.page.getByRole("dialog")).toHaveCount(0, { timeout: 5000 });
  }

  async expectPinnedFirst(content: string) {
    await expect.poll(async () => (await this.publishedOrder())[0] ?? "", { timeout: 15000 }).toContain(content);
    await expect(this.postCard(content).getByText(labels.pinnedLabel, { exact: true })).toBeVisible();
    await expect(this.page.getByRole("main").getByText(labels.pinnedLabel, { exact: true })).toHaveCount(1);
  }

  async expectNotPinned(content: string) {
    await expect(this.postCard(content).getByText(labels.pinnedLabel, { exact: true })).toHaveCount(0, { timeout: 10000 });
  }

  async expectNoPinnedPost() {
    await this.openTab("published");
    await expect(this.page.getByRole("main").getByText(labels.pinnedLabel, { exact: true })).toHaveCount(0, { timeout: 10000 });
  }

  /** A creator with no posts sees the composer and nothing to pin. */
  async expectEmptyFeeds() {
    await this.openTab("published");
    await expect(this.page.getByRole("main").getByText(labels.composerPlaceholder).first()).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByRole("main").getByRole("button", { name: labels.postOptions })).toHaveCount(0);
    await expect(this.page.getByRole("main").getByText(labels.pinnedLabel, { exact: true })).toHaveCount(0);
    await expect(this.page.getByRole("menuitem", { name: labels.menu.pin })).toHaveCount(0);
  }

  // ── Deleting ──
  readonly deleteDialog = this.page.getByRole("dialog", { name: labels.deleteDialog });

  async openDeletePost(content: string) {
    await this.choosePostAction(content, labels.menu.delete);
    await expect(this.deleteDialog).toBeVisible({ timeout: 10000 });
    await expect(this.deleteDialog).toContainText(labels.deleteWarning);
  }

  async expectDeleteMentionsPin(mentioned: boolean) {
    if (mentioned) await expect(this.deleteDialog).toContainText(labels.deletePinnedNote);
    else await expect(this.deleteDialog).not.toContainText(labels.deletePinnedNote);
  }

  async cancelDelete() {
    await safeClick(this.deleteDialog.getByRole("button", { name: labels.cancel, exact: true }));
    await expect(this.deleteDialog).toBeHidden({ timeout: 10000 });
  }

  async confirmDelete() {
    const deleted = this.page.waitForResponse((r) => /\/api\/v1\/posts\/[^/]+$/.test(r.url()) && r.request().method() === "DELETE", { timeout: 20000 });
    await safeClick(this.deleteDialog.getByRole("button", { name: labels.menu.delete, exact: true }));
    expect((await deleted).status(), "deleting the post").toBe(200);
    await expect(this.deleteDialog).toBeHidden({ timeout: 10000 });
  }

  // ── Insights ──
  /** Post menu → Insights: total views, likes and comments as the dialog prints them. */
  async readInsights(content: string): Promise<{ views: number; likes: number; comments: number }> {
    await this.choosePostAction(content, labels.menu.insights);
    const dialog = this.page.getByRole("dialog", { name: labels.insightsDialog });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    const text = (await dialog.innerText()).replace(/\s+/g, " ");
    await safeClick(dialog.getByRole("button", { name: labels.close, exact: true }).last());
    await expect(dialog).toBeHidden({ timeout: 10000 });
    const read = (re: RegExp) => Number(text.match(re)?.[1] ?? NaN);
    return { views: read(/(\d+) Total views/), likes: read(/Likes (\d+)/), comments: read(/Comments (\d+)/) };
  }

  // ── Editing media and products of a published post ──
  /** Each media tile in Edit Post is an image with its own (unnamed) remove button. */
  private get editMediaRemoveButtons() {
    return this.editDialog.locator("div:has(> img)").getByRole("button");
  }

  /** Remove `count` media items, optionally upload replacements, then Save. */
  async editPostMedia(content: string, change: { remove: number; add?: string[] }) {
    await this.openEditPost(content);
    for (let i = 0; i < change.remove; i += 1) {
      const before = await this.editMediaRemoveButtons.count();
      await safeClick(this.editMediaRemoveButtons.first());
      await expect(this.editMediaRemoveButtons).toHaveCount(before - 1, { timeout: 10000 });
    }
    if (change.add?.length) {
      const before = await this.editMediaRemoveButtons.count();
      await this.editDialog.locator('input[type="file"][multiple]').setInputFiles(change.add);
      await expect(this.editMediaRemoveButtons).toHaveCount(before + change.add.length, { timeout: 30000 });
    }
    await this.saveEditDialog();
  }

  /** Add or remove linked products of a published post through Edit Post → Add product. */
  async editPostProducts(content: string, change: { add?: string[]; remove?: string[] }) {
    await this.openEditPost(content);
    if (change.add?.length) {
      await safeClick(this.editDialog.getByRole("button", { name: labels.addProduct }));
      await expect(this.selectProductDialog).toBeVisible({ timeout: 10000 });
      for (const title of change.add) {
        const row = this.selectProductDialog.locator("label").filter({ has: this.page.getByRole("img", { name: title, exact: true }) });
        await safeClick(row.getByRole("checkbox"));
      }
      await safeClick(this.selectProductDialog.getByRole("button", { name: labels.addProducts }));
      await expect(this.selectProductDialog).toBeHidden({ timeout: 10000 });
    }
    // Unticking every product in Select Product disables its button, so a link is removed with the × on its chip.
    for (const title of change.remove ?? []) {
      const chip = this.editDialog.locator('[data-slot="card"]').filter({ has: this.page.getByRole("img", { name: title, exact: true }) });
      await safeClick(chip.getByRole("button"));
    }
    for (const title of change.add ?? []) await expect(this.editDialog).toContainText(title);
    for (const title of change.remove ?? []) await expect(this.editDialog).not.toContainText(title);
    await this.saveEditDialog();
  }

  private async saveEditDialog() {
    const saved = this.page.waitForResponse((r) => /\/api\/v1\/posts\/[^/]+$/.test(r.url()) && r.request().method() === "PUT", { timeout: 20000 });
    await safeClick(this.editDialog.getByRole("button", { name: labels.save, exact: true }));
    expect((await saved).status(), "saving the edited post").toBe(200);
    await expect(this.editDialog).toBeHidden({ timeout: 10000 });
  }

  private toast(text: string) {
    return locatorChain(this.page, { testId: "toast", selector: "[data-sonner-toast]" }).filter({ hasText: text }).first();
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
