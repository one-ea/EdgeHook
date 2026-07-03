import { describe, it, expect } from "vitest";
import { createRequestId, isAllowedWebhookMethod, REQUEST_ID_HEADER, ALLOWED_WEBHOOK_METHOD } from "../src/request";

describe("request", () => {
  describe("createRequestId", () => {
    it("returns a non-empty string", () => {
      const id = createRequestId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
    });

    it("returns a valid UUID", () => {
      const id = createRequestId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it("returns unique values across calls", () => {
      const ids = new Set(Array.from({ length: 10 }, () => createRequestId()));
      expect(ids.size).toBe(10);
    });
  });

  describe("isAllowedWebhookMethod", () => {
    it("returns true for POST", () => {
      expect(isAllowedWebhookMethod("POST")).toBe(true);
    });

    it("returns false for GET", () => {
      expect(isAllowedWebhookMethod("GET")).toBe(false);
    });

    it("returns false for PUT", () => {
      expect(isAllowedWebhookMethod("PUT")).toBe(false);
    });

    it("returns false for DELETE", () => {
      expect(isAllowedWebhookMethod("DELETE")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isAllowedWebhookMethod("")).toBe(false);
    });
  });

  describe("constants", () => {
    it("REQUEST_ID_HEADER is X-Request-Id", () => {
      expect(REQUEST_ID_HEADER).toBe("X-Request-Id");
    });

    it("ALLOWED_WEBHOOK_METHOD is POST", () => {
      expect(ALLOWED_WEBHOOK_METHOD).toBe("POST");
    });
  });
});
