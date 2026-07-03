import { describe, it, expect } from "vitest";
import {
  buildSignedPayload,
  authenticateWebhook,
  WEBHOOK_TIMESTAMP_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_ID_HEADER,
  SIGNATURE_TOLERANCE_SECONDS
} from "../src/auth";

const SECRET = "test-secret-key";
const RAW_BODY = '{"type":"test","data":"hello"}';

function makeHeaders(timestamp: string, signature: string, webhookId = "producer-1"): Headers {
  const headers = new Headers();
  headers.set(WEBHOOK_TIMESTAMP_HEADER, timestamp);
  headers.set(WEBHOOK_SIGNATURE_HEADER, signature);
  headers.set(WEBHOOK_ID_HEADER, webhookId);
  return headers;
}

async function computeSignature(secret: string, rawBody: string, timestamp: string): Promise<string> {
  const payload = buildSignedPayload(timestamp, rawBody);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("auth", () => {
  describe("buildSignedPayload", () => {
    it("joins timestamp and rawBody with dot", () => {
      expect(buildSignedPayload("123", "body")).toBe("123.body");
    });

    it("handles empty body", () => {
      expect(buildSignedPayload("0", "")).toBe("0.");
    });
  });

  describe("authenticateWebhook", () => {
    it("returns missing_secret when secret is undefined", async () => {
      const request = new Request("http://localhost", { headers: makeHeaders("1", "sig") });
      const result = await authenticateWebhook(request, RAW_BODY, undefined);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("missing_secret");
    });

    it("returns missing_secret when secret is empty string", async () => {
      const request = new Request("http://localhost", { headers: makeHeaders("1", "sig") });
      const result = await authenticateWebhook(request, RAW_BODY, "");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("missing_secret");
    });

    it("returns missing_headers when timestamp is missing", async () => {
      const headers = new Headers();
      headers.set(WEBHOOK_SIGNATURE_HEADER, "sig");
      headers.set(WEBHOOK_ID_HEADER, "id");
      const request = new Request("http://localhost", { headers });
      const result = await authenticateWebhook(request, RAW_BODY, SECRET);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("missing_headers");
    });

    it("returns missing_headers when signature is missing", async () => {
      const headers = new Headers();
      headers.set(WEBHOOK_TIMESTAMP_HEADER, "1");
      headers.set(WEBHOOK_ID_HEADER, "id");
      const request = new Request("http://localhost", { headers });
      const result = await authenticateWebhook(request, RAW_BODY, SECRET);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("missing_headers");
    });

    it("returns missing_headers when webhook id is missing", async () => {
      const headers = new Headers();
      headers.set(WEBHOOK_TIMESTAMP_HEADER, "1");
      headers.set(WEBHOOK_SIGNATURE_HEADER, "sig");
      const req = new Request("http://localhost", { headers });
      const result = await authenticateWebhook(req, RAW_BODY, SECRET);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("missing_headers");
    });

    it("returns expired when timestamp is too old", async () => {
      const now = new Date("2026-07-02T12:00:00Z");
      const oldTimestamp = String(Math.floor((now.getTime() / 1000) - SIGNATURE_TOLERANCE_SECONDS - 60));
      const sig = await computeSignature(SECRET, RAW_BODY, oldTimestamp);
      const request = new Request("http://localhost", { headers: makeHeaders(oldTimestamp, sig) });
      const result = await authenticateWebhook(request, RAW_BODY, SECRET, now);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("expired");
    });

    it("returns expired when timestamp is too far in the future", async () => {
      const now = new Date("2026-07-02T12:00:00Z");
      const futureTimestamp = String(Math.floor((now.getTime() / 1000) + SIGNATURE_TOLERANCE_SECONDS + 60));
      const sig = await computeSignature(SECRET, RAW_BODY, futureTimestamp);
      const request = new Request("http://localhost", { headers: makeHeaders(futureTimestamp, sig) });
      const result = await authenticateWebhook(request, RAW_BODY, SECRET, now);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("expired");
    });

    it("returns expired when timestamp is non-numeric", async () => {
      const request = new Request("http://localhost", { headers: makeHeaders("abc", "sig") });
      const result = await authenticateWebhook(request, RAW_BODY, SECRET);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("expired");
    });

    it("returns invalid when signature is wrong", async () => {
      const now = new Date("2026-07-02T12:00:00Z");
      const timestamp = String(Math.floor(now.getTime() / 1000));
      const request = new Request("http://localhost", { headers: makeHeaders(timestamp, "deadbeef") });
      const result = await authenticateWebhook(request, RAW_BODY, SECRET, now);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("invalid");
    });

    it("returns ok with correct signature (hex)", async () => {
      const now = new Date("2026-07-02T12:00:00Z");
      const timestamp = String(Math.floor(now.getTime() / 1000));
      const sig = await computeSignature(SECRET, RAW_BODY, timestamp);
      const request = new Request("http://localhost", { headers: makeHeaders(timestamp, sig) });
      const result = await authenticateWebhook(request, RAW_BODY, SECRET, now);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.producerId).toBe("producer-1");
    });

    it("returns ok with correct signature (sha256= prefix)", async () => {
      const now = new Date("2026-07-02T12:00:00Z");
      const timestamp = String(Math.floor(now.getTime() / 1000));
      const sig = await computeSignature(SECRET, RAW_BODY, timestamp);
      const request = new Request("http://localhost", { headers: makeHeaders(timestamp, `sha256=${sig}`) });
      const result = await authenticateWebhook(request, RAW_BODY, SECRET, now);
      expect(result.ok).toBe(true);
    });

    it("returns ok at the exact boundary of the time window", async () => {
      const now = new Date("2026-07-02T12:00:00Z");
      const timestamp = String(Math.floor((now.getTime() / 1000) - SIGNATURE_TOLERANCE_SECONDS));
      const sig = await computeSignature(SECRET, RAW_BODY, timestamp);
      const request = new Request("http://localhost", { headers: makeHeaders(timestamp, sig) });
      const result = await authenticateWebhook(request, RAW_BODY, SECRET, now);
      expect(result.ok).toBe(true);
    });

    it("returns ok at the exact upper boundary of the time window", async () => {
      const now = new Date("2026-07-02T12:00:00Z");
      const timestamp = String(Math.floor((now.getTime() / 1000) + SIGNATURE_TOLERANCE_SECONDS));
      const sig = await computeSignature(SECRET, RAW_BODY, timestamp);
      const request = new Request("http://localhost", { headers: makeHeaders(timestamp, sig) });
      const result = await authenticateWebhook(request, RAW_BODY, SECRET, now);
      expect(result.ok).toBe(true);
    });

    it("signature is body-sensitive", async () => {
      const now = new Date("2026-07-02T12:00:00Z");
      const timestamp = String(Math.floor(now.getTime() / 1000));
      const sig1 = await computeSignature(SECRET, '{"a":1}', timestamp);
      const sig2 = await computeSignature(SECRET, '{"a":2}', timestamp);
      expect(sig1).not.toBe(sig2);
    });
  });

  describe("SIGNATURE_TOLERANCE_SECONDS", () => {
    it("is 300 seconds", () => {
      expect(SIGNATURE_TOLERANCE_SECONDS).toBe(300);
    });
  });
});
