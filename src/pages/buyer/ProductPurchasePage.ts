import { expect, type Locator, type Page } from '@playwright/test';
import { consultationBuyerDetailData, consultationBuyerSchedulingData, formatConsultationSaveMySpotDate } from '@test-data/buyer/consultation.detail.data';
import { buyerEventsDetailData } from '@test-data/buyer/events.detail.data';
import { onlineCourseBuyerDetailData, onlineCourseCheckoutData } from '@test-data/buyer/online-course.detail.data';
import { amountRow } from '@pages/shared/locators';
import type { PurchaseProduct } from '@test-data/buyer/promotion.data';
import { consultationLifecycleData } from '@test-data/creator/consultation.lifecycle.data';
import { parseConsultationDayButtonLabel } from '@test-data/creator/consultation.pricing.data';
import { flakyClick } from '@utils/flaky-utils';
import { buildSmartStrategies, locatorChain, smartClick, smartLocator } from '@utils/heal-utils';
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
    await this.openVoucherEntry();
  }

  /**
   * FLAKY_FIX: checkout hydration can replace the Choose Voucher button, or fold an open voucher
   * entry back to it, after the checkout opens. Click until the Redeem Voucher field stays up.
   */
  private async openVoucherEntry() {
    await expect(async () => {
      if (!(await this.voucherInput.isVisible())) await this.chooseVoucherButton.click({ timeout: 3000 });
      await expect(this.voucherInput).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 30000 });
  }

