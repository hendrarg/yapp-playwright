import type { APIRequestContext, Browser, Page } from '@playwright/test';
import { baseURL } from '@config/env';
import { depositWebhook } from '@helpers/api/webhook';
import { loginWithToken } from '@helpers/auth/token-login';
import { ProductPurchasePage } from '@pages/buyer/ProductPurchasePage';

const phone = () => `812${Date.now().toString().slice(-9)}`;

/**
 * Buy a course as another account in its own browser context and settle it through the
 * deposit webhook. `beforePay` runs on the checkout page (e.g. to check or answer questions).
 * The caller closes the returned context.
 */
export async function buyCourseAs(
  browser: Browser,
  request: APIRequestContext,
  buyerToken: string,
  course: { title: string; sharePath: string },
  beforePay?: (page: Page) => Promise<void>,
) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    await loginWithToken(context, buyerToken, baseURL);
    const page = await context.newPage();
    const checkout = new ProductPurchasePage(page, baseURL);
    await checkout.openOnlineCourseCheckout(course.title, course.sharePath);
    if (beforePay) await beforePay(page);
    const orderId = await checkout.payOnlineCourseCheckout({ name: 'QA Buyer', phone: phone() });
    await depositWebhook(request, orderId);
    return { orderId, context, page };
  } catch (e) {
    await context.close();
    throw e;
  }
}
