import type { DeliveryStatus, JsonObject } from "./types";

export interface DeliveryRecordRow {
  event_id: string;
  request_id: string;
  target_id: string;
  event_type: string;
  producer_id: string;
  attempt_count: number;
  status: DeliveryStatus;
  http_status: number | null;
  latency_ms: number | null;
  payload: string;
  attempts_json: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryRecord {
  eventId: string;
  requestId: string;
  targetId: string;
  eventType: string;
  producerId: string;
  attemptCount: number;
  status: DeliveryStatus;
  httpStatus: number | null;
  latencyMs: number | null;
  attempts: DeliveryAttemptRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryAttemptRecord {
  attempt: number;
  status: DeliveryStatus;
  httpStatus: number | null;
  latencyMs: number | null;
  completedAt: string;
}
