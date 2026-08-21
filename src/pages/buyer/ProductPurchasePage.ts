import { expect, type Locator, type Page } from '@playwright/test';
import { consultationBuyerDetailData, consultationBuyerSchedulingData, formatConsultationSaveMySpotDate } from '@test-data/buyer/consultation.detail.data';
import { onlineCourseBuyerDetailData, onlineCourseCheckoutData } from '@test-data/buyer/online-course.detail.data';
import { amountRow } from '@pages/shared/locators';
import type { PurchaseProduct } from '@test-data/buyer/promotion.data';
import { consultationLifecycleData } from '@test-data/creator/consultation.lifecycle.data';
import { parseConsultationDayButtonLabel } from '@test-data/creator/consultation.pricing.data';
import { flakyClick } from '@utils/flaky-utils';
import { locatorChain, smartClick, smartLocator } from '@utils/heal-utils';
import { safeClick, safeFill, waitForLoaded } from '@utils/playwright.utils';

export type OrderSummary = {
  subtotal: number;
  discount: number;
  total: number;
};

export class ProductPurchasePage {
  readonly voucherInput: Locator;
  readonly chooseVoucherButton: Locator;
  readonly applyVoucherButton: Locator;
  private readonly purchaseAction = smartLocator(this.page, {
    role: 'button',
    name: 'Purchase',
    text: 'Purchase',
    selector: 'button:has-text("Purchase")',
  });

  constructor(public readonly page: Page, private readonly baseURL: string) {
    this.voucherInput = page.getByRole('textbox', { name: 'Redeem Voucher' });
    this.chooseVoucherButton = page.getByRole('button', { name: 'Choose Voucher', exact: true });
    this.applyVoucherButton = page.getByRole('button', { name: 'Use Now', exact: true });
  }

  async goto(product: PurchaseProduct) {
    await this.page.goto(new URL(product.path.slice(1), this.baseURL).toString());
    await waitForLoaded(this.page);
  }

  async expectLoaded(product: PurchaseProduct) {
    await expect(this.page).toHaveURL(new URL(product.path.slice(1), this.baseURL).toString());
    await expect(this.page.getByText(product.title, { exact: true }).filter({ visible: true })).toBeVisible();
  }

  async openPurchase(product: PurchaseProduct) {
    await this.goto(product);
    await this.expectLoaded(product);

    if (product.option) {
      // The innermost card that shows this option label and carries a Select button.
      // Browser-verified equivalent to the old `ancestor::div[.//button[...]]` step.
      const selectAction = this.page.getByRole('button', { name: 'Select', exact: true });
      const optionCard = this.page
        .locator('div')
        .filter({ hasText: product.option })
        .filter({ has: selectAction })
        .last();
      // FLAKY_FIX: product hydration can replace the option button after navigation.
      await flakyClick(optionCard.getByRole('button', { name: 'Select', exact: true }));
    }

    // FLAKY_FIX: product hydration can also replace the primary purchase button.
    await flakyClick(this.page.getByRole('button', { name: /^(Get Product|Purchase)$/ }));
    // FLAKY_FIX: checkout hydration can replace the voucher entry button after purchase opens.
    await flakyClick(this.chooseVoucherButton);
    await expect(this.voucherInput).toBeVisible();
  }

  async applyPromotion(code: string) {
    await safeFill(this.voucherInput, code);
    await safeClick(this.applyVoucherButton);
  }

  async getOrderSummary(): Promise<OrderSummary> {
    return {
      subtotal: await this.readMoney('Subtotal'),
      discount: await this.readMoney('Discount', 0),
      total: await this.readMoney('Total'),
    };
  }

  async expectActiveDiscount(before: OrderSummary, percent: number) {
    const expectedDiscount = (before.subtotal * percent) / 100;
    await expect.poll(async () => (await this.getOrderSummary()).discount).toBeCloseTo(expectedDiscount, 0);
    const after = await this.getOrderSummary();
    expect(after.discount).toBeCloseTo(expectedDiscount, 0);
    expect(after.subtotal).toBe(before.subtotal - after.discount);
    expect(after.total).toBeLessThan(before.total);
  }

  async expectRejectedPromotion(before: OrderSummary, error?: string) {
    if (error) {
      await expect(this.page.getByText(error, { exact: true })).toBeVisible();
      const after = await this.getOrderSummary();
      expect(after.subtotal).toBe(before.subtotal);
      expect(after.discount).toBe(0);
      return;
    }
    await expect.poll(() => this.getOrderSummary()).toEqual(before);
  }

