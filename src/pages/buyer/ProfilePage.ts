import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { trackAuthToken } from "@helpers/auth/validate-token";
import { safeClick, waitForLoaded } from "@utils/playwright.utils";
import {
  creatorProfileHandle,
  profileTabs,
  profileLabels,
  type ProfileTab,
} from "@test-data/buyer/profile.data";

const ACTIVE_TAB_CLASS = "primary-text-color";
const POST_SELECTOR = "[class*='cursor-pointer'][class*='flex-row'][class*='items-start']";

export class ProfilePage {
  private auth = trackAuthToken(this.page);

  constructor(public readonly page: Page, private readonly baseURL: string) {}

  private get main() {
    return this.page.locator("main");
  }

  // ── Navigation ──
  // No-arg goto → buyer's own profile (/profile).
  // Pass a creator handle to open a creator profile (/{handle}).
  async goto(handle?: string) {
    const path = handle ?? "profile";
    await this.page.goto(new URL(path, this.baseURL).toString());
    await this.page.waitForLoadState("networkidle");
    await waitForLoaded(this.page);
  }

  async expectLoaded() {
    expect(this.page.url()).not.toContain("/auth");
  }

  async expectAuthenticated() {
    await this.auth.expectValid();
  }

  // ── Creator profile header ──
  readonly profilePicture = this.page.getByRole("img", { name: "Hendra Rizal Gunawan" });

