import type { APIRequestContext, Browser, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { createOnlineCourseProduct, deleteProduct, productSharePath, type ProductStatus } from "@helpers/api/product";
import { createPromotion, deletePromotion, getPromotionId, type CreatePromotionOptions } from "@helpers/api/promotion";
import { promotionData } from "@test-data/buyer/promotion.data";
import { testImages } from "@test-data/creator/post.data";
import { ProductPurchasePage } from "@pages/buyer/ProductPurchasePage";
import { depositWebhook } from "@helpers/api/webhook";
import { loginWithToken } from "@helpers/auth/token-login";
import { baseURL, creatorsBaseURL } from "@config/env";

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

/**
 * Run `fn` on a guest checkout of `product` in a fresh browser context, so the caller's
 * (creator) session keeps its cookies.
 */
export async function inGuestCheckout<T>(
  browser: Browser,
  product: { title: string; sharePath: string },
  fn: (checkout: ProductPurchasePage) => Promise<T>,
): Promise<T> {
  const context = await browser.newContext();
  // A hand-made context does not inherit the config's action timeout; without one a vanished element waits forever.
  context.setDefaultTimeout(30000);
  try {
    const page = await context.newPage();
    const checkout = new ProductPurchasePage(page, baseURL);
    await openGuestCheckout(page, checkout, product);
    return await fn(checkout);
  } finally {
    await context.close();
  }
}

/**
 * Buy a product as a guest with a promo code applied and settle it through the dev deposit webhook,
 * so a completed order carrying that promo exists. Returns the order uuid.
 */
export async function buyWithPromotion(
  browser: Browser,
  request: APIRequestContext,
  product: { title: string; sharePath: string },
  code: string,
  buyer: { name: string; email: string; phone: string },
): Promise<string> {
  const orderId = await inGuestCheckout(browser, product, async (checkout) => {
    const before = await checkout.getOrderSummary();
    await checkout.applyPromotion(code);
    await expect.poll(async () => (await checkout.getOrderSummary()).discount, { timeout: 15000 }).toBeGreaterThan(before.discount);
    return checkout.payGuestCheckout(buyer);
  });
  await depositWebhook(request, orderId, { tolerateTimeout: true });
  return orderId;
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

  async course(title: string, token: string, price: number = promotionData.coursePrice, status: ProductStatus = "active") {
    const created = await createOnlineCourseProduct(this.request, { title, description: 'Promotion checkout fixture', thumbnailImagePath: testImages.claude, price, status }, token);
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
