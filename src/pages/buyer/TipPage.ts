import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { smartClick } from "@utils/heal-utils";
import { safeClick, safeFill, waitForLoaded } from "@utils/playwright.utils";

type TipReviewData = {
  displayAmount: string;
  currency: string;
  creatorName: string;
  paymentMethod: string;
  publicNote: string;
  privateNote: string;
};

type TipCheckoutPrep = {
  amount: string;
  votingOption: string;
  paymentMethod: string;
};

export class TipPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  async goto(handle: string, amount?: string) {
    const path = amount ? `${handle}/tip?amount=${amount}` : `${handle}/tip`;
    await this.page.goto(new URL(path, this.baseURL).toString(), { waitUntil: "domcontentloaded" });
    await waitForLoaded(this.page);
  }

  async expectLoaded() {
    expect(this.page.url()).not.toContain("/auth");
  }

  // ── Tip page form ──
  readonly title = this.page.locator("span").filter({ hasText: "Send Tip" }).first();
  readonly amountInput = this.page.getByRole("textbox", { name: "Input Amount" });
  readonly paymentMethod = this.page.getByRole("combobox");
  readonly nameInput = this.page.getByRole("textbox", { name: "Your Name or Nickname" });
  readonly emailInput = this.page.getByRole("textbox", { name: "Your Email" });
  readonly anonymousCheckbox = this.page
    .getByText("Send as Anonymous", { exact: true })
    .locator("xpath=../..")
    .getByRole("checkbox");
  readonly giveNotesInput = this.page.getByRole("textbox", { name: "Notes can be seen by public" });
  readonly privateNotesInput = this.page.getByRole("textbox", { name: "Notes can only be seen by creator" });
  readonly sendButton = this.page.getByRole("button", { name: "Send Tip" }).last();
  readonly supportAgreementCheckbox = this.page
    .getByText(/^With this, I declare that this transaction/)
    .locator("xpath=../../..")
    .getByRole("checkbox");

  async expectPageLoaded() {
    await expect(this.title).toBeVisible({ timeout: 10000 });
    await expect(this.amountInput).toBeVisible({ timeout: 10000 });
    await expect(this.paymentMethod).toBeVisible({ timeout: 5000 }).catch(() => {});
  }

  async expectFormAutoFilled() {
    await expect(this.nameInput).toBeVisible({ timeout: 10000 });
    expect((await this.nameInput.inputValue()).length).toBeGreaterThan(0);
    await expect(this.emailInput).toBeVisible({ timeout: 5000 });
    expect((await this.emailInput.inputValue()).length).toBeGreaterThan(0);
    await expect(this.anonymousCheckbox).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(this.paymentMethod).toBeVisible({ timeout: 5000 });
  }

  async expectTipFormReady() {
    await this.expectPageLoaded();
    await this.expectFormAutoFilled();
  }

  async prepareCheckout(data: TipCheckoutPrep) {
    await this.expectTipFormReady();
    await this.fillAmount(data.amount);
    await this.selectVotingOptionIfPresent(data.votingOption);
    await this.expectPaymentMethodAvailableAndSelect(data.paymentMethod);
  }

  async clearName() {
    await this.nameInput.click();
    await this.nameInput.press("ControlOrMeta+A");
    await this.nameInput.press("Backspace");
  }

  async fillName(value: string) {
    await this.nameInput.fill(value);
  }

  async blurName() {
    await this.nameInput.press("Tab");
  }

  async expectNameError(message = "Name is required") {
    await expect(this.page.getByText(message, { exact: true })).toBeVisible({ timeout: 5000 });
  }

  async expectEmailError(message = "Email is required") {
    await expect(this.page.getByText(message, { exact: true })).toBeVisible({ timeout: 5000 });
  }

  async expectEmailDisabled() {
    await expect(this.emailInput).toBeDisabled();
  }

  async expectNotesEmpty() {
    await expect(this.giveNotesInput).toHaveValue("");
    await expect(this.privateNotesInput).toHaveValue("");
  }

  async selectAnonymous() {
    await safeClick(this.anonymousCheckbox);
  }

  async expectAnonymousSelected() {
    await expect(this.anonymousCheckbox).toHaveAttribute("aria-checked", "true");
  }

  async expectSendTipEnabled() {
    await expect(this.sendButton).toBeEnabled();
  }

  async expectGiveNotesLimit(maxLength = 200) {
    const notes = "x".repeat(maxLength);
    await this.giveNotesInput.fill(notes);
    await expect(this.giveNotesInput).toHaveValue(notes);
    await this.giveNotesInput.fill(`${notes}x`);
    await expect(this.giveNotesInput).toHaveValue(notes);
  }

  async submit(): Promise<string> {
    await safeClick(this.sendButton);
    await this.page.waitForURL(/\/transaction\//, { timeout: 15000 });
    await waitForLoaded(this.page);
    await this.page.waitForLoadState("networkidle").catch(() => {});
    return this.page.url().split("/transaction/")[1];
  }

  async attemptSubmit() {
    await safeClick(this.sendButton);
  }

  async expectSubmissionBlocked() {
    expect(this.page.url()).toContain("/tip");
    await expect(this.sendButton).toBeVisible();
  }

  async fillAmount(value: string) {
    await this.amountInput.fill(value);
    await this.page.waitForTimeout(300);
  }

  async selectCurrency(currency: string) {
    const currencyTab = this.page.getByRole("tab", { name: currency, exact: true });
    await safeClick(currencyTab);
    await expect(currencyTab).toHaveAttribute("aria-selected", "true");
  }

  async expectAmountError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible({ timeout: 5000 });
  }

  async selectVotingOptionIfPresent(optionName: string) {
    const option = this.page.getByRole("radio", { name: optionName, exact: true });
    if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
      await smartClick(this.page, {
        role: "radio",
        name: optionName,
        text: optionName,
      });
    }
  }

  async expectPaymentMethodAvailableAndSelect(method: string) {
    await expect(this.paymentMethod).toBeEnabled({ timeout: 10000 });
    await smartClick(this.page, {
      role: "combobox",
      selector: 'button[role="combobox"]',
    });

    const option = this.page.getByRole("option", { name: method, exact: false });
    await expect(option).toBeVisible({ timeout: 5000 });
    await smartClick(this.page, {
      role: "option",
      name: method,
      text: method,
    });
    await expect(this.paymentMethod).toContainText(new RegExp(method, "i"));
  }

  async uncheckSupportAgreement() {
    await expect(this.supportAgreementCheckbox).toBeVisible({ timeout: 5000 });
    if (await this.supportAgreementCheckbox.getAttribute("aria-checked") === "true") {
      await safeClick(this.supportAgreementCheckbox);
    }
    await expect(this.supportAgreementCheckbox).toHaveAttribute("aria-checked", "false");
  }

  async expectSendTipDisabled() {
    await expect(this.sendButton).toBeDisabled();
  }

  async acceptSupportAgreement() {
    if (await this.supportAgreementCheckbox.getAttribute("aria-checked") !== "true") {
      await safeClick(this.supportAgreementCheckbox);
    }
    await expect(this.supportAgreementCheckbox).toHaveAttribute("aria-checked", "true");
  }

  async fillNotes(publicNote: string, privateNote: string) {
    await safeFill(this.giveNotesInput, publicNote);
    await safeFill(this.privateNotesInput, privateNote);
  }

  async expectReviewInformation(data: TipReviewData): Promise<string> {
    await expect(this.page.getByText(data.creatorName, { exact: true })).toBeVisible();
    await expect(this.page.getByRole("tab", { name: data.currency, exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(this.amountInput).toHaveValue(data.displayAmount);
    expect((await this.nameInput.inputValue()).length).toBeGreaterThan(0);
    expect((await this.emailInput.inputValue()).length).toBeGreaterThan(0);
    await expect(this.anonymousCheckbox).toHaveAttribute("aria-checked", "false");
    await expect(this.giveNotesInput).toHaveValue(data.publicNote);
    await expect(this.privateNotesInput).toHaveValue(data.privateNote);
    await expect(this.paymentMethod).toContainText(new RegExp(data.paymentMethod, "i"));

    const subtotalLabel = this.page.getByText("Subtotal", { exact: true });
    if (!await subtotalLabel.isVisible()) {
      await smartClick(this.page, {
        role: "button",
        name: "Detail Transactions",
        text: "Detail Transactions",
      }, { timeout: 1500 });
    }

    const subtotalRow = subtotalLabel.locator("..");
    const totalRow = this.page.getByText("Total", { exact: true }).locator("..");
    await expect(subtotalRow.getByText(data.displayAmount, { exact: true })).toBeVisible();

    const totalValue = totalRow.locator("span").filter({ hasText: /^Rp[\d.]+$/ });
    await expect(totalValue).toHaveCount(1);
    await expect(this.sendButton).toBeEnabled();
    return (await totalValue.innerText()).trim();
  }
}
