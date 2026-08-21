import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { trackAuthToken } from "@helpers/auth/validate-token";
import { safeClick, safeFill, waitForLoaded } from "@utils/playwright.utils";
import { locatorChain } from "@utils/heal-utils";
import { POST_CARD_SELECTOR } from "@pages/shared/locators";
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

  private commentActions(commentText: string) {
    return this.page
      .locator("div")
      .filter({ hasText: commentText })
      .filter({ has: this.page.getByRole("button") })
      .getByRole("button")
      .last();
  }

  private commentAction(name: string) {
    return this.page
      .getByRole('menuitem', { name, exact: true })
      .or(this.page.getByRole('button', { name, exact: true }))
      .last();
  }

  async expectCommentVisible(commentText: string) {
    await expect(this.page.getByText(commentText, { exact: true })).toBeVisible({ timeout: 10000 });
  }

  async expectCommentHidden(commentText: string) {
    await expect(this.page.getByText(commentText, { exact: true })).toBeHidden({ timeout: 10000 });
  }

  async editComment(commentText: string, updatedText: string) {
    await safeClick(this.commentActions(commentText));
    await safeClick(this.commentAction('Edit'));
    const editField = this.page.getByRole('textbox').last().or(this.page.locator('textarea').last());
    await safeFill(editField, updatedText);
    await safeClick(locatorChain(this.page, { role: 'button', name: 'Save', text: 'Save' }).or(this.page.getByRole('button', { name: /Save|Update/i }).last()));
    await this.expectCommentVisible(updatedText);
  }

  async deleteComment(commentText: string) {
    await safeClick(this.commentActions(commentText));
    await safeClick(this.commentAction('Delete'));
    const confirmation = this.page.getByRole('button', { name: /Delete|Confirm/i }).last();
    if (await confirmation.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(confirmation).toBeVisible({ timeout: 5000 });
      await confirmation.click({ timeout: 10000 });
    }
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

  async expectLockedPostDetail() {
    await this.expectPostDetailOpen();
    await expect(this.unlockPostButtons.first()).toBeVisible({ timeout: 10000 });
    await expect(
      locatorChain(this.page, { role: "button", name: "Unlock Now", text: "Unlock now" }).or(
        this.page.getByRole("button", { name: /Unlock Now|Unlock now/ }),
      ),
    ).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(/Unlock post to add comments/i).first()).toBeVisible({ timeout: 10000 });
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

  async submitUnlockPayment(name: string, phone: string): Promise<string> {
    await safeClick(
      locatorChain(this.page, { role: "button", name: "Unlock Now", text: "Unlock now" }).or(
        this.page.getByRole("button", { name: /Unlock Now|Unlock now/ }).last(),
      ),
    );
    const dialog = this.page.getByRole("dialog").filter({ hasText: /Unlock Exclusive Post|Exclusive Post/ }).first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const emailInput = dialog.locator('input[type="email"]').or(dialog.getByRole("textbox", { name: /email/i }));
    await expect(emailInput.first()).toBeVisible({ timeout: 10000 });
    expect((await emailInput.first().inputValue()).length).toBeGreaterThan(0);

    const nameInput = dialog.getByRole("textbox", { name: /name/i }).or(dialog.locator('input[name*="name" i]'));
    const phoneInput = dialog.getByRole("textbox", { name: /phone/i }).or(dialog.locator('input[type="tel"]'));
    await nameInput.first().fill(name);
    await phoneInput.first().fill(phone);

    await safeClick(dialog.getByRole("button", { name: /Pay|Unlock|Continue/i }).last());
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

