import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { tipLabels } from "@test-data/buyer/profile.data";
import { locatorChain, smartClick, smartLocator } from "@utils/heal-utils";
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
  // FLAKY_FIX: no bare getByText("Send Tip") — also matches the submit button
  readonly title = this.page
    .getByRole("heading", { name: tipLabels.sendTip, exact: true })
    .or(this.page.locator("span.font-bold").filter({ hasText: new RegExp(`^${tipLabels.sendTip}$`) }));

  // tip-amount-input is the controlled field (tabindex=-1); role/placeholder alone can miss updates
  readonly amountInput = this.page
    .locator("input.tip-amount-input")
    .or(this.page.getByRole("textbox", { name: tipLabels.inputAmount, exact: true }))
    .or(this.page.getByPlaceholder(tipLabels.inputAmount, { exact: true }))
    .first();

  readonly paymentMethod = locatorChain(this.page, {
    role: "combobox",
    selector: 'button[role="combobox"]',
  });

  readonly nameInput = locatorChain(this.page, {
    role: "textbox",
    name: tipLabels.yourName,
    label: tipLabels.yourName,
  });

  readonly emailInput = locatorChain(this.page, {
    role: "textbox",
    name: tipLabels.yourEmail,
    label: tipLabels.yourEmail,
  });

  readonly anonymousCheckbox = this.page
    .locator("div.flex.gap-2")
    .filter({ hasText: new RegExp(`^${tipLabels.sendAnonymous}$`) })
    .getByRole("checkbox");

  readonly giveNotesInput = locatorChain(this.page, {
    role: "textbox",
    name: tipLabels.giveNotes,
    label: tipLabels.giveNotes,
  });

  readonly privateNotesInput = locatorChain(this.page, {
    role: "textbox",
    name: tipLabels.privateNotes,
    label: tipLabels.privateNotes,
  });

  readonly sendButton = locatorChain(this.page, {
    role: "button",
    name: tipLabels.sendTip,
    text: tipLabels.sendTip,
  }).last();

  readonly supportAgreementCheckbox = this.page
    .locator("div.flex.gap-2")
    .filter({ hasText: new RegExp(tipLabels.agreementPrefix) })
    .getByRole("checkbox");

  async expectPageLoaded() {
    await expect(this.title).toBeVisible({ timeout: 10000 });
    await expect(this.amountInput).toBeVisible({ timeout: 10000 });
    await expect(this.paymentMethod).toBeVisible({ timeout: 5000 }).catch(() => {});
  }

  async expectFormAutoFilled() {
    await expect(this.nameInput).toBeVisible({ timeout: 10000 });
    await expect
      .poll(async () => (await this.nameInput.inputValue()).length, {
        timeout: 15000,
        message: "expected name to be prefilled",
      })
      .toBeGreaterThan(0);
    await expect(this.emailInput).toBeVisible({ timeout: 5000 });
    await expect
      .poll(async () => (await this.emailInput.inputValue()).length, {
        timeout: 15000,
        message: "expected email to be prefilled",
      })
      .toBeGreaterThan(0);
    await expect(this.anonymousCheckbox).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(this.paymentMethod).toBeVisible({ timeout: 5000 });
  }

  async expectTipFormReady() {
    await this.expectPageLoaded();
    await this.expectFormAutoFilled();
  }

  async prepareCheckout(data: TipCheckoutPrep) {
    await this.expectTipFormReady();
    await this.finalizeCheckout(data);
  }

  /** Amount, voting, and payment when the form is already on screen (e.g. after profile handoff). */
  async finalizeCheckout(data: TipCheckoutPrep) {
    await this.fillAmount(data.amount);
    await this.selectVotingOptionIfPresent(data.votingOption);
    await this.expectPaymentMethodAvailableAndSelect(data.paymentMethod);
    await this.expectSendTipEnabled();
  }

  async expectAgreementSelectedByDefault() {
    await expect(this.supportAgreementCheckbox).toHaveAttribute("aria-checked", "true");
    await expect(this.sendButton).toBeVisible();
    await this.expectSendTipEnabled();
  }

  async completeReview(data: TipReviewData): Promise<string> {
    await this.acceptSupportAgreement();
    await this.fillNotes(data.publicNote, data.privateNote);
    return this.expectReviewInformation(data);
  }

  async completeReviewAndSubmit(data: TipReviewData): Promise<{ orderId: string; reviewTotal: string }> {
    const reviewTotal = await this.completeReview(data);
    const orderId = await this.submit();
    return { orderId, reviewTotal };
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
    await expect(locatorChain(this.page, { text: message, role: "alert", name: message })).toBeVisible({ timeout: 5000 });
  }

  async expectEmailError(message = "Email is required") {
    await expect(locatorChain(this.page, { text: message, role: "alert", name: message })).toBeVisible({ timeout: 5000 });
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
    await this.waitForStableLocator(this.sendButton, "expected Send Tip button to be stable");
    await safeClick(this.sendButton);
    await this.page.waitForURL(/\/transaction\//, { timeout: 15000 });
    await waitForLoaded(this.page);
    return this.page.url().split("/transaction/")[1];
  }

  async attemptSubmit() {
    await safeClick(this.sendButton);
  }

  async expectSubmissionBlocked() {
    expect(this.page.url()).toContain("/tip");
    await expect(this.sendButton).toBeVisible();
  }

  private async waitForStableLocator(locator: Locator, message: string) {
    await expect
      .poll(async () => {
        if (!(await locator.isVisible())) return false;
        try {
          await locator.scrollIntoViewIfNeeded({ timeout: 1000 });
          return true;
        } catch {
          return false;
        }
      }, { timeout: 10000, message })
      .toBe(true);
  }

  private async focusAmountInput() {
    await this.waitForStableLocator(this.amountInput, "expected amount input to be stable");
    await this.amountInput.click({ force: true });
    await this.amountInput.focus();
  }

  private async commitAmountInput() {
    // Blur via Tab so React validation runs (native blur() is flaky on this controlled input)
    await this.amountInput.press("Tab");
    await this.page.waitForTimeout(400);
  }

  async clearAmount() {
    // Seed via suggestion or typing — clearing an already-empty field skips validation
    await this.focusAmountInput();
    const suggestion = this.page.getByRole("button", { name: /^Rp[\d.]+$/ }).first();
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await safeClick(suggestion);
      await this.page.waitForTimeout(300);
      await this.focusAmountInput();
    } else {
      await this.amountInput.pressSequentially("2", { delay: 40 });
    }
    await this.amountInput.press("ControlOrMeta+A");
    await this.amountInput.press("Backspace");
    await this.commitAmountInput();
  }

  async fillAmount(value: string) {
    await this.focusAmountInput();
    await this.amountInput.press("ControlOrMeta+A");
    await this.amountInput.press("Backspace");
    if (value !== "") {
      await this.amountInput.pressSequentially(value, { delay: 40 });
    }
    await this.commitAmountInput();
  }

  // FLAKY_FIX: no text fallback — getByText("IDR") matches inner <span> inside the tab
  private currencyTab(currency: string) {
    return this.page
      .getByRole("tab", { name: currency, exact: true })
      .or(this.page.locator(`[role="tab"]:has(:text-is("${currency}"))`));
  }

  async selectCurrency(currency: string) {
    await expect
      .poll(async () => {
        const currencyTab = this.currencyTab(currency);
        if (!(await currencyTab.isVisible())) return false;
        try {
          await currencyTab.scrollIntoViewIfNeeded({ timeout: 500 });
          await currencyTab.click({ timeout: 2000 });
          return (await currencyTab.getAttribute("aria-selected")) === "true";
        } catch {
          return false;
        }
      }, { timeout: 10000, message: `expected ${currency} tab to be selected` })
      .toBe(true);
  }

  async expectOnlyCurrencyActive(active: string, inactive: string) {
    await expect(this.currencyTab(active)).toHaveAttribute("aria-selected", "true");
    await expect(this.currencyTab(inactive)).toHaveAttribute("aria-selected", "false");
  }

  async expectAmountError(message: string) {
    // Poll main copy first — error text is plain, not always role=alert
    await expect
      .poll(async () => (await this.page.locator("main").innerText()).includes(message), {
        timeout: 10000,
        message: `expected amount error visible: ${message}`,
      })
      .toBe(true);
    await expect(this.page.getByText(message, { exact: true })).toBeVisible({ timeout: 5000 });
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
    if ((await this.supportAgreementCheckbox.getAttribute("aria-checked")) === "true") {
      await safeClick(this.supportAgreementCheckbox);
    }
    await expect(this.supportAgreementCheckbox).toHaveAttribute("aria-checked", "false");
  }

  async expectSendTipDisabled() {
    await expect(this.sendButton).toBeDisabled();
  }

  async acceptSupportAgreement() {
    if ((await this.supportAgreementCheckbox.getAttribute("aria-checked")) !== "true") {
      await safeClick(this.supportAgreementCheckbox);
    }
    await expect(this.supportAgreementCheckbox).toHaveAttribute("aria-checked", "true");
  }

  async fillNotes(publicNote: string, privateNote: string) {
    await safeFill(this.giveNotesInput, publicNote);
    await safeFill(this.privateNotesInput, privateNote);
  }

  async expectReviewInformation(data: TipReviewData): Promise<string> {
    await expect(locatorChain(this.page, { text: data.creatorName, role: "heading", name: data.creatorName })).toBeVisible();
    await expect(this.currencyTab(data.currency)).toHaveAttribute("aria-selected", "true");
    await expect(this.amountInput).toHaveValue(data.displayAmount);
    expect((await this.nameInput.inputValue()).length).toBeGreaterThan(0);
    expect((await this.emailInput.inputValue()).length).toBeGreaterThan(0);
    await expect(this.anonymousCheckbox).toHaveAttribute("aria-checked", "false");
    await expect(this.giveNotesInput).toHaveValue(data.publicNote);
    await expect(this.privateNotesInput).toHaveValue(data.privateNote);
    await expect(this.paymentMethod).toContainText(new RegExp(data.paymentMethod, "i"));

    const subtotalLabel = locatorChain(this.page, {
      text: tipLabels.subtotal,
      role: "cell",
      name: tipLabels.subtotal,
    });
    if (!(await subtotalLabel.isVisible())) {
      await smartClick(this.page, {
        role: "button",
        name: tipLabels.detailTransactions,
        text: tipLabels.detailTransactions,
      }, { timeout: 1500 });
    }

    const subtotalRow = subtotalLabel.locator("..");
    const totalRow = locatorChain(this.page, { text: tipLabels.total, role: "cell", name: tipLabels.total }).locator("..");
    await expect(subtotalRow.getByText(data.displayAmount, { exact: true })).toBeVisible();

    const totalValue = totalRow.locator("span").filter({ hasText: /^Rp[\d.]+$/ });
    await expect(totalValue).toHaveCount(1);
    await expect(this.sendButton).toBeEnabled();
    return (await totalValue.innerText()).trim();
  }
}

