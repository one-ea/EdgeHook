import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  logRequestLifecycle,
  logDeliveryAttempt,
  logQueueFailure,
  redactSensitiveFields
} from "../src/logger";
import type { DeliveryAttempt, JsonValue } from "../src/types";

describe("logger", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("logRequestLifecycle", () => {
    it("logs accepted request", () => {
      logRequestLifecycle({ requestId: "req-1", outcome: "accepted" });
      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(logged.kind).toBe("webhook_request");
      expect(logged.requestId).toBe("req-1");
      expect(logged.outcome).toBe("accepted");
      expect(logged.code).toBeUndefined();
    });

    it("logs rejected request with error code", () => {
      logRequestLifecycle({
        requestId: "req-2",
        producerId: "prod-1",
        eventType: "test.event",
        outcome: "rejected",
        code: "WEBHOOK_INVALID_SIGNATURE"
      });
      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(logged.kind).toBe("webhook_request");
      expect(logged.producerId).toBe("prod-1");
      expect(logged.eventType).toBe("test.event");
      expect(logged.outcome).toBe("rejected");
      expect(logged.code).toBe("WEBHOOK_INVALID_SIGNATURE");
    });
  });

  describe("logDeliveryAttempt", () => {
    it("logs delivery attempt", () => {
      const attempt: DeliveryAttempt = {
        eventId: "evt-1",
        targetId: "tgt-1",
        attempt: 2,
        status: "transient_failure",
        httpStatus: 503,
        latencyMs: 42,
        completedAt: "2026-07-02T12:00:00.000Z"
      };
      logDeliveryAttempt(attempt, "req-1");
      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(logged.kind).toBe("delivery_attempt");
      expect(logged.requestId).toBe("req-1");
      expect(logged.eventId).toBe("evt-1");
      expect(logged.targetId).toBe("tgt-1");
      expect(logged.attempt).toBe(2);
      expect(logged.status).toBe("transient_failure");
      expect(logged.httpStatus).toBe(503);
      expect(logged.latencyMs).toBe(42);
    });
  });

  describe("logQueueFailure", () => {
    it("logs queue failure to console.error", () => {
      logQueueFailure("req-1", "evt-1");
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const logged = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
      expect(logged.kind).toBe("queue_failure");
      expect(logged.requestId).toBe("req-1");
      expect(logged.eventId).toBe("evt-1");
      expect(logged.code).toBe("WEBHOOK_QUEUE_UNAVAILABLE");
      expect(logged.status).toBe("queue_send_failed");
    });
  });

  describe("redactSensitiveFields", () => {
    it("redacts authorization", () => {
      const result = redactSensitiveFields({ authorization: "Bearer token" });
      expect(result).toEqual({ authorization: "[REDACTED]" });
    });

    it("redacts secret", () => {
      const result = redactSensitiveFields({ secret: "my-secret" });
      expect(result).toEqual({ secret: "[REDACTED]" });
    });

    it("redacts signature", () => {
      const result = redactSensitiveFields({ signature: "abc123" });
      expect(result).toEqual({ signature: "[REDACTED]" });
    });

    it("redacts token", () => {
      const result = redactSensitiveFields({ token: "x-token" });
      expect(result).toEqual({ token: "[REDACTED]" });
    });

    it("redacts password", () => {
      const result = redactSensitiveFields({ password: "p@ss" });
      expect(result).toEqual({ password: "[REDACTED]" });
    });

    it("redacts key", () => {
      const result = redactSensitiveFields({ key: "api-key" });
      expect(result).toEqual({ key: "[REDACTED]" });
    });

    it("redacts case-insensitively", () => {
      const result = redactSensitiveFields({ Authorization: "Bearer token" });
      expect(result).toEqual({ Authorization: "[REDACTED]" });
    });

    it("redacts nested sensitive fields", () => {
      const result = redactSensitiveFields({ nested: { secret: "hidden" } });
      expect(result).toEqual({ nested: { secret: "[REDACTED]" } });
    });

    it("redacts sensitive fields in arrays", () => {
      const result = redactSensitiveFields([{ token: "x" }, { data: "ok" }]);
      expect(result).toEqual([{ token: "[REDACTED]" }, { data: "ok" }]);
    });

    it("preserves non-sensitive fields", () => {
      const result = redactSensitiveFields({ name: "test", count: 42, active: true });
      expect(result).toEqual({ name: "test", count: 42, active: true });
    });

    it("handles primitive values", () => {
      expect(redactSensitiveFields("hello" as JsonValue)).toBe("hello");
      expect(redactSensitiveFields(42 as JsonValue)).toBe(42);
      expect(redactSensitiveFields(true as JsonValue)).toBe(true);
      expect(redactSensitiveFields(null as JsonValue)).toBe(null);
    });
  });
});
