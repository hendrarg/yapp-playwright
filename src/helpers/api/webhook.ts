import type { APIRequestContext } from "@playwright/test";

const WEBHOOK_URL = "https://staging.yapp.ink/api/v1/webhook/deposit-dev";

export async function depositWebhook(request: APIRequestContext, orderId: string) {
  const response = await request.post(WEBHOOK_URL, {
    headers: { "content-type": "application/json" },
    data: { orderID: orderId },
  });
  if (!response.ok()) {
    throw new Error(`Webhook failed: ${response.status()} ${await response.text()}`);
  }
  return response;
}
