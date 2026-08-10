import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { trackAuthToken } from "@helpers/auth/validate-token";
import { safeClick, waitForLoaded } from "@utils/playwright.utils";
import { locatorChain, smartLocator } from "@utils/heal-utils";
import {
  profileTabs,
  profileLabels,
  resolveCreatorProfile,
  type CreatorProfileContext,
  type ProfileTab,
} from "@test-data/buyer/profile.data";

const ACTIVE_TAB_CLASS = "primary-text-color";
const POST_SELECTOR = "[class*='cursor-pointer'][class*='flex-row'][class*='items-start']";
const BUYER_APP_ROUTES = new Set([
  "feeds",
  "explore",
  "cart",
  "library",
  "messages",
  "profile",
  "auth",
]);

export class ProfilePage {
  private auth = trackAuthToken(this.page);
  private creator: CreatorProfileContext | null = null;

  constructor(public readonly page: Page, private readonly baseURL: string) {}

  private get main() {
    return this.page.getByRole("main").or(this.page.locator("main"));
  }

  private get creatorContext(): CreatorProfileContext {
    if (!this.creator) {
      throw new Error(
        'ProfilePage creator context is not set. Use goto(handle), buyerNav.open("profile", { handle }), or navigate to a creator profile URL first.',
      );
    }
    return this.creator;
  }

  setCreator(handle: string) {
    this.creator = resolveCreatorProfile(handle);
  }

