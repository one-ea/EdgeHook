import { describe, it, expect } from "vitest";
import { enqueueNotificationEvent, logQueueFailure } from "../src/queue";
import type { Env, NotificationEvent } from "../src/types";

function makeEvent(): NotificationEvent {
  return {
    id: "evt-test",
    requestId: "req-test",
    producerId: "prod-test",
    source: "webhook",
    type: "test.event",
    payload: {},
    metadata: {},
    receivedAt: "2026-07-02T12:00:00.000Z"
  };
}

describe("queue", () => {
  describe("enqueueNotificationEvent", () => {
    it("returns missing_binding when WEBHOOK_EVENTS is not set", async () => {
      const env = {
        WEBHOOK_EVENTS: undefined as unknown as Queue<NotificationEvent>,
        DEFAULT_EVENT_TYPE: "webhook.received",
        TARGET_URL: "http://localhost"
      };
      const result = await enqueueNotificationEvent(env, makeEvent());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("missing_binding");
    });

    it("returns ok when send succeeds", async () => {
      const fakeQueue = {
        send: async (_body: NotificationEvent) => Promise.resolve()
      };
      const env = {
        WEBHOOK_EVENTS: fakeQueue as unknown as Queue<NotificationEvent>,
        DEFAULT_EVENT_TYPE: "webhook.received",
        TARGET_URL: "http://localhost"
      };
      const result = await enqueueNotificationEvent(env, makeEvent());
      expect(result.ok).toBe(true);
    });

    it("returns send_failed when send throws", async () => {
      const fakeQueue = {
        send: async (_body: NotificationEvent) => { throw new Error("send error"); }
      };
      const env = {
        WEBHOOK_EVENTS: fakeQueue as unknown as Queue<NotificationEvent>,
        DEFAULT_EVENT_TYPE: "webhook.received",
        TARGET_URL: "http://localhost"
      };
      const result = await enqueueNotificationEvent(env, makeEvent());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("send_failed");
    });
  });
});
