import type { DeliveryAttempt, NotificationEvent } from "./types";
import type { DeliveryRecord, DeliveryAttemptRecord } from "./delivery_store";

export async function createDeliveryRecord(
  db: D1Database,
  event: NotificationEvent,
  targetId: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO delivery_records
       (event_id, request_id, target_id, event_type, producer_id, attempt_count, status, payload, attempts_json, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 0, 'pending', ?6, '[]', ?7, ?8)`
    )
    .bind(
      event.id,
      event.requestId,
      targetId,
      event.type,
      event.producerId,
      JSON.stringify(event),
      now,
      now
    )
    .run();
}

export async function updateDeliveryRecord(
  db: D1Database,
  eventId: string,
  attempt: DeliveryAttempt,
  attemptNumber: number
): Promise<void> {
  const now = new Date().toISOString();
  const attemptRecord: DeliveryAttemptRecord = {
    attempt: attemptNumber,
    status: attempt.status,
    httpStatus: attempt.httpStatus ?? null,
    latencyMs: attempt.latencyMs,
    completedAt: attempt.completedAt
  };

  const row = await db
    .prepare("SELECT attempts_json FROM delivery_records WHERE event_id = ?1")
    .bind(eventId)
    .first<{ attempts_json: string }>();

  if (!row) {
    return;
  }

  const existing: DeliveryAttemptRecord[] = JSON.parse(row.attempts_json || "[]");
  existing.push(attemptRecord);

  await db
    .prepare(
      `UPDATE delivery_records
       SET status = ?1, http_status = ?2, latency_ms = ?3, attempt_count = ?4, attempts_json = ?5, updated_at = ?6
       WHERE event_id = ?7`
    )
    .bind(
      attempt.status,
      attempt.httpStatus ?? null,
      attempt.latencyMs,
      attemptNumber,
      JSON.stringify(existing),
      now,
      eventId
    )
    .run();
}

export async function getDeliveryRecord(
  db: D1Database,
  eventId: string
): Promise<DeliveryRecord | null> {
  const row = await db
    .prepare("SELECT * FROM delivery_records WHERE event_id = ?1")
    .bind(eventId)
    .first();

  if (!row) {
    return null;
  }

  return mapRow(row);
}

export async function getDeliveryRecordsByRequestId(
  db: D1Database,
  requestId: string
): Promise<DeliveryRecord[]> {
  const result = await db
    .prepare("SELECT * FROM delivery_records WHERE request_id = ?1")
    .bind(requestId)
    .all();

  return result.results.map(mapRow);
}

export async function getFailedDeliveryRecords(
  db: D1Database,
  limit = 50
): Promise<DeliveryRecord[]> {
  const result = await db
    .prepare("SELECT * FROM delivery_records WHERE status = 'terminal_failure' ORDER BY updated_at DESC LIMIT ?1")
    .bind(limit)
    .all();

  return result.results.map(mapRow);
}

function mapRow(row: Record<string, unknown>): DeliveryRecord {
  return {
    eventId: row.event_id as string,
    requestId: row.request_id as string,
    targetId: row.target_id as string,
    eventType: row.event_type as string,
    producerId: row.producer_id as string,
    attemptCount: row.attempt_count as number,
    status: row.status as DeliveryRecord["status"],
    httpStatus: row.http_status as number | null,
    latencyMs: row.latency_ms as number | null,
    attempts: JSON.parse((row.attempts_json as string) || "[]"),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}
