import { describe, it, expect } from "vitest";
import { parseWebhookPayload, validateWebhookPayload, isJsonObject } from "../src/parser";

describe("parser", () => {
  describe("parseWebhookPayload", () => {
    it("parses valid JSON object", () => {
      const result = parseWebhookPayload('{"type":"event.test","payload":{"key":"val"}}');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.payload.type).toBe("event.test");
      }
    });

    it("rejects invalid JSON", () => {
      const result = parseWebhookPayload("not-json");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("invalid_json");
      }
    });

    it("rejects non-object JSON (array)", () => {
      const result = parseWebhookPayload("[1,2,3]");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("invalid_payload");
        expect(result.fields).toEqual([{ path: "$", code: "object_required" }]);
      }
    });

    it("rejects non-object JSON (string)", () => {
      const result = parseWebhookPayload('"hello"');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("invalid_payload");
      }
    });

    it("rejects non-object JSON (number)", () => {
      const result = parseWebhookPayload("42");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("invalid_payload");
      }
    });

    it("rejects non-object JSON (null)", () => {
      const result = parseWebhookPayload("null");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("invalid_payload");
      }
    });

    it("accepts empty object", () => {
      const result = parseWebhookPayload("{}");
      expect(result.ok).toBe(true);
    });

    it("rejects when type is not a string", () => {
      const result = parseWebhookPayload('{"type":123}');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fields).toContainEqual({ path: "type", code: "string_required" });
      }
    });

    it("accepts when type is a string", () => {
      const result = parseWebhookPayload('{"type":"event.test"}');
      expect(result.ok).toBe(true);
    });

    it("accepts when type is absent", () => {
      const result = parseWebhookPayload('{"other":"field"}');
      expect(result.ok).toBe(true);
    });

    it("rejects when metadata is not an object", () => {
      const result = parseWebhookPayload('{"metadata":"not-object"}');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fields).toContainEqual({ path: "metadata", code: "object_required" });
      }
    });

    it("accepts when metadata is an object", () => {
      const result = parseWebhookPayload('{"metadata":{"key":"val"}}');
      expect(result.ok).toBe(true);
    });

    it("accepts when metadata is absent", () => {
      const result = parseWebhookPayload('{"type":"test"}');
      expect(result.ok).toBe(true);
    });

    it("returns multiple validation errors", () => {
      const result = parseWebhookPayload('{"type":1,"metadata":"bad"}');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fields).toHaveLength(2);
      }
    });
  });

  describe("isJsonObject", () => {
    it("returns true for plain object", () => {
      expect(isJsonObject({})).toBe(true);
    });

    it("returns false for array", () => {
      expect(isJsonObject([])).toBe(false);
    });

    it("returns false for string", () => {
      expect(isJsonObject("hello")).toBe(false);
    });

    it("returns false for number", () => {
      expect(isJsonObject(42)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isJsonObject(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isJsonObject(undefined)).toBe(false);
    });
  });
});
