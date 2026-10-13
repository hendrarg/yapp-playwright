import { creatorAuthTest as test, expect } from "../test-base";
import { createPromotion, deletePromotion, getPromotionId } from "@helpers/api/promotion";
import { getOrder } from "@helpers/api/orders";
import { buyWithPromotion, inGuestCheckout, PromoFixtures } from "@helpers/buyer/promotion-checkout";
import { promotionData } from "@test-data/buyer/promotion.data";
import { formatPromotionDateDay, formatPromotionListDate, generatePromotionValidationData, promotionValidationData } from "@test-data/creator/promotions.validation.data";
import { promotionsScopeData } from "@test-data/creator/promotions.scope.data";
import { promotionsAffiliateData } from "@test-data/creator/promotions.affiliate.data";
import { promotionsPricingData } from "@test-data/creator/promotions.pricing.data";
import { generatePromotionBuyer, promotionsLifecycleData } from "@test-data/creator/promotions.lifecycle.data";
import { generatePromotionData } from "@test-data/creator/promotion.data";

const DAY_MS = 24 * 60 * 60 * 1000;
const creatorToken = () => process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, "");
const rupiah = (amount: number) => `Rp${amount.toLocaleString("id-ID")}`;

test.describe("Creator Promotions", () => {
  test("Promotion — Creation & Configuration, Usage Limit, Period (negative & boundary)", {
    tag: ["@AUT-PRM-001", "@promotions", "@creator", "@regression"],
  }, async ({ creatorNav, promotionsPage, page, browser }) => {
    test.setTimeout(180_000);
    const token = creatorToken();
    test.skip(!token, "YAPP_TEST_ACCESS_TOKEN is required to seed the product and promotion");
    if (!token) return;
    const fx = new PromoFixtures(page.request);
    const savedIds: string[] = [];

    try {
      await test.step("Required fields block an empty promotion", async () => {
        await creatorNav.open("promotions");
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.submitEmptyPromotionForm();
        await promotionsPage.expectRequiredFieldFeedback();
      });

      await test.step("A promotion without maximum usage is saved unlimited", async () => {
        const promotion = generatePromotionValidationData({ maximumUsage: undefined });
        await creatorNav.open("promotions");
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.fillPromotionForm(promotion);
        const response = await promotionsPage.submitPromotionForm();
        savedIds.push(getPromotionId(response));
        expect(response.data.name).toBe(promotion.name);
        expect(response.data.maxUsed).toBeNull();
      });

      await test.step("A promotion with maximum usage keeps the limit", async () => {
        const promotion = generatePromotionValidationData({ maximumUsage: promotionValidationData.maximumUsage });
        await creatorNav.open("promotions");
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.fillPromotionForm(promotion);
        const response = await promotionsPage.submitPromotionForm();
        savedIds.push(getPromotionId(response));
        expect(response.data.maxUsed).toBe(promotion.maximumUsage);
      });

      await test.step("An expired code is refused at checkout", async () => {
        const course = await fx.course(`Promo expired ${Date.now()}`, token);
        const code = await fx.promo(generatePromotionData("expired"), token);
        await inGuestCheckout(browser, course, async (checkout) => {
          const before = await checkout.getOrderSummary();
          await checkout.applyPromotion(code);
          await checkout.expectRejectedPromotion(before, promotionData.rejection.expired);
        });
      });
    } finally {
      for (const id of savedIds) await deletePromotion(page.request, id).catch(() => undefined);
      await fx.cleanup();
    }
  });

  test("Promotion — Creation & Configuration, Voucher Code", {
    tag: ["@AUT-PRM-002", "@promotions", "@creator", "@smoke", "@regression"],
    annotation: [{ type: "issue", description: "L-55" }],
  }, async ({ creatorNav, promotionsPage, page }) => {
    test.setTimeout(180_000);
    // Known bug L-55: generated code length varies between 8 and 12 characters. Last step.
    test.fail(true, "L-55: generated voucher codes have inconsistent length");
    const savedIds: string[] = [];
    const openCreate = async () => {
      await creatorNav.open("promotions");
      await promotionsPage.openCreatePromotionForm();
    };

    try {
      await test.step("Percentage discount is accepted", async () => {
        await openCreate();
        const response = await promotionsPage.createDiscountPromotion(
          "percentage",
          { ...generatePromotionValidationData(), discount: promotionsPricingData.percentageDiscount },
          { voucherPattern: promotionsPricingData.voucherCodePattern },
        );
        savedIds.push(getPromotionId(response));
        promotionsPage.expectDiscountTypeSaved(response, "percentage");
        expect(response.data.discount).toBe(promotionsPricingData.percentageDiscount);
      });

      await test.step("Fixed-amount discount is accepted", async () => {
        await openCreate();
        const response = await promotionsPage.createDiscountPromotion("fixed", {
          ...generatePromotionValidationData(),
          discount: promotionsPricingData.fixedDiscount,
        });
        savedIds.push(getPromotionId(response));
        promotionsPage.expectDiscountTypeSaved(response, "flat");
        expect(response.data.discount).toBe(promotionsPricingData.fixedDiscount);
      });

      await test.step("A voucher code is generated automatically", async () => {
        await openCreate();
        await promotionsPage.expectAutoGeneratedVoucherCode(promotionsPricingData.voucherCodePattern);
      });

      await test.step("Refresh generates a different code", async () => {
        const initialCode = await promotionsPage.expectAutoGeneratedVoucherCode(promotionsPricingData.voucherCodePattern);
        const refreshedCode = await promotionsPage.refreshVoucherCode();
        expect(refreshedCode).not.toBe(initialCode);
        expect(refreshedCode).toMatch(promotionsPricingData.voucherCodePattern);
      });

      await test.step("A percentage above 100 is refused on submit; 100 is accepted", async () => {
        await openCreate();
        await promotionsPage.fillPromotionForm(generatePromotionValidationData());
        await promotionsPage.updatePromotionDiscount(promotionsPricingData.percentageOverCap);
        await expect(promotionsPage.requiredMessage).toHaveCount(0);
        await promotionsPage.submitPromotionFormExpectRejected(promotionsPricingData.overCapReason);
        await promotionsPage.updatePromotionDiscount(promotionsPricingData.percentageCap);
        const response = await promotionsPage.submitPromotionForm();
        savedIds.push(getPromotionId(response));
        expect(response.data.discount).toBe(promotionsPricingData.percentageCap);
      });

      await test.step("A zero or negative discount is refused with a message", async () => {
        await openCreate();
        await promotionsPage.fillPromotionForm(generatePromotionValidationData());
        await promotionsPage.updatePromotionDiscount(promotionsPricingData.zeroDiscount);
        await promotionsPage.submitPromotionFormExpectRejected(promotionsPricingData.zeroDiscountReason);
        await promotionsPage.updatePromotionDiscount(promotionsPricingData.negativeDiscount);
        await promotionsPage.submitPromotionFormExpectFieldError(promotionsPricingData.negativeDiscountMessage);
      });

      await test.step("Generated codes share one length (L-55)", async () => {
        await openCreate();
        const codes = await promotionsPage.collectGeneratedCodes(promotionsPricingData.codeRefreshes);
        codes.forEach((code) => expect(code).toMatch(promotionsPricingData.voucherCodePattern));
        expect(new Set(codes.map((code) => code.length)).size, `generated codes: ${codes.join(", ")}`).toBe(1);
      });
    } finally {
      for (const id of savedIds) await deletePromotion(page.request, id).catch(() => undefined);
    }
  });

  test("Promotion — Product Scope, Publish", {
    tag: ["@AUT-PRM-003", "@promotions", "@creator", "@regression"],
  }, async ({ creatorNav, promotionsPage, page, browser }) => {
    test.setTimeout(300_000);
    const token = creatorToken();
    test.skip(!token, "YAPP_TEST_ACCESS_TOKEN is required to seed the products");
    if (!token) return;
    const fx = new PromoFixtures(page.request);
    const savedIds: string[] = [];
    const selectedProducts = [promotionsScopeData.products.telegram, promotionsScopeData.products.digitalDownload];
    const scoped = generatePromotionValidationData();
    const live = generatePromotionValidationData();

    try {
      await test.step("Product scope defaults to All Product", async () => {
        await creatorNav.open("promotions");
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.expectDefaultAllProductsScope();
      });

      await test.step("Selected Product reveals the product picker", async () => {
        await promotionsPage.selectSelectedProductsScope();
      });

      await test.step("Products from different categories can be found and selected", async () => {
        for (const product of selectedProducts) {
          await promotionsPage.searchProductsInScope(product);
          await promotionsPage.expectProductSelectableInScope(product);
          await promotionsPage.selectProductInScope(product);
        }
      });

      await test.step("Selected products are prefilled when the promotion is edited", async () => {
        await creatorNav.open("promotions");
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.fillSelectedProductsPromotion(scoped, selectedProducts);
        savedIds.push(getPromotionId(await promotionsPage.submitPromotionForm()));
        await creatorNav.open("promotions");
        await promotionsPage.searchPromotions(scoped.name, scoped.code);
        await promotionsPage.openPromotionEdit(scoped.code, scoped.name);
        await promotionsPage.expectSelectedProductsOnEdit(selectedProducts);
      });

      const stamp = Date.now();
      const course = await fx.course(`Promo live ${stamp}`, token);

      await test.step("A new promotion is Active at once and redeemable", async () => {
        await creatorNav.open("promotions");
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.fillPromotionForm(live);
        savedIds.push(getPromotionId(await promotionsPage.submitPromotionForm()));
        await creatorNav.open("promotions");
        await promotionsPage.searchPromotions(live.name, live.code);
        await promotionsPage.expectPromotionStatus(live.code, promotionsLifecycleData.status.active);
        await inGuestCheckout(browser, course, async (checkout) => {
          const before = await checkout.getOrderSummary();
          await checkout.applyPromotion(live.code);
          await checkout.expectActiveDiscount(before, live.discount);
        });
      });

      await test.step("The promotion is shared by copying its code", async () => {
        await promotionsPage.expectPromotionActions(live.code, promotionsLifecycleData.actions);
        await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
        await promotionsPage.copyPromotionCode(live.code);
        await promotionsPage.expectPromotionCodeCopied(live.code);
      });

      const draft = await fx.course(`Promo pick draft ${stamp}`, token, promotionData.coursePrice, "draft");
      const inactive = await fx.course(`Promo pick inactive ${stamp}`, token, promotionData.coursePrice, "inactive");

      await test.step("Find Product shows each product's real price", async () => {
        await creatorNav.open("promotions");
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.selectSelectedProductsScope();
        await promotionsPage.searchProductsInScope(course.title);
        await promotionsPage.expectProductOptionInScope(course.title, rupiah(promotionData.coursePrice));
        await promotionsPage.closeProductScopePicker();
      });

      // Changed on dev 2026-10-12: Draft and Inactive products are no longer offered (they used to be
      // listed with no status marker). TC-PRM-C-044 still describes the old behaviour — Need Review.
      await test.step("Find Product does not offer Draft or Inactive products", async () => {
        for (const product of [draft, inactive]) {
          await promotionsPage.searchProductsInScope(product.title);
          await promotionsPage.expectProductNotOfferedInScope(product.title);
          await promotionsPage.closeProductScopePicker();
        }
      });
    } finally {
      for (const id of savedIds) await deletePromotion(page.request, id).catch(() => undefined);
      await fx.cleanup();
    }
  });

  test("Promotion — Period, Affiliate", {
    tag: ["@AUT-PRM-004", "@promotions", "@creator", "@regression"],
  }, async ({ creatorNav, promotionsPage, page, browser }) => {
    test.setTimeout(240_000);
    // TC-PRM-C-017 (affiliate reward) stays Blocked and is not covered here.
    const token = creatorToken();
    test.skip(!token, "YAPP_TEST_ACCESS_TOKEN is required to seed the product");
    if (!token) return;
    const fx = new PromoFixtures(page.request);
    const savedIds: string[] = [];
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endDate = new Date(startDate.getTime() + DAY_MS);
    const period = generatePromotionValidationData({
      startDateDay: formatPromotionDateDay(startDate),
      endDateDay: formatPromotionDateDay(endDate),
    });
    let payload: Record<string, unknown> = {};

    try {
      await test.step("Start and end period are saved", async () => {
        await creatorNav.open("promotions");
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.fillPromotionForm(period);
        const saved = await promotionsPage.submitPromotionFormWithPayload();
        savedIds.push(getPromotionId(saved.response));
        payload = saved.payload;
        await creatorNav.open("promotions");
        await promotionsPage.searchPromotions(period.name, period.code);
        await promotionsPage.expectPromotionPeriodInList(period.code, formatPromotionListDate(startDate), formatPromotionListDate(endDate));
      });

      await test.step("A code inside its active period is redeemed", async () => {
        const course = await fx.course(`Promo period ${Date.now()}`, token);
        await inGuestCheckout(browser, course, async (checkout) => {
          const before = await checkout.getOrderSummary();
          await checkout.applyPromotion(period.code);
          await checkout.expectActiveDiscount(before, period.discount);
        });
      });

      await test.step("Affiliate is off by default", async () => {
        await creatorNav.open("promotions");
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.expectDefaultAffiliateDisabled();
      });

      await test.step("Affiliate commission and assignee are saved", async () => {
        const promotion = generatePromotionValidationData();
        await promotionsPage.fillPromotionForm(promotion);
        await promotionsPage.enableAffiliateCommission(promotionsAffiliateData.commission);
        await promotionsPage.assignAffiliateCreator(promotionsAffiliateData.assigneeSearch);
        await promotionsPage.expectAssignedAffiliateCreator(promotionsAffiliateData.assigneeHandle);
        const response = await promotionsPage.submitPromotionForm();
        savedIds.push(getPromotionId(response));
        promotionsPage.expectAffiliateAssignmentSaved(response, {
          commission: promotionsAffiliateData.commission,
          username: promotionsAffiliateData.assigneeHandle,
        });
        await creatorNav.open("promotions");
        await promotionsPage.searchPromotions(promotion.name, promotion.code);
        await promotionsPage.expectAffiliateBadgeInList(promotion.code);
      });

      await test.step("Days before today cannot be picked as the start date", async () => {
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.expectPastStartDatesDisabled(today, formatPromotionDateDay);
      });

      await test.step("The period is sent in UTC and shown back in local time", async () => {
        expect(payload.periodStartAt).toBe(startDate.toISOString());
        expect(payload.periodEndAt).toBe(endDate.toISOString());
        await creatorNav.open("promotions");
        await promotionsPage.searchPromotions(period.name, period.code);
        await promotionsPage.expectPromotionPeriodInList(
          period.code,
          new RegExp(`${formatPromotionListDate(startDate)}\\s*00:00`),
          new RegExp(`${formatPromotionListDate(endDate)}\\s*00:00`),
        );
      });

      await test.step("The owner is not offered as their own affiliate", async () => {
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.enableAffiliateCommission(promotionsAffiliateData.commission);
        const offered = await promotionsPage.searchAffiliateCreators(promotionsAffiliateData.ownerHandle);
        expect(offered.filter((option) => option.includes(`@${promotionsAffiliateData.ownerHandle}`))).toEqual([]);
      });
    } finally {
      for (const id of savedIds) await deletePromotion(page.request, id).catch(() => undefined);
      await fx.cleanup();
    }
  });

  test("Promotion — Management — Part 1", {
    tag: ["@AUT-PRM-005", "@promotions", "@creator", "@regression"],
  }, async ({ creatorNav, promotionsPage, ordersPage, page, browser }) => {
    test.setTimeout(360_000);
    const token = creatorToken();
    test.skip(!token, "YAPP_TEST_ACCESS_TOKEN is required to seed the product and promotion");
    if (!token) return;
    const fx = new PromoFixtures(page.request);
    const promo = generatePromotionData("active");

    try {
      const course = await fx.course(`Promo manage ${Date.now()}`, token);
      await fx.promo(promo, token);

      await test.step("The promotion appears in the list", async () => {
        await creatorNav.open("promotions");
        await promotionsPage.expectPromotionRowCountAtLeast(1);
        await promotionsPage.searchPromotions(promo.name, promo.code);
        await promotionsPage.expectPromotionListed(promo.code);
      });

      await test.step("A row shows name, code, period, discount, status and redeem count", async () => {
        await promotionsPage.expectPromotionRowFields(promo.code, {
          name: promo.name,
          code: promo.code,
          discountLabel: `${promo.discount}% off`,
          status: promotionsLifecycleData.status.active,
          redeemCount: "0",
        });
        await promotionsPage.expectPromotionPeriodInList(
          promo.code,
          formatPromotionListDate(new Date(promo.periodStartAt)),
          formatPromotionListDate(new Date(promo.periodEndAt)),
        );
      });

      await test.step("Copying a code shows a confirmation", async () => {
        await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
        await promotionsPage.copyPromotionCode(promo.code);
        await promotionsPage.expectCopyConfirmationFeedback(promo.code);
        await promotionsPage.expectPromotionCodeCopied(promo.code);
      });

      const orderId = await buyWithPromotion(browser, page.request, course, promo.code, generatePromotionBuyer());
      await expect.poll(async () => (await getOrder(page.request, orderId)).promoCodeName, { timeout: 60000 }).toBe(promo.name);
      const baseline = await getOrder(page.request, orderId);

      await test.step("The Set Inactive toggle deactivates the promotion without a reload", async () => {
        await creatorNav.open("promotions");
        await promotionsPage.searchPromotions(promo.name, promo.code);
        const body = await promotionsPage.setPromotionInactive(promo.code);
        expect(body).toEqual({ isActive: false });
        await promotionsPage.expectToast(promotionsLifecycleData.inactiveToast);
        await promotionsPage.expectPromotionStatus(promo.code, promotionsLifecycleData.status.inactive);
      });

      await test.step("An inactive code is refused at checkout", async () => {
        await inGuestCheckout(browser, course, async (checkout) => {
          const before = await checkout.getOrderSummary();
          await checkout.applyPromotion(promo.code);
          await checkout.expectRejectedPromotion(before, promotionData.rejection.expired);
        });
      });

      await test.step("A reactivated promotion is Active and redeemable again", async () => {
        await promotionsPage.setPromotionActive(promo.code);
        await promotionsPage.expectPromotionStatus(promo.code, promotionsLifecycleData.status.active);
        await inGuestCheckout(browser, course, async (checkout) => {
          const before = await checkout.getOrderSummary();
          await checkout.applyPromotion(promo.code);
          await checkout.expectActiveDiscount(before, promo.discount);
        });
      });

      await test.step("An earlier order is unchanged after its promotion is deactivated", async () => {
        await promotionsPage.setPromotionInactive(promo.code);
        expect(await getOrder(page.request, orderId)).toEqual(baseline);
        await ordersPage.openDetail(orderId);
        await ordersPage.expectPromoCodeDiscount(promo.name, baseline.promoCodeDiscount ?? 0);
        await ordersPage.expectRevenue(baseline);
        await creatorNav.open("promotions");
        await promotionsPage.searchPromotions(promo.name, promo.code);
        await promotionsPage.setPromotionActive(promo.code);
      });
    } finally {
      await fx.cleanup();
    }
  });

  test("Promotion — Management — Part 2", {
    tag: ["@AUT-PRM-006", "@promotions", "@creator", "@regression"],
    annotation: [{ type: "issue", description: "L-51" }],
  }, async ({ creatorNav, promotionsPage, page, browser }) => {
    test.setTimeout(420_000);
    // Known bug L-51: the delete confirmation does not name the promotion. Last step.
    test.fail(true, "L-51: delete confirmation does not name the promotion");
    const token = creatorToken();
    test.skip(!token, "YAPP_TEST_ACCESS_TOKEN is required to seed the product and promotions");
    if (!token) return;
    const fx = new PromoFixtures(page.request);
    const now = Date.now();
    const promo = generatePromotionData("active", { discount: promotionsLifecycleData.initialDiscount });
    const doomed = generatePromotionData("active");
    const expired = generatePromotionData("expired");
    const upcoming = generatePromotionData("active", {
      periodStartAt: new Date(now + 3 * DAY_MS).toISOString(),
      periodEndAt: new Date(now + 6 * DAY_MS).toISOString(),
    });

    let doomedId = "";

    try {
      const course = await fx.course(`Promo edit ${now}`, token);
      for (const seeded of [promo, expired, upcoming]) await fx.promo(seeded, token);
      doomedId = getPromotionId(await createPromotion(page.request, doomed, token));
      const redeem = (code: string, percent: number) =>
        inGuestCheckout(browser, course, async (checkout) => {
          const before = await checkout.getOrderSummary();
          await checkout.applyPromotion(code);
          await checkout.expectActiveDiscount(before, percent);
        });

      await test.step("Edit opens with the saved configuration", async () => {
        await creatorNav.open("promotions");
        await promotionsPage.searchPromotions(promo.name, promo.code);
        await promotionsPage.openPromotionEdit(promo.code, promo.name);
        await promotionsPage.expectPromotionFormPrefilled(promo);
      });

      await test.step("An edit changes later redemptions, not an earlier order", async () => {
        const orderId = await buyWithPromotion(browser, page.request, course, promo.code, generatePromotionBuyer());
        await expect.poll(async () => (await getOrder(page.request, orderId)).promoCodeName, { timeout: 60000 }).toBe(promo.name);
        const baseline = await getOrder(page.request, orderId);
        await creatorNav.open("promotions");
        await promotionsPage.searchPromotions(promo.name, promo.code);
        await promotionsPage.openPromotionEdit(promo.code, promo.name);
        await promotionsPage.updatePromotionDiscount(promotionsLifecycleData.updatedDiscount);
        expect((await promotionsPage.savePromotionEdit()).data.discount).toBe(promotionsLifecycleData.updatedDiscount);
        expect(await getOrder(page.request, orderId)).toEqual(baseline);
        await redeem(promo.code, promotionsLifecycleData.updatedDiscount);
      });

      await test.step("Delete asks for confirmation first", async () => {
        await creatorNav.open("promotions");
        await promotionsPage.searchPromotions(doomed.name, doomed.code);
        await promotionsPage.openDeleteConfirmation(doomed.code);
        await promotionsPage.expectDeleteConfirmationVisible();
        await promotionsPage.dismissDeleteConfirmation();
        await promotionsPage.expectPromotionListed(doomed.code);
      });

      await test.step("A deleted promotion leaves the list and its code is refused", async () => {
        await promotionsPage.deletePromotionFromList(doomed.code);
        await promotionsPage.expectPromotionAbsent(doomed.code);
        await inGuestCheckout(browser, course, async (checkout) => {
          const before = await checkout.getOrderSummary();
          await checkout.applyPromotion(doomed.code);
          // Deletion is soft: the code reads as no longer active, not as unknown.
          await checkout.expectRejectedPromotion(before, promotionData.rejection.expired);
        });
      });

      await test.step("Status follows the period but has its own manual switch", async () => {
        const { status, actions } = promotionsLifecycleData;
        for (const [seeded, expected] of [[upcoming, status.notStarted], [promo, status.active], [expired, status.expired]] as const) {
          await promotionsPage.searchPromotions(seeded.name, seeded.code);
          await promotionsPage.expectPromotionStatus(seeded.code, expected);
          await promotionsPage.expectPromotionActions(seeded.code, actions);
        }
        await promotionsPage.searchPromotions(promo.name, promo.code);
        await promotionsPage.setPromotionInactive(promo.code);
        await promotionsPage.expectPromotionStatus(promo.code, status.inactive);
        await promotionsPage.setPromotionActive(promo.code);
        await promotionsPage.expectPromotionStatus(promo.code, status.active);
      });

      await test.step("A configuration change applies to the next redemption", async () => {
        await promotionsPage.openPromotionEdit(promo.code, promo.name);
        await promotionsPage.updatePromotionDiscount(promotionsLifecycleData.reconfiguredDiscount);
        await promotionsPage.savePromotionEdit();
        await creatorNav.open("promotions");
        await promotionsPage.searchPromotions(promo.name, promo.code);
        await promotionsPage.expectPromotionRowFields(promo.code, {
          name: promo.name,
          code: promo.code,
          discountLabel: `${promotionsLifecycleData.reconfiguredDiscount}% off`,
          status: promotionsLifecycleData.status.active,
          redeemCount: "1",
        });
        await redeem(promo.code, promotionsLifecycleData.reconfiguredDiscount);
      });

      await test.step("Search matches name in any case and code, with an empty state", async () => {
        await promotionsPage.searchPromotions(promo.name.toUpperCase(), promo.code);
        await promotionsPage.searchPromotions(promo.code);
        await promotionsPage.typeSearchQuery(`nomatch${now}`);
        await promotionsPage.expectSearchEmptyState();
        await promotionsPage.typeSearchQuery("");
        await promotionsPage.expectPromotionRowCountAtLeast(3);
      });

      await test.step("The delete confirmation names the promotion (L-51)", async () => {
        await promotionsPage.searchPromotions(promo.name, promo.code);
        await promotionsPage.openDeleteConfirmation(promo.code);
        await promotionsPage.expectDeleteConfirmationNames(promo.name);
      });
    } finally {
      if (doomedId) await deletePromotion(page.request, doomedId).catch(() => undefined);
      await fx.cleanup();
    }
  });

  test("Promotion — Feedback, Accessibility, Order Attribution", {
    tag: ["@AUT-PRM-007", "@promotions", "@creator", "@regression"],
  }, async ({ creatorNav, promotionsPage, ordersPage, page, browser }) => {
    test.setTimeout(300_000);
    const token = creatorToken();
    test.skip(!token, "YAPP_TEST_ACCESS_TOKEN is required to seed the product and promotion");
    if (!token) return;
    const fx = new PromoFixtures(page.request);
    const savedIds: string[] = [];
    const promo = generatePromotionData("active");

    try {
      await test.step("Order detail names the redeemed promotion in the API and the dashboard", async () => {
        const course = await fx.course(`Promo order ${Date.now()}`, token);
        await fx.promo(promo, token);
        const orderId = await buyWithPromotion(browser, page.request, course, promo.code, generatePromotionBuyer());
        await expect.poll(async () => (await getOrder(page.request, orderId)).promoCodeName, { timeout: 60000 }).toBe(promo.name);
        const order = await getOrder(page.request, orderId);
        expect(order.promoCodeDiscount).toBe(Math.round((promotionData.coursePrice * promo.discount) / 100));
        await ordersPage.openDetail(orderId);
        await ordersPage.expectPromoCodeDiscount(promo.name, order.promoCodeDiscount ?? 0);
      });

      await test.step("Date pickers and the copy control are named, keyboard-operable buttons", async () => {
        await creatorNav.open("promotions");
        await promotionsPage.searchPromotions(promo.name, promo.code);
        await promotionsPage.expectCopyButtonNamed(promo.code, promo.code);
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.expectDateTriggersAccessible();
      });

      await test.step("Create, edit and delete each confirm success with a toast", async () => {
        const promotion = generatePromotionValidationData();
        await creatorNav.open("promotions");
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.fillPromotionForm(promotion);
        savedIds.push(getPromotionId(await promotionsPage.submitPromotionForm()));
        await promotionsPage.expectToast(promotionsLifecycleData.successToast);
        await creatorNav.open("promotions");
        await promotionsPage.searchPromotions(promotion.name, promotion.code);
        await promotionsPage.openPromotionEdit(promotion.code, promotion.name);
        await promotionsPage.updatePromotionDiscount(promotionsLifecycleData.updatedDiscount);
        await promotionsPage.savePromotionEdit();
        await promotionsPage.expectToast(promotionsLifecycleData.successToast);
        await creatorNav.open("promotions");
        await promotionsPage.searchPromotions(promotion.name, promotion.code);
        await promotionsPage.deletePromotionFromList(promotion.code);
        await promotionsPage.expectToast(promotionsLifecycleData.successToast);
      });

    } finally {
      for (const id of savedIds) await deletePromotion(page.request, id).catch(() => undefined);
      await fx.cleanup();
    }
  });
});
