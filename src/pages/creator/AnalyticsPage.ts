import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain } from "@utils/heal-utils";

/** One Revenue Overview card as rendered: the amount and the growth figure. */
export interface MetricCard {
  value: string;
  growth: string;
}

export interface RevenueSummary {
  totalRevenue: number;
  totalRevenueTipping: number;
  totalRevenueProduct: number;
  totalRevenueCampaign: number;
  totalRevenuePostPurchase: number;
  totalRevenueTierMembershipPurchase: number;
  totalRevenuePostLifetimePurchase: number;
  totalRevenueChange: number;
  tippingChange: number;
  productChange: number;
  campaignChange: number;
  postPurchaseChange: number;
  tierMembershipPurchaseChange: number;
  postLifetimePurchaseChange: number;
}

/**
 * `/analytics` — Revenue Overview (seven metric cards with growth, a range picker, source switches
 * over a bar chart) followed by Audience & Reach (profile/product views, activity, buyer journey,
 * the Products table). The overview reads `GET /creator/analytics/summary?start_date&end_date`.
 */
export class AnalyticsPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto() {
    await this.page.goto(new URL("analytics", this.baseURL).toString());
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/analytics/);
    expect(this.page.url()).not.toContain("/auth");
  }

  private get main(): Locator {
    return this.page.getByRole("main").last();
  }

  /**
   * Every summary response, read as it arrives. The page can fire the same request twice and drop
   * the first, whose body is then gone — reading eagerly and keeping the latest parse avoids that.
   */
  private readonly summaries: Array<{ summary: RevenueSummary; startDate: string; endDate: string }> = [];
  private listening = false;

  private listen() {
    if (this.listening) return;
    this.listening = true;
    this.page.on("response", (response) => {
      if (!response.url().includes("/creator/analytics/summary?") || !response.ok()) return;
      const url = new URL(response.url());
      response
        .json()
        .then((body) => this.summaries.push({ summary: body.data as RevenueSummary, startDate: url.searchParams.get("start_date") ?? "", endDate: url.searchParams.get("end_date") ?? "" }))
        .catch(() => undefined);
    });
  }

  /**
   * Run `action`, then return the newest summary that arrived for the expected window (if given).
   * A window the page already fetched is served from its query cache with no new request; with
   * `window` known, the summary stored earlier for it is the one on screen.
   */
  private async summaryAfter(action: () => Promise<unknown>, window?: { start?: string; end?: string }) {
    this.listen();
    const seen = this.summaries.length;
    const fits = (s: { startDate: string; endDate: string }) => (!window?.start || s.startDate === window.start) && (!window?.end || s.endDate === window.end);
    await action();
    const fresh = () => this.summaries.slice(seen).filter(fits);
    const known = window?.start && window?.end ? this.summaries.slice(0, seen).filter(fits) : [];
    await expect.poll(() => fresh().length > 0, { timeout: known.length ? 5000 : 30000 }).toBe(true).catch((error) => {
      if (!known.length) throw error;
    });
    const pool = fresh().length ? fresh() : known;
    return pool[pool.length - 1];
  }

  /** Load the page and return the summary that fills the overview. */
  async open(): Promise<{ summary: RevenueSummary; startDate: string; endDate: string }> {
    return this.summaryAfter(async () => {
      await this.goto();
      await this.expectLoaded();
    });
  }

  async expectOverviewHeader() {
    await expect(this.main.getByText("Revenue Overview", { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(this.main.getByText(/^Last synced: \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)).toBeVisible();
  }

  /**
   * Every metric card in order, keyed by label. A card reads label → `Rp…` amount → `n.n%` growth;
   * the source switches further down repeat the labels without the amounts, so only the first run
   * of label/amount/growth triples counts.
   */
  async readMetrics(labels: readonly string[]): Promise<Record<string, MetricCard>> {
    await expect(this.main.getByText(labels[0], { exact: true }).first()).toBeVisible({ timeout: 20000 });
    const texts = (await this.main.getByRole("paragraph").allInnerTexts()).map((t) => t.trim());
    const cards: Record<string, MetricCard> = {};
    for (let i = 0; i < texts.length - 2; i++) {
      const [label, value, growth] = texts.slice(i, i + 3);
      if (labels.includes(label) && !cards[label] && /^Rp[\d.]+$/.test(value) && /^-?[\d.]+%$/.test(growth)) cards[label] = { value, growth };
    }
    return cards;
  }

  // ── Range picker ──

  /** The overview's range button (the Audience section has its own further down). */
  private get rangeButton(): Locator {
    return this.main.getByRole("button", { name: /^(All time|Last \d+ (days|months|year)|\d{1,2} \w{3} \d{4} - \d{1,2} \w{3} \d{4})$/ }).first();
  }

  private get rangeDialog(): Locator {
    return this.page.getByRole("dialog");
  }

  async expectRange(label: string) {
    await expect(this.rangeButton).toHaveText(label);
  }

  async openRangePicker() {
    await this.rangeButton.click();
    await expect(this.rangeDialog.getByRole("radiogroup")).toBeVisible();
  }

  async expectRangeOptions(labels: readonly string[]) {
    await expect(this.rangeDialog.getByRole("radio")).toHaveCount(labels.length);
    for (const label of labels) await expect(this.rangeDialog.getByRole("radio", { name: label, exact: true })).toBeVisible();
  }

  async expectCustomDateCalendar() {
    await expect(this.rangeDialog.getByText("Custom Date", { exact: true })).toBeVisible();
    await expect(this.rangeDialog.getByRole("grid")).toBeVisible();
  }

  async closeRangePicker() {
    await this.page.keyboard.press("Escape");
    await expect(this.rangeDialog).toHaveCount(0);
  }

  /** Pick a preset; it applies at once. Returns the summary the overview was refetched with. */
  async selectRange(label: string, window?: { start: string; end: string }) {
    if (!(await this.rangeDialog.count())) await this.openRangePicker();
    const result = await this.summaryAfter(() => locatorChain(this.page, { role: "radio", name: label, exact: true }).click(), window);
    // Picking the range already in force leaves the dialog open.
    if (await this.rangeDialog.count()) await this.closeRangePicker();
    await this.expectRange(label);
    return result;
  }

  /**
   * Pick a custom range by day-cell name (e.g. "Monday, October 5th, 2026"); `window` is the same
   * range as YYYY-MM-DD, to tell its summary from the one the first click fetched. The second click
   * applies it; the dialog stays open until dismissed.
   */
  async selectCustomRange(start: string, end: string, window: { start: string; end: string }) {
    await this.openRangePicker();
    await this.rangeDialog.getByRole("button", { name: start }).click();
    const result = await this.summaryAfter(() => this.rangeDialog.getByRole("button", { name: end }).click(), window);
    await this.closeRangePicker();
    return result;
  }

  // ── Source switches and the bar chart ──

  private sourceRow(label: string): Locator {
    return this.main.locator("div").filter({ has: this.page.getByText(label, { exact: true }) }).filter({ has: this.page.getByRole("switch") }).last();
  }

  sourceSwitch(label: string): Locator {
    return this.sourceRow(label).getByRole("switch");
  }

  async setSourceShown(label: string, shown: boolean) {
    const toggle = this.sourceSwitch(label);
    if ((await toggle.getAttribute("aria-checked")) !== String(shown)) await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", String(shown));
  }

  /** The source's colour, taken from the swatch beside its switch, as `#RRGGBB`. */
  async sourceColor(label: string): Promise<string> {
    return this.sourceRow(label).evaluate((row) => {
      const swatch = row.querySelector('[style*="background-color"]') as any;
      const rgb = (swatch?.style.backgroundColor ?? "").match(/\d+/g)?.map(Number) ?? [];
      return `#${rgb.map((n: number) => n.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
    });
  }

  private get chart(): Locator {
    return this.main.getByRole("application").first();
  }

  /** Bars the chart paints in `color` (one per day with revenue from that source). */
  async barsIn(color: string): Promise<number> {
    return this.chart.evaluate(
      (svg, fill) => [...svg.querySelectorAll("path.recharts-rectangle")].filter((bar) => (bar.getAttribute("fill") ?? "").toUpperCase() === fill).length,
      color,
    );
  }

  // ── Audience ──

  /** The Audience overview's Profile views figure. */
  async profileViews(): Promise<number> {
    const label = this.main.getByText("Profile views", { exact: true });
    await expect(label).toBeVisible({ timeout: 20000 });
    const text = (await this.main.innerText()).replace(/\s+/g, " ");
    const match = text.match(/Profile views ([\d.,]+)/);
    if (!match) throw new Error("Profile views figure not found");
    return Number(match[1].replace(/[.,]/g, ""));
  }

  async expectAudienceHeading(copy: string) {
    await expect(this.main.getByRole("heading", { name: "Audience", exact: true })).toBeVisible();
    await expect(this.main.getByText(copy, { exact: true })).toBeVisible();
  }
}
