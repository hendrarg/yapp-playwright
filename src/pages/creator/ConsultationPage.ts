import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartLocator } from "@utils/heal-utils";
import { safeClick, safeFill } from "@utils/playwright.utils";
import {
  closeProductCompleteModal,
  expectProductCompleteModal,
  fillPrice,
  readProductCompleteSharePath,
  setPricingEnabled,
  uploadGallery,
  uploadHero,
} from "@helpers/creator/product-editor";
import {
  afterSalesSection,
  descriptionEditor,
  priceInput,
  productCompleteDialog,
  textFeedback,
  titleInput,
} from "@pages/shared/locators";
import { consultationConfigData } from "@test-data/creator/consultation.config.data";
import { consultationLifecycleData, consultationWeekdayLabel } from "@test-data/creator/consultation.lifecycle.data";
import { consultationMediaData } from "@test-data/creator/consultation.media.data";
import { consultationNavigationData } from "@test-data/creator/consultation.navigation.data";
import { consultationPricingData } from "@test-data/creator/consultation.pricing.data";
import { consultationValidationData } from "@test-data/creator/consultation.validation.data";
import { productsCreationData } from "@test-data/creator/products.creation.data";

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

  private afterSalesCustomizeSwitch(): Locator {
    return this.page
      .getByLabel("Details")
      .getByText("Customize Message")
      .locator("xpath=preceding::*[@role='switch'][1]");
  }

  private afterSalesMessageEditor(): Locator {
    return this.page
      .getByLabel("Details")
      .locator('[contenteditable="true"][role="textbox"]')
      .nth(1);
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
    await expect(titleInput(this.page)).toBeVisible({ timeout: 30000 });
    await expect(this.page.getByRole("button", { name: "Next: Set Availability" })).toBeVisible({
      timeout: 10000,
    });
    await expect(this.page.getByText("Buyer Form")).toBeVisible({ timeout: 10000 });
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

  async expectConsultationTitleRequired() {
    await expect(textFeedback(this.page, consultationValidationData.titleRequiredError)).toBeVisible({
      timeout: 10000,
    });
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

  async makeConsultationUnsavedChanges(title: string, description: string) {
    await this.fillConsultationTitle(title);
    await this.fillConsultationDescription(description);
  }

  async expectConsultationNextCtaStickyAfterScroll() {
    const next = this.visibleConsultationNextCta();
    await expect(next).toBeVisible({ timeout: 10000 });
    const before = await next.boundingBox();
    expect(before, "expected Next CTA box before scroll").toBeTruthy();

    await this.page.evaluate(() => {
      const w = globalThis as unknown as { scrollBy: (x: number, y: number) => void };
      w.scrollBy(0, 1500);
    });
    await this.page.waitForTimeout(400);

    await expect(next).toBeVisible({ timeout: 10000 });
    const after = await next.boundingBox();
    expect(after, "expected Next CTA box after scroll").toBeTruthy();
    expect(after!.y).toBeGreaterThanOrEqual(0);
    expect(after!.y).toBeLessThan(consultationNavigationData.mobileViewport.height);
    // Sticky bottom CTA should stay near the same viewport Y after scroll.
    expect(Math.abs(after!.y - before!.y)).toBeLessThan(40);
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

  async expectConsultationZeroPriceRejected() {
    await expect(this.page).toHaveURL(productsCreationData.consultationCreatePath);
    await expect(this.page.getByRole("heading", { name: "Availability*" })).toHaveCount(0, {
      timeout: 10000,
    });
    const error = this.page.getByText(consultationPricingData.zeroPriceErrorPattern);
    if (await error.isVisible().catch(() => false)) {
      await expect(error).toBeVisible();
      return;
    }
    await expect(priceInput(this.page)).toBeVisible({ timeout: 10000 });
    await expect(
      this.page.getByRole("button", { name: "Next: Set Availability" }),
    ).toBeVisible({ timeout: 10000 });
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

  async publishConsultationWithMinimumNotice(
    title: string,
    description: string,
    options: {
      minimumNoticeHours: number;
      price?: string;
      pricingEnabled?: boolean;
      weekday?: string;
      startTime?: string;
      endTime?: string;
    },
  ): Promise<string> {
    await this.prepareConsultationDetailsWithoutSubmit(title, description);

    if (options.pricingEnabled === false) {
      await setPricingEnabled(this.page, false);
    } else {
      await setPricingEnabled(this.page, true);
      await fillPrice(this.page, options.price ?? consultationPricingData.validPrice);
    }

    await this.submitConsultationDetails();
    await this.expectConsultationAvailabilityStep();
    await this.setConsultationMinimumNoticeHours(options.minimumNoticeHours);

    const weekday = options.weekday ?? consultationWeekdayLabel();
    await this.configureConsultationWeekdaySlotRange(
      weekday,
      options.startTime ?? consultationPricingData.slotStartTime,
      options.endTime ?? consultationPricingData.slotEndTime,
    );
    await this.saveAndPublishConsultation();
    await expectProductCompleteModal(this.page);
    const sharePath = await readProductCompleteSharePath(this.page);
    await closeProductCompleteModal(this.page);
    return sharePath;
  }

  async prepareConsultationDetailsForAvailability(title: string, description: string) {
    await this.fillConsultationTitle(title);
    await this.fillConsultationDescription(description);
    await uploadHero(this.page, consultationMediaData.heroImagePath);
    await uploadGallery(this.page, consultationMediaData.additionalImagePaths);
    await fillPrice(this.page, consultationLifecycleData.price);
    await this.submitConsultationDetails();
    await this.expectConsultationAvailabilityStep();
  }

  async setConsultationMinimumNoticeHours(hours: number) {
    const notice = this.page
      .getByLabel("Minimum notice value")
      .or(this.page.getByRole("spinbutton", { name: /Minimum notice/i }))
      .filter({ visible: true })
      .first();
    await safeFill(notice, String(hours));
  }

  async configureConsultationWeekdaySlot(day: string) {
    const starts = this.page
      .getByRole("combobox", { name: `Start time for ${day}` })
      .filter({ visible: true });
    if ((await starts.count()) === 0) {
      await this.addConsultationWeekdayTimeSlot(day);
    }

    const start = this.page
      .getByRole("combobox", { name: `Start time for ${day}` })
      .filter({ visible: true })
      .first();
    await start.click({ timeout: 10000 });
    await this.page.getByRole("option").first().click();

    const end = this.page
      .getByRole("combobox", { name: `End time for ${day}` })
      .filter({ visible: true })
      .first();
    await end.click({ timeout: 10000 });
    await this.page.getByRole("option").last().click();
  }

  async expectConsultationPublishReady() {
    const publish = this.page
      .getByRole("button", { name: /Save and Publish|Create Consultation/i })
      .filter({ visible: true })
      .first();
    await expect(publish).toBeEnabled({ timeout: 15000 });
  }

  async saveConsultationAsDraft() {
    await safeClick(this.page.getByRole("button", { name: "Save as Draft", exact: true }));
    await expect(this.page).toHaveURL(/\/products(?:\?|$)/, { timeout: 60000 });
  }

  async openConsultationEditTab(tab: "Details" | "Availability") {
    await this.page.getByRole("tab", { name: tab }).click({ timeout: 10000 });
    await expect(this.page.getByRole("tab", { name: tab })).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 10000 },
    );
  }

  async expectConsultationWeekdaySlotConfigured(day: string) {
    await expect(
      this.page.getByRole("combobox", { name: `Start time for ${day}` }).first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByRole("combobox", { name: `End time for ${day}` }).first()).toBeVisible({
      timeout: 10000,
    });
  }

  async expectAvailabilityControlsVisible() {
    await expect(this.page.getByRole("heading", { name: "Availability*" })).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText("Availability Range").first()).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText("Appointment Duration").first()).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText("Minimum Notice").first()).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText("Buffer Time").first()).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText("Allow Buyers to reschedule").first()).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText("Limit Booking Frequency").first()).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByText("Timezone").first()).toBeVisible({ timeout: 5000 });
  }

  async toggleBufferTime(enable: boolean) {
    const switchEl = this.page.locator('[role="switch"]').nth(2);
    await switchEl.scrollIntoViewIfNeeded();
    const checked = await switchEl.getAttribute("aria-checked");
    if ((checked === "true") !== enable) {
      await switchEl.click();
      await this.page.waitForTimeout(500);
    }
  }

  async toggleReschedule(enable: boolean) {
    const switchEl = this.page.locator('[role="switch"]').nth(3);
    await switchEl.scrollIntoViewIfNeeded();
    const checked = await switchEl.getAttribute("aria-checked");
    if ((checked === "true") !== enable) {
      await switchEl.click();
      await this.page.waitForTimeout(500);
    }
  }

  async toggleBookingFrequency(enable: boolean) {
    const switchEl = this.page.locator('[role="switch"]').nth(4);
    await switchEl.scrollIntoViewIfNeeded();
    const checked = await switchEl.getAttribute("aria-checked");
    if ((checked === "true") !== enable) {
      await switchEl.click();
      await this.page.waitForTimeout(500);
    }
  }

  async setAvailabilityRange(value: string) {
    const combo = this.page.locator('[role="combobox"]').filter({ hasText: /months|weeks/i }).first();
    await combo.click();
    await this.page.waitForTimeout(300);
    await this.page.getByRole("option", { name: value }).click();
  }

  async setAppointmentDuration(value: string) {
    const combo = this.page.locator('[role="combobox"]').filter({ hasText: /hour|minute/i }).first();
    await combo.click();
    await this.page.waitForTimeout(300);
    await this.page.getByRole("option", { name: value }).click();
  }

  async expectAvailabilityRangeValue(expected: string) {
    await expect(
      this.page.locator('[role="combobox"]').filter({ hasText: /months|weeks/i }).first()
    ).toContainText(expected, { timeout: 5000 });
  }

  async expectAppointmentDurationValue(expected: string) {
    await expect(
      this.page.locator('[role="combobox"]').filter({ hasText: /hour|minute/i }).first()
    ).toContainText(expected, { timeout: 5000 });
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

  async expectAfterSalesToggleOn() {
    const checked = await this.afterSalesCustomizeSwitch().getAttribute("aria-checked");
    expect(checked, "Customize Message toggle should be on").toBe("true");
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
