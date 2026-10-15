import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { trackAuthToken } from "@helpers/auth/validate-token";
import { safeClick, safeFill, waitForLoaded } from "@utils/playwright.utils";
import { locatorChain, smartLocator } from "@utils/heal-utils";
import { POST_CARD_SELECTOR, VERIFIED_BADGE_SELECTOR } from "@pages/shared/locators";
import { feedsTabs, feedsLabels, scrollRounds, scrollDelayMs, type FeedsTab } from "@test-data/buyer/feeds.data";

const ACTIVE_TAB_COLOR = "text-[#373737]";

export class FeedsPage {
  private auth = trackAuthToken(this.page);

  constructor(public readonly page: Page, private readonly baseURL: string) {}

  private async waitForPageSettled() {
    await waitForLoaded(this.page);
  }

  async goto() {
    await this.page.goto(new URL("feeds", this.baseURL).toString());
    await this.waitForPageSettled();
  }

  async gotoPost(postId: string) {
    await this.page.goto(new URL(`post/${postId}`, this.baseURL).toString());
    await this.waitForPageSettled();
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/feeds/);
    expect(this.page.url()).not.toContain("/auth");
  }

  async expectAuthenticated() {
    await this.auth.expectValid();
  }

  // ── Tabs (rendered as buttons; active tab uses dark text color class) ──
  private tabButton(label: string) {
    return this.page.getByRole("button", { name: label, exact: true });
  }

  readonly followingTab = this.page.getByRole("button", { name: feedsTabs.following, exact: true });
  readonly yourPostTab = this.page.getByRole("button", { name: feedsTabs.yourPost, exact: true });
  readonly exclusiveTab = this.page.getByRole("button", { name: feedsTabs.exclusive, exact: true });

  async switchToTab(tab: FeedsTab) {
    const target =
      tab === "following" ? this.followingTab : tab === "yourPost" ? this.yourPostTab : this.exclusiveTab;
    await safeClick(target);
    await this.waitForPageSettled();
  }

  async expectTabActive(label: string) {
    const tab = this.tabButton(label);
    await expect(tab).toBeVisible({ timeout: 10000 });
    const ariaSelected = await tab.getAttribute("aria-selected");
    if (ariaSelected === "true") {
      return;
    }
    const cls = (await tab.getAttribute("class")) ?? "";
    expect(
      cls.includes(ACTIVE_TAB_COLOR),
      `Tab "${label}" should be active (aria-selected or class missing "${ACTIVE_TAB_COLOR}"): ${cls}`,
    ).toBe(true);
  }

  // ── Creators You Might Like section ──
  readonly creatorsSection = locatorChain(this.page, {
    text: feedsLabels.creatorsYouMightLike,
    role: "heading",
    name: feedsLabels.creatorsYouMightLike,
  });
  readonly followButtons = locatorChain(this.page, {
    role: "button",
    name: feedsLabels.follow,
    text: feedsLabels.follow,
  });

  private get creatorCards(): Locator {
    return this.page.locator("main").locator("div").filter({
      has: locatorChain(this.page, { role: "button", name: feedsLabels.follow, text: feedsLabels.follow }),
    });
  }

  readonly creatorAvatar = this.page.locator("main img").first();

  async expectCreatorsSectionVisible() {
    await expect(this.creatorsSection).toBeVisible({ timeout: 10000 });
    await expect(this.followButtons.first()).toBeVisible({ timeout: 10000 });
    await expect(this.creatorCards.first()).toBeVisible({ timeout: 10000 });
  }

  // ── Follow / Unfollow from Creators You Might Like ──
  readonly followingButtons = locatorChain(this.page, {
    role: "button",
    name: feedsLabels.following,
    text: feedsLabels.following,
  });

  async getFirstCreatorName(): Promise<string> {
    const card = this.creatorCards.first();
    const allText = (await card.textContent()) ?? "";
    const name = allText.replace(feedsLabels.follow, "").trim();
    return name;
  }

  async getFirstCreatorHandle(): Promise<string> {
    const alt = (await this.creatorAvatar.getAttribute("alt")) ?? "";
    return alt.trim();
  }

  async followFirstCreator() {
    await safeClick(this.followButtons.first());
    await this.waitForPageSettled();
  }

  async expectCreatorRemovedFromSuggestions(creatorName: string) {
    const card = this.creatorCards.filter({ hasText: creatorName }).first();
    await expect(card).toBeHidden({ timeout: 10000 });
  }

  async expectFollowingButtonVisible() {
    await expect(this.followingButtons.first()).toBeVisible({ timeout: 10000 });
  }

  // ── Feed posts ──
  private get feedPosts(): Locator {
    return this.page.locator("main").locator(POST_CARD_SELECTOR);
  }

  readonly memberOnlyLabel = locatorChain(this.page, {
    text: feedsLabels.memberOnly,
    selector: `main :text-is("${feedsLabels.memberOnly}")`,
  });

  private get lockedPosts(): Locator {
    return this.feedPosts.filter({
      has: locatorChain(this.page, { role: "button", name: feedsLabels.unlockPost, text: feedsLabels.unlockPost }),
    });
  }

  readonly unlockPostButtons = locatorChain(this.page, {
    role: "button",
    name: feedsLabels.unlockPost,
    text: feedsLabels.unlockPost,
  });

  readonly publicImagePosts = this.feedPosts
    .filter({ has: locatorChain(this.page, { role: "button", name: feedsLabels.openPostMedia, text: feedsLabels.openPostMedia }) })
    .filter({ hasNot: this.unlockPostButtons })
    .filter({ hasNot: this.memberOnlyLabel });

  readonly mediaButtons = locatorChain(this.page, {
    role: "button",
    name: feedsLabels.openPostMedia,
    text: feedsLabels.openPostMedia,
  });

  // ── Like / Unlike ──
  readonly firstLikeButton = locatorChain(this.page, { role: "button", name: feedsLabels.likePost, text: feedsLabels.likePost }).first();
  readonly firstUnlikeButton = locatorChain(this.page, { role: "button", name: feedsLabels.unlikePost, text: feedsLabels.unlikePost }).first();
  private get firstLikeCountEl() {
    return this.feedPosts.first().locator("p").filter({ hasText: /^\d+$/ }).first();
  }
  private postByContent(content: string) {
    return this.feedPosts.filter({ hasText: content }).first();
  }
  private postLikeCountEl(post: Locator) {
    return post.locator("p").filter({ hasText: /^\d+$/ }).first();
  }
  private priceText(price: number) {
    return `Rp${new Intl.NumberFormat("id-ID").format(price)}`;
  }

  async getFirstPostLikeCount(): Promise<number> {
    const text = (await this.firstLikeCountEl.textContent()) ?? "0";
    return parseInt(text.trim(), 10) || 0;
  }

  async likeFirstPost(): Promise<number> {
    await safeClick(this.firstLikeButton);
    await expect(this.firstUnlikeButton).toBeVisible({ timeout: 15000 });
    return 0;
  }

  async expectLikedState() {
    await expect(this.firstUnlikeButton).toBeVisible({ timeout: 15000 });
    const count = await this.getFirstPostLikeCount();
    expect(count, "like count should be >= 1").toBeGreaterThanOrEqual(1);
  }

  async expectUnlikedState() {
    await expect(this.firstLikeButton).toBeVisible({ timeout: 15000 });
  }

  async unlikeFirstPost() {
    await safeClick(this.firstUnlikeButton);
    await expect(this.firstLikeButton).toBeVisible({ timeout: 15000 });
  }

  async expectPostVisible(content: string) {
    await expect(this.postByContent(content)).toBeVisible({ timeout: 15000 });
  }

  async expectPostHidden(content: string) {
    await expect(this.feedPosts.filter({ hasText: content })).toHaveCount(0, { timeout: 15000 });
  }

  /** Number of post cards currently rendered in the active tab. */
  async countPosts(): Promise<number> {
    return this.feedPosts.count();
  }

  async getPostLikeCount(content: string): Promise<number> {
    const text = (await this.postLikeCountEl(this.postByContent(content)).textContent()) ?? "0";
    return parseInt(text.trim(), 10) || 0;
  }

  async rapidLikePost(content: string, clickCount = 5) {
    const likeButton = this.postByContent(content).getByRole("button", { name: feedsLabels.likePost });
    await expect(likeButton).toBeVisible({ timeout: 10000 });
    await likeButton.click({ clickCount, timeout: 5000 });
    await expect(this.postByContent(content).getByRole("button", { name: feedsLabels.unlikePost })).toBeVisible({
      timeout: 15000,
    });
  }

  async unlikePost(content: string) {
    const post = this.postByContent(content);
    await safeClick(post.getByRole("button", { name: feedsLabels.unlikePost }));
    await expect(post.getByRole("button", { name: feedsLabels.likePost })).toBeVisible({ timeout: 15000 });
  }

  async likePost(content: string) {
    const post = this.postByContent(content);
    await safeClick(post.getByRole("button", { name: feedsLabels.likePost }));
    await expect(post.getByRole("button", { name: feedsLabels.unlikePost })).toBeVisible({ timeout: 15000 });
  }

  async expectPostLikedState(content: string) {
    await expect(this.postByContent(content).getByRole("button", { name: feedsLabels.unlikePost })).toBeVisible({
      timeout: 15000,
    });
  }

  async expectPostUnlikedState(content: string) {
    await expect(this.postByContent(content).getByRole("button", { name: feedsLabels.likePost })).toBeVisible({
      timeout: 15000,
    });
  }

  // ── Post detail (click post card to open detail page) ──
  readonly firstPostCard = this.feedPosts.first();
  // FLAKY_FIX: no text fallback — getByText("Back") matches inner <p>, not the button
  readonly postDetailBackButton = locatorChain(this.page, {
    role: "button",
    name: feedsLabels.back,
    exact: true,
    selector: `button:has(:text-is("${feedsLabels.back}"))`,
  });

  async openFirstPostDetail() {
    await safeClick(this.firstPostCard);
    await this.waitForPageSettled();
  }

  async openPostDetail(content: string) {
    await safeClick(this.postByContent(content));
    await this.waitForPageSettled();
  }

  async clickBackFromPostDetail() {
    await safeClick(this.postDetailBackButton);
    await this.waitForPageSettled();
  }

  // ── Navigate to creator profile from feed post ──
  readonly firstPostCreatorName = this.feedPosts.first().locator("p").first();

  async navigateToCreatorProfileFromPost() {
    await safeClick(this.firstPostCreatorName);
    await this.waitForPageSettled();
  }

  async navigateToCreatorProfileFromPostContent(content: string) {
    const creatorHandle = this.postByContent(content).locator("p").first();
    await safeClick(creatorHandle);
    await this.waitForPageSettled();
  }

  // ── Navigate to creator profile from Following tab post ──
  async openCreatorProfileFromFollowingTab(content?: string) {
    await this.switchToTab("following");
    await this.waitForPageSettled();
    if (content) {
      await expect(this.postByContent(content)).toBeVisible({ timeout: 15000 });
      await this.navigateToCreatorProfileFromPostContent(content);
    } else {
      await expect(this.feedPosts.first()).toBeVisible({ timeout: 15000 });
      await safeClick(this.firstPostCreatorName);
    }
    await expect(this.page).not.toHaveURL(/\/feeds\/?$/, { timeout: 15000 });
    await this.waitForPageSettled();
  }

  async expectExclusiveContentOnly() {
    await this.expectTabActive(feedsTabs.exclusive);
    await expect(this.feedPosts.first()).toBeVisible({ timeout: 10000 });
    await expect(locatorChain(this.page, { role: "button", name: feedsLabels.openPostMedia, text: feedsLabels.openPostMedia }).first()).toBeVisible({
      timeout: 10000,
    });
    expect(this.page.url()).not.toContain("/auth");
  }

  async infiniteScroll() {
    for (let i = 0; i < scrollRounds; i++) {
      const before = await this.feedPosts.count();
      await this.page.getByRole("main").hover().catch(() => undefined);
      await this.page.mouse.wheel(0, 2400);
      await this.page.keyboard.press("PageDown").catch(() => undefined);
      await this.feedPosts.last().evaluate((node) => {
        const w = globalThis as any;
        let el: any = node;
        while (el) {
          if (el.scrollHeight > el.clientHeight) {
            el.scrollTop = el.scrollHeight;
          }
          el = el.parentElement;
        }
        w.scrollTo(0, w.document.body.scrollHeight);
      });
      await this.page.waitForTimeout(scrollDelayMs);
      await waitForLoaded(this.page);
      const after = await this.feedPosts.count();
      expect(after).toBeGreaterThanOrEqual(before);
    }
  }

  async expectLockedPostsBlurred() {
    await expect(this.lockedPosts.first()).toBeVisible({ timeout: 10000 });
    await expect(this.unlockPostButtons.first()).toBeVisible({ timeout: 10000 });
  }

  async expectLockedPostVisible(content: string) {
    const post = this.postByContent(content);
    await expect(post).toBeVisible({ timeout: 15000 });
    await expect(post.getByRole("button", { name: feedsLabels.unlockPost })).toBeVisible({ timeout: 10000 });
  }

  /** Pink lock pill beside a pay-per-view post's timestamp; it has no accessible name, only the brand gradient. */
  readonly exclusiveBadges = locatorChain(this.page, { selector: 'span[class*="from-[#FF0090]"]' });

