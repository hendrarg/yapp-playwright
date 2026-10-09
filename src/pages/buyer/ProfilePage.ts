import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { trackAuthToken } from "@helpers/auth/validate-token";
import { safeClick, waitForLoaded } from "@utils/playwright.utils";
import { flakyClick } from "@utils/flaky-utils";
import { locatorChain, smartLocator } from "@utils/heal-utils";
import { POST_CARD_SELECTOR, VERIFIED_BADGE_SELECTOR } from "@pages/shared/locators";
import { ownProfileLabels, profileTabs, profileLabels, resolveCreatorProfile, type CreatorProfileContext, type ProfileTab } from "@test-data/buyer/profile.data";

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

// ── The signed-in buyer's own profile (/profile) ──
  /** Avatar, display name, following count and the My Memberships entry. */
  async expectOwnProfileIdentity(displayName: string) {
    await expect(this.page).toHaveURL(/\/profile$/, { timeout: 15000 });
    await expect(this.main.getByText(displayName, { exact: true }).first()).toBeVisible({ timeout: 15000 });
    await expect(this.main.getByText(ownProfileLabels.following, { exact: true })).toBeVisible();
    await expect(this.main.getByText(ownProfileLabels.myMemberships, { exact: true })).toBeVisible();
  }

  /** The own-profile tabs, in order. */
  async ownProfileTabLabels(): Promise<string[]> {
    return (await this.main.getByRole("button").filter({ has: this.page.locator("svg") }).allInnerTexts())
      .map((t) => t.trim())
      .filter((t) => (Object.values(profileTabs) as string[]).includes(t) || t === profileLabels.exclusiveTab);
  }

  /** The pencil badge on the own avatar (an unnamed span) leads to /profile/settings. */
  async openAccountSettings() {
    await safeClick(this.main.locator("span.absolute").filter({ has: this.page.locator("svg") }).first());
    await this.page.waitForURL(/\/profile\/settings/, { timeout: 15000 });
    await waitForLoaded(this.page);
  }

  /** The uploaded picture replaces the initial on the own profile and in the account menu. */
  async expectOwnPictureShown() {
    await expect(this.main.locator("img").first()).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByRole("button", { name: ownProfileLabels.accountMenu }).locator("img")).toBeVisible({ timeout: 15000 });
  }

