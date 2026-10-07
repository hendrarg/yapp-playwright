import type { APIRequestContext } from "@playwright/test";

const WEBHOOK_URL = "https://staging.yapp.ink/api/v1/webhook/deposit-dev";

/**
 * Settle an order on dev. For guest orders the order turns `completed` at once but the response can
 * hang (observed 2026-10-07); `tolerateTimeout` lets the caller verify the result in the UI instead.
 */
export async function depositWebhook(request: APIRequestContext, orderId: string, options: { tolerateTimeout?: boolean } = {}) {
  let response;
  try {
    response = await request.post(WEBHOOK_URL, {
      headers: { "content-type": "application/json" },
      data: { orderID: orderId },
      timeout: options.tolerateTimeout ? 45000 : undefined,
    });
  } catch (error) {
    if (options.tolerateTimeout && /Timeout/.test(String(error))) return null;
    throw error;
  }
  if (!response.ok()) {
    throw new Error(`Webhook failed: ${response.status()} ${await response.text()}`);
  }
  return response;
}
