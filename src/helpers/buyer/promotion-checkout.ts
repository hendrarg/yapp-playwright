import type { APIRequestContext, Page } from "@playwright/test";
import { createOnlineCourseProduct, deleteProduct, productSharePath } from "@helpers/api/product";
import { createPromotion, deletePromotion, getPromotionId, type CreatePromotionOptions } from "@helpers/api/promotion";
import { promotionData } from "@test-data/buyer/promotion.data";
import { testImages } from "@test-data/creator/post.data";
import type { ProductPurchasePage } from "@pages/buyer/ProductPurchasePage";
import { loginWithToken } from "@helpers/auth/token-login";
import { creatorsBaseURL } from "@config/env";

/** Open a product's checkout as a guest (cookies cleared) with the Redeem Voucher dialog ready. */
export async function openGuestCheckout(
  page: Page,
  productPurchasePage: ProductPurchasePage,
  product: { title: string; sharePath: string },
) {
  await page.context().clearCookies();
  await productPurchasePage.openOnlineCourseCheckout(product.title, product.sharePath);
  await productPurchasePage.openOnlineCourseVoucherDialog();
}

export async function restoreCreatorSession(page: Page, accessToken: string) {
  await loginWithToken(page.context(), accessToken, creatorsBaseURL);
  await page.goto(creatorsBaseURL, { waitUntil: "domcontentloaded" });
}

/** Seeds courses and promotions for one test and removes them afterwards. */
export class PromoFixtures {
  private readonly products: Array<{ uuid: string; token: string }> = [];
  private readonly promos: Array<{ uuid: string; token: string }> = [];
  constructor(private readonly request: APIRequestContext) {}

  async course(title: string, token: string, price: number = promotionData.coursePrice) {
    const created = await createOnlineCourseProduct(this.request, { title, description: 'Promotion checkout fixture', thumbnailImagePath: testImages.claude, price }, token);
    this.products.push({ uuid: created.productUuid, token });
    return { uuid: created.productUuid, title, sharePath: productSharePath(created) };
  }

  async promo(options: CreatePromotionOptions, token: string): Promise<string> {
    this.promos.push({ uuid: getPromotionId(await createPromotion(this.request, options, token)), token });
    return options.code;
  }

  async cleanup() {
    for (const { uuid, token } of this.promos) await deletePromotion(this.request, uuid, token).catch(() => undefined);
    for (const { uuid, token } of this.products) await deleteProduct(this.request, uuid, token).catch(() => undefined);
  }
}
