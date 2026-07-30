import type { Page } from "@playwright/test";
import type { ProductPurchasePage } from "@pages/buyer/ProductPurchasePage";
import type { PurchaseProduct } from "@test-data/buyer/promotion.data";
import { loginWithToken } from "@helpers/auth/token-login";
import { creatorsBaseURL } from "@config/env";

export async function openGuestCheckout(
  page: Page,
  productPurchasePage: ProductPurchasePage,
  product: PurchaseProduct,
) {
  await page.context().clearCookies();
  await productPurchasePage.openPurchase(product);
}

export async function restoreCreatorSession(page: Page, accessToken: string) {
  await loginWithToken(page.context(), accessToken, creatorsBaseURL);
  await page.goto(creatorsBaseURL, { waitUntil: "domcontentloaded" });
}
