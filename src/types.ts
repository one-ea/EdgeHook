export interface Env {
  WEBHOOK_EVENTS: Queue<NotificationEvent>;
  WEBHOOK_SECRET?: string;
  DEFAULT_EVENT_TYPE: string;
  TARGET_URL: string;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface NotificationEvent {
  id: string;
  requestId: string;
  producerId: string;
  source: "webhook";
  type: string;
  payload: JsonObject;
  metadata: JsonObject;
  receivedAt: string;
}

export type DeliveryStatus = "success" | "transient_failure" | "terminal_failure";

export interface DeliveryAttempt {
  eventId: string;
  targetId: string;
  attempt: number;
  status: DeliveryStatus;
  httpStatus?: number;
  latencyMs: number;
  completedAt: string;
}

export interface DownstreamTarget {
  id: string;
  url: string;
}

export interface FieldError {
  path: string;
  code: string;
}

export interface ErrorResponseBody {
  error: {
    code: WebhookErrorCode;
    message: string;
    fields?: FieldError[];
  };
  requestId: string;
}

export type WebhookErrorCode =
  | "WEBHOOK_METHOD_NOT_ALLOWED"
  | "WEBHOOK_UNAUTHORIZED"
  | "WEBHOOK_SIGNATURE_EXPIRED"
  | "WEBHOOK_INVALID_SIGNATURE"
  | "WEBHOOK_INVALID_JSON"
  | "WEBHOOK_INVALID_PAYLOAD"
  | "WEBHOOK_CONFIG_MISSING"
  | "WEBHOOK_QUEUE_UNAVAILABLE"
  | "WEBHOOK_DELIVERY_FAILED";

export interface QueueMessageBody {
  event: NotificationEvent;
}
