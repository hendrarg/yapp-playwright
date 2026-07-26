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
  readonly title = locatorChain(this.page, {
    role: "heading",
    name: tipLabels.sendTip,
    text: tipLabels.sendTip,
    selector: "span:has-text('Send Tip')",
  });

  readonly amountInput = locatorChain(this.page, {
    role: "textbox",
    name: tipLabels.inputAmount,
    placeholder: tipLabels.inputAmount,
  });

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
    .getByRole("checkbox")
    .filter({ has: this.page.getByText(tipLabels.sendAnonymous, { exact: true }) })
    .or(locatorChain(this.page, { role: "checkbox", name: tipLabels.sendAnonymous, text: tipLabels.sendAnonymous }));

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
    .getByRole("checkbox")
    .filter({ has: this.page.getByText(new RegExp(tipLabels.agreementPrefix)) });

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
    const currencyTab = locatorChain(this.page, { role: "tab", name: currency, text: currency });
    await safeClick(currencyTab);
    await expect(currencyTab).toHaveAttribute("aria-selected", "true");
  }

  async expectAmountError(message: string) {
    await expect(locatorChain(this.page, { text: message, role: "alert", name: message })).toBeVisible({ timeout: 5000 });
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
    await expect(
      locatorChain(this.page, { role: "tab", name: data.currency, text: data.currency }),
    ).toHaveAttribute("aria-selected", "true");
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
