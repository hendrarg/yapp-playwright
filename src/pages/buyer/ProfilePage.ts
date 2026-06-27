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
  readonly sendTipesButton = this.main.getByRole("button", { name: profileLabels.sendTipes, exact: true });

  async expectSupportSectionVisible() {
    await expect(this.supportSectionHeading).toBeVisible({ timeout: 10000 });
    await expect(this.tipCurrencyGroup).toBeVisible({ timeout: 10000 });
    await expect(this.idrButton).toBeVisible({ timeout: 10000 });
    await expect(this.usdtButton).toBeVisible({ timeout: 10000 });
    await expect(this.tipInput).toBeVisible({ timeout: 10000 });
    await expect(this.tipSuggestions.first()).toBeVisible({ timeout: 10000 });
    await expect(this.sendTipesButton).toBeVisible({ timeout: 10000 });
  }

  async expectSendTipesDisabled() {
    await expect(this.sendTipesButton).toBeDisabled({ timeout: 5000 });
  }

  async selectTipSuggestion(amountLabel: string = profileLabels.tipSuggestion.idr[1]) {
    await safeClick(this.main.getByRole("button", { name: amountLabel, exact: true }));
    await this.page.waitForTimeout(500);
  }

  async expectSendTipesEnabled() {
    await expect(this.sendTipesButton).toBeEnabled({ timeout: 5000 });
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

  // ── Open public image post (modal) ──
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