/** A post card shows the Official badge beside its author's name, or not. */
  async expectPostAuthorOfficial(content: string, official: boolean) {
    const badge = this.postByContent(content).locator(VERIFIED_BADGE_SELECTOR);
    if (official) await expect(badge.first()).toBeVisible({ timeout: 10000 });
    else await expect(badge).toHaveCount(0);
  }

  async expectOfficialBadgeOnDetail() {
    await this.expectPostDetailOpen();
    await expect(this.page.getByRole("main").locator(VERIFIED_BADGE_SELECTOR).first()).toBeVisible({ timeout: 10000 });
  }

// ── Linked products on a post ──
  /** A linked-product chip on the post detail: thumbnail (alt = title), title and price. It has no role or link. */
  private linkedProductChip(title: string): Locator {
    return this.page
      .getByRole("main")
      .locator("div")
      .filter({ has: this.page.getByRole("img", { name: title, exact: true }) })
      .filter({ hasText: /Rp/ })
      .last();
  }

  async expectLinkedProduct(title: string, price: RegExp) {
    const chip = this.linkedProductChip(title);
    await expect(chip).toBeVisible({ timeout: 15000 });
    await expect(chip).toContainText(title);
    await expect(chip).toContainText(price);
    await expect(chip.getByRole("img", { name: title, exact: true })).toBeVisible();
  }

  async expectLinkedProductHidden(title: string) {
    await this.expectPostDetailOpen();
    await expect(this.page.getByRole("main").getByRole("img", { name: title, exact: true })).toHaveCount(0);
  }

  /** The feed card advertises `View Products (n)` only for posts that link products. */
  async expectFeedCardProductCount(content: string, count: number | null) {
    const label = this.postByContent(content).getByText(feedsLabels.viewProducts, { exact: false });
    if (count === null) await expect(label).toHaveCount(0);
    else await expect(label).toHaveText(`${feedsLabels.viewProducts} (${count})`, { timeout: 10000 });
  }

  /** An opened post with no linked product shows no product chip (no price anywhere in the post). */
  async expectNoLinkedProducts(content: string) {
    await this.expectPostBodyVisible(content);
    await expect(this.page.getByRole("main").getByText(/^Rp[\d.,]+$/)).toHaveCount(0);
  }

  async openLinkedProduct(title: string) {
    await safeClick(this.linkedProductChip(title).getByText(title, { exact: true }));
    await expect(this.page).toHaveURL(/\/product\//, { timeout: 15000 });
  }

/** The feed card names its author. */
  async expectPostAuthor(content: string, username: string) {
    await expect(this.postByContent(content)).toContainText(username, { timeout: 10000 });
  }

  /** A purchased PPV card shows its media without the `Unlock Post` gate. */
  async expectUnlockedFeedCard(content: string) {
    const post = this.postByContent(content);
    await expect(post).toBeVisible({ timeout: 15000 });
    await expect(post.getByRole("button", { name: feedsLabels.unlockPost })).toHaveCount(0);
    await expect(post.getByRole("button", { name: feedsLabels.openPostMedia }).first()).toBeVisible({ timeout: 10000 });
  }

/** At least one post on the page is signed with this username. */
  async expectPostAuthorOnPage(username: string) {
    await expect(this.feedPosts.filter({ hasText: username }).first()).toBeVisible({ timeout: 15000 });
  }

  async expectExclusiveBadge(content: string) {
    await expect(this.postByContent(content).filter({ has: this.exclusiveBadges })).toBeVisible({ timeout: 10000 });
  }

  async expectExclusiveBadgeOnDetail() {
    await this.expectPostDetailOpen();
    await expect(this.page.getByRole("main").locator(this.exclusiveBadges).first()).toBeVisible({ timeout: 10000 });
  }

  readonly screenshotWarningDialog = this.page.getByRole("dialog", { name: feedsLabels.screenshotWarning });

  readonly screenshotWarningDismiss = smartLocator(this.page, {
    role: "button",
    name: feedsLabels.screenshotWarningDismiss,
    text: feedsLabels.screenshotWarningDismiss,
  });

  /** Press the OS screenshot key; the Exclusive tab answers with a blocking warning dialog. */
  async attemptScreenshot() {
    await this.page.keyboard.press("PrintScreen");
    await expect(this.screenshotWarningDialog).toBeVisible({ timeout: 10000 });
    await expect(this.screenshotWarningDialog).toContainText(feedsLabels.screenshotWarningBody);
  }

  async dismissScreenshotWarning() {
    await this.screenshotWarningDismiss.click();
    await expect(this.screenshotWarningDialog).toBeHidden({ timeout: 10000 });
  }

  readonly postDetailDialog = locatorChain(this.page, {
    role: "dialog",
    name: "Post image modal",
    text: "Post image modal",
  });

  async openFirstPublicImagePost() {
    await safeClick(this.publicImagePosts.first());
    await this.postDetailDialog.waitFor({ state: "visible", timeout: 15000 });
    await this.waitForPageSettled();
  }

  async openPublicImagePost(content: string) {
    const mediaButton = this.postByContent(content).getByRole("button", { name: feedsLabels.openPostMedia }).first();
    await safeClick(mediaButton);
    await this.postDetailDialog.waitFor({ state: "visible", timeout: 15000 });
    await this.waitForPageSettled();
  }

  async openPostMedia(content: string) {
    const mediaButton = this.postByContent(content).getByRole("button", { name: feedsLabels.openPostMedia }).first();
    await safeClick(mediaButton);
    await this.waitForPageSettled();
  }

  async expectMediaPostsVisible() {
    await expect(this.publicImagePosts.first()).toBeVisible({ timeout: 15000 });
    await expect(this.mediaButtons.first()).toBeVisible({ timeout: 15000 });
  }

  async zoomPreviewImage() {
    const image = this.postDetailDialog.locator("img").first();
    await expect(image).toBeVisible({ timeout: 10000 });
    await image.hover();
    await this.page.mouse.wheel(0, -700);
    await this.page.waitForTimeout(300);
    await this.page.mouse.wheel(0, 700);
    await expect(image).toBeVisible({ timeout: 5000 });
  }

  async closePreview() {
    await this.page.keyboard.press("Escape");
    await expect(this.postDetailDialog).toBeHidden({ timeout: 10000 });
    await this.expectLoaded();
  }

  async openSecondGalleryMediaIfAvailable(): Promise<boolean> {
    const count = await this.feedPosts.count();
    for (let i = 0; i < count; i++) {
      const post = this.feedPosts.nth(i);
      const media = post.getByRole("button", { name: feedsLabels.openPostMedia });
      if ((await media.count()) > 1) {
        await safeClick(media.nth(1));
        await this.postDetailDialog.waitFor({ state: "visible", timeout: 15000 });
        await this.waitForPageSettled();
        return true;
      }
    }
    return false;
  }

  async swipePreviewLeftRight() {
    await expect(this.postDetailDialog).toBeVisible({ timeout: 10000 });
    await this.page.mouse.move(900, 400);
    await this.page.mouse.down();
    await this.page.mouse.move(300, 400, { steps: 8 });
    await this.page.mouse.up();
    await this.page.waitForTimeout(300);
    await this.page.mouse.down();
    await this.page.mouse.move(900, 400, { steps: 8 });
    await this.page.mouse.up();
    await expect(this.postDetailDialog.locator("img").first()).toBeVisible({ timeout: 5000 });
  }

// ── Media preview (dialog "Post image modal") ──
  readonly nextImageButton = smartLocator(this.page, { role: "button", name: feedsLabels.nextImage, text: feedsLabels.nextImage });
  readonly previousImageButton = smartLocator(this.page, { role: "button", name: feedsLabels.previousImage, text: feedsLabels.previousImage });

  /** File names of a post's images, in order; Next serves them through `/_next/image?url=…`. */
  private static imageKeys(imgs: Locator): Promise<string[]> {
    return imgs.evaluateAll((els) =>
      els.map((el) => {
        const src = el.getAttribute("src") ?? "";
        const url = new URL(src, (globalThis as any).location.href).searchParams.get("url") ?? src;
        return url.split("?")[0].split("/").pop() ?? "";
      }),
    );
  }

  postImageKeys(content: string): Promise<string[]> {
    return FeedsPage.imageKeys(this.postByContent(content).locator("img"));
  }

  async previewImageKey(): Promise<string> {
    await expect(this.postDetailDialog.locator("img").first()).toBeVisible({ timeout: 10000 });
    return (await FeedsPage.imageKeys(this.postDetailDialog.locator("img")))[0];
  }

  /** Tap the post's `index`-th media tile (0-based) and wait for the preview dialog. */
  async openPostMediaAt(content: string, index: number) {
    await safeClick(this.postByContent(content).getByRole("button", { name: feedsLabels.openPostMedia }).nth(index));
    await expect(this.postDetailDialog).toBeVisible({ timeout: 15000 });
  }

  /** The preview image is letterboxed (object-fit: contain), so it scales without distortion. */
  async expectPreviewImageProportional() {
    const image = this.postDetailDialog.locator("img").first();
    await expect(image).toBeVisible({ timeout: 10000 });
    await expect(image).toHaveCSS("object-fit", "contain");
    await expect.poll(() => image.evaluate((el) => (el as any).naturalWidth as number), { message: "preview image should load", timeout: 15000 }).toBeGreaterThan(0);
  }

  async nextImage() {
    await this.nextImageButton.click();
  }

  async previousImage() {
    await this.previousImageButton.click();
  }

  async expectPreviewImage(key: string) {
    await expect.poll(() => this.previewImageKey(), { timeout: 10000 }).toBe(key);
  }

  feedScrollY(): Promise<number> {
    return this.page.evaluate(() => (globalThis as any).scrollY as number);
  }

  private get dialogVideo(): Locator {
    return this.postDetailDialog.locator("video").first();
  }

  private videoState() {
    return this.dialogVideo.evaluate((el) => {
      const v = el as any;
      return { paused: v.paused, time: v.currentTime, fullscreen: !!(globalThis as any).document.fullscreenElement, controls: v.controls };
    });
  }

  /** Tapping a video opens it full screen in the preview dialog and it starts playing. */
  async expectVideoPlayingFullScreen() {
    await expect(this.dialogVideo).toBeVisible({ timeout: 15000 });
    await expect.poll(async () => (await this.videoState()).paused, { timeout: 10000 }).toBe(false);
    await expect.poll(async () => (await this.videoState()).fullscreen, { timeout: 10000 }).toBe(true);
  }

  /** Pause with a tap, resume with Space, then seek forward and back through the native controls. */
  async controlVideoPlayback() {
    expect((await this.videoState()).controls, "full-screen video should expose playback controls").toBe(true);
    await this.dialogVideo.click();
    await expect.poll(async () => (await this.videoState()).paused, { timeout: 5000 }).toBe(true);
    await this.page.keyboard.press("Space");
    await expect.poll(async () => (await this.videoState()).paused, { timeout: 5000 }).toBe(false);
    for (const target of [6, 1]) {
      await this.dialogVideo.evaluate((el, t) => { (el as any).currentTime = t; }, target);
      await expect.poll(async () => Math.abs((await this.videoState()).time - target), { timeout: 5000 }).toBeLessThan(1.5);
    }
  }

  private get previewVideo(): Locator {
    return this.page.locator("main video").or(this.page.locator("video"));
  }

  async openVideoPreviewIfAvailable(): Promise<boolean> {
    const video = this.previewVideo.first();
    if (!(await video.isVisible().catch(() => false))) {
      return false;
    }
    await safeClick(video);
    await this.waitForPageSettled();
    return true;
  }

  async expectVideoPreviewOpen() {
    await expect(this.previewVideo.first()).toBeVisible({ timeout: 15000 });
  }

  async expectVideoPlaybackControls() {
    const video = this.previewVideo.first();
    await expect(video).toBeVisible({ timeout: 10000 });
    await video.evaluate((el) => (el as any).pause());
    await expect.poll(() => video.evaluate((el) => (el as any).paused)).toBe(true);
    await video.evaluate((el) => (el as any).play());
    await expect.poll(() => video.evaluate((el) => (el as any).paused)).toBe(false);
    await video.evaluate((el) => {
      const media = el as any;
      media.currentTime = Math.min(media.duration || 1, media.currentTime + 1);
    });
    await expect(video).toBeVisible({ timeout: 5000 });
  }

  // ── Comment section (post detail page) ──
  readonly commentInput = locatorChain(this.page, {
    role: "textbox",
    name: feedsLabels.writeComment,
    placeholder: feedsLabels.writeComment,
  });
  // FLAKY_FIX: exact:true — role name "Post" substring-matched aria-label "Like post"
  readonly postCommentButton = locatorChain(this.page, {
    role: "button",
    name: feedsLabels.postComment,
    exact: true,
    selector: `button:has(:text-is("${feedsLabels.postComment}"))`,
  });
  readonly commentCountButton = this.page.getByRole("button", { name: /^\d+$/ }).first();
  readonly feedCommentCountButton = this.feedPosts.first().getByRole("button", { name: /^\d+$/ }).first();

  async getCommentCount(): Promise<number> {
    const text = (await this.commentCountButton.locator("p").first().textContent()) ?? "0";
    return parseInt(text.trim(), 10) || 0;
  }

  async getFeedCommentCount(): Promise<number> {
    const text = (await this.feedCommentCountButton.locator("p").first().textContent()) ?? "0";
    return parseInt(text.trim(), 10) || 0;
  }

  async getPostCommentCount(content: string): Promise<number> {
    const text = (await this.postByContent(content).getByRole("button", { name: /^\d+$/ }).first().locator("p").first().textContent()) ?? "0";
    return parseInt(text.trim(), 10) || 0;
  }

  async fillComment(text: string) {
    await this.commentInput.scrollIntoViewIfNeeded();
    await expect(this.commentInput).toBeVisible({ timeout: 10000 });
    await this.commentInput.fill(text);
  }

  async expectPostButtonEnabled() {
    await expect(this.postCommentButton).toBeEnabled({ timeout: 5000 });
  }

  async expectPostButtonDisabled() {
    await expect(this.postCommentButton).toBeDisabled({ timeout: 5000 });
  }

  async submitComment(commentText: string) {
    await safeClick(this.postCommentButton);
    await this.waitForPageSettled();
    await expect(this.page.getByText(commentText, { exact: false })).toBeVisible({ timeout: 10000 });
  }

  /** `Open comment actions` exists only on the viewer's own comments (one per comment row). */
  readonly commentActionsButtons = this.page.getByRole("button", { name: feedsLabels.openCommentActions, exact: true });
  /** The actions popover is a dialog holding `Edit` / `Delete` buttons. */
  private readonly commentActionsPopover = this.page.getByRole("dialog").filter({
    has: this.page.getByRole("button", { name: feedsLabels.editComment, exact: true }),
  });
  private readonly deleteCommentConfirmDialog = this.page.getByRole("dialog").filter({ hasText: feedsLabels.deleteCommentTitle });
  readonly saveCommentButton = smartLocator(this.page, {
    role: "button",
    name: feedsLabels.saveComment,
    text: feedsLabels.saveComment,
  });

  /** Index of the actions button whose comment row contains `commentText`, or -1. */
  private async commentActionsIndex(commentText: string): Promise<number> {
    const rows = await this.commentActionsButtons.evaluateAll((buttons) =>
      buttons.map((button) => button.parentElement?.textContent ?? ""),
    );
    return rows.findIndex((row) => row.includes(commentText));
  }

  private async openCommentActions(commentText: string) {
    const index = await this.commentActionsIndex(commentText);
    expect(index, `"${commentText}" should be the viewer's own comment with an actions button`).toBeGreaterThanOrEqual(0);
    await safeClick(this.commentActionsButtons.nth(index));
    await expect(this.commentActionsPopover).toBeVisible({ timeout: 5000 });
  }

  async expectCommentVisible(commentText: string) {
    await expect(this.page.getByText(commentText, { exact: true })).toBeVisible({ timeout: 10000 });
  }

  async expectCommentHidden(commentText: string) {
    await expect(this.page.getByText(commentText, { exact: true })).toBeHidden({ timeout: 10000 });
  }

  /**
   * Edit loads the comment into the `Write your comment` box and swaps in `Save`.
   * Only works within one minute of posting (`commentEditWindowMs`) — call it right after posting.
   */
  async editComment(commentText: string, updatedText: string) {
    await this.openCommentActions(commentText);
    await safeClick(this.commentActionsPopover.getByRole("button", { name: feedsLabels.editComment, exact: true }));
    await expect(this.commentInput).toHaveValue(commentText, { timeout: 5000 });
    await safeFill(this.commentInput, updatedText);
    await this.saveCommentButton.click();
    await this.expectCommentVisible(updatedText);
  }

  /** Delete asks for confirmation in a `Delete this comment?` dialog. */
  async deleteComment(commentText: string) {
    await this.openCommentActions(commentText);
    await safeClick(this.commentActionsPopover.getByRole("button", { name: feedsLabels.deleteComment, exact: true }));
    await expect(this.deleteCommentConfirmDialog).toBeVisible({ timeout: 5000 });
    await safeClick(this.deleteCommentConfirmDialog.getByRole("button", { name: feedsLabels.deleteComment, exact: true }));
    await this.expectCommentHidden(commentText);
  }

  /** Another account's comment is shown without any actions control. */
  async expectNoCommentActions(commentText: string) {
    await this.expectCommentVisible(commentText);
    expect(await this.commentActionsIndex(commentText), `"${commentText}" must not offer edit/delete`).toBe(-1);
  }

  /** The comment is shown under the given author's username (author and text share one block). */
  async expectCommentAuthor(commentText: string, username: string) {
    const block = this.page
      .getByRole("main")
      .locator("div")
      .filter({ has: this.page.getByText(commentText, { exact: true }) })
      .last();
    await expect(block).toContainText(username, { timeout: 10000 });
  }

  async expectCommentCountIncreased(previousCount: number) {
    await expect.poll(() => this.getCommentCount(), {
      message: `comment count should be > ${previousCount}`,
      timeout: 10000,
    }).toBeGreaterThan(previousCount);
  }

  async expectFeedCommentCountIncreased(previousCount: number) {
    // Feed may have stale data after back navigation — retry with delay
    for (let i = 0; i < 5; i++) {
      const newCount = await this.getFeedCommentCount();
      if (newCount > previousCount) return;
      await this.page.waitForTimeout(1000);
    }
    const finalCount = await this.getFeedCommentCount();
    expect(finalCount, `feed comment count should be > ${previousCount}`).toBeGreaterThan(previousCount);
  }

  async expectPostCommentCountIncreased(content: string, previousCount: number) {
    for (let i = 0; i < 5; i++) {
      const newCount = await this.getPostCommentCount(content);
      if (newCount > previousCount) return;
      await this.page.waitForTimeout(1000);
    }
    const finalCount = await this.getPostCommentCount(content);
    expect(finalCount, `feed comment count should be > ${previousCount}`).toBeGreaterThan(previousCount);
  }

  async expectPostDetailOpen() {
    // Text posts open as full page (/post/{id}), image posts open as dialog
    const isDialog = await this.postDetailDialog.isVisible({ timeout: 3000 }).catch(() => false);
    if (isDialog) {
      await expect(this.postDetailDialog).toBeVisible({ timeout: 10000 });
    } else {
      await expect(this.page).toHaveURL(/\/post\//, { timeout: 10000 });
    }
  }

  async expectPublicImageUnlocked() {
    const image = this.postDetailDialog.locator("img").first();
    await expect(image).toBeVisible({ timeout: 10000 });
    await expect(this.postDetailDialog.getByText(feedsLabels.memberOnly, { exact: true })).toBeHidden({ timeout: 5000 });
  }

  // ── Public post (no monetization indicators) ──
  readonly publicPosts = this.feedPosts.filter({ hasNot: this.page.getByText(feedsLabels.memberOnly, { exact: true }) });

  async openFirstPublicPost() {
    const post = this.publicPosts.first();
    await expect(post).toBeVisible({ timeout: 10000 });
    await expect(post.getByText(feedsLabels.memberOnly, { exact: true })).toBeHidden({ timeout: 3000 });
    await safeClick(post);
    // Image posts open a dialog, text posts navigate to /post/{id}
    const isDialog = await this.postDetailDialog.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isDialog) {
      await expect(this.page).toHaveURL(/\/post\//, { timeout: 10000 });
    }
    await this.waitForPageSettled();
  }

  // ── Locked/exclusive posts (monetization indicators) ──
  async expectMemberOnlyBadgeVisible() {
    await expect(this.lockedPosts.first()).toBeVisible({ timeout: 10000 });
    await expect(this.unlockPostButtons.first()).toBeVisible({ timeout: 5000 });
  }

  async navigateToLockedPostCreatorProfile() {
    const lockedPost = this.lockedPosts.first();
    const creatorName = lockedPost.locator("p").first();
    await safeClick(creatorName);
    await this.waitForPageSettled();
  }

  // ── Locked media preview (blocked before unlock) ──
  readonly unlockPostButton = this.lockedPosts.first().getByRole("button", { name: feedsLabels.unlockPost });

  async clickLockedPostMedia() {
    await expect(this.lockedPosts.first()).toBeVisible({ timeout: 10000 });
    await safeClick(this.lockedPosts.first());
    await this.waitForPageSettled();
  }

  async expectLockedMediaBlocked() {
    const dialog = this.postDetailDialog;
    const dialogVisible = await dialog.isVisible({ timeout: 3000 }).catch(() => false);
    if (dialogVisible) {
      const image = dialog.locator("img").first();
      await expect(image).toBeVisible({ timeout: 5000 });
      const blur = await image.evaluate((el) => (globalThis as any).getComputedStyle(el).filter).catch(() => "none");
      expect(blur).not.toBe("none");
      expect(blur).not.toBe("");
    }
    await expect(this.page.getByText(/Unlock|unlock/i).first()).toBeVisible({ timeout: 5000 });
  }

  /** The open post detail shows this many media tiles (`Open post media`). */
  async expectPostMediaCount(count: number) {
    await expect(this.page.getByRole("main").getByRole("button", { name: feedsLabels.openPostMedia })).toHaveCount(count, { timeout: 15000 });
  }

  /** The post body text is readable on the open post detail. */
  async expectPostBodyVisible(content: string) {
    await expect(this.page.getByRole("main").getByText(content, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }

/** Locked post detail: Unlock Post and Unlock Now. A signed-in viewer also gets "Unlock post to add comments"; a guest does not. */
  async expectLockedPostDetail(options: { signedIn?: boolean } = {}) {
    await this.expectPostDetailOpen();
    await expect(this.unlockPostButtons.first()).toBeVisible({ timeout: 10000 });
    await expect(
      locatorChain(this.page, { role: "button", name: "Unlock Now", text: "Unlock now" }).or(
        this.page.getByRole("button", { name: /Unlock Now|Unlock now/ }),
      ),
    ).toBeVisible({ timeout: 10000 });
    if (options.signedIn !== false) {
      await expect(this.page.getByText(/Unlock post to add comments/i).first()).toBeVisible({ timeout: 10000 });
    }
  }

  async openUnlockPreview(price = 20000) {
    await safeClick(this.unlockPostButtons.first());
    await expect(this.page.getByText(/Exclusive Content Preview|Unlock Exclusive Post|Unlock/i).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(this.page.getByText(this.priceText(price)).first()).toBeVisible({ timeout: 10000 });
  }

  async expectLockedEngagementBlocked() {
    await expect(this.page.getByText(/Unlock post to add comments/i).first()).toBeVisible({ timeout: 10000 });
    if (await this.commentInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(this.commentInput).toBeDisabled({ timeout: 5000 });
    }
  }

  readonly unlockPaymentDialog = this.page.getByRole("dialog", { name: feedsLabels.unlockPaymentDialog });

  readonly unlockPayButton = smartLocator(this.page, {
    role: "button",
    name: feedsLabels.unlockPay,
    text: feedsLabels.unlockPay,
  });

  /** Open the single-post payment dialog and check it charges this post's price. */
  async openUnlockPayment(price: number) {
    // The preview and the post detail both render "Unlock Now"; the topmost one (the preview's) opens payment.
    await safeClick(this.page.getByRole("button", { name: feedsLabels.unlockNow }).last());
    await expect(this.unlockPaymentDialog).toBeVisible({ timeout: 10000 });
    await expect(this.unlockPaymentDialog).toContainText(this.priceText(price));
  }

  async submitUnlockPayment(name: string, phone: string): Promise<string> {
    const dialog = this.unlockPaymentDialog;
    if (!(await dialog.isVisible())) {
      await safeClick(this.page.getByRole("button", { name: feedsLabels.unlockNow }).last());
    }
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const emailInput = dialog.locator('input[type="email"]').or(dialog.getByRole("textbox", { name: /email/i }));
    await expect(emailInput.first()).toBeVisible({ timeout: 10000 });
    expect((await emailInput.first().inputValue()).length).toBeGreaterThan(0);

    const nameInput = dialog.getByRole("textbox", { name: /name/i }).or(dialog.locator('input[name*="name" i]'));
    const phoneInput = dialog.getByRole("textbox", { name: /phone/i }).or(dialog.locator('input[type="tel"]'));
    await nameInput.first().fill(name);
    await phoneInput.first().fill(phone);

    await this.unlockPayButton.click();
    await this.page.waitForURL(/\/transaction\//, { timeout: 20000 });
    await this.waitForPageSettled();
    return this.page.url().split("/transaction/")[1];
  }

  async expectUnlockedExclusivePost(content: string) {
    await this.expectPostDetailOpen();
    await expect(this.page.getByText(content, { exact: false })).toBeVisible({ timeout: 10000 });
    await expect(this.unlockPostButtons.first()).toBeHidden({ timeout: 10000 });
    await expect(this.page.getByRole("main").locator("img").first()).toBeVisible({ timeout: 10000 });
  }

  async zoomUnlockedPostMedia() {
    const image = this.page.getByRole("main").locator("img").first();
    await expect(image).toBeVisible({ timeout: 10000 });
    await image.hover();
    await this.page.mouse.wheel(0, -700);
    await this.page.waitForTimeout(300);
    await this.page.mouse.wheel(0, 700);
    await expect(image).toBeVisible({ timeout: 5000 });
  }

  // ── Guest auth prompts (Following tab) ──
  readonly guestFollowingEmptyHeading = locatorChain(this.page, {
    text: feedsLabels.guestFollowingEmptyHeading,
    role: "heading",
    name: feedsLabels.guestFollowingEmptyHeading,
  });
  readonly guestFollowingEmptySubtext = locatorChain(this.page, {
    text: feedsLabels.guestFollowingEmptySubtext,
  });
  readonly signInBeforeFollowingDialog = this.page
    .getByRole("dialog")
    .filter({ hasText: feedsLabels.signInBeforeFollowing });

  async expectGuestFollowingEmptyState() {
    await expect(this.guestFollowingEmptyHeading).toBeVisible({ timeout: 10000 });
    await expect(this.guestFollowingEmptySubtext).toBeVisible({ timeout: 10000 });
  }

  async clickFirstFollowButton() {
    await safeClick(this.followButtons.first());
  }

  async expectSignInBeforeFollowingDialog() {
    await expect(this.signInBeforeFollowingDialog).toBeVisible({ timeout: 10000 });
    await expect(this.signInBeforeFollowingDialog.getByRole("button", { name: feedsLabels.signInNow })).toBeVisible();
  }

  async clickSignInNowFromDialog() {
    const signIn = this.signInBeforeFollowingDialog.getByRole("button", { name: feedsLabels.signInNow, exact: true });
    await Promise.all([
      this.page.waitForURL(/\/auth/, { timeout: 15000 }),
      safeClick(signIn),
    ]);
  }
}