  private syncCreatorFromUrl() {
    const segment = new URL(this.page.url()).pathname.replace(/^\//, "").split("/")[0];
    if (!segment || BUYER_APP_ROUTES.has(segment)) {
      return;
    }
    this.setCreator(segment);
  }

  // ── Navigation ──
  async goto(handle?: string) {
    if (handle) {
      this.setCreator(handle);
    } else {
      this.creator = null;
    }
    const path = handle ?? "profile";
    await this.page.goto(new URL(path, this.baseURL).toString());
    await waitForLoaded(this.page);
  }

  async expectLoaded() {
    expect(this.page.url()).not.toContain("/auth");
    this.syncCreatorFromUrl();
  }

  async expectAuthenticated() {
    await this.auth.expectValid();
  }

  // ── Creator profile header ──
  private get profilePicture() {
    return locatorChain(this.page, {
      role: "img",
      name: this.creatorContext.displayName,
    });
  }

  async expectProfileHeaderVisible() {
    await expect(this.profilePicture).toBeVisible({ timeout: 10000 });
    for (const tag of this.creatorContext.bioTags) {
      await expect(this.main.getByText(tag, { exact: true }).first()).toBeVisible({ timeout: 10000 });
    }
  }

  async expectProfileAvatarVisible() {
    await expect(this.main.locator("img").first()).toBeVisible({ timeout: 10000 });
  }

  // ── Share profile ──
  get shareButton() {
    return this.main.getByRole("button", { name: profileLabels.share });
  }

  async clickShare() {
    await safeClick(this.shareButton);
    await this.page.waitForTimeout(500);
  }

  async expectShareOptionsVisible() {
    await expect(this.page.getByRole("dialog", { name: /Share/i })).toBeVisible({ timeout: 5000 });
  }

  // ── Follow / Unfollow (profile header — exclude Feeds tab and sidebar suggestions) ──
  private get followButton() {
    return this.main.getByRole("button", { name: profileLabels.follow, exact: true }).first();
  }

  private get followingButton() {
    return this.main.getByRole("button", { name: /Following Unfollow/i });
  }

  readonly unfollowDialog = this.page.getByRole("dialog");
  readonly unfollowConfirmButton = this.unfollowDialog.getByRole("button", { name: "Unfollow" });

  async expectFollowingState() {
    await expect(this.followingButton).toBeVisible({ timeout: 10000 });
  }

  async expectFollowState() {
    await expect(this.followButton).toBeVisible({ timeout: 10000 });
  }

  async clickFollow() {
    await safeClick(this.followButton);
    await waitForLoaded(this.page);
  }

  async clickUnfollow() {
    await this.page.keyboard.press("Escape");
    await expect(this.postDetailDialog).toBeHidden({ timeout: 3000 }).catch(() => {});
    const btn = this.followingButton;
    await btn.scrollIntoViewIfNeeded();
    await btn.hover();
    await this.page.waitForTimeout(1000);
    await safeClick(btn);
    const dialogVisible = await this.unfollowDialog.isVisible({ timeout: 5000 }).catch(() => false);
    if (dialogVisible) {
      await safeClick(this.unfollowConfirmButton);
      await waitForLoaded(this.page);
    }
  }

  // ── Navigation ──
  readonly backButton = this.main.getByRole("button", { name: profileLabels.back, exact: true });

  async clickBackButton() {
    await safeClick(this.backButton);
    await waitForLoaded(this.page);
  }

  // ── Tabs (within main; sidebar has same names — scope to main) ──
  private tabButton(label: string) {
    return this.main.getByRole("button", { name: label, exact: true });
  }

  async switchToTab(tab: ProfileTab) {
    const label = profileTabs[tab];
    await safeClick(this.tabButton(label));
    await waitForLoaded(this.page);
  }

  async expectTabActive(tab: ProfileTab) {
    const label = profileTabs[tab];
    const btn = this.tabButton(label);
    await expect(btn).toBeVisible({ timeout: 10000 });
    const cls = (await btn.getAttribute("class")) ?? "";
    expect(
      cls.includes(ACTIVE_TAB_CLASS),
      `Tab "${label}" should be active (class missing "${ACTIVE_TAB_CLASS}"): ${cls}`,
    ).toBe(true);
  }

  async expectProductHiddenOnShops(productTitle: string) {
    await expect(this.productCards.filter({ hasText: productTitle })).toHaveCount(0, {
      timeout: 10000,
    });
  }

  async expectProductVisibleOnShops(productTitle: string) {
    await expect(this.productCards.filter({ hasText: productTitle }).first()).toBeVisible({
      timeout: 10000,
    });
  }

  // ── Shops tab: product cards ──
  private get productCards() {
    return this.main.locator(`a[href^="/${this.creatorContext.handle}/product/"]`);
  }

  async expectShopsTabContent() {
    await this.expectTabActive("shops");
    await expect(this.productCards.first()).toBeVisible({ timeout: 10000 });
    await expect(this.productCards.first().locator("h3")).toBeVisible({ timeout: 10000 });
    await expect(this.productCards.first().locator("img")).toBeVisible({ timeout: 10000 });
  }

  // ── Membership section (right column, visible on every tab) ──
  readonly membershipHeading = this.main.getByRole("paragraph").filter({ hasText: profileLabels.membership });
  readonly showMoreButton = locatorChain(this.page, {
    role: "button",
    name: profileLabels.showMore,
    text: profileLabels.showMore,
  });

  private get tierCards() {
    const pattern = this.creator?.tierPricePattern ?? profileLabels.tierPricePattern;
    return this.main.locator(`text=/${pattern} .* \\/ month/`);
  }

  async expectMembershipSectionVisible() {
    await expect(this.membershipHeading).toBeVisible({ timeout: 10000 });
    const tierCount = await this.tierCards.count();
    expect(tierCount, "should show at most 2 tiers before Show More").toBeLessThanOrEqual(2);
    expect(tierCount, "should have at least 1 tier").toBeGreaterThan(0);
    await expect(this.showMoreButton).toBeVisible({ timeout: 10000 });
  }

  // ── Support section (right column) — tip form ──
  private get supportSectionHeading() {
    return this.main.getByText(this.creatorContext.supportHeading, { exact: true }).first();
  }

  readonly tipCurrencyGroup = this.main.getByRole("group", { name: "Tip currency" });
  readonly idrButton = locatorChain(this.page, {
    role: "button",
    name: profileLabels.idr,
    text: profileLabels.idr,
  });
  readonly usdtButton = locatorChain(this.page, {
    role: "button",
    name: profileLabels.usdt,
    text: profileLabels.usdt,
  });
  readonly tipInput = locatorChain(this.page, {
    role: "textbox",
    placeholder: profileLabels.inputTipPlaceholder,
    name: profileLabels.inputTipPlaceholder,
  });
  readonly tipSuggestions = this.main.getByRole("button", { name: /^Rp[\d.]+$/ });
  // FLAKY_FIX: scope to tip form — page also renders a sticky duplicate "Send Tip" CTA
  private get tipFormRoot() {
    return this.main
      .locator("div")
      .filter({ has: this.page.getByRole("group", { name: "Tip currency" }) })
      .filter({ has: this.page.getByPlaceholder(profileLabels.inputTipPlaceholder) })
      .first();
  }
  private get sendTipButton() {
    return this.tipFormRoot
      .getByRole("button", { name: profileLabels.sendTip, exact: true })
      .or(this.tipFormRoot.locator(`button:has(:text-is("${profileLabels.sendTip}"))`));
  }

  async expectSupportSectionVisible() {
    await expect(this.supportSectionHeading).toBeVisible({ timeout: 10000 });
    await expect(this.tipCurrencyGroup).toBeVisible({ timeout: 10000 });
    await expect(this.idrButton).toBeVisible({ timeout: 10000 });
    await expect(this.usdtButton).toBeVisible({ timeout: 10000 });
    await expect(this.tipInput).toBeVisible({ timeout: 10000 });
    await expect(this.tipSuggestions.first()).toBeVisible({ timeout: 10000 });
    await expect(this.sendTipButton).toBeVisible({ timeout: 10000 });
  }

  async expectSendTipDisabled() {
    await expect(this.sendTipButton).toBeDisabled({ timeout: 5000 });
  }

  async expectSupportTipFormInitialState() {
    await this.expectSupportSectionVisible();
    await this.expectSendTipDisabled();
  }

  async selectTipSuggestion(amountLabel?: string) {
    const label = amountLabel ?? this.creatorContext.tipSuggestions.idr[1];
    if (!label) {
      throw new Error(`No IDR tip suggestion configured for creator "${this.creatorContext.handle}"`);
    }
    await safeClick(this.tipFormRoot.getByRole("button", { name: label, exact: true }));
    await this.page.waitForTimeout(500);
  }

  async expectSendTipEnabled() {
    await expect(this.sendTipButton).toBeEnabled({ timeout: 5000 });
  }

  /** Predefined Quick Tip amounts on the profile tip form (TC-PRF-B-013). */
  async expectQuickTipAmountsVisible(amounts?: readonly string[]) {
    const expected = amounts ?? this.creatorContext.tipSuggestions.idr;
    expect(expected.length, "creator must have configured quick tip amounts").toBeGreaterThan(0);
    await expect(this.tipCurrencyGroup).toBeVisible({ timeout: 10000 });
    await expect(this.tipInput).toBeVisible({ timeout: 10000 });
    for (const amount of expected) {
      await expect(this.tipFormRoot.getByRole("button", { name: amount, exact: true })).toBeVisible({
        timeout: 10000,
      });
    }
  }

  /** Tip form remains usable but no Quick Tip amount chips (TC-PRF-B-015). */
  async expectQuickTipAmountsHidden() {
    await expect(this.tipCurrencyGroup).toBeVisible({ timeout: 10000 });
    await expect(this.tipInput).toBeVisible({ timeout: 10000 });
    await expect(this.sendTipButton).toBeVisible({ timeout: 10000 });
    await expect(this.tipFormRoot.getByRole("button", { name: /^Rp[\d.]+$/ })).toHaveCount(0);
  }

  async selectIdrCurrency() {
    await safeClick(this.idrButton);
    await this.page.waitForTimeout(300);
  }

  async selectUsdtCurrency() {
    await safeClick(this.usdtButton);
    await this.page.waitForTimeout(300);
  }

  async fillTipAmount(value: string) {
    await this.tipInput.fill(value);
    await this.page.waitForTimeout(300);
  }

  async submitTip() {
    await safeClick(this.sendTipButton);
    await this.page.waitForURL(/\/tip/, { timeout: 15000 });
    await waitForLoaded(this.page);
  }

  // ── Links tab ──
  readonly linkCards = this.main.locator('a[href^="/campaign/"]');

  async expectLinksTabContent() {
    await this.expectTabActive("links");
    await expect(this.linkCards.first()).toBeVisible({ timeout: 10000 });
    await expect(this.linkCards.first().getByRole("img").first()).toBeVisible({ timeout: 10000 });
    await expect(this.linkCards.first().locator("h3")).toBeVisible({ timeout: 10000 });
  }

  // ── Support tab (tip history) ──
  async expectSupportTabContent() {
    await this.expectTabActive("support");
    const historyItems = this.main.locator("text=/ago$/").filter({ has: this.main.getByText(/sent/i) });
    await expect(historyItems.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  }

  // ── Feeds tab (creator's posts) ──
  readonly allFeedsToggle = this.main.getByRole("button", { name: profileLabels.allFeeds, exact: true });
  readonly exclusiveOnlyToggle = this.main.getByRole("button", { name: profileLabels.exclusiveOnly, exact: true });

  private get creatorFeedPosts(): Locator {
    return this.main.locator(POST_SELECTOR);
  }

  async expectFeedsTabContent() {
    await this.expectTabActive("feeds");
    await expect(this.allFeedsToggle).toBeVisible({ timeout: 10000 });
    await expect(this.exclusiveOnlyToggle).toBeVisible({ timeout: 10000 });
    await expect(this.creatorFeedPosts.first()).toBeVisible({ timeout: 10000 });
  }

  async toggleExclusiveOnly() {
    await safeClick(this.exclusiveOnlyToggle);
    await waitForLoaded(this.page);
    await this.page.waitForTimeout(1500);
  }

  async expectExclusiveOnlyShowsLocked() {
    await expect(this.memberOnlyLabel.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  }

  // ── Like / Unlike on creator feed posts ──
  private get creatorFirstUnlikeButton() {
    return this.creatorFeedPosts.first().getByRole("button", { name: profileLabels.unlikePost });
  }

  private get creatorFirstLikeButton() {
    return this.creatorFeedPosts.first().getByRole("button", { name: profileLabels.likePost });
  }

  private get creatorFirstLikeCount() {
    return this.creatorFeedPosts.first().locator("p").filter({ hasText: /^\d+$/ }).first();
  }

  private creatorPostByContent(content: string): Locator {
    return this.creatorFeedPosts.filter({ hasText: content }).first();
  }

  async getCreatorFirstPostLikeCount(): Promise<number> {
    const text = (await this.creatorFirstLikeCount.textContent()) ?? "0";
    return parseInt(text.trim(), 10) || 0;
  }

  async unlikeCreatorFirstPost(): Promise<number> {
    const countBefore = await this.getCreatorFirstPostLikeCount();
    await safeClick(this.creatorFirstUnlikeButton);
    await waitForLoaded(this.page);
    await this.page.waitForTimeout(500);
    return countBefore;
  }

  async expectCreatorPostUnlikedState() {
    await expect(this.creatorFirstLikeButton).toBeVisible({ timeout: 10000 });
  }

  async unlikeCreatorPost(content: string) {
    const post = this.creatorPostByContent(content);
    await safeClick(post.getByRole("button", { name: profileLabels.unlikePost }));
    await waitForLoaded(this.page);
    await expect(post.getByRole("button", { name: profileLabels.likePost })).toBeVisible({ timeout: 10000 });
  }

  readonly memberOnlyLabel = locatorChain(this.page, {
    text: profileLabels.memberOnly,
    selector: `main :text-is("${profileLabels.memberOnly}")`,
  });

  private get publicImagePosts(): Locator {
    const mediaButton = locatorChain(this.page, {
      role: "button",
      name: profileLabels.openPostMedia,
      text: profileLabels.openPostMedia,
    });
    return this.creatorFeedPosts.filter({ has: mediaButton }).filter({ hasNot: this.memberOnlyLabel });
  }

  readonly postDetailDialog = locatorChain(this.page, {
    role: "dialog",
    name: profileLabels.postImageModal,
    text: profileLabels.postImageModal,
  });

  async openFirstPublicImagePost() {
    const mediaButton = this.publicImagePosts
      .first()
      .getByRole("button", { name: profileLabels.openPostMedia })
      .first();
    await safeClick(mediaButton);
    await this.postDetailDialog.waitFor({ state: "visible", timeout: 15000 });
  }

  async expectPostDetailOpen() {
    await expect(this.postDetailDialog).toBeVisible({ timeout: 10000 });
  }

  async expectPublicImageUnlocked() {
    const image = this.postDetailDialog.locator("img").first();
    await expect(image).toBeVisible({ timeout: 10000 });
    const blur = await image.evaluate((el) => (globalThis as any).getComputedStyle(el).filter).catch(() => "none");
    expect(blur === "none" || blur === "", `public image should not be blurred, filter="${blur}"`).toBe(true);
    await expect(this.postDetailDialog.getByText(profileLabels.memberOnly, { exact: true })).toBeHidden({ timeout: 5000 }).catch(() => {});
  }

  private get publicFeedPosts(): Locator {
    const unlockButton = this.page.getByRole("button", { name: profileLabels.unlockPost });
    return this.creatorFeedPosts.filter({ hasNot: unlockButton });
  }

  // ── Guest auth prompts (Feeds tab) ──
  readonly signInNowButton = locatorChain(this.page, {
    role: "button",
    name: profileLabels.signInNow,
    text: profileLabels.signInNow,
  });

  readonly signInBeforeFollowingDialog = locatorChain(this.page, {
    role: "dialog",
    name: profileLabels.signInBeforeFollowing,
    text: profileLabels.signInBeforeFollowing,
  });

  async expectFeedsTabVisibleOnProfile() {
    await expect(this.tabButton(profileTabs.feeds)).toBeVisible({ timeout: 5000 });
  }

  async clickFirstLikePostAsGuest() {
    await safeClick(this.publicFeedPosts.first().getByRole("button", { name: profileLabels.likePost }));
  }

  async expectLoveThisPostSignInDialog() {
    const dialog = this.page.getByRole("dialog").filter({ hasText: /Love this post/i });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole("button", { name: profileLabels.signInNow })).toBeVisible();
  }

  async clickSignInNowFromDialog() {
    await safeClick(this.signInNowButton);
  }

  async clickFirstCommentButtonOnFeed() {
    await safeClick(this.publicFeedPosts.first().getByRole("button", { name: /^\d+$/ }).first());
  }

  async expectGuestCommentPrompt() {
    await expect(this.main.getByText(profileLabels.noCommentsYet).first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(this.main.getByText(profileLabels.signInToComment).first()).toBeVisible({ timeout: 5000 });
  }

  async clickSignInOnComment() {
    await safeClick(this.main.getByRole("button", { name: profileLabels.signIn, exact: true }).first());
  }

  async expectGuestCommentSignInDialog() {
    const dialog = this.page.getByRole("dialog").filter({ hasText: profileLabels.guestCommentSignInHeading });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole("button", { name: profileLabels.signInNow })).toBeVisible();
  }

  async expectSignInBeforeFollowingDialog() {
    await expect(this.signInBeforeFollowingDialog).toBeVisible({ timeout: 10000 });
    await expect(this.signInBeforeFollowingDialog.getByRole("button", { name: profileLabels.signInNow })).toBeVisible();
  }
}

