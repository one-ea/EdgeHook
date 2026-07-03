export const WEBHOOK_TIMESTAMP_HEADER = "X-Webhook-Timestamp";
export const WEBHOOK_SIGNATURE_HEADER = "X-Webhook-Signature";
export const WEBHOOK_ID_HEADER = "X-Webhook-Id";
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export type AuthenticationResult =
  | { ok: true; producerId: string }
  | { ok: false; reason: "missing_secret" | "missing_headers" | "expired" | "invalid" };

export function buildSignedPayload(timestamp: string, rawBody: string): string {
  return `${timestamp}.${rawBody}`;
}

export async function authenticateWebhook(
  request: Request,
  rawBody: string,
  secret: string | undefined,
  now: Date = new Date()
): Promise<AuthenticationResult> {
  if (!secret) {
    return { ok: false, reason: "missing_secret" };
  }

  const timestamp = request.headers.get(WEBHOOK_TIMESTAMP_HEADER);
  const signature = request.headers.get(WEBHOOK_SIGNATURE_HEADER);
  const webhookId = request.headers.get(WEBHOOK_ID_HEADER);

  if (!timestamp || !signature || !webhookId) {
    return { ok: false, reason: "missing_headers" };
  }

  if (isTimestampExpired(timestamp, now)) {
    return { ok: false, reason: "expired" };
  }

  const expectedSignature = await createHmacSha256(secret, buildSignedPayload(timestamp, rawBody));

  if (!timingSafeEqual(signature, expectedSignature)) {
    return { ok: false, reason: "invalid" };
  }

  return { ok: true, producerId: webhookId };
}

function isTimestampExpired(timestamp: string, now: Date): boolean {
  const timestampMs = Number(timestamp) * 1000;

  if (!Number.isFinite(timestampMs)) {
    return true;
  }

  const deltaSeconds = Math.abs(now.getTime() - timestampMs) / 1000;
  return deltaSeconds > SIGNATURE_TOLERANCE_SECONDS;
}

async function createHmacSha256(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return bytesToHex(new Uint8Array(signature));
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(actual: string, expected: string): boolean {
  const normalizedActual = normalizeSignature(actual);
  const normalizedExpected = normalizeSignature(expected);

  if (normalizedActual.length !== normalizedExpected.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < normalizedActual.length; index += 1) {
    diff |= normalizedActual.charCodeAt(index) ^ normalizedExpected.charCodeAt(index);
  }

  return diff === 0;
}

function normalizeSignature(signature: string): string {
  return signature.startsWith("sha256=") ? signature.slice("sha256=".length) : signature;
}
