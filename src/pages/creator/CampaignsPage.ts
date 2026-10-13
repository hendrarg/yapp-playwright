import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { smartLocator } from "@utils/heal-utils";
import { safeClick } from "@utils/playwright.utils";
import { baseURL as buyerBaseURL } from "@config/env";
import { campaignEditorData } from "@test-data/creator/campaign.data";

export class CampaignsPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  private readonly createCampaignLink = smartLocator(this.page, {
    role: "link",
    name: "Create Campaign",
    text: "Create Campaign",
    selector: 'a[href*="campaigns/create"]',
  });

  private readonly titleInput = smartLocator(this.page, {
    role: "textbox",
    name: "e.g., Help me launch my next music album",
    label: "Campaign Title",
    placeholder: "e.g., Help me launch my next music album",
    selector: 'input[placeholder*="Help me launch" i]',
  });

  private readonly goalInput = smartLocator(this.page, {
    role: "textbox",
    name: "Target",
    label: "Funding Goal",
    placeholder: "Target",
    selector: 'input[placeholder="Target"]',
  });

  private readonly searchInput = smartLocator(this.page, {
    role: "textbox",
    name: "Find campaigns",
    placeholder: "Find campaigns",
    selector: 'input[placeholder*="campaign" i]',
  });

  async goto() {
    await this.page.goto(new URL("campaigns", this.baseURL).toString(), { waitUntil: "domcontentloaded" });
  }

  async expectReceiveCurrency() {
    await expect(this.page.getByText(/IDR/i).first()).toBeVisible({ timeout: 10000 });
  }

  async expectCoverRemovable() {
    const tile = this.page.locator("div").filter({ has: this.page.getByAltText("Uploaded image") }).filter({ has: this.page.getByRole("button") }).last();
    await expect(tile.getByRole("button")).toBeVisible({ timeout: 10000 });
  }

  async openPublicCampaign(shortUrl: string) {
    await this.page.goto(new URL(`campaign/${shortUrl}`, buyerBaseURL).toString(), { waitUntil: "domcontentloaded" });
  }

  async closeTopDialog() {
    await this.page.keyboard.press("Escape");
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/campaigns/, { timeout: 30000 });
    expect(this.page.url()).not.toContain("/auth");
  }

  async expectAuthRequired() {
    await expect(this.page).toHaveURL(/\/auth/, { timeout: 30000 });
  }

  async openCreate() {
    await this.createCampaignLink.click({ timeout: 15000 });
    await expect(this.page).toHaveURL(/\/profile\/campaigns\/create/, { timeout: 30000 });
  }

  async openEdit(uuid: string) {
    await this.page.goto(new URL(`profile/campaigns/upsert?id=${uuid}`, this.baseURL).toString(), { waitUntil: "domcontentloaded" });
    await expect(this.page).toHaveURL(new RegExp(`upsert\\?id=${uuid}`), { timeout: 30000 });
    await expect(this.page.getByRole("textbox", { name: "e.g., Help me launch my next music album" })).not.toHaveValue("", { timeout: 20000 });
  }

  async openManage(uuid: string) {
    await this.page.goto(new URL(`profile/campaigns/manage?id=${uuid}`, this.baseURL).toString(), { waitUntil: "domcontentloaded" });
    await expect(this.page).toHaveURL(new RegExp(`manage\\?id=${uuid}`), { timeout: 30000 });
  }

  async expectListColumns() {
    for (const column of campaignEditorData.columns) {
      await expect(this.page.getByRole("columnheader", { name: column, exact: true })).toBeVisible({ timeout: 15000 });
    }
  }

  async selectStatusTab(name: string) {
    await this.page.getByRole("tab", { name, exact: true }).click({ timeout: 10000 });
    await expect(this.page.getByRole("tab", { name, exact: true })).toHaveAttribute("aria-selected", "true");
  }

  async expectEmptyResults() {
    await expect(this.page.getByText(campaignEditorData.emptyCollaboration, { exact: true })).toBeVisible({ timeout: 10000 });
  }

  async searchCampaigns(query: string) {
    await this.searchInput.fill(query, { timeout: 10000 });
    await expect(this.page.getByRole("row", { name: query }).first()).toBeVisible({ timeout: 15000 });
  }

  async expectCampaignListed(title: string, status: "ACTIVE" | "INACTIVE") {
    const row = this.page.getByRole("row", { name: title }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row).toContainText(status);
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title, { timeout: 10000 });
  }

  async clearTitle() {
    await this.titleInput.fill("", { timeout: 10000 });
  }

  async readTitle(): Promise<string> {
    return this.page.getByRole("textbox", { name: "e.g., Help me launch my next music album" }).inputValue();
  }

  async fillGoal(amount: string) {
    await this.goalInput.fill(amount, { timeout: 10000 });
  }

  async readGoal(): Promise<string> {
    const value = await this.page.getByRole("textbox", { name: "Target" }).inputValue();
    return value.replace(/[^\d]/g, "");
  }

  private campaignSave(): Promise<string> {
    const saved = this.page.waitForResponse((response) => {
      const path = new URL(response.url()).pathname;
      const writesCampaign = path === "/api/v1/campaigns" || /\/api\/v1\/campaigns\/[0-9a-f-]{36}$/.test(path);
      return writesCampaign && (response.request().method() === "POST" || response.request().method() === "PUT");
    }, { timeout: 60000 });
    return saved.then(async (response) => {
      expect(response.ok(), `campaign save failed: ${response.status()}`).toBeTruthy();
      const body = (await response.json().catch(() => ({}))) as { data?: { uuid?: string; data?: { uuid?: string } }; uuid?: string };
      return body.data?.uuid || body.data?.data?.uuid || body.uuid || "";
    });
  }

  async publish(): Promise<string> {
    const saved = this.campaignSave();
    await safeClick(this.page.getByRole("button", { name: "Publish", exact: true }).locator("visible=true"));
    return saved;
  }

  async saveAsDraft(): Promise<string> {
    const saved = this.campaignSave();
    await safeClick(this.page.getByRole("button", { name: "Save as Draft", exact: true }).locator("visible=true"));
    return saved;
  }

  async expectTitleRequired() {
    await expect(this.page.getByText(campaignEditorData.titleRequired, { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(this.page).toHaveURL(/\/profile\/campaigns\/(create|upsert)/);
  }

  private coverInput(): Locator {
    return this.page.locator('input[type="file"][accept*="image"]').first();
  }

  async chooseCover(filePath: string) {
    await this.coverInput().setInputFiles(filePath);
  }

  async uploadCover(filePath: string) {
    await this.chooseCover(filePath);
    await expect(this.page.getByAltText("Uploaded image")).toBeVisible({ timeout: 20000 });
  }

  /** Correct behaviour: an undersized cover is rejected and the message names the file. */
  async expectCoverRejected(fileName: string) {
    const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await expect.soft(this.page.getByText(new RegExp(`${escaped}.*(too small|at least 500|must be)`, "i")).first()).toBeVisible({ timeout: 8000 });
  }

  async uploadSupportingPhotos(filePaths: readonly string[]) {
    const input = this.page.locator('input[type="file"][multiple]').first();
    await input.setInputFiles([...filePaths]);
    await expect(this.page.getByText(new RegExp(`${filePaths.length}\\s*/\\s*10`))).toBeVisible({ timeout: 20000 });
  }

  /** The switch has no accessible name; the label is a sibling inside the same row. */
  private namedSwitch(label: string): Locator {
    return this.page.locator("div").filter({ has: this.page.getByRole("switch") }).filter({ hasText: label }).last().getByRole("switch");
  }

  async setNamedSwitch(name: string, enabled: boolean) {
    const toggle = this.namedSwitch(name);
    if ((await toggle.getAttribute("aria-checked")) !== String(enabled)) await toggle.click({ timeout: 10000 });
    await expect(toggle).toHaveAttribute("aria-checked", String(enabled));
  }

  async expectNamedSwitch(name: string, enabled: boolean) {
    await expect(this.namedSwitch(name)).toHaveAttribute("aria-checked", String(enabled), { timeout: 10000 });
  }

  async fillDescription(text: string) {
    const editor = this.page.getByRole("textbox", { name: /editable markdown|description/i }).locator("visible=true").last();
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    await this.page.keyboard.insertText(text);
    await expect(editor).toContainText(text, { timeout: 10000 });
  }

  async expectDescriptionContains(text: string) {
    await expect(this.page.getByRole("textbox", { name: /editable markdown|description/i }).locator("visible=true").last()).toContainText(text, { timeout: 10000 });
  }

  async readPreviewSlug(): Promise<string> {
    const field = this.page.getByText("yapp.ink/campaign", { exact: true }).locator("..").locator("..").getByRole("textbox");
    return (await field.inputValue()).trim();
  }

  async expectManageOverview() {
    for (const label of ["Goals", "Withdrawal History", "Activity"]) {
      await expect(this.page.getByText(label, { exact: true }).first()).toBeVisible({ timeout: 15000 });
    }
    await expect(this.page.getByText(/Rupiah|USDT/i).first()).toBeVisible();
  }

  async openPublicFromManage(): Promise<Page> {
    const popup = this.page.waitForEvent("popup");
    await safeClick(this.page.getByRole("link", { name: "View", exact: true }));
    return popup;
  }

  async expectPublicCampaign(title: string) {
    await expect(this.page.getByRole("button", { name: "Donate", exact: true }).or(this.page.getByRole("link", { name: "Donate", exact: true }))).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByText(title, { exact: false }).first()).toBeVisible();
    await expect(this.page.getByText("Campaign Details", { exact: true })).toBeVisible();
  }

  async openEditorFromManage() {
    await safeClick(this.page.getByRole("button", { name: "Edit", exact: true }));
    await expect(this.page).toHaveURL(/\/profile\/campaigns\/upsert/, { timeout: 30000 });
  }

  async selectSectionTab(name: string) {
    await this.page.getByRole("tab", { name, exact: true }).click({ timeout: 10000 });
    await expect(this.page.getByRole("tab", { name, exact: true })).toHaveAttribute("aria-selected", "true");
  }

  async openShare() {
    await safeClick(this.page.getByRole("button", { name: "Share", exact: true }));
    const dialog = this.page.getByRole("dialog").locator("visible=true");
    await expect(dialog.getByRole("heading", { name: "Share this campaign", exact: true })).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText("Copy link", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Share on social media", { exact: true })).toBeVisible();
  }

  async openWithdraw() {
    await safeClick(this.page.getByRole("button", { name: "Withdraw", exact: true }).first());
    const dialog = this.page.getByRole("dialog").locator("visible=true");
    await expect(dialog.getByText(/Withdraw - IDR/i)).toBeVisible({ timeout: 10000 });
    for (const label of ["Asset", "Destination", "Amount"]) {
      await expect(dialog.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(dialog.getByText(/Balance:\s*Rp/i)).toBeVisible();
  }

}
