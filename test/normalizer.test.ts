import { describe, it, expect, vi } from "vitest";
import { normalizeNotificationEvent } from "../src/normalizer";

describe("normalizer", () => {
  const requestId = "test-request-id";
  const producerId = "test-producer";
  const defaultEventType = "webhook.received";
  const now = new Date("2026-07-02T12:00:00Z");

  it("generates a valid NotificationEvent with type from payload", () => {
    const event = normalizeNotificationEvent({
      requestId,
      producerId,
      defaultEventType,
      payload: { type: "custom.event", data: "test" },
      now
    });

    expect(event.id).toBeTruthy();
    expect(event.requestId).toBe(requestId);
    expect(event.producerId).toBe(producerId);
    expect(event.source).toBe("webhook");
    expect(event.type).toBe("custom.event");
    expect(event.payload).toEqual({ type: "custom.event", data: "test" });
    expect(event.metadata).toEqual({});
    expect(event.receivedAt).toBe("2026-07-02T12:00:00.000Z");
  });

  it("uses default event type when type is absent", () => {
    const event = normalizeNotificationEvent({
      requestId,
      producerId,
      defaultEventType,
      payload: { data: "test" },
      now
    });

    expect(event.type).toBe("webhook.received");
  });

  it("uses default event type when type is empty string", () => {
    const event = normalizeNotificationEvent({
      requestId,
      producerId,
      defaultEventType,
      payload: { type: "" },
      now
    });

    expect(event.type).toBe("webhook.received");
  });

  it("copies metadata from payload", () => {
    const event = normalizeNotificationEvent({
      requestId,
      producerId,
      defaultEventType,
      payload: { type: "test", metadata: { key: "val" } },
      now
    });

    expect(event.metadata).toEqual({ key: "val" });
  });

  it("defaults metadata to empty object when not present", () => {
    const event = normalizeNotificationEvent({
      requestId,
      producerId,
      defaultEventType,
      payload: { type: "test" },
      now
    });

    expect(event.metadata).toEqual({});
  });

  it("defaults metadata to empty object when not an object", () => {
    const event = normalizeNotificationEvent({
      requestId,
      producerId,
      defaultEventType,
      payload: { type: "test", metadata: "bad" },
      now
    });

    expect(event.metadata).toEqual({});
  });

  it("generates unique event IDs", () => {
    const a = normalizeNotificationEvent({ requestId, producerId, defaultEventType, payload: {}, now });
    const b = normalizeNotificationEvent({ requestId, producerId, defaultEventType, payload: {}, now });
    expect(a.id).not.toBe(b.id);
  });
});
