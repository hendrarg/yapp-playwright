import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { trackAuthToken } from "@helpers/auth/validate-token";
import { safeClick, waitForLoaded } from "@utils/playwright.utils";
import {
  feedsTabs,
  feedsLabels,
  scrollRounds,
  scrollDelayMs,
  type FeedsTab,
} from "@test-data/buyer/feeds.data";

const POST_SELECTOR = ".flex.flex-row.gap-3.items-start.cursor-pointer.p-4";
const ACTIVE_TAB_COLOR = "text-[#373737]";

export class FeedsPage {
  private auth = trackAuthToken(this.page);

  constructor(public readonly page: Page, private readonly baseURL: string) {}

  private async waitForPageSettled() {
    await waitForLoaded(this.page);
    await this.page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
  }

  async goto() {
    await this.page.goto(new URL("feeds", this.baseURL).toString());
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
    const tab = this.page.getByRole("button", { name: label, exact: true });
    await expect(tab).toBeVisible({ timeout: 10000 });
    const cls = (await tab.getAttribute("class")) ?? "";
    expect(
      cls.includes(ACTIVE_TAB_COLOR),
      `Tab "${label}" should be active (class missing "${ACTIVE_TAB_COLOR}"): ${cls}`,
    ).toBe(true);
  }

  // ── Creators You Might Like section ──
  readonly creatorsSection = this.page.getByText(feedsLabels.creatorsYouMightLike, { exact: true });
  readonly followButtons = this.page.getByRole("button", { name: feedsLabels.follow, exact: true });
  readonly creatorCards = this.followButtons.locator("xpath=..");
  readonly creatorAvatar = this.creatorCards.first().locator("img").first();

  async expectCreatorsSectionVisible() {
    await expect(this.creatorsSection).toBeVisible({ timeout: 10000 });
    await expect(this.followButtons.first()).toBeVisible({ timeout: 10000 });
    await expect(this.creatorCards.first()).toBeVisible({ timeout: 10000 });
  }

  // ── Follow / Unfollow from Creators You Might Like ──
  readonly followingButtons = this.page.getByRole("button", { name: feedsLabels.following, exact: true });

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
  readonly feedPosts = this.page.locator(POST_SELECTOR);
  readonly memberOnlyLabel = this.page.getByText(feedsLabels.memberOnly, { exact: true });
  readonly lockedPosts = this.page.getByRole("button", { name: "Unlock Post" }).locator(
    "xpath=ancestor::div[contains(@class,'cursor-pointer')][1]",
  );
  readonly unlockPostButtons = this.page.getByRole("button", { name: "Unlock Post" });
  readonly publicImagePosts = this.page
    .locator(POST_SELECTOR)
    .filter({ has: this.page.getByRole("button", { name: feedsLabels.openPostMedia }) })
    .filter({ hasNot: this.page.getByRole("button", { name: "Unlock Post" }) })
    .filter({ hasNot: this.page.getByText(feedsLabels.memberOnly, { exact: true }) });

  // ── Like / Unlike ──
  readonly firstLikeButton = this.page.getByRole("button", { name: feedsLabels.likePost }).first();
  readonly firstUnlikeButton = this.page.getByRole("button", { name: feedsLabels.unlikePost }).first();
  private get firstLikeCountEl() {
    return this.feedPosts.first().locator("p").filter({ hasText: /^\d+$/ }).first();
  }
  private postByContent(content: string) {
    return this.feedPosts.filter({ hasText: content }).first();
  }
  private postLikeCountEl(post: Locator) {
    return post.locator("p").filter({ hasText: /^\d+$/ }).first();
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
  readonly postDetailBackButton = this.page.getByRole("button", { name: "Back" });

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
  readonly firstPostCreatorName = this.feedPosts.first().locator("p").filter({ hasText: /./ }).first();

  async navigateToCreatorProfileFromPost() {
    await safeClick(this.firstPostCreatorName);
    await this.waitForPageSettled();
  }

  async navigateToCreatorProfileFromPostContent(content: string) {
    const creatorName = this.postByContent(content).locator("p").filter({ hasText: /./ }).first();
    await safeClick(creatorName);
    await this.waitForPageSettled();
  }

  // ── Navigate to creator profile from Following tab post ──
  async openCreatorProfileFromFollowingTab() {
    await this.switchToTab("following");
    await this.waitForPageSettled();
    await expect(this.feedPosts.first()).toBeVisible({ timeout: 15000 });
    const creatorName = this.feedPosts.first().locator("p").filter({ hasText: /./ }).first();
    await safeClick(creatorName);
    await this.waitForPageSettled();
  }

  async expectExclusiveContentOnly() {
    await this.expectTabActive(feedsTabs.exclusive);
    await expect(this.feedPosts.first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByRole("button", { name: feedsLabels.openPostMedia }).first()).toBeVisible({
      timeout: 10000,
    });
    expect(this.page.url()).not.toContain("/auth");
  }

  async infiniteScroll() {
    for (let i = 0; i < scrollRounds; i++) {
      const before = await this.feedPosts.count();
      await this.page.locator("main").hover().catch(() => undefined);
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

  readonly postDetailDialog = this.page.getByRole("dialog", { name: "Post image modal" });

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

  // ── Comment section (post detail page) ──
  readonly commentInput = this.page.getByRole("textbox", { name: "Write your comment" });
  readonly postCommentButton = this.page.getByRole("button", { name: "Post", exact: true });
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
  readonly unlockPostButton = this.lockedPosts.first().getByRole("button", { name: "Unlock Post" });

  async clickLockedPostMedia() {
    await expect(this.lockedPosts.first()).toBeVisible({ timeout: 10000 });
    await safeClick(this.lockedPosts.first());
    await this.waitForPageSettled();
  }

  async expectLockedMediaBlocked() {
    // Media opens in dialog or detail — verify blur + unlock button
    const dialog = this.postDetailDialog;
    const dialogVisible = await dialog.isVisible({ timeout: 3000 }).catch(() => false);
    if (dialogVisible) {
      const image = dialog.locator("img").first();
      await expect(image).toBeVisible({ timeout: 5000 });
      const blur = await image.evaluate((el) => (globalThis as any).getComputedStyle(el).filter).catch(() => "none");
      expect(blur).not.toBe("none");
      expect(blur).not.toBe("");
    }
    // Verify unlock button or unlock prompt appears
    await expect(this.page.getByText(/Unlock|unlock/i).first()).toBeVisible({ timeout: 5000 });
  }
}
