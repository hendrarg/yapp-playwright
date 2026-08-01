import { expect, type Locator, type Page } from '@playwright/test';
import {
  consultationBuyerDetailData,
  consultationBuyerSchedulingData,
  formatConsultationSaveMySpotDate,
} from '@test-data/buyer/consultation.detail.data';
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
      const optionCard = this.page
        .getByText(product.option, { exact: true })
        .filter({ visible: true })
        .locator('xpath=ancestor::div[.//button[normalize-space(.)="Select"]][1]');
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

  private async readMoney(label: string, fallback?: number): Promise<number> {
    const row = this.page.getByText(label, { exact: true }).locator('..');
    if (await row.count() === 0 && fallback !== undefined) return fallback;

    const text = await row.innerText();
    const value = text.match(/-?\s*Rp\s*([\d.]+)/i)?.[1];
    expect(value, `${label} must contain an IDR amount`).toBeTruthy();
    return Number(value!.replaceAll('.', ''));
  }
}
