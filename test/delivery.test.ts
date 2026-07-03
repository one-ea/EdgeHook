import { describe, it, expect } from "vitest";
import {
  deliverNotificationEvent,
  classifyDeliveryResponse,
  shouldRetryDelivery,
  getDefaultTarget,
  MAX_DELIVERY_ATTEMPTS
} from "../src/delivery";
import type { Env, NotificationEvent } from "../src/types";

function makeFakeEnv(): Env {
  return {
    WEBHOOK_EVENTS: {} as Queue<NotificationEvent>,
    TARGET_URL: "http://localhost/success",
    DEFAULT_EVENT_TYPE: "webhook.received"
  };
}

function makeEvent(): NotificationEvent {
  return {
    id: "evt-test",
    requestId: "req-test",
    producerId: "producer-test",
    source: "webhook",
    type: "test.event",
    payload: {},
    metadata: {},
    receivedAt: "2026-07-02T12:00:00.000Z"
  };
}

describe("delivery", () => {
  describe("classifyDeliveryResponse", () => {
    it("classifies 200 as success", () => {
      expect(classifyDeliveryResponse(200)).toBe("success");
    });

    it("classifies 201 as success", () => {
      expect(classifyDeliveryResponse(201)).toBe("success");
    });

    it("classifies 299 as success", () => {
      expect(classifyDeliveryResponse(299)).toBe("success");
    });

    it("classifies 408 as transient_failure", () => {
      expect(classifyDeliveryResponse(408)).toBe("transient_failure");
    });

    it("classifies 429 as transient_failure", () => {
      expect(classifyDeliveryResponse(429)).toBe("transient_failure");
    });

    it("classifies 500 as transient_failure", () => {
      expect(classifyDeliveryResponse(500)).toBe("transient_failure");
    });

    it("classifies 502 as transient_failure", () => {
      expect(classifyDeliveryResponse(502)).toBe("transient_failure");
    });

    it("classifies 503 as transient_failure", () => {
      expect(classifyDeliveryResponse(503)).toBe("transient_failure");
    });

    it("classifies 400 as terminal_failure", () => {
      expect(classifyDeliveryResponse(400)).toBe("terminal_failure");
    });

    it("classifies 401 as terminal_failure", () => {
      expect(classifyDeliveryResponse(401)).toBe("terminal_failure");
    });

    it("classifies 403 as terminal_failure", () => {
      expect(classifyDeliveryResponse(403)).toBe("terminal_failure");
    });

    it("classifies 404 as terminal_failure", () => {
      expect(classifyDeliveryResponse(404)).toBe("terminal_failure");
    });

    it("classifies 422 as terminal_failure", () => {
      expect(classifyDeliveryResponse(422)).toBe("terminal_failure");
    });

    it("classifies 301 as terminal_failure", () => {
      expect(classifyDeliveryResponse(301)).toBe("terminal_failure");
    });
  });

  describe("shouldRetryDelivery", () => {
    it("retries transient_failure with remaining attempts", () => {
      expect(shouldRetryDelivery("transient_failure", 1)).toBe(true);
    });

    it("retries transient_failure at attempt 4", () => {
      expect(shouldRetryDelivery("transient_failure", 4)).toBe(true);
    });

    it("does not retry transient_failure at max attempts", () => {
      expect(shouldRetryDelivery("transient_failure", MAX_DELIVERY_ATTEMPTS)).toBe(false);
    });

    it("does not retry transient_failure above max attempts", () => {
      expect(shouldRetryDelivery("transient_failure", MAX_DELIVERY_ATTEMPTS + 1)).toBe(false);
    });

    it("does not retry success", () => {
      expect(shouldRetryDelivery("success", 1)).toBe(false);
    });

    it("does not retry terminal_failure", () => {
      expect(shouldRetryDelivery("terminal_failure", 1)).toBe(false);
    });
  });

  describe("getDefaultTarget", () => {
    it("returns target with TARGET_URL", () => {
      const env = makeFakeEnv();
      const target = getDefaultTarget(env);
      expect(target.id).toBe("default-http-target");
      expect(target.url).toBe("http://localhost/success");
    });
  });

  describe("MAX_DELIVERY_ATTEMPTS", () => {
    it("is 5", () => {
      expect(MAX_DELIVERY_ATTEMPTS).toBe(5);
    });
  });
});
