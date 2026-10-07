import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { trackAuthToken } from "@helpers/auth/validate-token";
import { safeClick, waitForLoaded } from "@utils/playwright.utils";
import { buyerAttachAccept, messageLabels as L } from "@test-data/buyer/message.data";

export class MessagePage {
  private auth = trackAuthToken(this.page);

  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto() {
    await this.page.goto(new URL("direct", this.baseURL).toString());
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/direct/);
    expect(this.page.url()).not.toContain("/auth");
  }

  async expectAuthenticated() {
    await this.auth.expectValid();
  }

  private get main(): Locator {
    return this.page.getByRole("main");
  }

  // ── Thread and composer ──
  readonly composer = this.page.getByRole("textbox", { name: L.composer });
  readonly sendButton = this.page.getByRole("button", { name: L.send });
  readonly attachButton = this.page.getByRole("button", { name: L.attach });
  readonly fileInput = this.page.locator('input[type="file"]');

  async openThread(conversationUuid: string) {
    await this.page.goto(new URL(`direct?chatId=${conversationUuid}`, this.baseURL).toString());
    await waitForLoaded(this.page);
    await expect(this.page).toHaveURL(new RegExp(`chatId=${conversationUuid}`));
  }

  async expectComposerOpen() {
    await expect(this.composer).toBeVisible({ timeout: 20000 });
  }

  async sendText(text: string) {
    await this.composer.fill(text);
    await this.composer.press("Enter");
    await expect(this.composer).toHaveValue("", { timeout: 10000 });
  }

  async sendAttachment(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
    await safeClick(this.sendButton);
  }

  /**
   * A bubble: the innermost block holding the message and its own `Message actions` menu.
   * The sender's bubbles hug the right edge, the other side's the left.
   */
  private bubble(content: string | Locator): Locator {
    const base = this.main.locator("div").filter({ has: this.page.getByRole("button", { name: L.messageActions }) });
    return (typeof content === "string" ? base.filter({ hasText: content }) : base.filter({ has: content })).last();
  }

  /** Bubbles sit either side of the thread column, whose centre the composer box shares. */
  private async expectAligned(bubble: Locator, side: "left" | "right") {
    await expect(bubble).toBeVisible({ timeout: 20000 });
    await expect(async () => {
      const box = (await bubble.boundingBox())!;
      const column = (await this.composer.boundingBox())!;
      const offset = box.x + box.width / 2 - (column.x + column.width / 2);
      expect(side === "right" ? offset > 0 : offset < 0, `bubble should sit on the ${side}`).toBe(true);
    }).toPass({ timeout: 10000 });
  }

  /** Own message: right-aligned, with a clock time and the delivered check. */
  async expectOwnMessage(content: string | Locator) {
    const bubble = this.bubble(content);
    await this.expectAligned(bubble, "right");
    await expect(bubble).toContainText(L.time);
    // The delivered tick is an unlabeled lucide check icon; its path is the stable part.
    await expect(bubble.locator('svg path[d="M20 6 9 17l-5-5"]').first()).toBeVisible();
  }

  /**
   * The other side's message: left-aligned. Consecutive messages share one clock time, printed
   * under the last of the run, so pass `timestamp: false` for any earlier message in a run.
   */
  async expectReceivedMessage(content: string | Locator, options: { timestamp?: boolean } = {}) {
    const bubble = this.bubble(content);
    await this.expectAligned(bubble, "left");
    if (options.timestamp !== false) await expect(bubble).toContainText(L.time);
  }

  /** Received messages render in send order. */
  async expectInOrder(first: string, second: string) {
    await expect(async () => {
      const text = await this.main.innerText();
      const a = text.lastIndexOf(first);
      expect(a, `${first} should render`).toBeGreaterThanOrEqual(0);
      expect(text.indexOf(second, a), `${second} should follow ${first}`).toBeGreaterThan(a);
    }).toPass({ timeout: 15000 });
  }

  async expectOwnImage() {
    await this.expectOwnMessage(this.page.getByRole("button", { name: "View media" }));
  }

  /** A sent video renders as a real `<video>` that has loaded its first frame. */
  async expectOwnVideo() {
    const video = this.main.locator("video").last();
    await expect(video).toBeVisible({ timeout: 30000 });
    await expect.poll(() => video.evaluate((v) => (v as unknown as { readyState: number }).readyState), { timeout: 30000 }).toBeGreaterThan(0);
  }

  /** The buyer composer: Attach media, the text box, Send and the Enter hint — no rich-card menu. */
  async expectBuyerComposerControls() {
    await this.expectComposerOpen();
    await expect(this.attachButton).toBeVisible();
    await expect(this.sendButton).toBeVisible();
    await expect(this.main.getByText(L.composerHint)).toBeVisible();
    await expect(this.page.getByRole("button", { name: /attachment menu/i })).toHaveCount(0);
    const accept = (await this.fileInput.getAttribute("accept")) ?? "";
    for (const type of buyerAttachAccept) expect(accept).toContain(type);
    await expect(this.fileInput).toHaveAttribute("multiple", "");
    await safeClick(this.attachButton);
    for (const card of [/Link Product/, /Link Campaign/, /Request Tip/, /Link Post/, /Link Membership/]) {
      await expect(this.page.getByText(card)).toHaveCount(0);
    }
    await this.page.keyboard.press("Escape");
  }

  // ── Read-only thread ──
  /** No composer: the "can't send" panel with its reason (and, for a lapsed member, the renewal banner). */
  async expectReadOnly(reason: string, options: { endedCreator?: string; subscribeLink?: boolean } = {}) {
    await expect(this.main.getByRole("heading", { name: L.readOnlyHeading })).toBeVisible({ timeout: 20000 });
    await expect(this.main.getByText(reason)).toBeVisible();
    await expect(this.composer).toHaveCount(0);
    await expect(this.sendButton).toHaveCount(0);
    if (options.endedCreator) await expect(this.main.getByText(L.subscriptionEnded(options.endedCreator))).toBeVisible();
    if (options.subscribeLink) await expect(this.main.getByRole("link", { name: L.subscribe, exact: true })).toBeVisible();
  }

  // ── Inbox list and the empty-state directory ──
  /**
   * A DM row in the list. Its accessible name is the avatar (photo alt or initials) then the name;
   * group rows read "<tier> <creator> — <tier> Group", which the lookahead keeps out.
   */
  inboxRow(name: string): Locator {
    return this.main.getByRole("button", { name: new RegExp(`^(?:\\S+ )?${name} (?!—)`) }).first();
  }

  async expectInboxPreview(name: string, preview: string) {
    await expect(this.inboxRow(name)).toContainText(preview, { timeout: 20000 });
  }

  private readonly directory = this.main.locator("section").filter({
    has: this.page.getByRole("heading", { name: L.directoryHeading }),
  });

  private directoryRow(name: string): Locator {
    return this.directory.locator("div")
      .filter({ hasText: name })
      .filter({ has: this.page.getByRole("button", { name: L.directoryMessage }) })
      .last();
  }

  async expectEmptyInboxDirectory() {
    await expect(this.main.getByText(L.emptyHeading).first()).toBeVisible({ timeout: 20000 });
    await expect(this.directory).toBeVisible({ timeout: 20000 });
    await expect(this.directory.getByRole("button", { name: L.directoryMessage }).first()).toBeVisible();
  }

  async expectDirectoryLists(name: string, listed: boolean) {
    await expect(this.directory).toBeVisible({ timeout: 20000 });
    const entry = this.directory.getByText(name, { exact: true });
    if (listed) await expect(entry.first()).toBeVisible({ timeout: 15000 });
    else await expect(entry).toHaveCount(0, { timeout: 15000 });
  }

  async expectDirectoryHidden() {
    await expect(this.main.getByRole("heading", { name: L.directoryHeading })).toHaveCount(0, { timeout: 15000 });
  }

  /** Message on a directory row creates (or reopens) the conversation and opens it. */
  async messageFromDirectory(name: string): Promise<string> {
    await safeClick(this.directoryRow(name).getByRole("button", { name: L.directoryMessage }));
    await expect(this.page).toHaveURL(/chatId=[0-9a-f-]{36}/, { timeout: 20000 });
    return new URL(this.page.url()).searchParams.get("chatId")!;
  }

  // ── Creator profile entry point ──
  async messageFromProfile(handle: string): Promise<string> {
    await this.page.goto(new URL(handle, this.baseURL).toString());
    await waitForLoaded(this.page);
    await safeClick(this.main.getByRole("button", { name: L.profileMessage }));
    await expect(this.page).toHaveURL(/\/direct\?chatId=[0-9a-f-]{36}/, { timeout: 20000 });
    return new URL(this.page.url()).searchParams.get("chatId")!;
  }

  // ── Rich cards ──
  /**
   * A link card: the smallest block holding both its image (alt = the card's subject) and its CTA.
   * Text alone is not enough — the text column and the CTA share a tighter wrapper than the image.
   */
  private card(imageName: string, cta: Locator): Locator {
    return this.main.locator("div")
      .filter({ has: this.page.getByRole("img", { name: imageName, exact: true }) })
      .filter({ has: cta })
      .last();
  }

  private async openInNewTab(link: Locator, url: RegExp): Promise<Page> {
    await expect(link).toHaveAttribute("target", "_blank");
    const [popup] = await Promise.all([this.page.waitForEvent("popup", { timeout: 20000 }), safeClick(link)]);
    await expect(popup).toHaveURL(url, { timeout: 20000 });
    await waitForLoaded(popup);
    return popup;
  }

  /** Product card: thumbnail, type badge, title, creator, Rp price and Buy Now → the product page. */
  async expectProductCard(product: { title: string; badge: string; creator: string; price: string }): Promise<Page> {
    const buyNow = this.page.getByRole("link", { name: L.buyNow });
    const card = this.card(product.title, buyNow);
    await expect(card).toBeVisible({ timeout: 20000 });
    for (const text of [product.title, product.badge, product.creator, product.price]) await expect(card).toContainText(text);
    return this.openInNewTab(card.getByRole("link", { name: L.buyNow }), /\/product\/\w+/);
  }

  /** Campaign card: banner, Active badge, name, owner, funding %, progress bar and Donate Now → donate page. */
  async expectCampaignCard(campaign: { title: string; uuid: string; owner: string }): Promise<Page> {
    const donate = this.page.getByRole("link", { name: L.donateNow });
    const card = this.card(campaign.title, donate);
    await expect(card).toBeVisible({ timeout: 20000 });
    await expect(card).toContainText(campaign.title);
    await expect(card).toContainText(L.campaignActive);
    await expect(card).toContainText(campaign.owner);
    await expect(card).toContainText(/\d+%/);
    await expect(card.getByRole("progressbar")).toBeVisible();
    return this.openInNewTab(card.getByRole("link", { name: L.donateNow }), new RegExp(`/campaign/.*${campaign.uuid}/donate`));
  }

  /** Tip request card: the creator's avatar and name, and Send Tip Rp<amount> → their tip page. */
  async openTipCard(creator: string, amountLabel: string) {
    const card = this.card(creator, this.page.getByRole("link", { name: L.sendTip(amountLabel) }));
    const tip = card.getByRole("link", { name: L.sendTip(amountLabel) });
    await expect(card).toBeVisible({ timeout: 20000 });
    await expect(card).toContainText(creator);
    await safeClick(tip);
    await expect(this.page).toHaveURL(new RegExp(`/${creator}/tip\\?amount=\\d+`), { timeout: 20000 });
    await waitForLoaded(this.page);
  }

  /** A post card is a button named after its author and content; it opens the post. */
  postCard(content: string): Locator {
    return this.main.getByRole("button", { name: new RegExp(content) }).last();
  }

  async expectPostCard(content: string, options: { image?: boolean; memberOnly?: boolean; locked?: boolean } = {}) {
    const card = this.postCard(content);
    await expect(card).toBeVisible({ timeout: 20000 });
    if (options.image) await expect(card.getByRole("img", { name: "Post image" })).toBeVisible();
    if (options.memberOnly) await expect(card).toContainText(L.memberOnly);
    const unlock = card.getByRole("button", { name: L.unlockPost });
    if (options.locked) await expect(unlock).toBeVisible();
    else await expect(unlock).toHaveCount(0);
  }

  async openPostCard(content: string, postUuid: string) {
    await safeClick(this.postCard(content));
    await expect(this.page).toHaveURL(new RegExp(`/post/${postUuid}`), { timeout: 20000 });
    await waitForLoaded(this.page);
  }

  /** The post detail reached from a card shows the post, and no unlock prompt when it is readable. */
  async expectPostOpened(content: string) {
    await expect(this.main.getByText(content).first()).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByRole("button", { name: /Unlock Now/i })).toHaveCount(0);
  }

  /** A card CTA's new tab shows what the card advertised. */
  async expectTabShows(tab: Page, text: string) {
    await expect(tab.getByText(text).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
  }

  async unlockPostFromCard(content: string) {
    await safeClick(this.postCard(content).getByRole("button", { name: L.unlockPost }));
  }

  /** Tier card: Membership badge, tier, creator and a CTA that reads the viewer's subscription. */
  tierCard(tier: string, cta: string): Locator {
    return this.card(tier, this.page.getByRole("link", { name: cta, exact: true }));
  }

  async expectTierCard(tier: string, creator: string, cta: string) {
    const card = this.tierCard(tier, cta);
    await expect(card).toBeVisible({ timeout: 20000 });
    await expect(card.getByRole("img", { name: tier })).toBeVisible();
    await expect(card).toContainText(L.membershipBadge);
    await expect(card).toContainText(creator);
  }

  /** Subscribe Now opens the tier's page in a new tab. */
  async subscribeFromTierCard(tier: string, tierUuid: string): Promise<Page> {
    return this.openInNewTab(this.tierCard(tier, L.subscribeNow).getByRole("link", { name: L.subscribeNow }), new RegExp(`/membership/${tierUuid}`));
  }

  /** Subscribed opens My Memberships, where the tier is listed as active. */
  async openSubscribedTier(tier: string) {
    await safeClick(this.tierCard(tier, L.subscribed).getByRole("link", { name: L.subscribed }));
    await expect(this.page).toHaveURL(/\/profile\/membership/, { timeout: 20000 });
    await expect(this.main.getByText(L.myMemberships)).toBeVisible({ timeout: 15000 });
    await expect(this.main.getByRole("button", { name: new RegExp(tier) }).first()).toBeVisible({ timeout: 15000 });
  }

  /** A member-only post the buyer cannot read asks for the tier that unlocks it. */
  async expectMembershipUnlockDialog(tier: string) {
    await safeClick(this.page.getByRole("button", { name: /Unlock Now/i }));
    const dialog = this.page.getByRole("dialog", { name: L.selectMembershipDialog });
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByRole("heading", { name: tier })).toBeVisible();
    await expect(dialog.getByRole("button", { name: new RegExp(`^${L.subscribe} Rp`) })).toBeVisible();
  }

  /** Scroll the thread back to its start; every listed message must still render. */
  async expectHistory(messages: string[]) {
    for (const text of messages) {
      const bubble = this.main.getByText(text, { exact: true }).first();
      await bubble.scrollIntoViewIfNeeded();
      await expect(bubble).toBeVisible({ timeout: 15000 });
    }
  }
}
