import type { DeliveryAttempt, JsonObject, JsonValue, WebhookErrorCode } from "./types";

const SENSITIVE_KEY_PATTERN = /(authorization|secret|signature|token|password|key)/i;

export interface RequestLogEntry {
  requestId: string;
  producerId?: string;
  eventType?: string;
  outcome: "accepted" | "rejected";
  code?: WebhookErrorCode;
}

export function logRequestLifecycle(entry: RequestLogEntry): void {
  writeLog("info", compactLogEntry({
    kind: "webhook_request",
    requestId: entry.requestId,
    producerId: entry.producerId,
    eventType: entry.eventType,
    outcome: entry.outcome,
    code: entry.code
  }));
}

export function logDeliveryAttempt(attempt: DeliveryAttempt, requestId: string): void {
  writeLog("info", compactLogEntry({
    kind: "delivery_attempt",
    requestId,
    eventId: attempt.eventId,
    targetId: attempt.targetId,
    attempt: attempt.attempt,
    status: attempt.status,
    httpStatus: attempt.httpStatus,
    latencyMs: attempt.latencyMs,
    completedAt: attempt.completedAt
  }));
}

export function logQueueFailure(requestId: string, eventId: string | undefined): void {
  writeLog("error", compactLogEntry({
    kind: "queue_failure",
    requestId,
    eventId,
    code: "WEBHOOK_QUEUE_UNAVAILABLE",
    status: "queue_send_failed"
  }));
}

export function redactSensitiveFields(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveFields(item));
  }

  if (typeof value === "object" && value !== null) {
    const redacted: JsonObject = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      redacted[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : redactSensitiveFields(nestedValue);
    }

    return redacted;
  }

  return value;
}

function writeLog(level: "info" | "error", entry: JsonObject): void {
  const redacted = redactSensitiveFields(entry);
  const serialized = JSON.stringify(redacted);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  console.log(serialized);
}

function compactLogEntry(entry: Record<string, JsonValue | undefined>): JsonObject {
  const compacted: JsonObject = {};

  for (const [key, value] of Object.entries(entry)) {
    if (value !== undefined) {
      compacted[key] = value;
    }
  }

  return compacted;
}