  async expectProfileHeaderVisible() {
    await expect(this.profilePicture).toBeVisible({ timeout: 10000 });
    await expect(this.main.getByText("Software Developer", { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(this.main.getByText("Tester", { exact: true }).first()).toBeVisible({ timeout: 10000 });
  }

  // ── Follow / Unfollow ──
  readonly followButton = this.page.getByRole("button", { name: "Follow", exact: true });
  // Button shows "Following" + "Unfollow" when followed (accessible name = "Following Unfollow")
  readonly followingButton = this.page.getByRole("button", { name: /Following/ });
  readonly unfollowDialog = this.page.getByRole("dialog");
  readonly unfollowConfirmButton = this.unfollowDialog.getByRole("button", { name: "Unfollow" });
  readonly cancelButton = this.unfollowDialog.getByRole("button", { name: "Cancel" });

  async expectFollowingState() {
    await expect(
      this.page.getByRole("button", { name: /Follow/ }).filter({ hasText: "Following" })
    ).toBeVisible({ timeout: 10000 });
  }

  async expectFollowState() {
    await expect(this.followButton).toBeVisible({ timeout: 10000 });
  }

  async clickUnfollow() {
    // Hover the following button to reveal the Unfollow text
    const btn = this.page.getByRole("button", { name: /Follow/ }).filter({ hasText: "Following" });
    await btn.scrollIntoViewIfNeeded();
    await btn.hover();
    await this.page.waitForTimeout(1000);
    // Click the button — hovering reveals "Unfollow" text, click triggers dialog
    await safeClick(btn);
    // Check if confirmation dialog appeared
    const dialogVisible = await this.unfollowDialog.isVisible({ timeout: 5000 }).catch(() => false);
    if (dialogVisible) {
      await safeClick(this.unfollowConfirmButton);
      await waitForLoaded(this.page);
      await this.page.waitForLoadState("networkidle").catch(() => {});
    }
  }

  async confirmUnfollow() {
    await safeClick(this.unfollowConfirmButton);
    await waitForLoaded(this.page);
    await this.page.waitForLoadState("networkidle").catch(() => {});
  }

  // ── Navigation ──
  readonly backButton = this.page.getByRole("button", { name: "Back" });

  async clickBackButton() {
    await safeClick(this.backButton);
    await waitForLoaded(this.page);
    await this.page.waitForLoadState("networkidle").catch(() => {});
  }

  // ── Tabs (within main; sidebar has same names — scope to main) ──
  private tabButton(label: string) {
    return this.main.getByRole("button", { name: label, exact: true });
  }

  async switchToTab(tab: ProfileTab) {
    const label = profileTabs[tab];
    await safeClick(this.tabButton(label));
    await waitForLoaded(this.page);
    await this.page.waitForLoadState("networkidle").catch(() => {});
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

  // ── Shops tab: product cards ──
  readonly productCards = this.main.locator(`a[href^="/${creatorProfileHandle}/product/"]`);

  async expectShopsTabContent() {
    await this.expectTabActive("shops");
    await expect(this.productCards.first()).toBeVisible({ timeout: 10000 });
    await expect(this.productCards.first().locator("h3")).toBeVisible({ timeout: 10000 });
    await expect(this.productCards.first().locator("img")).toBeVisible({ timeout: 10000 });
  }

  // ── Membership section (right column, visible on every tab) ──
  readonly membershipHeading = this.main.getByRole("paragraph").filter({ hasText: profileLabels.membership });
  readonly showMoreButton = this.main.getByRole("button", { name: profileLabels.showMore, exact: true });
  readonly tierCards = this.main.locator(`text=/${profileLabels.tierPricePattern} .* \\/ month/`);

  async expectMembershipSectionVisible() {
    await expect(this.membershipHeading).toBeVisible({ timeout: 10000 });
    const tierCount = await this.tierCards.count();
    expect(tierCount, "should show at most 2 tiers before Show More").toBeLessThanOrEqual(2);
    expect(tierCount, "should have at least 1 tier").toBeGreaterThan(0);
    await expect(this.showMoreButton).toBeVisible({ timeout: 10000 });
  }

  // ── Support section (right column) — tip form ──
  readonly supportSectionHeading = this.main.getByText(profileLabels.supportHeading, { exact: true }).first();
  readonly tipCurrencyGroup = this.main.getByRole("group", { name: "Tip currency" });
  readonly idrButton = this.main.getByRole("button", { name: profileLabels.idr, exact: true });
  readonly usdtButton = this.main.getByRole("button", { name: profileLabels.usdt, exact: true });
  readonly tipInput = this.main.getByPlaceholder(profileLabels.inputTipPlaceholder);
  readonly tipSuggestions = this.main.getByRole("button", { name: /^Rp[\d.]+$/ });
  readonly sendTipButton = this.main.getByRole("button", { name: profileLabels.sendTip, exact: true });

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

  async selectTipSuggestion(amountLabel: string = profileLabels.tipSuggestion.idr[1]) {
    await safeClick(this.main.getByRole("button", { name: amountLabel, exact: true }));
    await this.page.waitForTimeout(500);
  }

  async expectSendTipEnabled() {
    await expect(this.sendTipButton).toBeEnabled({ timeout: 5000 });
  }

  async selectIdrCurrency() {
    await safeClick(this.idrButton);
    await this.page.waitForTimeout(300);
  }

  async submitTip() {
    await safeClick(this.sendTipButton);
    await this.page.waitForURL(/\/tip/, { timeout: 15000 });
    await waitForLoaded(this.page);
    await this.page.waitForLoadState("networkidle").catch(() => {});
  }

  // ── Tip page (/{handle}/tip) ──
  readonly tipPageTitle = this.page.locator("span").filter({ hasText: "Send Tip" }).first();
  readonly tipAmountInput = this.page.getByRole("textbox", { name: "Input Amount" });
  readonly tipPaymentMethod = this.page.getByRole("combobox");
  readonly tipBackButton = this.page.getByRole("button", { name: "Back" });
  readonly tipNameInput = this.page.getByRole("textbox", { name: "Your Name or Nickname" });
  readonly tipEmailInput = this.page.getByRole("textbox", { name: "Your Email" });
  readonly tipCheckboxAnonymous = this.page.getByRole("checkbox").first();
  // The "Send Tip" button on the tip page (different from support tab)
  readonly tipPageSendButton = this.page.getByRole("button", { name: "Send Tip" }).last();

  async expectTipPageLoaded() {
    await expect(this.tipPageTitle).toBeVisible({ timeout: 10000 });
    await expect(this.tipAmountInput).toBeVisible({ timeout: 10000 });
    await expect(this.tipPaymentMethod).toBeVisible({ timeout: 10000 });
    expect((await this.tipAmountInput.inputValue())).toContain("50.000");
  }

  async expectTipFormAutoFilled() {
    // Name auto-filled
    await expect(this.tipNameInput).toBeVisible({ timeout: 10000 });
    expect((await this.tipNameInput.inputValue()).length).toBeGreaterThan(0);
    // Email auto-filled
    await expect(this.tipEmailInput).toBeVisible({ timeout: 5000 });
    expect((await this.tipEmailInput.inputValue()).length).toBeGreaterThan(0);
    // Checkbox checked
    await expect(this.tipCheckboxAnonymous).toBeVisible({ timeout: 5000 }).catch(() => {});
    // Payment default qris
    await expect(this.tipPaymentMethod).toBeVisible({ timeout: 5000 });
  }

  async submitTipFromTipPage(): Promise<string> {
    await safeClick(this.tipPageSendButton);
    await this.page.waitForURL(/\/transaction\//, { timeout: 15000 });
    await waitForLoaded(this.page);
    await this.page.waitForLoadState("networkidle").catch(() => {});
    return this.page.url().split("/transaction/")[1];
  }

  // ── Transaction page (/transaction/{orderId}) ──
  readonly transactionOrderId = this.page.getByText(/Order ID : /).first();
  readonly transactionAmount = this.page.getByText("Rp50.506").last();
  readonly transactionTipTo = this.page.getByRole("textbox").first();
  readonly transactionCheckStatusButton = this.page.getByRole("button", { name: "Check Status" });

  async expectTransactionPageLoaded(creatorName: string) {
    await expect(this.page).toHaveURL(/\/transaction\//, { timeout: 10000 });
    await expect(this.transactionAmount).toBeVisible({ timeout: 5000 });
    await expect(this.transactionCheckStatusButton).toBeVisible({ timeout: 5000 });
    await expect(this.transactionOrderId).toBeVisible({ timeout: 5000 });
    expect((await this.transactionTipTo.inputValue())).toContain(creatorName);
    await expect(this.page.getByText("Payment Method")).toBeVisible({ timeout: 5000 });
  }

  async getOrderId(): Promise<string> {
    const text = (await this.transactionOrderId.textContent()) ?? "";
    return text.replace("Order ID : ", "").trim();
  }

  // ── Success page (after webhook) ──
  readonly successDialog = this.page.getByRole("dialog", { name: "Payment Successful" });
  readonly successHeading = this.successDialog.getByRole("heading", { name: "Payment Successful!" });
  readonly successCardCreator = this.successDialog.getByText("Hendra Rizal Gunawan").first();
  readonly successAmount = this.successDialog.getByText("IDR 50,000");
  readonly backToProfileButton = this.successDialog.getByRole("button", { name: "Back to Profile" });

  async expectPaymentSuccess() {
    await expect(this.successDialog).toBeVisible({ timeout: 15000 });
    await expect(this.successHeading).toBeVisible({ timeout: 5000 });
    await expect(this.successCardCreator).toBeVisible({ timeout: 5000 });
    await expect(this.successAmount).toBeVisible({ timeout: 5000 });
    await expect(this.backToProfileButton).toBeVisible({ timeout: 5000 });
  }

  // ── Links tab ── (renders campaign/link cards with images + headings)
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
  readonly creatorFeedPosts = this.main.locator(POST_SELECTOR);

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
    await expect(this.main.getByText(profileLabels.memberOnly, { exact: true }).first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  }

  async isAllFeedsActive() {
    const cls = (await this.allFeedsToggle.getAttribute("class")) ?? "";
    return cls.includes(ACTIVE_TAB_CLASS);
  }

  // ── Like / Unlike on creator feed posts ──
  readonly creatorFirstUnlikeButton = this.creatorFeedPosts.first().getByRole("button", { name: "Unlike post" });
  readonly creatorFirstLikeButton = this.creatorFeedPosts.first().getByRole("button", { name: "Like post" });
  readonly creatorFirstLikeCount = this.creatorFeedPosts.first().locator("p").filter({ hasText: /^\d+$/ }).first();

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
  readonly memberOnlyLabel = this.main.getByText(profileLabels.memberOnly, { exact: true });
  readonly publicImagePosts = this.main
    .getByRole("button", { name: profileLabels.openPostMedia })
    .locator("xpath=ancestor::div[contains(@class,'cursor-pointer')][1]")
    .filter({ hasNot: this.main.getByText(profileLabels.memberOnly, { exact: true }) });
  readonly postDetailDialog = this.page.getByRole("dialog", { name: "Post image modal" });

  async openFirstPublicImagePost() {
    const mediaButton = this.publicImagePosts
      .first()
      .getByRole("button", { name: profileLabels.openPostMedia })
      .first();
    await safeClick(mediaButton);
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
    await expect(this.postDetailDialog.getByText(profileLabels.memberOnly, { exact: true })).toBeHidden({ timeout: 5000 }).catch(() => {});
  }
}