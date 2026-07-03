export const REQUEST_ID_HEADER = "X-Request-Id";
export const ALLOWED_WEBHOOK_METHOD = "POST";

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function isAllowedWebhookMethod(method: string): boolean {
  return method === ALLOWED_WEBHOOK_METHOD;
}
