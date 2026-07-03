import { describe, it, expect } from "vitest";
import {
  jsonResponse,
  errorResponse,
  methodNotAllowedResponse,
  configMissingResponse,
  invalidSignatureResponse,
  signatureExpiredResponse,
  invalidJsonResponse,
  invalidPayloadResponse,
  queueUnavailableResponse
} from "../src/responses";
import type { ErrorResponseBody } from "../src/types";

describe("responses", () => {
  const requestId = "test-request-id";

  describe("jsonResponse", () => {
    it("returns a Response with JSON body", async () => {
      const body = { key: "value" };
      const res = jsonResponse(body, 202, requestId);
      expect(res.status).toBe(202);
      expect(res.headers.get("Content-Type")).toContain("application/json");
      expect(res.headers.get("X-Request-Id")).toBe(requestId);
      const data = await res.json() as Record<string, unknown>;
      expect(data).toEqual(body);
    });

    it("includes custom headers", () => {
      const res = jsonResponse({}, 200, requestId, { Allow: "POST" });
      expect(res.headers.get("Allow")).toBe("POST");
    });
  });

  describe("errorResponse", () => {
    it("returns structured error body", async () => {
      const res = errorResponse({
        code: "WEBHOOK_INVALID_JSON",
        message: "invalid json",
        requestId,
        status: 400
      });
      expect(res.status).toBe(400);
      const body = await res.json() as ErrorResponseBody;
      expect(body.error.code).toBe("WEBHOOK_INVALID_JSON");
      expect(body.error.message).toBe("invalid json");
      expect(body.requestId).toBe(requestId);
    });

    it("includes fields when provided", async () => {
      const res = errorResponse({
        code: "WEBHOOK_INVALID_PAYLOAD",
        message: "invalid payload",
        requestId,
        status: 422,
        fields: [{ path: "type", code: "string_required" }]
      });
      const body = await res.json() as ErrorResponseBody;
      expect(body.error.fields).toEqual([{ path: "type", code: "string_required" }]);
    });

    it("does not include fields when not provided", async () => {
      const res = errorResponse({
        code: "WEBHOOK_CONFIG_MISSING",
        message: "missing config",
        requestId,
        status: 500
      });
      const body = await res.json() as ErrorResponseBody;
      expect(body.error.fields).toBeUndefined();
    });
  });

  describe("methodNotAllowedResponse", () => {
    it("returns 405 with Allow header", async () => {
      const res = methodNotAllowedResponse(requestId);
      expect(res.status).toBe(405);
      expect(res.headers.get("Allow")).toBe("POST");
      const body = await res.json() as ErrorResponseBody;
      expect(body.error.code).toBe("WEBHOOK_METHOD_NOT_ALLOWED");
    });
  });

  describe("configMissingResponse", () => {
    it("returns 500 with custom message", async () => {
      const res = configMissingResponse(requestId, "custom config error");
      expect(res.status).toBe(500);
      const body = await res.json() as ErrorResponseBody;
      expect(body.error.code).toBe("WEBHOOK_CONFIG_MISSING");
      expect(body.error.message).toBe("custom config error");
    });
  });

  describe("invalidSignatureResponse", () => {
    it("returns 401", async () => {
      const res = invalidSignatureResponse(requestId);
      expect(res.status).toBe(401);
      const body = await res.json() as ErrorResponseBody;
      expect(body.error.code).toBe("WEBHOOK_INVALID_SIGNATURE");
    });
  });

  describe("signatureExpiredResponse", () => {
    it("returns 401", async () => {
      const res = signatureExpiredResponse(requestId);
      expect(res.status).toBe(401);
      const body = await res.json() as ErrorResponseBody;
      expect(body.error.code).toBe("WEBHOOK_SIGNATURE_EXPIRED");
    });
  });

  describe("invalidJsonResponse", () => {
    it("returns 400", async () => {
      const res = invalidJsonResponse(requestId);
      expect(res.status).toBe(400);
      const body = await res.json() as ErrorResponseBody;
      expect(body.error.code).toBe("WEBHOOK_INVALID_JSON");
    });
  });

  describe("invalidPayloadResponse", () => {
    it("returns 422 with fields", async () => {
      const res = invalidPayloadResponse(requestId, [{ path: "type", code: "string_required" }]);
      expect(res.status).toBe(422);
      const body = await res.json() as ErrorResponseBody;
      expect(body.error.code).toBe("WEBHOOK_INVALID_PAYLOAD");
      expect(body.error.fields).toBeDefined();
    });

    it("returns 422 without fields", async () => {
      const res = invalidPayloadResponse(requestId);
      expect(res.status).toBe(422);
      const body = await res.json() as ErrorResponseBody;
      expect(body.error.fields).toEqual([]);
    });
  });

  describe("queueUnavailableResponse", () => {
    it("returns 503", async () => {
      const res = queueUnavailableResponse(requestId);
      expect(res.status).toBe(503);
      const body = await res.json() as ErrorResponseBody;
      expect(body.error.code).toBe("WEBHOOK_QUEUE_UNAVAILABLE");
    });
  });
});