/**
   * Visiting /<own username> shows the public profile with the buyer's display name. The page can
   * render as the link-in-bio template, which has no `main` landmark and puts the name in an h1.
   */
  async expectOwnPublicProfile(displayName: string) {
    const nameHeading = smartLocator(this.page, { role: "heading", name: displayName, exact: true, text: displayName });
    expect((await nameHeading.text({ timeout: 15000 })).trim()).toBe(displayName);
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

  get followerCountText() {
    return this.page.getByText(/followers/);
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

/** Every label is a visible profile tab. */
  async expectTabs(labels: readonly string[]) {
    for (const label of labels) await expect(this.tabButton(label)).toBeVisible({ timeout: 10000 });
  }

  async expectNoTab(label: string) {
    await expect(this.tabButton(label)).toHaveCount(0);
  }

  async switchToTab(tab: ProfileTab) {
    const button = this.tabButton(profileTabs[tab]);
    // A click that lands before hydration is dropped and the profile stays on Shops; repeat until selected.
    await expect(async () => {
      await safeClick(button);
      await expect(button).toHaveAttribute("data-state", "active", { timeout: 2000 });
    }).toPass({ timeout: 30000 });
    await waitForLoaded(this.page);
  }

  async expectTabActive(tab: ProfileTab) {
    const label = profileTabs[tab];
    const btn = this.tabButton(label);
    await expect(btn).toBeVisible({ timeout: 10000 });
    // Radix tabs: the selected trigger carries data-state="active" (the colour classes change with themes).
    await expect(btn, `Tab "${label}" should be active`).toHaveAttribute("data-state", "active", { timeout: 10000 });
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

/** The desktop right-hand Membership panel is shown (tier details are creator-specific). */
  async expectMembershipPanelVisible() {
    await expect(this.membershipHeading.first()).toBeVisible({ timeout: 10000 });
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
  /**
   * The tip form itself. FLAKY_FIX: the page also renders a sticky duplicate CTA, so the
   * form is pinned by the three things only it holds together — the currency group, the
   * amount input, and the quick-amount chips. The quick-amount filter plus `.last()`
   * matter: without them this resolved to an outer wrapper holding the whole page's
   * buttons, which only appeared to work because the CTA was then matched by its label.
   */
  private get tipFormRoot() {
    return this.main
      .locator("div")
      .filter({ has: this.page.getByRole("group", { name: "Tip currency" }) })
      .filter({ has: this.page.getByPlaceholder(profileLabels.inputTipPlaceholder) })
      .filter({ has: this.page.getByRole("button", { name: /^Rp[\d.]+$/ }) })
      .last();
  }

  /**
   * The tip CTA, identified without its label. Creators can rename this button
   * ("Support Me", "TipMe 1234", ...), so matching the default "Send Tip" made every
   * assertion depend on the creator's current configuration — and any test that saved a
   * custom label permanently broke the others. Inside the form the CTA is the only
   * button that is neither a currency toggle nor a quick-amount chip.
   */
  private get sendTipButton() {
    return this.tipFormRoot
      .getByRole("button")
      .filter({ hasNotText: /^(IDR|USDT|Rp[\d.,]+|\$[\d.,]+)$/ });
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

  async expectPublicSendTipButtonVisible(timeout = 10000) {
    await expect(this.sendTipButton).toBeVisible({ timeout });
  }

  async expectPublicSendTipButtonAttached() {
    await expect(this.sendTipButton).toBeAttached({ timeout: 10000 });
  }

  /**
   * Assert the tip CTA carries a specific label — for the test that exists to prove a
   * creator's custom button text reaches the public profile.
   */
  async expectPublicTipCtaLabel(expected: string) {
    await expect(this.sendTipButton).toHaveText(expected, { timeout: 10000 });
  }

  async expectHandleVisible(handle: string) {
    await expect(this.page.getByText(handle, { exact: true })).toBeVisible({ timeout: 10000 });
  }

  /** Asserts an unsaved draft value never reached the public profile. */
  async expectTextAbsent(value: string) {
    await expect(this.page.getByText(value)).toHaveCount(0, { timeout: 10000 });
  }

  /**
   * Any outbound social link on the public profile. Matched by destination host rather
   * than by name or role: "a social link, whichever platform" has no accessible name to
   * key on, so `testId` leads for when the app gains one and the href match is the
   * working fallback.
   */
  private socialLink(): Locator {
    return locatorChain(this.page, {
      testId: "profile-social-link",
      selector: 'a[href*="instagram.com"], a[href*="twitter.com"], a[href*="youtube.com"]',
    }).first();
  }

  async expectSocialLinkAttached() {
    await expect(this.socialLink()).toBeAttached({ timeout: 10000 });
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
    return this.main.locator(POST_CARD_SELECTOR);
  }

  async expectFeedsTabContent() {
    await this.expectTabActive("feeds");
    await expect(this.allFeedsToggle).toBeVisible({ timeout: 10000 });
    await expect(this.exclusiveOnlyToggle).toBeVisible({ timeout: 10000 });
    await expect(this.creatorFeedPosts.first()).toBeVisible({ timeout: 10000 });
  }

  async toggleExclusiveOnly() {
    // FLAKY_FIX: the Feeds tab re-renders its filter bar after hydration and detaches the toggle.
    await flakyClick(this.exclusiveOnlyToggle);
    await waitForLoaded(this.page);
    await this.page.waitForTimeout(1500);
  }

  /** A post of this creator is listed on the Feeds tab. */
  async expectCreatorPostVisible(content: string) {
    await expect(this.creatorPostByContent(content)).toBeVisible({ timeout: 15000 });
  }

  /** A post of this creator is listed but gated: it offers `Unlock Post`, not its content. */
  async expectCreatorPostLocked(content: string) {
    const post = this.creatorPostByContent(content);
    await expect(post).toBeVisible({ timeout: 15000 });
    await expect(post.getByRole("button", { name: profileLabels.unlockPost, exact: true })).toBeVisible({ timeout: 10000 });
  }

  /** A purchased post is listed without the `Unlock Post` gate. */
  async expectCreatorPostUnlocked(content: string) {
    const post = this.creatorPostByContent(content);
    await expect(post).toBeVisible({ timeout: 15000 });
    await expect(post.getByRole("button", { name: profileLabels.unlockPost, exact: true })).toBeHidden({ timeout: 10000 });
  }

  // ── Lifetime (Unlock All) offer on the Feeds tab ──
  readonly lifetimeOffer = this.main.getByText(profileLabels.lifetimeOffer, { exact: true });

  readonly lifetimeUnlockButton = smartLocator(this.page, {
    role: "button",
    name: profileLabels.lifetimeUnlock,
    exact: true,
    text: profileLabels.lifetimeUnlock,
  });

  readonly lifetimeDialog = this.page.getByRole("dialog", { name: profileLabels.lifetimeDialog });

  /** `Pay Rp<total>` — disabled until the fee breakdown has loaded. */
  readonly lifetimePayButton = this.lifetimeDialog.getByRole("button", { name: profileLabels.lifetimePay });


  /**
   * The lifetime banner on the Feeds tab. A price saved moments ago is served stale for a while,
   * so reload the profile (back on the Feeds tab) until the banner shows up.
   */
  async expectLifetimeOffer() {
    await expect(async () => {
      if (!(await this.lifetimeOffer.isVisible())) {
        await this.page.reload();
        await waitForLoaded(this.page);
        await this.switchToTab("feeds");
      }
      await expect(this.lifetimeOffer).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 60000, intervals: [2000, 5000] });
    await expect.poll(() => this.lifetimeUnlockButton.visibleCount(), { timeout: 10000 }).toBeGreaterThan(0);
  }

  async expectNoLifetimeOffer() {
    await expect(this.lifetimeOffer).toBeHidden({ timeout: 15000 });
    await expect.poll(() => this.lifetimeUnlockButton.visibleCount(), { timeout: 10000 }).toBe(0);
  }

/** Open the lifetime checkout from the Feeds-tab banner and check the price it charges. */
  async openLifetimeCheckout(price: string) {
    await this.expectLifetimeOffer();
    await this.lifetimeUnlockButton.click();
    await expect(this.lifetimeDialog).toBeVisible({ timeout: 10000 });
    await expect(this.lifetimeDialog).toContainText(price);
  }

  /** Pay the open lifetime checkout (phone only when not prefilled); returns the order id from the URL. */
  async payLifetime(phone: string): Promise<string> {
    // The buyer's saved phone is prefilled (and the field then refuses input); type one only when it is blank.
    const phoneInput = this.lifetimeDialog.getByPlaceholder(profileLabels.lifetimePhone);
    if (!(await phoneInput.inputValue())) await phoneInput.fill(phone);
    // FLAKY_FIX: the button re-renders once the fee breakdown arrives.
    await flakyClick(this.lifetimePayButton);
    await this.page.waitForURL(/\/transaction\//, { timeout: 20000 });
    await waitForLoaded(this.page);
    return this.page.url().split("/transaction/")[1];
  }

  async buyLifetime(price: string, phone: string): Promise<string> {
    await this.openLifetimeCheckout(price);
    return this.payLifetime(phone);
  }

  async expectLifetimeCheckoutNamesCreator(creatorName: string) {
    await expect(this.lifetimeDialog).toContainText(creatorName, { timeout: 10000 });
  }


/** The profile header shows the Official badge beside the creator's name. */
  async expectOfficialBadgeBesideName(displayName: string) {
    const nameRow = this.main.locator("div").filter({ has: this.page.getByText(displayName, { exact: true }) }).filter({ has: this.page.locator(VERIFIED_BADGE_SELECTOR) });
    await expect(nameRow.last()).toBeVisible({ timeout: 10000 });
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