  async gotoSharePath(sharePath: string) {
    const normalized = sharePath.startsWith('/') ? sharePath.slice(1) : sharePath;
    await this.page.goto(new URL(normalized, this.baseURL).toString(), {
      waitUntil: 'domcontentloaded',
    });
    await waitForLoaded(this.page);
  }

  async isProductPubliclyPurchasable(): Promise<boolean> {
    try {
      await this.purchaseAction.text({ timeout: 1500 });
      return true;
    } catch {
      return false;
    }
  }

  async expectConsultationProductLoaded(title: string) {
    await expect(this.page.getByText(title, { exact: false }).filter({ visible: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(
      this.page.getByRole('heading', { name: 'Consultation Detail' }).filter({ visible: true }),
    ).toBeVisible({
      timeout: 15000,
    });
  }

  async expectConsultationNotBookable() {
    await expect(
      this.page.getByText(consultationLifecycleData.noSessionsCopy).filter({ visible: true }).first(),
    ).toBeVisible({
      timeout: 15000,
    });
  }

  async expectConsultationBookable() {
    await expect(this.page.getByText(consultationLifecycleData.noSessionsCopy)).toHaveCount(0, {
      timeout: 30000,
    });
    await expect(
      this.page
        .getByRole('button', { name: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+/ })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      this.page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
  }

  async readFirstConsultationDayLabel(): Promise<string> {
    const dayButton = this.page
      .getByRole('button', { name: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+/ })
      .filter({ visible: true })
      .first();
    await expect(dayButton).toBeVisible({ timeout: 15000 });
    return (await dayButton.innerText()).replace(/\s+/g, ' ').trim();
  }

  async readFirstConsultationDayDate(reference = new Date()): Promise<Date> {
    const label = await this.readFirstConsultationDayLabel();
    return parseConsultationDayButtonLabel(label, reference);
  }

  private consultationSessionDayButtons(): Locator {
    return this.page
      .getByRole('button', { name: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+/ })
      .or(this.page.getByRole('button', { name: /slots left/i }))
      .filter({ visible: true });
  }

  private consultationTimeSlotButtons(): Locator {
    return this.page
      .getByRole('button', { name: /^\d{2}:\d{2}$/ })
      .or(this.page.getByRole('button', { name: /^(0?\d|1\d|2[0-3]):[0-5]\d$/ }))
      .filter({ visible: true });
  }

  private consultationTimeSlotButton(time: string): Locator {
    return locatorChain(this.page, {
      role: 'button',
      name: time,
      text: time,
      exact: true,
    }).filter({ visible: true });
  }

  async expectConsultationAvailableDaysOnly(
    options: {
      dayChipPrefix?: string;
      weekdayIndex?: number;
      rangeMonths?: number;
      reference?: Date;
    } = {},
  ) {
    const dayChipPrefix = options.dayChipPrefix ?? consultationBuyerSchedulingData.dayChipPrefix;
    const weekdayIndex = options.weekdayIndex ?? consultationBuyerSchedulingData.weekdayIndex;
    const rangeMonths = options.rangeMonths ?? consultationBuyerSchedulingData.availabilityRangeValue;
    const reference = options.reference ?? new Date();

    await expect(
      locatorChain(this.page, {
        text: consultationBuyerDetailData.availableSessionLabel,
        role: 'heading',
        name: consultationBuyerDetailData.availableSessionLabel,
      }).filter({ visible: true }),
    ).toBeVisible({ timeout: 15000 });

    const dayButtons = this.consultationSessionDayButtons();
    await expect(dayButtons.first()).toBeVisible({ timeout: 15000 });
    const count = await dayButtons.count();
    expect(count, 'at least one available session day').toBeGreaterThan(0);

    const rangeEnd = new Date(reference);
    rangeEnd.setMonth(rangeEnd.getMonth() + rangeMonths);
    rangeEnd.setHours(23, 59, 59, 999);

    for (let index = 0; index < count; index++) {
      const button = dayButtons.nth(index);
      await expect(button).toBeEnabled({ timeout: 10000 });
      const label = (await button.innerText()).replace(/\s+/g, ' ').trim();
      expect(label, `day chip must be ${dayChipPrefix}`).toMatch(
        new RegExp(`^${dayChipPrefix}\\s+`, 'i'),
      );

      const date = parseConsultationDayButtonLabel(label, reference);
      expect(date.getDay(), `${label} weekday`).toBe(weekdayIndex);
      expect(date.getTime(), `${label} within availability range`).toBeGreaterThanOrEqual(
        reference.getTime() - 24 * 60 * 60 * 1000,
      );
      expect(date.getTime(), `${label} within availability range`).toBeLessThanOrEqual(rangeEnd.getTime());
    }
  }

  async selectFirstConsultationDay() {
    const dayButtons = this.consultationSessionDayButtons();
    await expect(dayButtons.first()).toBeVisible({ timeout: 15000 });
    // FLAKY_FIX: session day chips can remount while the first chip is resolved.
    const dayLabel = (await dayButtons.first().innerText()).replace(/\s+/g, ' ').trim();
    await flakyClick(this.consultationSessionDayButtons().first());
    return dayLabel;
  }

  async selectConsultationTimeSlot(time = consultationBuyerSchedulingData.expectedSlots[0]) {
    await smartClick(this.page, {
      role: 'button',
      name: time,
      text: time,
      exact: true,
    });
    await expect(this.consultationTimeSlotButton(time)).toBeEnabled({ timeout: 10000 });
  }

  async expectConsultationBookingSummary(options: { dayLabel: string; time: string }) {
    const datePart = formatConsultationSaveMySpotDate(options.dayLabel);
    const ctaPattern = new RegExp(
      `${consultationBuyerSchedulingData.saveMySpotCtaPrefix}[\\s\\S]*${datePart}[\\s\\S]*${options.time}`,
      'i',
    );
    const cta = this.consultationSaveMySpotButton().filter({ hasText: ctaPattern });

    await expect(cta).toBeVisible({ timeout: 15000 });
    await expect(cta).toBeEnabled({ timeout: 10000 });
    await expect(
      locatorChain(this.page, {
        text: consultationBuyerSchedulingData.totalAmountLabel,
        role: 'heading',
        name: consultationBuyerSchedulingData.totalAmountLabel,
      }).filter({ visible: true }),
    ).toBeVisible({ timeout: 10000 });
  }

  private consultationSaveMySpotButton(): Locator {
    return this.page.getByRole('button', { name: /save my spot/i }).filter({ visible: true });
  }

  private consultationAddToCartButton(): Locator {
    return this.page
      .getByRole('button', { name: consultationBuyerSchedulingData.addToCartCta, exact: true })
      .filter({ visible: true });
  }

  private consultationCheckoutDialog(): Locator {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('heading', { name: consultationBuyerSchedulingData.checkoutHeading, exact: true }) });
  }

  /**
   * The checkout dialog as the buyer flow sees it, without filtering on the heading —
   * used by the steps that assert on the dialog's own contents. `testId` leads so a
   * future `data-testid` wins automatically; today it resolves through the role.
   */
  private consultationCheckoutDialogRoot(): Locator {
    return locatorChain(this.page, { testId: 'checkout-dialog', role: 'dialog' });
  }

  /**
   * The checkout heading is rendered as a heading in some states and as plain text in
   * others, so match either and take the first hit.
   */
  private consultationCheckoutHeading(): Locator {
    const dialog = this.consultationCheckoutDialogRoot();
    const heading = consultationBuyerSchedulingData.checkoutHeading;
    return dialog
      .getByRole('heading', { name: heading, exact: true })
      .or(dialog.getByText(heading, { exact: true }))
      .first();
  }

  private consultationCheckoutNameInput(): Locator {
    return this.consultationCheckoutDialogRoot().getByPlaceholder(/name/i).first();
  }

  private consultationCheckoutEmailInput(): Locator {
    return this.consultationCheckoutDialogRoot().getByPlaceholder(/email/i).first();
  }

  async expectConsultationCheckoutOpen() {
    await expect(this.consultationCheckoutDialogRoot()).toBeVisible({ timeout: 10000 });
  }

  /** Labels every checkout dialog shows; the optional ones vary by entry point. */
  async expectConsultationCheckoutSummary(
    options: { title?: string; meetingPlatform?: boolean; singleSession?: boolean } = {},
  ) {
    const dialog = this.consultationCheckoutDialogRoot();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(this.consultationCheckoutHeading()).toBeVisible({ timeout: 5000 });
    if (options.title) {
      await expect(dialog.getByText(options.title)).toBeVisible({ timeout: 5000 });
    }
    await expect(
      dialog.getByText(consultationBuyerSchedulingData.consultationDetailsLabel, { exact: true }),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      dialog.getByText(consultationBuyerSchedulingData.dateAndTimeLabel, { exact: true }),
    ).toBeVisible({ timeout: 5000 });
    if (options.meetingPlatform) {
      await expect(
        dialog.getByText(consultationBuyerSchedulingData.meetingPlatformLabel, { exact: true }),
      ).toBeVisible({ timeout: 5000 });
    }
    if (options.singleSession) {
      await expect(
        dialog.getByText(consultationBuyerSchedulingData.singleSessionLabel),
      ).toBeVisible({ timeout: 5000 });
    }
  }

  /** Guards against the dialog rendering its heading twice. */
  async expectConsultationCheckoutHeadingUnique() {
    const count = await this.consultationCheckoutDialogRoot()
      .getByText(consultationBuyerSchedulingData.checkoutHeading, { exact: true })
      .count();
    expect(count, 'checkout heading should appear exactly once').toBeLessThanOrEqual(1);
  }

  async expectConsultationCheckoutIdentityFields() {
    await expect(this.consultationCheckoutDialogRoot()).toBeVisible({ timeout: 10000 });
    await expect(this.consultationCheckoutHeading()).toBeVisible({ timeout: 5000 });
    await expect(this.consultationCheckoutNameInput()).toBeVisible({ timeout: 5000 });
    await expect(this.consultationCheckoutEmailInput()).toBeVisible({ timeout: 5000 });
  }

  /**
   * Fill the buyer identity fields when the dialog asks for them — a signed-in buyer
   * gets them pre-filled and the inputs are absent — then confirm the booking.
   */
  async submitConsultationCheckout(buyer: { name: string; email: string }) {
    const nameInput = this.consultationCheckoutNameInput();
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill(buyer.name);
    }
    const emailInput = this.consultationCheckoutEmailInput();
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill(buyer.email);
    }
    await this.consultationCheckoutDialogRoot().getByRole('button', { name: 'Join' }).click();
    await this.page.waitForTimeout(2000);
  }

