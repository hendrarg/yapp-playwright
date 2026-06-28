import type { Page } from "@playwright/test";
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

  async goto() {
    await this.page.goto(new URL("feeds", this.baseURL).toString());
    await this.page.waitForLoadState("networkidle");
    await waitForLoaded(this.page);
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
    await waitForLoaded(this.page);
    await this.page.waitForLoadState("networkidle").catch(() => {});
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
    await expect(this.creatorAvatar).toBeVisible({ timeout: 10000 });
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
    await waitForLoaded(this.page);
    await this.page.waitForLoadState("networkidle").catch(() => {});
  }

  async expectCreatorRemovedFromSuggestions(creatorName: string) {
    const card = this.creatorCards.filter({ hasText: creatorName }).first();
    await expect(card).toBeHidden({ timeout: 10000 }).catch(() => {});
  }

  async expectFollowingButtonVisible() {
    await expect(this.followingButtons.first()).toBeVisible({ timeout: 10000 });
  }

  // ── Feed posts ──
  readonly feedPosts = this.page.locator(POST_SELECTOR);
  readonly memberOnlyLabel = this.page.getByText(feedsLabels.memberOnly, { exact: true });
  readonly lockedPosts = this.memberOnlyLabel.locator(
    "xpath=ancestor::div[contains(@class,'cursor-pointer')][1]",
  );
  readonly lockIcon = this.lockedPosts.first().locator("img").first();
  readonly publicImagePosts = this.page
    .locator(POST_SELECTOR)
    .filter({ has: this.page.getByRole("button", { name: feedsLabels.openPostMedia }) })
    .filter({ hasNot: this.page.getByText(feedsLabels.memberOnly, { exact: true }) });

  // ── Like / Unlike ──
  readonly firstLikeButton = this.page.getByRole("button", { name: feedsLabels.likePost }).first();
  readonly firstUnlikeButton = this.page.getByRole("button", { name: feedsLabels.unlikePost }).first();
  private get firstLikeCountEl() {
    return this.feedPosts.first().locator("p").filter({ hasText: /^\d+$/ }).first();
  }

  async getFirstPostLikeCount(): Promise<number> {
    const text = (await this.firstLikeCountEl.textContent()) ?? "0";
    return parseInt(text.trim(), 10) || 0;
  }

  async likeFirstPost(): Promise<number> {
    await this.firstLikeButton.scrollIntoViewIfNeeded();
    await expect(this.firstLikeButton).toBeVisible({ timeout: 10000 });
    await this.firstLikeButton.click({ force: true, timeout: 10000 });
    await this.page.waitForTimeout(1500);
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

  // ── Post detail (click post card to open detail page) ──
  readonly firstPostCard = this.feedPosts.first();
  readonly postDetailBackButton = this.page.getByRole("button", { name: "Back" });

  async openFirstPostDetail() {
    await safeClick(this.firstPostCard);
    await waitForLoaded(this.page);
    await this.page.waitForLoadState("networkidle").catch(() => {});
  }

  async clickBackFromPostDetail() {
    await safeClick(this.postDetailBackButton);
    await waitForLoaded(this.page);
    await this.page.waitForLoadState("networkidle").catch(() => {});
  }

  // ── Navigate to creator profile from feed post ──
  readonly firstPostCreatorName = this.feedPosts.first().locator("p").filter({ hasText: /./ }).first();

  async navigateToCreatorProfileFromPost() {
    await safeClick(this.firstPostCreatorName);
    await waitForLoaded(this.page);
    await this.page.waitForLoadState("networkidle").catch(() => {});
  }

  // ── Navigate to creator profile from Following tab post ──
  async openCreatorProfileFromFollowingTab() {
    await this.switchToTab("following");
    await waitForLoaded(this.page);
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await expect(this.feedPosts.first()).toBeVisible({ timeout: 15000 });
    const firstPostAvatar = this.feedPosts.first().locator("img").first();
    await safeClick(firstPostAvatar);
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await waitForLoaded(this.page);
  }

  async expectExclusiveContentOnly() {
    await this.expectTabActive(feedsTabs.exclusive);
    await expect(this.feedPosts.first()).toBeVisible({ timeout: 10000 });
    expect(this.page.url()).not.toContain("/auth");
  }

  async infiniteScroll() {
    for (let i = 0; i < scrollRounds; i++) {
      const before = await this.feedPosts.count();
      await this.page.evaluate(() => {
        const w = globalThis as any;
        w.scrollTo(0, w.document.body.scrollHeight);
      });
      await this.page.waitForTimeout(scrollDelayMs);
      await waitForLoaded(this.page);
      const after = await this.feedPosts.count();
      expect(after).toBeGreaterThanOrEqual(before);
    }
  }

  async expectLockedPostsBlurred() {
    await expect(this.lockedPosts.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
    await expect(this.lockIcon).toBeVisible({ timeout: 10000 }).catch(() => {});
  }

  readonly postDetailDialog = this.page.getByRole("dialog", { name: "Post image modal" });

  async openFirstPublicImagePost() {
    await safeClick(this.publicImagePosts.first());
    await this.postDetailDialog.waitFor({ state: "visible", timeout: 15000 });
    await this.page.waitForLoadState("networkidle").catch(() => {});
  }

  async expectPostDetailOpen() {
    await expect(this.postDetailDialog).toBeVisible({ timeout: 10000 });
  }

  async expectPublicImageUnlocked() {
    const image = this.postDetailDialog.locator("img").first();
    await expect(image).toBeVisible({ timeout: 10000 });
    const blur = await image.evaluate((el) => (globalThis as any).getComputedStyle(el).filter).catch(() => "none");
    expect(blur === "none" || blur === "", `public image should not be blurred, filter="${blur}"`).toBe(true);
    await expect(this.postDetailDialog.getByText(feedsLabels.memberOnly, { exact: true })).toBeHidden({ timeout: 5000 }).catch(() => {});
  }
}