import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain } from "@utils/heal-utils";

export type ReferralTab = "My Referral" | "Referred By";

/** One row of the My Referral table, as rendered. */
export interface ReferralRow {
  user: string;
  dateJoined: string;
  commissionIdr: string;
  commissionUsdt: string;
}

/**
 * `/referral` — two tabs. My Referral: the creator's code and link (Copy / Share), the three-step
 * explainer, Lifetime Earnings / Active referrals and the Referral List table. Referred By: the
 * 10%-off offer and the Referral Code field with Apply Referral.
 */
export class ReferralPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto() {
    await this.page.goto(new URL("referral", this.baseURL).toString());
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/referral/);
    expect(this.page.url()).not.toContain("/auth");
  }

  private tab(name: ReferralTab): Locator {
    return locatorChain(this.page, { role: "tab", name, exact: true });
  }

  private panel(name: ReferralTab): Locator {
    return this.page.getByRole("tabpanel", { name });
  }

  async openTab(name: ReferralTab) {
    await this.tab(name).click();
    await expect(this.tab(name)).toHaveAttribute("aria-selected", "true");
    await expect(this.panel(name)).toBeVisible();
  }

  // ── My Referral: code and link ──

  private get codeText(): Locator {
    return this.panel("My Referral").getByText(/^[A-Z0-9]{6}$/);
  }

  private get linkText(): Locator {
    return this.panel("My Referral").getByText(/auth\?c=/);
  }

  /** The code and link shown once the page loads; returns the code. */
  async expectReferralInfo(): Promise<string> {
    await expect(this.panel("My Referral").getByText("Referral Code", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(this.codeText).toBeVisible({ timeout: 15000 });
    const code = (await this.codeText.innerText()).trim();
    await expect(this.linkText).toContainText(`auth?c=${code}`);
    return code;
  }

  async linkLabel(): Promise<string> {
    return (await this.linkText.innerText()).replace(/\s+/g, "/");
  }

  private toast(text: string): Locator {
    return this.page.locator("[data-sonner-toast]").filter({ hasText: text });
  }

  private async clipboard(): Promise<string> {
    return this.page.evaluate(() =>
      (navigator as Navigator & { clipboard: { readText(): Promise<string> } }).clipboard.readText(),
    );
  }

  async copyCode(): Promise<string> {
    await this.panel("My Referral").getByRole("button", { name: "Copy", exact: true }).click();
    await expect(this.toast("Referral code copied to clipboard")).toBeVisible();
    return this.clipboard();
  }

  /** The link's copy control is an icon-only button — the panel's one button without any text. */
  async copyLink(): Promise<string> {
    await this.panel("My Referral").getByRole("button").filter({ hasNotText: /\S/ }).first().click();
    await expect(this.toast("Referral link copied to clipboard")).toBeVisible();
    return this.clipboard();
  }

  async expectInviterBenefit(copy: { steps: readonly string[]; reward: string }) {
    const panel = this.panel("My Referral");
    for (const step of copy.steps) await expect(panel.getByText(step, { exact: true })).toBeVisible();
    await expect(panel.getByText(copy.reward)).toBeVisible();
  }

  // ── My Referral: share ──

  private get shareDialog(): Locator {
    return this.page.getByRole("dialog", { name: "Share Yapp.ink" });
  }

  async openShare() {
    await this.panel("My Referral").getByRole("button", { name: "Share", exact: true }).click();
    await expect(this.shareDialog).toBeVisible();
  }

  /** The dialog repeats the link in a "Copy link" box and offers the social targets. */
  async expectShareTargets(link: string, targets: readonly string[]) {
    await expect(this.shareDialog.getByRole("textbox", { name: "Copy link" })).toHaveValue(link);
    for (const target of targets) await expect(this.shareDialog.getByRole("button", { name: target, exact: true })).toBeVisible();
  }

  /** Choose a social target and return the share URL it opened in a new tab. */
  async shareTo(target: string): Promise<string> {
    const [popup] = await Promise.all([
      this.page.waitForEvent("popup"),
      this.shareDialog.getByRole("button", { name: target, exact: true }).click(),
    ]);
    const url = decodeURIComponent(popup.url());
    await popup.close();
    return url;
  }

  async closeShare() {
    await this.shareDialog.getByRole("button", { name: "Close" }).click();
    await expect(this.shareDialog).toHaveCount(0);
  }

  // ── My Referral: summary and list ──

  /** Lifetime Earnings and Active referrals, read from the panel text (each label is followed by its value). */
  async readSummary(): Promise<{ lifetimeEarnings: string; activeReferrals: string }> {
    const panel = this.panel("My Referral");
    await expect(panel.getByText("Lifetime Earnings", { exact: true })).toBeVisible();
    await expect(panel.getByText("Active referrals", { exact: true })).toBeVisible();
    const text = (await panel.innerText()).replace(/\s+/g, " ");
    return {
      lifetimeEarnings: text.match(/Lifetime Earnings (\S+)/)?.[1] ?? "",
      activeReferrals: text.match(/Active referrals (\d+)/)?.[1] ?? "",
    };
  }

  private get table(): Locator {
    return this.panel("My Referral").getByRole("table");
  }

  async expectColumns(columns: readonly string[]) {
    await expect(this.table.getByRole("columnheader")).toHaveText([...columns]);
  }

  async readRows(): Promise<ReferralRow[]> {
    const rows = this.table.getByRole("rowgroup").nth(1).getByRole("row");
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    const out: ReferralRow[] = [];
    for (const row of await rows.all()) {
      const cells = (await row.getByRole("cell").allInnerTexts()).map((c) => c.replace(/\s+/g, " ").trim());
      if (cells.length < 4) continue;
      out.push({ user: cells[0], dateJoined: cells[1], commissionIdr: cells[2], commissionUsdt: cells[3] });
    }
    return out;
  }

  async expectEmptyList(copy: { title: string; hint: string }) {
    const body = this.table.getByRole("rowgroup").nth(1);
    await expect(body.getByRole("row")).toHaveCount(1);
    await expect(body.getByRole("cell")).toContainText(copy.title);
    await expect(body.getByRole("cell")).toContainText(copy.hint);
    await expect(body.getByRole("img")).toBeVisible();
  }

  async expectPagination(state: { rows: string; label: string; enabled: boolean }) {
    const panel = this.panel("My Referral");
    await expect(panel.getByRole("combobox")).toHaveText(state.rows);
    await expect(panel.getByText(state.label, { exact: true })).toBeVisible();
    for (const name of ["Go to first page", "Go to previous page", "Go to next page", "Go to last page"]) {
      const button = panel.getByRole("button", { name });
      if (state.enabled) await expect(button).toBeEnabled();
      else await expect(button).toBeDisabled();
    }
  }

  // ── Referred By ──

  get codeInput(): Locator {
    return locatorChain(this.page, { role: "textbox", name: "Referral Code", selector: "#referral-code" });
  }

  get applyButton(): Locator {
    return this.panel("Referred By").getByRole("button", { name: "Apply Referral" });
  }

  async expectReferredByOffer(offer: { title: string; body: string }) {
    const panel = this.panel("Referred By");
    await expect(panel).toContainText(offer.title);
    await expect(panel).toContainText(offer.body);
    await expect(this.codeInput).toBeVisible();
    await expect(this.applyButton).toBeVisible();
  }

  async expectCodeFieldAttributes(placeholder: string) {
    await expect(this.codeInput).toHaveAttribute("id", "referral-code");
    await expect(this.codeInput).toHaveAttribute("placeholder", placeholder);
    await expect(this.codeInput).not.toHaveAttribute("maxlength", /.*/);
  }

  /** Type a code; the field keeps it verbatim and validates it against the server as you type. */
  async enterCode(code: string) {
    await this.codeInput.fill(code);
    await expect(this.codeInput).toHaveValue(code);
  }

  async expectInvalidCode(message: string) {
    await expect(this.panel("Referred By").getByText(message, { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(this.applyButton).toBeDisabled();
  }

  async expectCodeAccepted(message: string) {
    await expect(this.applyButton).toBeEnabled({ timeout: 10000 });
    await expect(this.panel("Referred By").getByText(message, { exact: true })).toHaveCount(0);
  }
}
