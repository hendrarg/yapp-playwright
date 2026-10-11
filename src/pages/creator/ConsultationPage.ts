import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartLocator } from "@utils/heal-utils";
import { safeClick, safeFill } from "@utils/playwright.utils";
import { closeProductCompleteModal, uploadGallery, uploadHero } from "@helpers/creator/product-editor";
import { afterSalesSection, descriptionEditor, priceInput, productCompleteDialog, textFeedback, titleInput } from "@pages/shared/locators";
import { consultationConfigData } from "@test-data/creator/consultation.config.data";
import { consultationMediaData } from "@test-data/creator/consultation.media.data";
import { consultationNavigationData } from "@test-data/creator/consultation.navigation.data";
import { consultationPricingData } from "@test-data/creator/consultation.pricing.data";
import { consultationValidationData } from "@test-data/creator/consultation.validation.data";
import { productsCreationData } from "@test-data/creator/products.creation.data";

type AvailabilitySwitch = "Buffer Time" | "Allow Buyers to reschedule" | "Limit Booking Frequency" | "Status";

export class ConsultationPage {
  constructor(
    public readonly page: Page,
    private readonly baseURL: string,
  ) {}

  private readonly nextSetAvailabilityAction = smartLocator(this.page, {
    role: "button",
    name: "Next: Set Availability",
    text: "Next: Set Availability",
    selector: 'button:has-text("Next: Set Availability")',
  });

  private readonly consultationBackAction = smartLocator(this.page, {
    role: "button",
    name: "Back",
    text: "Back",
    selector: 'button:has-text("Back")',
  });

  private readonly createConsultationAction = smartLocator(this.page, {
    role: "button",
    name: "Create Consultation",
    text: "Create Consultation",
    selector: 'button:has-text("Create Consultation")',
  });

  private consultationAfterSalesPreviewButton(): Locator {
    return afterSalesSection(this.page)
      .getByRole("button", { name: "Preview", exact: true })
      .or(this.page.getByRole("button", { name: "Preview", exact: true }))
      .filter({ visible: true })
      .first();
  }

  private consultationAfterSalesPreviewDialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ hasText: consultationConfigData.previewDialogHeadingPattern })
      .or(this.page.getByRole("dialog").filter({ hasText: /Links/i }))
      .last();
  }

  private visibleConsultationNextCta(): Locator {
    return this.page
      .getByRole("button", { name: consultationNavigationData.nextCtaName, exact: true })
      .filter({ visible: true })
      .first();
  }

  /**
   * The After Sales toggle. Browser-verified: the label's own row holds exactly one
   * switch, so this replaces the `preceding::*[@role='switch'][1]` axis, which searched
   * backwards through the whole document from the label.
   */
  private afterSalesCustomizeSwitch(): Locator {
    return this.page.locator('div:has(> label:has-text("Customize Message"))').getByRole("switch");
  }

  /**
   * The After Sales editor: the innermost block holding the `Customize Message` label and a
   * rich-text editor. Works on create (no tabs) and on edit (inside the Details tab) alike.
   */
  private afterSalesMessageEditor(): Locator {
    return this.page
      .locator("div")
      .filter({ visible: true })
      .filter({ has: this.page.locator('label:has-text("Customize Message")') })
      .filter({ has: this.page.locator('[contenteditable="true"][role="textbox"]') })
      // A block that also holds the Description editor is too wide (it matches before the After
      // Sales editor mounts), so exclude it.
      .filter({ hasNot: this.page.locator('label:has-text("Description")') })
      .last()
      .locator('[contenteditable="true"][role="textbox"]');
  }

  async goto() {
    await this.page.goto(
      new URL("products/create/consultation", this.baseURL).toString(),
      { waitUntil: "domcontentloaded" },
    );
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(
      /\/products\/(?:create|update)\/consultation|\/products\/update\/appointment\//,
      { timeout: 30000 },
    );
    // The edit form renders a second, hidden copy of the form; check the visible one.
    await expect(titleInput(this.page).filter({ visible: true }).first()).toBeVisible({ timeout: 30000 });
    await expect(this.page.getByRole("button", { name: "Next: Set Availability" }).filter({ visible: true }).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(this.page.getByText("Buyer Form").filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
  }

  /** The edit form lives under `appointment`, not `consultation` (see M-02). */
  async gotoEdit(productUuid: string, tab: "Details" | "Availability" = "Details") {
    await this.page.goto(new URL(`products/update/appointment/${productUuid}`, this.baseURL).toString(), { waitUntil: "domcontentloaded" });
    await this.expectLoaded();
    if (tab === "Availability") await this.openConsultationEditTab("Availability");
  }

  /** The create route says `consultation`; the matching edit route should open the same editor. */
  async gotoEditByConsultationRoute(productUuid: string) {
    await this.page.goto(new URL(`products/update/consultation/${productUuid}`, this.baseURL).toString(), { waitUntil: "domcontentloaded" });
    await this.expectLoaded();
  }

  async expectConsultationCreateFlow() {
    await expect(this.page).toHaveURL(productsCreationData.consultationCreatePath);
    await expect(titleInput(this.page)).toBeVisible({ timeout: 10000 });
    await expect(
      this.page.getByRole("button", { name: "Next: Set Availability" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText("Buyer Form")).toBeVisible({ timeout: 10000 });
  }

  async fillConsultationDescription(text: string) {
    const editor = descriptionEditor(this.page);
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    await this.page.keyboard.insertText(text);
  }

  async appendConsultationDescription(text: string) {
    const editor = descriptionEditor(this.page);
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("End");
    await this.page.keyboard.insertText(text);
  }

  async expectConsultationDescriptionCounter(expected: string) {
    await expect(
      locatorChain(this.page, {
        text: expected,
        selector: `p:has-text("${expected}")`,
      }),
    ).toBeVisible({ timeout: 10000 });
  }

  async submitConsultationDetails() {
    await this.nextSetAvailabilityAction.click({ timeout: 10000 });
  }

  private formMessage(text: string): Locator {
    return locatorChain(this.page, { text, selector: `[data-slot="form-message"]:has-text("${text}")` }).filter({ visible: true });
  }

  /** The price rule message under Price Setting (it only surfaces after Next is pressed). */
  async expectConsultationPriceError(shown: boolean) {
    const message = this.formMessage(consultationPricingData.priceRuleError);
    if (shown) await expect(message.first()).toBeVisible({ timeout: 10000 });
    else await expect(message).toHaveCount(0, { timeout: 10000 });
  }

  async expectConsultationTitleRequired() {
    await expect(textFeedback(this.page, consultationValidationData.titleRequiredError)).toBeVisible({
      timeout: 10000,
    });
  }

  private visibleTitleInput(): Locator {
    return titleInput(this.page).filter({ visible: true }).first();
  }

  async readConsultationTitleValue(): Promise<string> {
    return this.visibleTitleInput().inputValue();
  }

  /** A documented title limit shows up as the input's maxlength. */
  async expectConsultationTitleLimited() {
    await expect(this.visibleTitleInput()).toHaveAttribute("maxlength", /^\d+$/, { timeout: 5000 });
  }

  async fillConsultationTitle(title: string) {
    await safeFill(
      this.page.getByRole("textbox", { name: "Enter title", exact: true }).first(),
      title,
    );
  }

  async applyConsultationRichTextFormatting(text: string) {
    const editor = descriptionEditor(this.page);
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    await this.page.keyboard.insertText(text);
    await this.page.keyboard.press("Control+A");
    await this.page.getByRole("radio", { name: "Bold" }).first().click();
    await this.page.getByRole("radio", { name: "Italic" }).first().click();
    await this.page.getByRole("radio", { name: "Underline" }).first().click();
    await expect(editor.locator("strong")).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByRole("radio", { name: "Remove italic" })).toBeVisible({
      timeout: 10000,
    });
    await expect(this.page.getByRole("radio", { name: "Remove underline" })).toBeVisible({
      timeout: 10000,
    });
  }

  async openConsultationAfterSalesPreview() {
    const preview = this.consultationAfterSalesPreviewButton();
    await expect(preview).toBeEnabled({ timeout: 10000 });
    await safeClick(preview);
    await expect(this.consultationAfterSalesPreviewDialog()).toBeVisible({ timeout: 15000 });
  }

  async expectConsultationAfterSalesPreviewReadOnly(options: {
    message: string;
    linkLabel: string;
  }) {
    const dialog = this.consultationAfterSalesPreviewDialog();
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByText(options.message, { exact: false })).toBeVisible({
      timeout: 10000,
    });
    await expect(
      dialog
        .getByRole("link", { name: options.linkLabel })
        .or(dialog.getByText(options.linkLabel, { exact: true }))
        .first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(dialog.locator('[contenteditable="true"]')).toHaveCount(0, { timeout: 10000 });
    await expect(dialog.getByRole("textbox")).toHaveCount(0, { timeout: 10000 });
  }

  async expectConsultationAvailabilityStep() {
    await expect(this.page.getByRole("heading", { name: "Availability*" })).toBeVisible({
      timeout: 30000,
    });
    await expect(this.page.getByRole("button", { name: "Create Consultation" })).toBeVisible({
      timeout: 10000,
    });
  }

  async addConsultationWeekdayTimeSlot(day: string = "Mon") {
    await this.page.getByRole("button", { name: `Add time slot for ${day}` }).click();
    await expect(this.page.getByRole("combobox", { name: `Start time for ${day}` }).first()).toBeVisible({
      timeout: 10000,
    });
  }

  /** The form's sticky header. It sits inside `main`, so it is not a `banner` landmark. */
  private formHeader(): Locator {
    return this.page.locator("main header").filter({ visible: true }).first();
  }

  /** The save and publish buttons in the form header, in order. */
  async readSaveControls(): Promise<string[]> {
    const buttons = this.formHeader().getByRole("button", { name: /Save|Publish|Create Consultation|Draft/ }).filter({ visible: true });
    return (await buttons.allInnerTexts()).map((text) => text.trim());
  }

  /** On create, Step 2's `Save` stores a draft and returns to the products list. */
  async saveConsultationDraftOnCreate() {
    const saved = this.page.waitForResponse((r) => new URL(r.url()).pathname === "/api/v1/shop/products" && r.request().method() === "POST", { timeout: 30000 });
    await safeClick(this.formHeader().getByRole("button", { name: "Save", exact: true }));
    expect((await saved).ok()).toBe(true);
  }

  /** On a published consultation, Step 2's first button `Save as Draft` takes it down at once — no confirmation. */
  async saveConsultationAsDraftFromEdit() {
    let dialogShown = false;
    const onDialog = () => { dialogShown = true; };
    this.page.on("dialog", onDialog);
    const saved = this.page.waitForResponse((r) => /\/api\/v1\/shop\/products\/[0-9a-f-]{36}$/.test(new URL(r.url()).pathname) && r.request().method() === "PUT", { timeout: 30000 });
    await safeClick(this.formHeader().getByRole("button", { name: "Save as Draft", exact: true }));
    expect((await saved).ok()).toBe(true);
    this.page.off("dialog", onDialog);
    expect(dialogShown, "no browser confirm before taking the consultation down").toBe(false);
    await expect(this.page.getByRole("alertdialog")).toHaveCount(0);
  }

  /** The modal after a first publish versus after republishing an edit. */
  async expectPublishModalCopy(copy: { heading: string; body: string }, sharePath: string) {
    const dialog = productCompleteDialog(this.page);
    await expect(dialog).toBeVisible({ timeout: 60000 });
    await expect(dialog).toContainText(copy.heading);
    await expect(dialog).toContainText(copy.body);
    await expect(dialog).toContainText(sharePath);
    await expect(dialog.getByRole("button", { name: "View Product Page" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Copy Link/i }).first()).toBeVisible();
  }

  private priceSwitch(name: string, id: string): Locator {
    return locatorChain(this.page, { role: "switch", name, exact: true, selector: `#${id}` }).filter({ visible: true }).first();
  }

  private flexiblePriceSwitch(): Locator {
    return this.priceSwitch("Allow customers to set their own fair price", "enable-flexible-price");
  }

  private cryptoSwitch(): Locator {
    return this.priceSwitch("Enable Crypto", "enable-crypto");
  }

  private discountSwitch(): Locator {
    return this.priceSwitch("Set Discount", "enable-discount");
  }

  /** Flexible price, crypto and discount all start off. */
  async expectPriceOptionsOff() {
    for (const toggle of [this.flexiblePriceSwitch(), this.cryptoSwitch(), this.discountSwitch()]) {
      await expect(toggle).toHaveAttribute("aria-checked", "false", { timeout: 10000 });
    }
  }

  private async switchOn(toggle: Locator) {
    if ((await toggle.getAttribute("aria-checked")) !== "true") await safeClick(toggle);
    await expect(toggle).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
  }

  /** Flexible pricing turns the price into `Set Minimum Price`. */
  async enableFlexiblePrice(minimum: string) {
    await this.switchOn(this.flexiblePriceSwitch());
    await expect(this.page.getByText(/Set Minimum Price/).filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
    await safeFill(priceInput(this.page), minimum);
  }

  /** Crypto adds a USDT price beside the rupiah one. */
  async enableCrypto(usdt: string) {
    await this.switchOn(this.cryptoSwitch());
    const usdtInput = locatorChain(this.page, { placeholder: "0.001", selector: 'input[placeholder="0.001"]' }).filter({ visible: true }).first();
    await expect(this.page.getByText("USDT", { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
    await safeFill(usdtInput, usdt);
  }

  /**
   * Discount reveals a `Percentage | Fixed` select, the amount, and the resulting price in IDR
   * (filled in by the form). The block is labelled `Set Minimum Discount`.
   */
  async enableDiscount(type: "Percentage" | "Fixed", amount: string, expectedPrice: string) {
    await this.switchOn(this.discountSwitch());
    // The label sits outside the row; the row is the innermost block holding the type select.
    const block = this.page
      .locator("div")
      .filter({ visible: true })
      .filter({ has: this.page.getByRole("combobox").filter({ hasText: /^(Percentage|Fixed)$/ }) })
      .last();
    const typeSelect = block.getByRole("combobox");
    await safeClick(typeSelect);
    await expect(this.page.getByRole("option")).toHaveText(["Percentage", "Fixed"], { timeout: 10000 });
    await this.page.getByRole("option", { name: type, exact: true }).click();
    await safeFill(block.getByRole("textbox").first(), amount);
    await expect(block.getByRole("textbox").last()).toHaveValue(expectedPrice, { timeout: 10000 });
  }

  /** Every day starts Unavailable on a new consultation. */
  async expectAllDaysUnavailable(days: readonly string[]) {
    await this.expectWeeklyTimeControlCount(0);
    for (const day of days) {
      await expect(this.page.getByRole("button", { name: `Add time slot for ${day}` }).filter({ visible: true })).toHaveCount(1);
    }
  }

  async expectConsultationFeedback(message: string, shown: boolean) {
    const feedback = this.page.getByText(message, { exact: true }).filter({ visible: true });
    if (shown) await expect(feedback.first()).toBeVisible({ timeout: 10000 });
    else await expect(feedback).toHaveCount(0, { timeout: 10000 });
  }

  async createConsultation() {
    await this.createConsultationAction.click({ timeout: 10000 });
  }

  async readAppointmentProductUuidFromUrl(): Promise<string> {
    const match = this.page.url().match(/\/products\/update\/appointment\/([^/?#]+)/);
    expect(match?.[1], "expected appointment product uuid in URL").toBeTruthy();
    return match![1];
  }

  async saveAndPublishConsultation() {
    await this.expectConsultationPublishReady();
    const publish = this.page
      .getByRole("button", { name: /Save and Publish|Create Consultation/i })
      .filter({ visible: true })
      .first();
    await safeClick(publish);
  }

  async expectConsultationLiveModalWithSharePath(sharePath: string) {
    const dialog = productCompleteDialog(this.page);
    await expect(dialog).toBeVisible({ timeout: 60000 });
    await expect(dialog).toContainText(consultationMediaData.republishLiveHeading);
    await expect(dialog).toContainText(sharePath);
    await expect(dialog.getByRole("button", { name: "View Product Page" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Copy Link/i }).first()).toBeVisible();
  }

  async useConsultationMobileViewport() {
    await this.page.setViewportSize(consultationNavigationData.mobileViewport);
  }

  async expectConsultationNextCtaStickyAfterScroll() {
    const next = this.visibleConsultationNextCta();
    await expect(next).toBeVisible({ timeout: 10000 });
    const before = await next.boundingBox();
    expect(before, "expected Next CTA box before scroll").toBeTruthy();

    const scrolled = await this.page.evaluate(() => {
      const w = globalThis as unknown as { scrollBy: (x: number, y: number) => void; scrollY: number };
      w.scrollBy(0, 1500);
      return w.scrollY;
    });
    await this.page.waitForTimeout(400);
    expect(scrolled, "the form is long enough to scroll").toBeGreaterThan(0);

    // Sticky means the CTA is still inside the viewport after the content moved under it. Its exact
    // offset shifts by a header's height once scrolling starts, so the position is not compared.
    await expect(next).toBeVisible({ timeout: 10000 });
    const after = await next.boundingBox();
    expect(after, "expected Next CTA box after scroll").toBeTruthy();
    expect(after!.y).toBeGreaterThanOrEqual(0);
    expect(after!.y + after!.height).toBeLessThanOrEqual(consultationNavigationData.mobileViewport.height);
  }

  async navigateAwayFromConsultationViaBack() {
    await this.consultationBackAction.click({ timeout: 10000 });
  }

  async expectConsultationUnsavedChangesDialog() {
    const dialog = this.page
      .getByRole("alertdialog")
      .or(this.page.getByRole("dialog"))
      .filter({ hasText: consultationNavigationData.unsavedDialogPattern })
      .first();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(this.page).toHaveURL(productsCreationData.consultationCreatePath);
  }

  async prepareConsultationDetailsWithoutSubmit(title: string, description: string) {
    await this.fillConsultationTitle(title);
    await this.fillConsultationDescription(description);
    await uploadHero(this.page, consultationMediaData.heroImagePath);
    await uploadGallery(this.page, consultationMediaData.additionalImagePaths);
  }

  async configureConsultationWeekdaySlotRange(day: string, startTime: string, endTime: string) {
    const starts = this.page
      .getByRole("combobox", { name: `Start time for ${day}` })
      .filter({ visible: true });
    if ((await starts.count()) === 0) {
      await this.addConsultationWeekdayTimeSlot(day);
    }

    const start = starts.first();
    await start.click({ timeout: 10000 });
    await this.page.getByRole("option", { name: startTime, exact: true }).click();

    const end = this.page
      .getByRole("combobox", { name: `End time for ${day}` })
      .filter({ visible: true })
      .first();
    await end.click({ timeout: 10000 });
    await this.page.getByRole("option", { name: endTime, exact: true }).click();
  }

  async setConsultationMinimumNoticeHours(hours: number) {
    const notice = this.page
      .getByLabel("Minimum notice value")
      .or(this.page.getByRole("spinbutton", { name: /Minimum notice/i }))
      .filter({ visible: true })
      .first();
    await safeFill(notice, String(hours));
  }

  async expectConsultationPublishReady() {
    const publish = this.page
      .getByRole("button", { name: /Save and Publish|Create Consultation/i })
      .filter({ visible: true })
      .first();
    await expect(publish).toBeEnabled({ timeout: 15000 });
  }

  async openConsultationEditTab(tab: "Details" | "Availability") {
    await this.page.getByRole("tab", { name: tab }).click({ timeout: 10000 });
    await expect(this.page.getByRole("tab", { name: tab })).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 10000 },
    );
  }

  /**
   * The innermost visible block holding a setting's label and the given kind of control. The
   * Availability tab gives its switches ids but leaves its selects and number boxes unnamed, so the
   * label is the stable anchor for all of them (the page also renders a hidden second copy).
   */
  private settingBlock(label: string, control: "switch" | "combobox" | "spinbutton"): Locator {
    return this.page
      .locator("div")
      .filter({ visible: true })
      .filter({ has: this.page.getByText(label, { exact: true }).filter({ visible: true }) })
      .filter({ has: this.page.getByRole(control).filter({ visible: true }) })
      .last();
  }

  private settingSwitch(label: AvailabilitySwitch): Locator {
    return this.settingBlock(label, "switch").getByRole("switch").first();
  }

  async setAvailabilitySwitch(label: AvailabilitySwitch, enable: boolean) {
    const toggle = this.settingSwitch(label);
    await toggle.scrollIntoViewIfNeeded();
    if ((await toggle.getAttribute("aria-checked")) !== String(enable)) await safeClick(toggle);
    await expect(toggle).toHaveAttribute("aria-checked", String(enable), { timeout: 10000 });
  }

  /**
   * The Availability `Status` switch pauses or resumes new bookings. Turning it off asks first
   * (`Make Consultation Inactive?`, scheduled sessions keep running). It is form state, saved as
   * `consultationConfig.isAcceptNewBooking` by the next Save and Publish; the product stays active.
   */
  async setConsultationAcceptingBookings(accepting: boolean, confirmCopy: string) {
    const toggle = this.settingSwitch("Status");
    if ((await toggle.getAttribute("aria-checked")) === String(accepting)) return;
    await safeClick(toggle);
    if (!accepting) {
      const dialog = this.page.getByRole("dialog").filter({ hasText: "Make Consultation Inactive?" });
      await expect(dialog).toContainText(confirmCopy, { timeout: 10000 });
      await dialog.getByRole("button", { name: "Yes, Inactivate" }).click({ timeout: 10000 });
    }
    await expect(toggle).toHaveAttribute("aria-checked", String(accepting), { timeout: 10000 });
  }

  async expectAvailabilitySwitch(label: AvailabilitySwitch, enabled: boolean) {
    await expect(this.settingSwitch(label)).toHaveAttribute("aria-checked", String(enabled), { timeout: 10000 });
  }

  /**
   * The controls a switch reveals for reschedule and booking frequency sit in a sibling block,
   * not beside the label, so they are anchored on their own block's text instead: the
   * `day(s) before session` suffix, and the `Per Day / Per Week / Per Month` select.
   */
  private revealedBlock(label: string): Locator | undefined {
    const visibleDivs = this.page.locator("div").filter({ visible: true });
    if (label === "Allow Buyers to reschedule") {
      return visibleDivs.filter({ has: this.page.getByText("day(s) before session", { exact: true }) }).filter({ has: this.page.getByRole("spinbutton") }).last();
    }
    if (label === "Limit Booking Frequency") {
      return visibleDivs.filter({ has: this.page.getByRole("combobox").filter({ hasText: /^Per (Day|Week|Month)$/ }) }).filter({ has: this.page.getByRole("spinbutton") }).last();
    }
    return undefined;
  }

  /** A preset select under a label: `Availability Range`, `Appointment Duration`, `Before Event`… */
  private settingSelect(label: string, index = 0): Locator {
    return (this.revealedBlock(label) ?? this.settingBlock(label, "combobox")).getByRole("combobox").nth(index);
  }

  async expectSettingOptions(label: string, options: readonly string[], selected: string, index = 0) {
    const select = this.settingSelect(label, index);
    await expect(select).toContainText(selected, { timeout: 10000 });
    await safeClick(select);
    await expect(this.page.getByRole("option")).toHaveText([...options], { timeout: 10000 });
    await this.page.keyboard.press("Escape");
    await expect(this.page.getByRole("option")).toHaveCount(0, { timeout: 5000 });
  }

  async selectSetting(label: string, option: string, index = 0) {
    const select = this.settingSelect(label, index);
    await safeClick(select);
    await this.page.getByRole("option", { name: option, exact: true }).click({ timeout: 10000 });
    await expect(select).toContainText(option, { timeout: 10000 });
  }

  async expectSettingValue(label: string, value: string, index = 0) {
    await expect(this.settingSelect(label, index)).toContainText(value, { timeout: 10000 });
  }

  /** A setting's number box (Minimum Notice, reschedule days, booking frequency count). */
  private settingNumber(label: string): Locator {
    return (this.revealedBlock(label) ?? this.settingBlock(label, "spinbutton")).getByRole("spinbutton").first();
  }

  async fillSettingNumber(label: string, value: number) {
    await safeFill(this.settingNumber(label), String(value));
    await expect(this.settingNumber(label)).toHaveValue(String(value));
  }

  async expectSettingNumber(label: string, value: number, min?: number) {
    await expect(this.settingNumber(label)).toHaveValue(String(value), { timeout: 10000 });
    if (min !== undefined) await expect(this.settingNumber(label)).toHaveAttribute("min", String(min));
  }

  private dayTimeControls(day: string, edge: "Start" | "End"): Locator {
    return this.page.getByRole("combobox", { name: `${edge} time for ${day}` }).filter({ visible: true });
  }

  /** The weekly schedule shows one start and one end control per configured range. */
  async expectWeeklyTimeControlCount(count: number) {
    await expect(this.page.getByRole("combobox", { name: /^(Start|End) time for (Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/ }).filter({ visible: true }))
      .toHaveCount(count, { timeout: 10000 });
  }

  /** The end-time picker lists every 15-minute slot of the day and disables none, even before the start. */
  async expectEndTimeOptions(day: string, count: number) {
    await safeClick(this.dayTimeControls(day, "End").first());
    await expect(this.page.getByRole("option")).toHaveCount(count, { timeout: 10000 });
    await expect(this.page.locator('[role="option"][aria-disabled="true"], [role="option"][data-disabled]')).toHaveCount(0);
    await this.page.keyboard.press("Escape");
  }

  /** Add one more range to a day and set its start and end. */
  async addTimeRange(day: string, start: string, end: string) {
    const before = await this.dayTimeControls(day, "Start").count();
    await safeClick(this.page.getByRole("button", { name: `Add time slot for ${day}` }).filter({ visible: true }).first());
    await expect(this.dayTimeControls(day, "Start")).toHaveCount(before + 1, { timeout: 10000 });
    await this.setTimeRange(day, before, start, end);
  }

  async setTimeRange(day: string, index: number, start: string, end: string) {
    await safeClick(this.dayTimeControls(day, "Start").nth(index));
    await this.page.getByRole("option", { name: start, exact: true }).click({ timeout: 10000 });
    await safeClick(this.dayTimeControls(day, "End").nth(index));
    await this.page.getByRole("option", { name: end, exact: true }).click({ timeout: 10000 });
    await expect(this.dayTimeControls(day, "Start").nth(index)).toContainText(start);
    await expect(this.dayTimeControls(day, "End").nth(index)).toContainText(end);
  }

  /** A day holds at most two ranges; with both set, its Add button is disabled. */
  async expectTimeRangeLimitReached(day: string) {
    await expect(this.dayTimeControls(day, "Start")).toHaveCount(2);
    await expect(this.page.getByRole("button", { name: `Add time slot for ${day}` }).filter({ visible: true }).first()).toBeDisabled();
  }

  async removeTimeRange(day: string, index: number) {
    const before = await this.dayTimeControls(day, "Start").count();
    await safeClick(this.page.getByRole("button", { name: `Remove time slot for ${day}` }).filter({ visible: true }).nth(index));
    await expect(this.dayTimeControls(day, "Start")).toHaveCount(before - 1, { timeout: 10000 });
  }

  /** The day's ranges, in order, as start–end pairs. */
  async expectTimeRanges(day: string, ranges: readonly (readonly [string, string])[]) {
    await expect(this.dayTimeControls(day, "Start")).toHaveText(ranges.map(([start]) => start), { timeout: 10000 });
    await expect(this.dayTimeControls(day, "End")).toHaveText(ranges.map(([, end]) => end));
  }

  /** Buffer Time is two preset selects (Before Event, After Event) and no free-text box. */
  async expectBufferHasNoTextInput() {
    const block = this.page
      .locator("div")
      .filter({ visible: true })
      .filter({ has: this.page.getByText("Before Event", { exact: true }).filter({ visible: true }) })
      .filter({ has: this.page.getByText("After Event", { exact: true }).filter({ visible: true }) })
      .last();
    await expect(block.getByRole("combobox")).toHaveCount(2);
    await expect(block.getByRole("textbox")).toHaveCount(0);
    await expect(block.getByRole("spinbutton")).toHaveCount(0);
  }

  /** The sentence under the reschedule switch and the label beside its number box. */
  async readRescheduleCopy(): Promise<{ helper: string; fieldLabel: string }> {
    const helper = await this.page.getByText(/^Buyers can reschedule/).filter({ visible: true }).first().innerText();
    const fieldLabel = await this.page.getByText(/before session/).filter({ visible: true }).first().innerText();
    return { helper, fieldLabel };
  }

  /** The timezone picker: its default, the number of entries, and a search that narrows them. */
  async expectTimezonePicker(timezone: { label: string; options: number; searchPlaceholder: string; search: string }) {
    await this.expectAvailabilityTimezone(timezone.label);
    await safeClick(this.page.getByText(timezone.label, { exact: true }).filter({ visible: true }).first());
    await expect(this.page.getByRole("option")).toHaveCount(timezone.options, { timeout: 10000 });
    await this.page.getByPlaceholder(timezone.searchPlaceholder).fill(timezone.search);
    await expect.poll(() => this.page.getByRole("option").count(), { timeout: 10000 }).toBeLessThan(timezone.options);
    for (const option of await this.page.getByRole("option").allInnerTexts()) expect(option.toLowerCase()).toContain(timezone.search.toLowerCase());
    await this.page.keyboard.press("Escape");
  }

  async expectAvailabilityTimezone(timezone: string) {
    await expect(this.page.getByText(timezone, { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
  }

  async reloadConsultationEditor() {
    await this.page.reload({ waitUntil: "domcontentloaded" });
    await expect(this.page).toHaveURL(/\/products\/(?:create|update)\/consultation|\/products\/update\/appointment\//, {
      timeout: 30000,
    });
    await expect(this.page.getByRole("textbox", { name: "Enter title", exact: true }).first()).toBeVisible({
      timeout: 30000,
    });
  }

  async enableConsultationAfterSalesMessage() {
    const toggle = this.afterSalesCustomizeSwitch();
    if ((await toggle.getAttribute("aria-checked")) !== "true") {
      await toggle.click({ timeout: 10000 });
    }
    await expect(this.afterSalesMessageEditor()).toBeVisible({ timeout: 10000 });
  }

  async disableConsultationAfterSalesMessage() {
    const toggle = this.afterSalesCustomizeSwitch();
    if ((await toggle.getAttribute("aria-checked")) !== "false") {
      await toggle.click({ timeout: 10000 });
    }
    await expect(this.afterSalesMessageEditor()).toBeHidden({ timeout: 5000 });
  }

  get afterSalesSwitchChecked(): Promise<string | null> {
    return this.afterSalesCustomizeSwitch().getAttribute("aria-checked");
  }

  async expectAfterSalesToggleOff() {
    const checked = await this.afterSalesCustomizeSwitch().getAttribute("aria-checked");
    expect(checked, "Customize Message toggle should be off").toBe("false");
  }

  /** Customize Message on, its editor and the 0/1000 counter exposed, under the purpose copy. */
  async expectAfterSalesDefaultOn(purposeCopy: string, emptyCounter: string) {
    await expect(this.afterSalesCustomizeSwitch()).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
    await expect(this.page.getByText(purposeCopy, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(this.afterSalesMessageEditor()).toBeVisible();
    await expect(this.page.getByText(emptyCounter, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  }

  async expectAfterSalesCounter(text: string) {
    await expect(this.page.getByText(text, { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
  }

  async clearConsultationAfterSalesMessage() {
    await this.enableConsultationAfterSalesMessage();
    const editor = this.afterSalesMessageEditor();
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
  }

  async expectAfterSalesMessageBlocked() {
    await expect(this.page.getByText(/please fill|required|enter a message/i).first()).toBeVisible({ timeout: 5000 });
  }

  async fillConsultationAfterSalesMessage(message: string) {
    await this.enableConsultationAfterSalesMessage();
    const editor = this.afterSalesMessageEditor();
    await editor.scrollIntoViewIfNeeded();
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.insertText(message);
    await expect(editor).toContainText(message, { timeout: 10000 });
  }

  async expectConsultationAfterSalesMessage(message: string) {
    await this.openConsultationEditTab("Details");
    await this.enableConsultationAfterSalesMessage();
    await expect(this.afterSalesMessageEditor()).toContainText(message, { timeout: 10000 });
  }

  async saveAndPublishConsultationFromEdit() {
    await this.saveAndPublishConsultation();
    const dialog = productCompleteDialog(this.page);
    if (await dialog.isVisible().catch(() => false)) {
      await closeProductCompleteModal(this.page);
    }
    await expect(this.page).toHaveURL(/\/products(?:\?|$)|\/products\/update\/appointment\//, {
      timeout: 30000,
    });
  }

}