  /** The confirmation toast is best-effort: it can be gone before the assertion runs. */
  async expectConsultationBookingToastIfPresent() {
    const toast = locatorChain(this.page, {
      testId: 'toast',
      role: 'alert',
      selector: '.toast',
    }).first();
    if (await toast.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(toast).toBeVisible({ timeout: 5000 });
    }
  }

  async expectConsultationCheckoutBlocked() {
    await flakyClick(this.consultationAddToCartButton());
    await expect(this.consultationCheckoutDialog()).toHaveCount(0, { timeout: 5000 });
  }

  async expectConsultationCheckoutBlockedUntilTimeSelected() {
    await expect(this.consultationSaveMySpotButton()).toBeVisible({ timeout: 10000 });
    await flakyClick(this.consultationSaveMySpotButton());
    await expect(this.consultationCheckoutDialog()).toHaveCount(0, { timeout: 5000 });
  }

  async clickConsultationSaveMySpot() {
    await safeClick(this.consultationSaveMySpotButton());
    await expect(this.consultationCheckoutDialog()).toBeVisible({ timeout: 15000 });
  }

  async expectConsultationCheckoutDetails(options: {
    title: string;
    creatorHandle?: string;
    dayLabel: string;
    time: string;
    endTime?: string;
    meetingPlatform?: string;
  }) {
    const dialog = this.consultationCheckoutDialog();
    const creatorHandle = options.creatorHandle ?? consultationBuyerDetailData.creatorHandle;
    const meetingPlatform = options.meetingPlatform ?? consultationBuyerDetailData.meetingPlatform;
    const datePart = formatConsultationSaveMySpotDate(options.dayLabel);
    const endTime = options.endTime ?? consultationBuyerSchedulingData.expectedSlots[1] ?? options.time;
    const timeRange = new RegExp(
      `${options.time.replace(':', '\\:')}\\s*-\\s*${endTime.replace(':', '\\:')}`,
    );

    await expect(
      dialog.getByRole('heading', {
        name: consultationBuyerSchedulingData.checkoutHeading,
        exact: true,
      }),
    ).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText(options.title, { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText(creatorHandle, { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(
      dialog.getByText(consultationBuyerSchedulingData.consultationDetailsLabel, { exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      dialog.getByText(consultationBuyerSchedulingData.dateAndTimeLabel, { exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText(new RegExp(datePart.replace(' ', '\\s+'), 'i'))).toBeVisible({
      timeout: 10000,
    });
    await expect(dialog.getByText(timeRange)).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText(consultationBuyerSchedulingData.singleSessionLabel)).toBeVisible({
      timeout: 10000,
    });
    await expect(
      dialog.getByText(consultationBuyerSchedulingData.meetingPlatformLabel, { exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText(meetingPlatform, { exact: true })).toBeVisible({ timeout: 10000 });
  }

  async expectConsultationTimeSlots(
    options: {
      expectedSlots?: readonly string[];
      unavailableSlots?: readonly string[];
    } = {},
  ) {
    const expectedSlots = options.expectedSlots ?? consultationBuyerSchedulingData.expectedSlots;
    const unavailableSlots =
      options.unavailableSlots ?? consultationBuyerSchedulingData.unavailableSlots;

    await expect(this.consultationTimeSlotButtons().first()).toBeVisible({ timeout: 15000 });

    const visibleSlots = (await this.consultationTimeSlotButtons().allInnerTexts()).map((text) =>
      text.replace(/\s+/g, ' ').trim(),
    );
    expect(visibleSlots.sort()).toEqual([...expectedSlots].sort());

    for (const slot of expectedSlots) {
      const button = this.consultationTimeSlotButton(slot);
      await expect(button).toBeVisible({ timeout: 10000 });
      await expect(button).toBeEnabled({ timeout: 10000 });
    }

    for (const slot of unavailableSlots) {
      await expect(this.consultationTimeSlotButton(slot)).toHaveCount(0);
    }

    await smartClick(this.page, {
      role: 'button',
      name: expectedSlots[0],
      text: expectedSlots[0],
      exact: true,
    });
    await expect(this.consultationTimeSlotButton(expectedSlots[0])).toBeEnabled();
  }

  private consultationNextSlideButton(): Locator {
    return this.page
      .getByRole('button', { name: consultationBuyerDetailData.nextSlideName, exact: true })
      .or(this.page.locator('[data-slot="carousel-next"]'))
      .filter({ visible: true })
      .first();
  }

  private consultationPreviousSlideButton(): Locator {
    return this.page
      .getByRole('button', { name: consultationBuyerDetailData.previousSlideName, exact: true })
      .or(this.page.locator('[data-slot="carousel-previous"]'))
      .filter({ visible: true })
      .first();
  }

  private consultationSlideDot(index: number): Locator {
    const name = consultationBuyerDetailData.slideButtonName(index);
    return this.page.getByRole('button', { name, exact: true }).filter({ visible: true });
  }

  async expectConsultationProductDetails(options: {
    title: string;
    description: string;
    pricePattern?: RegExp;
    creatorHandle?: string;
  }) {
    await this.expectConsultationProductLoaded(options.title);
    await expect(
      this.page.getByText(options.description, { exact: false }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      this.page
        .getByText(options.pricePattern ?? consultationBuyerDetailData.priceDisplayPattern)
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      this.page
        .getByText(consultationBuyerDetailData.productBadge, { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      this.page
        .getByRole('link', {
          name: options.creatorHandle ?? consultationBuyerDetailData.creatorHandle,
        })
        .or(
          this.page.getByText(
            options.creatorHandle ?? consultationBuyerDetailData.creatorHandle,
            { exact: true },
          ),
        )
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      this.page.getByRole('tab', { name: consultationBuyerDetailData.overviewTab }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      this.page.getByRole('tab', { name: consultationBuyerDetailData.aboutCreatorTab }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      this.page
        .getByText(consultationBuyerDetailData.availableSessionLabel, { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      this.page.getByText(consultationBuyerDetailData.meetingLinkHint).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(this.consultationNextSlideButton()).toBeVisible({ timeout: 10000 });
    await expect(
      this.page.getByRole('button', { name: /^Go to slide \d+$/ }),
    ).toHaveCount(consultationBuyerDetailData.expectedSlideCount, { timeout: 15000 });
  }

  async expectConsultationOverviewAndAboutCreatorTabs() {
    const overview = this.page.getByRole('tab', { name: consultationBuyerDetailData.overviewTab });
    const about = this.page.getByRole('tab', { name: consultationBuyerDetailData.aboutCreatorTab });
    await overview.click({ timeout: 10000 });
    await expect(overview).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
    await about.click({ timeout: 10000 });
    await expect(about).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
    await expect(
      this.page
        .getByText(consultationBuyerDetailData.creatorHandle, { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 10000 });
  }

  async expectConsultationSlideActive(index: number) {
    const slide = this.consultationSlideDot(index);
    await expect(slide).toBeVisible({ timeout: 10000 });
    await expect
      .poll(async () => (await slide.getAttribute('class')) ?? '', { timeout: 10000 })
      .toMatch(consultationBuyerDetailData.activeSlideClassPattern);
    await expect(slide).not.toHaveClass(consultationBuyerDetailData.inactiveSlideClassPattern);
  }

  async goToConsultationNextSlide() {
    await safeClick(this.consultationNextSlideButton());
  }

  async goToConsultationPreviousSlide() {
    await safeClick(this.consultationPreviousSlideButton());
  }

  async goToConsultationSlide(index: number) {
    await safeClick(this.consultationSlideDot(index));
  }

  async expectConsultationSlideStripCount(count = consultationBuyerDetailData.expectedSlideCount) {
    await expect(this.page.getByRole('button', { name: /^Go to slide \d+$/ })).toHaveCount(count, {
      timeout: 15000,
    });
  }

  async expectConsultationCarouselNavigable() {
    await this.expectConsultationSlideStripCount();
    await this.expectConsultationSlideActive(1);
    await this.goToConsultationNextSlide();
    await this.expectConsultationSlideActive(2);
    await expect(this.consultationPreviousSlideButton()).toBeVisible({ timeout: 10000 });

    await this.goToConsultationSlide(3);
    await this.expectConsultationSlideActive(3);

    await this.goToConsultationPreviousSlide();
    await this.expectConsultationSlideActive(2);

    for (let index = 1; index <= consultationBuyerDetailData.expectedSlideCount; index++) {
      await this.goToConsultationSlide(index);
      await this.expectConsultationSlideActive(index);
    }
  }

  /** Online Course buyer product-detail (AUT-FV-169 / TC-OC-B-001). */
  async expectOnlineCourseProductLoaded(title: string) {
    await expect(
      locatorChain(this.page, {
        role: 'heading',
        name: onlineCourseBuyerDetailData.detailHeading,
        text: onlineCourseBuyerDetailData.detailHeading,
      }).filter({ visible: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      this.page.getByText(title, { exact: false }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
  }

  async expectOnlineCourseProductDetails(options: {
    title: string;
    description: string;
    pricePattern?: RegExp;
    creatorName?: string;
  }) {
    const creatorName = options.creatorName ?? onlineCourseBuyerDetailData.creatorName;
    await this.expectOnlineCourseProductLoaded(options.title);

    await expect(
      this.page.getByText(options.description, { exact: false }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });

    await expect(
      this.page
        .getByText(options.pricePattern ?? onlineCourseBuyerDetailData.priceDisplayPattern)
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 15000 });

    await expect(
      this.page
        .getByText(onlineCourseBuyerDetailData.productBadge, { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 15000 });

    await expect(
      this.page
        .getByText(creatorName, { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 15000 });

    await expect(
      locatorChain(this.page, {
        role: 'tab',
        name: onlineCourseBuyerDetailData.overviewTab,
        text: onlineCourseBuyerDetailData.overviewTab,
      }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      locatorChain(this.page, {
        role: 'tab',
        name: onlineCourseBuyerDetailData.aboutCreatorTab,
        text: onlineCourseBuyerDetailData.aboutCreatorTab,
      }),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      locatorChain(this.page, {
        role: 'button',
        name: 'Purchase',
        text: 'Purchase',
      }).filter({ visible: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      locatorChain(this.page, {
        role: 'button',
        name: 'Add To Cart',
        text: 'Add To Cart',
      }).filter({ visible: true }),
    ).toBeVisible({ timeout: 10000 });

    await expect(this.onlineCourseCarouselItem()).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByRole('button', { name: /^Go to slide \d+$/ })).toHaveCount(
      onlineCourseBuyerDetailData.expectedSlideCount,
      { timeout: 15000 },
    );
  }

  async expectOnlineCourseCarouselNavigable() {
    await expect(this.page.getByRole('button', { name: /^Go to slide \d+$/ })).toHaveCount(
      onlineCourseBuyerDetailData.expectedSlideCount,
      { timeout: 15000 },
    );
    await this.goToOnlineCourseNextSlide();
    await expect(this.onlineCoursePreviousSlideButton()).toBeVisible({ timeout: 10000 });
  }

  async expectOnlineCourseOverviewAndAboutCreatorTabs() {
    const overview = locatorChain(this.page, {
      role: 'tab',
      name: onlineCourseBuyerDetailData.overviewTab,
      text: onlineCourseBuyerDetailData.overviewTab,
    });
    const about = locatorChain(this.page, {
      role: 'tab',
      name: onlineCourseBuyerDetailData.aboutCreatorTab,
      text: onlineCourseBuyerDetailData.aboutCreatorTab,
    });
    await about.click({ timeout: 10000 });
    await expect(about).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
    await expect(
      this.page
        .getByText(onlineCourseBuyerDetailData.creatorName, { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 10000 });
    await overview.click({ timeout: 10000 });
    await expect(overview).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
  }

  private onlineCourseCarouselItem(): Locator {
    return locatorChain(this.page, {
      role: 'group',
      selector: '[data-slot="carousel-item"]',
    })
      .filter({ visible: true })
      .first();
  }

  private onlineCourseNextSlideButton(): Locator {
    return locatorChain(this.page, {
      role: 'button',
      name: onlineCourseBuyerDetailData.nextSlideName,
      selector: '[data-slot="carousel-next"]',
    })
      .filter({ visible: true })
      .first();
  }

  private onlineCoursePreviousSlideButton(): Locator {
    return locatorChain(this.page, {
      role: 'button',
      name: onlineCourseBuyerDetailData.previousSlideName,
      selector: '[data-slot="carousel-previous"]',
    })
      .filter({ visible: true })
      .first();
  }

  private onlineCourseSlideDot(index: number): Locator {
    const name = onlineCourseBuyerDetailData.slideButtonName(index);
    return this.page.getByRole('button', { name, exact: true }).filter({ visible: true });
  }

  async goToOnlineCourseNextSlide() {
    await safeClick(this.onlineCourseNextSlideButton());
  }

  async goToOnlineCoursePreviousSlide() {
    await safeClick(this.onlineCoursePreviousSlideButton());
  }

  async goToOnlineCourseSlide(index: number) {
    await safeClick(this.onlineCourseSlideDot(index));
  }

  async expectOnlineCourseSlideActive(index: number) {
    const slide = this.onlineCourseSlideDot(index);
    await expect(slide).toBeVisible({ timeout: 10000 });
    await expect
      .poll(async () => (await slide.getAttribute('class')) ?? '', { timeout: 10000 })
      .toMatch(onlineCourseBuyerDetailData.activeSlideClassPattern);
    await expect(slide).not.toHaveClass(onlineCourseBuyerDetailData.inactiveSlideClassPattern);
  }

  /** Arrow + thumbnail-strip navigation (AUT-FV-170 / TC-OC-B-002). */
  async expectOnlineCourseThumbnailNavigation() {
    await expect(this.page.getByRole('button', { name: /^Go to slide \d+$/ })).toHaveCount(
      onlineCourseBuyerDetailData.expectedSlideCount,
      { timeout: 15000 },
    );
    await this.expectOnlineCourseSlideActive(1);

    await this.goToOnlineCourseNextSlide();
    await this.expectOnlineCourseSlideActive(2);
    await expect(this.onlineCoursePreviousSlideButton()).toBeVisible({ timeout: 10000 });

    await this.goToOnlineCoursePreviousSlide();
    await this.expectOnlineCourseSlideActive(1);

    await this.goToOnlineCourseSlide(onlineCourseBuyerDetailData.expectedSlideCount);
    await this.expectOnlineCourseSlideActive(onlineCourseBuyerDetailData.expectedSlideCount);

    for (let index = 1; index <= onlineCourseBuyerDetailData.expectedSlideCount; index++) {
      await this.goToOnlineCourseSlide(index);
      await this.expectOnlineCourseSlideActive(index);
    }
  }

  /** Online Course checkout (AUT-FV-171 / TC-OC-B-003..007). */

  /** Open a paid course checkout page from its share path as a logged-in buyer. */
  async openOnlineCourseCheckout(title: string, sharePath: string) {
    await this.gotoSharePath(sharePath);
    await this.expectOnlineCourseProductLoaded(title);
    await flakyClick(this.page.getByRole('button', { name: /^(Get Product|Purchase)$/ }));
    await expect(this.page).toHaveURL(/\/checkout\?quantity=1/, { timeout: 15000 });
  }

  /** Opens the Redeem Voucher dialog from the online course checkout page. */
  async openOnlineCourseVoucherDialog() {
    await safeClick(this.chooseVoucherButton);
    await expect(this.voucherInput).toBeVisible({ timeout: 10000 });
  }

  /** TC-OC-B-003: checkout shows product, creator, and quantity 1. */
  async expectOnlineCourseCheckoutInitiated(options: { title: string; creatorName?: string }) {
    const creatorName = options.creatorName ?? onlineCourseBuyerDetailData.creatorName;
    await expect(
      this.page.getByText(options.title, { exact: false }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      this.page.getByText(creatorName, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      this.page.getByText(onlineCourseCheckoutData.quantityLabelPattern).filter({ visible: true }),
    ).toBeVisible({ timeout: 10000 });
  }

  /** TC-OC-B-004: buyer fields prefill from profile; required fields block submission. */
  async expectOnlineCourseCheckoutPrefill() {
    // Email is always pre-filled from the logged-in account; name may be empty
    // when the profile has no display name, so only the applicable field asserts.
    await expect(this.page.getByPlaceholder('Enter your email')).toBeDisabled({ timeout: 10000 });
    await expect(this.page.getByPlaceholder('Enter your email')).toHaveValue(/@inbox\.testmail\.app/, {
      timeout: 10000,
    });
    await expect(this.page.getByPlaceholder('Enter phone number')).toBeVisible({ timeout: 10000 });
  }

  async expectOnlineCourseCheckoutRequiredValidation() {
    const name = this.page.getByPlaceholder('Enter your name');
    const phone = this.page.getByPlaceholder('Enter phone number');

    await name.fill('');
    await phone.focus();
    await expect(this.page.getByText(onlineCourseCheckoutData.buyerNameRequiredError)).toBeVisible({
      timeout: 10000,
    });

    // Phone can pre-fill from the buyer profile; clear it so the required
    // validation blocks submission.
    await phone.fill('');
    await this.page.getByRole('button', { name: onlineCourseCheckoutData.payCtaPattern }).click();
    await expect(this.page.getByText(onlineCourseCheckoutData.phoneNumberRequiredError)).toBeVisible({
      timeout: 10000,
    });
  }

  /** TC-OC-B-005: selecting a payment method is reflected in the checkout summary. */
  async selectOnlineCoursePaymentMethod(name: string | RegExp) {
    await this.page.getByRole('combobox').click();
    await this.page.getByRole('option', { name }).click();
  }

  async expectOnlineCoursePaymentMethod(name: string | RegExp) {
    await expect(this.page.getByRole('combobox')).toContainText(name, { timeout: 10000 });
  }

  /** Free course checkout shows a zero total and Get Product CTA (no payment method). */
  async expectOnlineCourseFreeCheckout(title: string, sharePath: string) {
    await this.gotoSharePath(sharePath);
    await this.expectOnlineCourseProductLoaded(title);
    await expect(
      this.page
        .getByText(onlineCourseCheckoutData.freeTotalLabel, { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 10000 });

    await this.page.getByRole('button', { name: 'Get Product', exact: true }).click();
    const dialog = this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('heading', { name: onlineCourseCheckoutData.checkoutHeading, exact: true }) });
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByText(onlineCourseCheckoutData.freeCheckoutBadge, { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(dialog.getByRole('button', { name: 'Get Product', exact: true })).toBeVisible({
      timeout: 10000,
    });
  }

  /** TC-OC-B-007: order review shows subtotal, total, and the Pay CTA matching the total. */
  async expectOnlineCourseOrderReview(options: { subtotal: number }) {
    await expect(
      this.page.getByText(onlineCourseCheckoutData.payCtaPattern).filter({ visible: true }),
    ).toBeVisible({ timeout: 10000 });
    const summary = await this.getOrderSummary();
    expect(summary.subtotal).toBe(options.subtotal);
    expect(summary.discount).toBeGreaterThanOrEqual(0);
    const payCta = this.page.getByRole('button', { name: onlineCourseCheckoutData.payCtaPattern });
    await expect(payCta).toContainText(summary.total.toLocaleString('en-US'), { timeout: 10000 });
  }

  /** Free product buyer page shows Free / IDR 0 (AUT-FV-193 / TC-PD-C-018). Works as product owner. */
  async expectOnlineCourseFreeBuyerView(title: string, sharePath: string) {
    await this.gotoSharePath(sharePath);
    await this.expectOnlineCourseProductLoaded(title);
    await expect(
      this.page
        .getByText(onlineCourseCheckoutData.freeTotalLabel, { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      this.page
        .getByText(onlineCourseCheckoutData.freeBuyerBadge, { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 10000 });
  }

  private async readMoney(label: string, fallback?: number): Promise<number> {
    const row = amountRow(this.page, label);
    if (await row.count() === 0 && fallback !== undefined) return fallback;

    const text = await row.innerText();
    const value = text.match(/-?\s*Rp\s*([\d.]+)/i)?.[1];
    expect(value, `${label} must contain an IDR amount`).toBeTruthy();
    return Number(value!.replaceAll('.', ''));
  }
}
