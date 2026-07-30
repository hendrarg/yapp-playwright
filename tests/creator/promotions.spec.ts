import { creatorAuthTest as test, expect } from "../test-base";
import { deletePromotion } from "@helpers/api/promotion";
import {
  generatePromotionValidationData,
  promotionValidationData,
} from "@test-data/creator/promotions.validation.data";
import { promotionsScopeData } from "@test-data/creator/promotions.scope.data";

function getPromotionId(response: { data?: { uuid?: string; id?: string } }): string {
  const id = response.data?.uuid ?? response.data?.id;
  if (!id) throw new Error("Create promotion response did not include an ID");
  return id;
}

test.describe("Creator Promotions", () => {
  test("Validate Promotions Inputs and Boundary Conditions", {
    tag: ["@AUT-FV-236", "@promotions", "@creator", "@regression"],
  }, async ({ creatorNav, promotionsPage, page }) => {
    test.setTimeout(120_000);

    let unlimitedPromotionId = "";
    let limitedPromotionId = "";

    try {
      await test.step("Validate required fields", async () => {
        await creatorNav.open("promotions");
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.submitEmptyPromotionForm();
        await promotionsPage.expectRequiredFieldFeedback();
      });

      await test.step("Save promotion without usage limit", async () => {
        const promotion = generatePromotionValidationData({ maximumUsage: undefined });

        await creatorNav.open("promotions");
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.fillPromotionForm(promotion);

        const response = await promotionsPage.submitPromotionForm();
        unlimitedPromotionId = getPromotionId(response);
        expect(response.data.name).toBe(promotion.name);
        expect(response.data.maxUsed).toBeNull();
      });

      await test.step("Save promotion with usage limit", async () => {
        const promotion = generatePromotionValidationData({
          maximumUsage: promotionValidationData.maximumUsage,
        });

        await creatorNav.open("promotions");
        await promotionsPage.openCreatePromotionForm();
        await promotionsPage.fillPromotionForm(promotion);

        const response = await promotionsPage.submitPromotionForm();
        limitedPromotionId = getPromotionId(response);
        expect(response.data.name).toBe(promotion.name);
        expect(response.data.maxUsed).toBe(promotion.maximumUsage);
      });
    } finally {
      if (limitedPromotionId) {
        await deletePromotion(page.request, limitedPromotionId);
      }

      if (unlimitedPromotionId) {
        await deletePromotion(page.request, unlimitedPromotionId);
      }
    }
  });

  test("Search products across categories in product scope", {
    tag: ["@AUT-FV-240", "@promotions", "@creator", "@regression"],
  }, async ({ creatorNav, promotionsPage }) => {
    test.setTimeout(120_000);

    await test.step("Open create promotion form and choose Selected Products", async () => {
      await creatorNav.open("promotions");
      await promotionsPage.openCreatePromotionForm();
      await promotionsPage.selectSelectedProductsScope();
    });

    await test.step("Search and select products from different categories", async () => {
      await promotionsPage.searchProductsInScope(promotionsScopeData.products.telegram);
      await promotionsPage.expectProductSelectableInScope(promotionsScopeData.products.telegram);
      await promotionsPage.selectProductInScope(promotionsScopeData.products.telegram);

      await promotionsPage.searchProductsInScope(promotionsScopeData.products.digitalDownload);
      await promotionsPage.expectProductSelectableInScope(promotionsScopeData.products.digitalDownload);
      await promotionsPage.selectProductInScope(promotionsScopeData.products.digitalDownload);
    });
  });
});
