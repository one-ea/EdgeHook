import type { JsonObject, NotificationEvent } from "./types";
import { isJsonObject } from "./parser";

export interface NormalizeEventOptions {
  requestId: string;
  producerId: string;
  defaultEventType: string;
  payload: JsonObject;
  now?: Date;
}

export function normalizeNotificationEvent(options: NormalizeEventOptions): NotificationEvent {
  return {
    id: crypto.randomUUID(),
    requestId: options.requestId,
    producerId: options.producerId,
    source: "webhook",
    type: getEventType(options.payload, options.defaultEventType),
    payload: options.payload,
    metadata: getMetadata(options.payload),
    receivedAt: (options.now || new Date()).toISOString()
  };
}

function getEventType(payload: JsonObject, defaultEventType: string): string {
  return typeof payload.type === "string" && payload.type.length > 0
    ? payload.type
    : defaultEventType;
}

function getMetadata(payload: JsonObject): JsonObject {
  return isJsonObject(payload.metadata) ? payload.metadata : {};
}
