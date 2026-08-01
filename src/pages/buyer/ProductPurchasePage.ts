import { expect, type Locator, type Page } from '@playwright/test';
import { consultationBuyerDetailData } from '@test-data/buyer/consultation.detail.data';
import type { PurchaseProduct } from '@test-data/buyer/promotion.data';
import { consultationLifecycleData } from '@test-data/creator/consultation.lifecycle.data';
import { parseConsultationDayButtonLabel } from '@test-data/creator/consultation.pricing.data';
import { flakyClick } from '@utils/flaky-utils';
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