/** On an open product page: Purchase opens the checkout (voucher entry visible). */
  async startPurchase(title: string) {
    await expect(this.page.getByText(title, { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
    await this.purchaseAction.click();
    await expect(this.chooseVoucherButton).toBeVisible({ timeout: 15000 });
  }

  async applyPromotion(code: string) {
    await this.openVoucherEntry();
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

/**
   * A rejected code shows its reason under the voucher, applies no discount and keeps the subtotal.
   * The summary then drops both fee rows (total = subtotal) — the product's invalid-voucher signal, not a pricing bug.
   */
  async expectRejectedPromotion(before: OrderSummary, reason: string) {
    await expect(this.page.getByText(reason, { exact: true })).toBeVisible({ timeout: 15000 });
    await expect.poll(async () => (await this.getOrderSummary()).discount, { timeout: 10000 }).toBe(0);
    const after = await this.getOrderSummary();
    expect(after.subtotal).toBe(before.subtotal);
    await expect(this.page.getByText('Transaction Fee', { exact: true })).toHaveCount(0);
    await expect(this.page.getByText('Payment Gateway Fee', { exact: true })).toHaveCount(0);
    expect(after.total).toBe(after.subtotal);
  }

  /** Use Now stays disabled until a code is typed. Leaves the typed code in the field. */
  async expectUseNowEnabledOnlyWithCode(code: string) {
    await safeFill(this.voucherInput, '');
    await expect(this.applyVoucherButton).toBeDisabled({ timeout: 5000 });
    await safeFill(this.voucherInput, code);
    await expect(this.applyVoucherButton).toBeEnabled({ timeout: 5000 });
  }

  /** The applied code sits in the voucher box with an × that removes it. */
  private voucherRemoveButton(code: string) {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('button', { name: code.trim().toUpperCase() }) })
      .getByRole('button')
      .filter({ has: this.page.locator('svg.lucide-x') })
      .last();
  }

  async removePromotion(code: string) {
    await safeClick(this.voucherRemoveButton(code));
    await expect(this.voucherRemoveButton(code)).toHaveCount(0, { timeout: 10000 });
  }

  /** Back to the untouched summary: no discount, the original subtotal/total, voucher entry offered again. */
  async expectPromotionCleared(before: OrderSummary) {
    await expect.poll(() => this.getOrderSummary(), { timeout: 10000 }).toEqual(before);
    await expect(this.chooseVoucherButton).toBeVisible({ timeout: 10000 });
  }

  async gotoSharePath(sharePath: string) {
    const normalized = sharePath.startsWith('/') ? sharePath.slice(1) : sharePath;
    await this.page.goto(new URL(normalized, this.baseURL).toString(), {
      waitUntil: 'domcontentloaded',
    });
    await waitForLoaded(this.page);
  }

  async expectEventsBuyerDetails(options: {
    title: string;
    description: string;
    venue: string;
    address: string;
    eventDate: string;
    startTime: string;
    endTime: string;
  }) {
    // The description renders after the header; read the page only once it is there.
    await expect(this.page.getByRole("main")).toContainText(options.description, { timeout: 15000 });
    const details = smartLocator(this.page, {
      role: "main",
      text: "Product Detail",
      selector: "main",
    });
    const bodyText = await details.text({ timeout: 15000 });
    const dateMatch = options.eventDate.match(/^\d{1,2} ([A-Za-z]+) \d{4}$/);
    expect(dateMatch, "expected a readable event date").not.toBeNull();
    const month = new Map([
      ["January", "Jan"],
      ["February", "Feb"],
      ["March", "Mar"],
      ["April", "Apr"],
      ["May", "May"],
      ["June", "Jun"],
      ["July", "Jul"],
      ["August", "Aug"],
      ["September", "Sep"],
      ["October", "Oct"],
      ["November", "Nov"],
      ["December", "Dec"],
    ]).get(dateMatch![1]);
    expect(bodyText).toContain(options.title);
    expect(bodyText).toContain(options.description);
    expect(bodyText).toContain(options.venue);
    expect(bodyText).toContain(options.address);
    // The creator picker pads the day (`01 November 2026`); the buyer page does not (`1 Nov`).
    expect(bodyText).toContain(`${Number(dateMatch![0].split(" ")[0])} ${month}`);
    expect(bodyText).toContain(options.startTime);
    expect(bodyText).toContain(options.endTime);
  }

  async expectEventOverview(options: { title: string; creator: string }) {
    await expect(
      this.page.getByText(buyerEventsDetailData.eventBadge, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByText(options.title, { exact: true }).filter({ visible: true }).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(this.page.getByText(options.creator, { exact: true }).filter({ visible: true }).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(
      locatorChain(this.page, {
        role: 'tab',
        name: buyerEventsDetailData.overviewTab,
        text: buyerEventsDetailData.overviewTab,
      }).filter({ visible: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      locatorChain(this.page, {
        role: 'tab',
        name: buyerEventsDetailData.aboutCreatorTab,
        text: buyerEventsDetailData.aboutCreatorTab,
      }).filter({ visible: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      locatorChain(this.page, {
        role: 'heading',
        name: buyerEventsDetailData.detailHeading,
        text: buyerEventsDetailData.detailHeading,
      }).filter({ visible: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      this.page.getByRole('tabpanel', { name: buyerEventsDetailData.overviewTab }).filter({ visible: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      this.page.getByText(buyerEventsDetailData.ticketDetailHeading, { exact: true }).filter({ visible: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      locatorChain(this.page, {
        role: 'button',
        name: buyerEventsDetailData.selectTicketAction,
        text: buyerEventsDetailData.selectTicketAction,
      }).filter({ visible: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      locatorChain(this.page, {
        role: 'button',
        name: buyerEventsDetailData.addToCartAction,
        text: buyerEventsDetailData.addToCartAction,
      }).filter({ visible: true }),
    ).toBeVisible({ timeout: 10000 });
  }

  async expectEventCarouselBoundary(expectedSlides: number) {
    const dots = this.page.getByRole('button', { name: /^Go to slide \d+$/ }).filter({ visible: true });
    await expect(dots).toHaveCount(expectedSlides, { timeout: 15000 });
    await expect(this.eventNextSlideButton()).toBeVisible({ timeout: 10000 });
    await expect(this.eventPreviousSlideButton()).toHaveCount(0);

    for (let index = 1; index < expectedSlides; index++) {
      await safeClick(this.eventNextSlideButton());
    }

    await expect(this.eventPreviousSlideButton()).toBeVisible({ timeout: 10000 });
    await expect(this.eventNextSlideButton()).toHaveCount(0);
  }

  async expectEventDateAndStatus(options: {
    datePattern: RegExp;
    timePattern?: RegExp;
    allDayText?: string;
    statusPattern: RegExp;
  }) {
    const bodyText = await this.page.getByRole('main').innerText();
    expect(bodyText).toMatch(options.datePattern);
    if (options.timePattern) expect(bodyText).toMatch(options.timePattern);
    if (options.allDayText) expect(bodyText).toContain(options.allDayText);
    expect(bodyText).toMatch(options.statusPattern);
  }

  async expectEventVenueLink(venue: string, hrefPattern: RegExp) {
    const venueLink = locatorChain(this.page, {
      role: 'link',
      name: venue,
      text: venue,
      selector: 'a[href*="google.com/maps/search"]',
    }).filter({ visible: true }).first();
    await expect(venueLink).toBeVisible({ timeout: 10000 });
    await expect(venueLink).toHaveAttribute('href', hrefPattern);
    await expect(venueLink).toHaveAttribute('target', '_blank');
  }

  async expectEventTicketTiers(options: {
    soldOutTier: string;
    availableTier: string;
    soldOutPricePattern: RegExp;
    availablePricePattern: RegExp;
    quantityPattern: RegExp;
  }) {
    const bodyText = await this.page.getByRole('main').innerText();
    expect(bodyText).toContain(options.soldOutTier);
    expect(bodyText).toContain(options.availableTier);
    expect(bodyText).toMatch(options.soldOutPricePattern);
    expect(bodyText).toMatch(options.availablePricePattern);
    expect(bodyText).toMatch(options.quantityPattern);
    await expect(this.page.getByText('Sold Out', { exact: true }).filter({ visible: true })).toBeVisible({
      timeout: 10000,
    });
    const selectButtons = this.page.getByRole('button', { name: 'Select', exact: true }).filter({ visible: true });
    await expect(selectButtons).toHaveCount(2, { timeout: 10000 });
    await expect(selectButtons.nth(0)).toBeDisabled();
    await expect(selectButtons.nth(1)).toBeEnabled();
  }

  /**
   * One tier card on the event page: its price text, and whether it can be selected. A tier
   * outside its sales window reads `Sold Out` and its `Select` button is disabled.
   */
  async expectEventTierCard(name: string, options: { price: RegExp; onSale: boolean }) {
    const card = this.page.getByRole('main').locator('div')
      .filter({ has: this.page.getByText(name, { exact: true }) })
      .filter({ has: this.page.getByRole('button', { name: 'Select', exact: true }) })
      .last();
    await expect(card).toBeVisible({ timeout: 10000 });
    await expect(card).toContainText(options.price);
    const select = card.getByRole('button', { name: 'Select', exact: true });
    if (options.onSale) {
      await expect(select).toBeEnabled();
      await expect(card.getByText('Sold Out', { exact: true })).toHaveCount(0);
    } else {
      await expect(select).toBeDisabled();
      await expect(card.getByText('Sold Out', { exact: true })).toBeVisible();
    }
  }

  async expectHybridEventAccess(options: {
    venue: string;
    address: string;
    platform: string;
    meetingLinkNotice: string;
    onlineTier: string;
    offlineTier: string;
  }) {
    const bodyText = await this.page.getByRole('main').innerText();
    expect(bodyText).toContain(options.venue);
    expect(bodyText).toContain(options.address);
    expect(bodyText).toContain(options.platform);
    expect(bodyText).toContain(options.meetingLinkNotice);
    expect(bodyText).toContain(options.onlineTier);
    expect(bodyText).toContain(options.offlineTier);
  }

  async expectEventDiscountedTier(pricePattern: RegExp) {
    await expect(this.page.getByText(pricePattern).filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
  }

  async expectBuyerStartFromAbsent() {
    await expect(this.page.getByText(/Start From/i).filter({ visible: true })).toHaveCount(0);
  }

  async expectEventQuantityLabel(quantityPattern: RegExp) {
    await expect(this.page.getByText(quantityPattern).filter({ visible: true }).first()).toBeVisible({
      timeout: 10000,
    });
  }

  async expectEventAboutCreator() {
    const overview = locatorChain(this.page, {
      role: 'tab',
      name: buyerEventsDetailData.overviewTab,
      text: buyerEventsDetailData.overviewTab,
    }).filter({ visible: true });
    const aboutCreator = locatorChain(this.page, {
      role: 'tab',
      name: buyerEventsDetailData.aboutCreatorTab,
      text: buyerEventsDetailData.aboutCreatorTab,
    }).filter({ visible: true });
    await safeClick(aboutCreator);
    await expect(aboutCreator).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
    await expect(this.page.getByRole('heading', { name: /^Meet .+ — .+$/ }).filter({ visible: true })).toBeVisible({
      timeout: 10000,
    });
    const creatorPanel = locatorChain(this.page, {
      role: 'tabpanel',
      name: buyerEventsDetailData.aboutCreatorTab,
      text: buyerEventsDetailData.aboutCreatorTab,
    }).filter({ visible: true });
    await expect(
      creatorPanel
        .getByRole('paragraph')
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 10000 });
    await safeClick(overview);
    await expect(overview).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
  }

  async expectOwnerEventView() {
    await expect(
      locatorChain(this.page, {
        role: 'button',
        name: buyerEventsDetailData.editProductAction,
        text: buyerEventsDetailData.editProductAction,
      }).filter({ visible: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      locatorChain(this.page, {
        role: 'button',
        name: buyerEventsDetailData.addToCartAction,
        text: buyerEventsDetailData.addToCartAction,
      }).filter({ visible: true }),
    ).toHaveCount(0);
  }

  async expectEventStickyBarBeforeSelection() {
    await expect(this.eventSelectTicketButton()).toBeVisible({ timeout: 10000 });
    await expect(this.eventSelectTicketButton()).toBeDisabled();
    await expect(this.eventAddToCartButton()).toBeVisible({ timeout: 10000 });
    await expect(this.eventAddToCartButton()).toBeDisabled();
  }

  async selectEventTicket(tierName: string) {
    const eventMain = locatorChain(this.page, {
      role: 'main',
      selector: 'main',
    });
    await expect(eventMain).toBeVisible({ timeout: 10000 });
    expect(await eventMain.innerText()).toContain(tierName);

    const [selectButtonStrategy] = buildSmartStrategies(this.page, {
      role: 'button',
      name: 'Select',
      text: 'Select',
      exact: true,
    });
    const count = await selectButtonStrategy.count();
    for (let index = 0; index < count; index++) {
      const button = selectButtonStrategy.nth(index);
      if (await button.isVisible() && await button.isEnabled()) {
        await flakyClick(button);
        await expect(this.eventAddToCartButton()).toBeEnabled({ timeout: 10000 });
        return;
      }
    }
    throw new Error(`No available ticket tier found for "${tierName}"`);
  }

  async expectEventStickyBarEnabledAfterScroll() {
    await expect(this.eventAddToCartButton()).toBeVisible({ timeout: 10000 });
    await expect(this.eventAddToCartButton()).toBeEnabled();
    await this.page.evaluate(() => {
      const w = globalThis as unknown as {
        scrollTo: (x: number, y: number) => void;
        document: { body: { scrollHeight: number } };
      };
      w.scrollTo(0, w.document.body.scrollHeight);
    });
    await expect(this.eventAddToCartButton()).toBeVisible({ timeout: 10000 });
    await expect(this.eventAddToCartButton()).toBeEnabled();
  }

  async openEventCheckout() {
    await safeClick(this.eventAddToCartButton());
    await expect(this.eventCheckoutDialog()).toBeVisible({ timeout: 15000 });
  }

  async expectEventCheckoutForm(options: { title: string; tierName: string; subtotal: string }) {
    const dialog = this.eventCheckoutDialog();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole('heading', { name: buyerEventsDetailData.checkout.heading, exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(dialog.getByText('Fill in your ticket info for', { exact: false })).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole('heading', { name: options.title, exact: true })).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole('heading', { name: 'Contact Detail', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(this.eventCheckoutNameInput()).toHaveValue(/.+/);
    await expect(this.eventCheckoutEmailInput()).toHaveValue(/.+@.+/);
    await expect(dialog.getByRole('heading', { name: buyerEventsDetailData.checkout.attendeeDetailsHeading, exact: true }))
      .toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText(options.tierName, { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText(buyerEventsDetailData.checkout.useContactDetails, { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(dialog.getByRole('switch')).toBeChecked();
    await expect(
      dialog.getByText(buyerEventsDetailData.checkout.subtotalLabel, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText(options.subtotal, { exact: true }).filter({ visible: true }).first()).toBeVisible({
      timeout: 10000,
    });
  }

  async expectEventPhoneValidation() {
    await safeFill(this.eventCheckoutPhoneInput(), buyerEventsDetailData.checkout.invalidPhone);
    await safeClick(this.eventCheckoutSubmitButton());
    await expect(
      this.eventCheckoutDialog().getByText(buyerEventsDetailData.checkout.phoneError, { exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await safeFill(this.eventCheckoutPhoneInput(), buyerEventsDetailData.checkout.validPhone);
  }

  async submitEventCheckout() {
    await safeClick(this.eventCheckoutSubmitButton());
    await expect(this.eventProductAddedDialog()).toBeVisible({ timeout: 15000 });
  }

  async expectEventProductAdded(options: { title: string; creator: string }) {
    const dialog = this.eventProductAddedDialog();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole('heading', { name: buyerEventsDetailData.checkout.productAddedHeading, exact: true }))
      .toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole('img', { name: options.title, exact: true }).filter({ visible: true }).first())
      .toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole('heading', { name: options.title, exact: true }).filter({ visible: true }).first())
      .toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText(options.creator, { exact: true }).filter({ visible: true }).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(dialog.getByRole('button', { name: buyerEventsDetailData.checkout.seeCartAction, exact: true }))
      .toBeVisible({ timeout: 10000 });
    await expect(
      dialog.getByRole('heading', { name: buyerEventsDetailData.checkout.recommendationsHeading, exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeVisible({ timeout: 10000 });
  }

  async clickEventSeeCart() {
    await safeClick(this.eventProductAddedDialog().getByRole('button', {
      name: buyerEventsDetailData.checkout.seeCartAction,
      exact: true,
    }));
    await expect(this.page).toHaveURL(/\/cart/);
  }

  private eventSelectTicketButton(): Locator {
    const [primary] = buildSmartStrategies(this.page, {
      role: 'button',
      name: buyerEventsDetailData.selectTicketAction,
      text: buyerEventsDetailData.selectTicketAction,
      exact: true,
    });
    return primary.filter({ visible: true }).first();
  }

  private eventAddToCartButton(): Locator {
    const [primary] = buildSmartStrategies(this.page, {
      role: 'button',
      name: buyerEventsDetailData.addToCartAction,
      text: buyerEventsDetailData.addToCartAction,
      exact: true,
    });
    return primary.filter({ visible: true }).first();
  }

  private eventCheckoutDialog(): Locator {
    return locatorChain(this.page, {
      role: 'dialog',
      selector: '[role="dialog"]',
    }).filter({
      has: this.page.getByRole('heading', {
        name: buyerEventsDetailData.checkout.heading,
        exact: true,
      }),
    }).last();
  }

  private eventCheckoutNameInput(): Locator {
    return locatorChain(this.page, {
      role: 'textbox',
      name: buyerEventsDetailData.checkout.contactNamePlaceholder,
      placeholder: buyerEventsDetailData.checkout.contactNamePlaceholder,
    }).filter({ visible: true }).first();
  }

  private eventCheckoutPhoneInput(): Locator {
    return locatorChain(this.page, {
      role: 'textbox',
      name: buyerEventsDetailData.checkout.phonePlaceholder,
      placeholder: buyerEventsDetailData.checkout.phonePlaceholder,
    }).filter({ visible: true }).first();
  }

  private eventCheckoutEmailInput(): Locator {
    return locatorChain(this.page, {
      role: 'textbox',
      name: buyerEventsDetailData.checkout.emailPlaceholder,
      placeholder: buyerEventsDetailData.checkout.emailPlaceholder,
    }).filter({ visible: true }).first();
  }

  private eventCheckoutSubmitButton(): Locator {
    return this.eventCheckoutDialog().getByRole('button', {
      name: 'Add to Cart',
      exact: true,
    });
  }

  private eventProductAddedDialog(): Locator {
    return locatorChain(this.page, {
      role: 'dialog',
      selector: '[role="dialog"]',
    }).filter({
      has: this.page.getByRole('heading', {
        name: buyerEventsDetailData.checkout.productAddedHeading,
        exact: true,
      }),
    }).last();
  }

  private eventNextSlideButton(): Locator {
    return locatorChain(this.page, {
      role: 'button',
      name: 'Next slide',
      text: 'Next slide',
      selector: '[data-slot="carousel-next"]',
    }).filter({ visible: true }).first();
  }

  private eventPreviousSlideButton(): Locator {
    return locatorChain(this.page, {
      role: 'button',
      name: 'Previous slide',
      text: 'Previous slide',
      selector: '[data-slot="carousel-previous"]',
    }).filter({ visible: true }).first();
  }

  /** A product buyers cannot reach (draft, inactive, deleted) renders the not-found page. */
  async expectProductPageNotFound() {
    const notFound = locatorChain(this.page, { role: 'heading', name: "That page doesn't exist", text: "That page doesn't exist" }).first();
    await expect(notFound).toBeVisible({ timeout: 15000 });
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

  private consultationCalendarDialog(): Locator {
    return this.page.getByRole('dialog').filter({ has: this.page.getByRole('grid') }).last();
  }

  /**
   * The page shows only the next three open dates; `View all` opens a month calendar whose day
   * buttons carry the full date as their name (`Monday, October 19th, 2026`). Pick one there.
   */
  async selectConsultationDateFromCalendar(date: Date) {
    const dayButton = await this.consultationCalendarDay(date);
    await expect(dayButton).toBeEnabled({ timeout: 10000 });
    // The calendar stays open (Escape does not close it); a day already picked must not be clicked again.
    if (!/selected/.test((await dayButton.getAttribute('aria-label', { timeout: 10000 })) ?? '')) {
      await dayButton.click({ timeout: 10000 });
    }
    await expect(dayButton).toHaveAccessibleName(/selected/, { timeout: 10000 });
  }

  /** A date in the `View all` calendar is open (bookable) or disabled. */
  async expectConsultationCalendarDate(date: Date, open: boolean) {
    const dayButton = await this.consultationCalendarDay(date);
    if (open) await expect(dayButton).toBeEnabled({ timeout: 10000 });
    else await expect(dayButton).toBeDisabled({ timeout: 10000 });
  }

  /**
   * A flexible-price consultation advertises its floor, and `Save my spot` first asks the buyer to
   * `Name a Fair Price` with that floor as the minimum.
   */
  async expectConsultationFlexiblePricing(minimum: string) {
    const main = this.page.getByRole('main');
    await expect(main.getByText('This creator offers flexible pricing.').filter({ visible: true }).first()).toBeVisible({ timeout: 20000 });
    await expect(main.getByText(new RegExp(`start from Rp${minimum.replace('.', '\\.')}`, 'i')).filter({ visible: true }).first()).toBeVisible();
    await flakyClick(this.consultationSaveMySpotButton().first());
    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Name a Fair Price' });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toContainText(`Min. price: Rp${minimum}`);
    await expect(dialog.getByRole('button', { name: 'Input Amount' })).toBeVisible();
  }

  /** A discounted price shows the reduced amount, the struck original and the percentage. */
  async expectConsultationDiscountedPrice(pattern: RegExp) {
    // The three parts sit in separate elements, so match the page text rather than one node.
    await expect(this.page.getByRole('main').first()).toContainText(pattern, { timeout: 20000 });
  }

  /** With crypto enabled, the checkout voucher list offers the crypto voucher. */
  async expectCryptoVoucherOffered(copy: string) {
    await flakyClick(this.page.getByRole('button', { name: 'Choose Voucher' }).filter({ visible: true }).first());
    await expect(this.page.getByText(copy, { exact: false }).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
  }

  /** A paused consultation offers no time slot and no `Save my spot`. */
  async expectConsultationTakingNoBookings() {
    await expect(this.page.getByRole('heading', { name: 'Consultation Detail' }).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
    // Sessions load after the header; an early count of zero proves nothing.
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.getByText('Total Amount', { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
    await expect(this.consultationTimeSlotButtons()).toHaveCount(0);
    await expect(this.consultationSaveMySpotButton()).toHaveCount(0);
  }

  /** A completed booking's transaction page still opens with its success state. */
  async expectTransactionSuccessful() {
    await expect(this.page.getByText('Purchase Successful!', { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 20000 });
  }

  async isConsultationCalendarDateOpen(date: Date): Promise<boolean> {
    return (await this.consultationCalendarDay(date)).isEnabled();
  }

  /** Open `View all` if needed, page to the date's month, and return that day's button. */
  private async consultationCalendarDay(date: Date): Promise<Locator> {
    const dialog = this.consultationCalendarDialog();
    if (!(await dialog.isVisible().catch(() => false))) {
      const viewAll = locatorChain(this.page, { role: 'button', name: 'View all', text: 'View all', exact: true }).filter({ visible: true }).first();
      await expect(viewAll).toBeVisible({ timeout: 20000 });
      await flakyClick(viewAll);
    }
    const month = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    await expect(dialog.getByRole('grid')).toBeVisible({ timeout: 10000 });
    for (let i = 0; i < 12 && (await dialog.getByRole('grid').getAttribute('aria-label', { timeout: 10000 })) !== month; i++) {
      const forward = new Date(`1 ${await dialog.getByRole('grid').getAttribute('aria-label', { timeout: 10000 })}`) < date;
      await dialog.getByRole('button', { name: forward ? 'Go to the Next Month' : 'Go to the Previous Month' }).click({ timeout: 10000 });
    }
    await expect(dialog.getByRole('grid')).toHaveAttribute('aria-label', month);
    const day = date.getDate();
    const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    const weekday = date.toLocaleString('en-US', { weekday: 'long' });
    const monthName = date.toLocaleString('en-US', { month: 'long' });
    // Today's button is prefixed `Today, `.
    return dialog.getByRole('button', { name: new RegExp(`^(Today, )?${weekday}, ${monthName} ${day}${suffix}, ${date.getFullYear()}`) });
  }

  /**
   * Book a free consultation as a guest: pick the date and time in the calendar, Confirm, then
   * fill the checkout and press `Pay Rp0`. The order completes at once; the page may stay put.
   */
  /** Pick a date and time in the calendar and Confirm, landing on the consultation checkout. */
  async openConsultationCheckout(date: Date, time: string) {
    await this.selectConsultationDateFromCalendar(date);
    const dialog = this.consultationCalendarDialog();
    await dialog.getByRole('button', { name: time, exact: true }).click({ timeout: 10000 });
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click({ timeout: 10000 });
    await expect(this.page).toHaveURL(/\/checkout\?.*consultationStartTime=/, { timeout: 20000 });
  }

  /** Checkout states the buyer's timezone and carries the same offset in the session times. */
  async expectConsultationCheckoutTimezone(copy: string, urlPattern: RegExp) {
    await expect(this.page.getByText(copy, { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
    await expect(this.page).toHaveURL(urlPattern);
  }

  async bookFreeConsultationAsGuest(options: { date: Date; time: string; buyer: { name: string; email: string; phone: string } }) {
    await this.openConsultationCheckout(options.date, options.time);
    const field = (placeholder: string) => this.page.getByPlaceholder(placeholder).filter({ visible: true }).first();
    await field('Enter your name').fill(options.buyer.name);
    await field('Enter your email').fill(options.buyer.email);
    await field('Enter phone number').fill(options.buyer.phone);
    // A "Did you mean …@hotmail.com?" hint can re-render the form and clear the confirmation.
    await expect(async () => {
      await field('Re-enter your email').fill(options.buyer.email);
      await this.page.waitForTimeout(500);
      await expect(field('Re-enter your email')).toHaveValue(options.buyer.email, { timeout: 1000 });
    }).toPass({ timeout: 20000 });
    // The form settles once it echoes the email back; a click before that is ignored.
    await expect(this.page.getByText(`Receipt & download link will be sent to ${options.buyer.email}`)).toBeVisible({ timeout: 15000 });
    const pay = this.page.getByRole('button', { name: 'Pay Rp0', exact: true });
    await expect(pay).toBeEnabled({ timeout: 10000 });
    const response = this.page.waitForResponse((r) => new URL(r.url()).pathname === '/api/v1/orders/quote' && r.request().method() === 'POST', { timeout: 30000 });
    await flakyClick(pay);
    expect((await response).ok()).toBe(true);
    await expect(this.page).toHaveURL(/\/transaction\//, { timeout: 30000 });
  }

  /** The time slots offered for the date picked in the calendar, in order. */
  async expectCalendarSlotsExactly(slots: readonly string[]) {
    const times = this.consultationCalendarDialog().getByRole('button', { name: /^\d{2}:\d{2}$/ });
    await expect(times.first()).toBeVisible({ timeout: 15000 });
    await expect(times).toHaveText([...slots], { timeout: 15000 });
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
    creatorName: string;
  }) {
    const { creatorName } = options;
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
    // Online courses are bought one at a time: the page offers Purchase only, never Add To Cart.
    await expect(this.page.getByRole('button', { name: 'Add To Cart' })).toHaveCount(0);

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

  async expectOnlineCourseOverviewAndAboutCreatorTabs(creatorName: string) {
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
        .getByText(creatorName, { exact: true })
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

  /** A tier with a Free Access benefit badges the product for its members only. */
  async expectMemberFreeAccessBadge(visible: boolean, priceText: string) {
    const main = this.page.getByRole('main');
    await expect(main.getByText(priceText).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
    const badge = main.getByText(/^Free Access/).filter({ visible: true });
    if (visible) await expect(badge.first()).toBeVisible({ timeout: 10000 });
    else await expect(badge).toHaveCount(0);
  }

  /** Path of the product page's first gallery image (the primary one), unwrapped from /_next/image. */
  async primaryImagePath(): Promise<string> {
    // Slides are `group`s inside the carousel `region`; their <img> has an empty alt, so no img role.
    const firstSlide = this.page.getByRole('main').getByRole('region').getByRole('group').first();
    await expect(firstSlide.locator('img').first()).toBeAttached({ timeout: 15000 });
    const src = await firstSlide.locator('img').first().getAttribute('src') ?? '';
    const real = src.startsWith('/_next/image') ? new URL(src, this.baseURL).searchParams.get('url') ?? src : src;
    return new URL(real, this.baseURL).pathname;
  }

  /**
   * Limited slots with "Show remaining count": the product page shows "Selling fast", a
   * `<sold> / <total>` counter and "Limited slots, grab yours before it's gone." (the creator
   * form's helper promises "X of Y slots left", which is not what renders).
   */
  async expectSlotCounter(sold: number, total: number) {
    const main = this.page.getByRole('main');
    await expect(main.getByText('Selling fast').filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
    await expect(main.getByText(new RegExp(`^${sold}\\s*/\\s*${total}$`)).filter({ visible: true }).first()).toBeVisible();
    await expect(main.getByText(/Limited slots, grab yours before it.s gone\./).filter({ visible: true }).first()).toBeVisible();
  }

  /** A creator's additional question shows on the checkout; answer it so Pay is not blocked. */
  async expectCheckoutQuestion(label: string, answer = 'Answer from automation') {
    const main = this.page.getByRole('main');
    await expect(main.getByText(label, { exact: false }).first()).toBeVisible({ timeout: 15000 });
    const field = main.getByRole('textbox', { name: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
    if (await field.count()) await field.first().fill(answer);
  }

  /** Open a paid course checkout page from its share path as a logged-in buyer. */
  async openOnlineCourseCheckout(title: string, sharePath: string) {
    await this.gotoSharePath(sharePath);
    await this.expectOnlineCourseProductLoaded(title);
    // A click that lands before hydration is dropped; repeat until checkout opens.
    await expect(async () => {
      if (!/\/checkout/.test(this.page.url())) await flakyClick(this.page.getByRole('button', { name: /^(Get Product|Purchase)$/ }));
      await expect(this.page).toHaveURL(/\/checkout\?quantity=1/, { timeout: 5000 });
    }).toPass({ timeout: 30000 });
  }

  /** Opens the Redeem Voucher dialog from the online course checkout page. */
  async openOnlineCourseVoucherDialog() {
    await this.openVoucherEntry();
  }

  /** TC-OC-B-003: checkout shows product, creator, and quantity 1. */
  async expectOnlineCourseCheckoutInitiated(options: { title: string; creatorName: string }) {
    const { creatorName } = options;
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
    await expect(payCta).toContainText(`Rp${summary.total.toLocaleString('id-ID')}`, { timeout: 10000 });
  }

/**
   * Guest checkout (2026-10-07): name, email, a "Confirm email" field and phone, with the note
   * "Receipt & download link will be sent to <email>"; there is no verification-code step any more.
   */
  async payGuestCheckout(buyer: { name: string; email: string; phone: string }): Promise<string> {
    const field = (placeholder: string) => this.page.getByPlaceholder(placeholder).filter({ visible: true }).first();
    await field('Enter your name').fill(buyer.name);
    await field('Enter your email').fill(buyer.email);
    await field('Re-enter your email').fill(buyer.email);
    await field('Enter phone number').fill(buyer.phone);
    await expect(this.page.getByText(`Receipt & download link will be sent to ${buyer.email}`)).toBeVisible({ timeout: 10000 });
    await flakyClick(this.page.getByRole('button', { name: onlineCourseCheckoutData.payCtaPattern }));
    await this.page.waitForURL(/\/transaction\//, { timeout: 20000 });
    return this.page.url().split('/transaction/')[1];
  }

  /** Fill whatever buyer fields are blank, press Pay and return the order id from `/product/transaction/<id>`. */
  async payOnlineCourseCheckout(buyer: { name: string; phone: string }): Promise<string> {
    const name = this.page.getByPlaceholder('Enter your name');
    if (!(await name.inputValue())) await name.fill(buyer.name);
    const phone = this.page.getByPlaceholder('Enter phone number');
    if (!(await phone.inputValue())) await phone.fill(buyer.phone);
    await flakyClick(this.page.getByRole('button', { name: onlineCourseCheckoutData.payCtaPattern }));
    // The transaction page's load event can hang on the payment widget; the URL is what matters.
    await expect(this.page).toHaveURL(/\/transaction\//, { timeout: 30000 });
    return this.page.url().split('/transaction/')[1];
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
