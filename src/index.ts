import type { Env, NotificationEvent } from "./types";
import { authenticateWebhook } from "./auth";
import { deliverNotificationEvent, getDefaultTarget, shouldRetryDelivery } from "./delivery";
import { createDeliveryRecord, updateDeliveryRecord, getDeliveryRecord, getDeliveryRecordsByRequestId } from "./delivery_repo";
import { logDeliveryAttempt, logRequestLifecycle } from "./logger";
import { normalizeNotificationEvent } from "./normalizer";
import { parseWebhookPayload } from "./parser";
import { enqueueNotificationEvent, logQueueFailure } from "./queue";
import { createRequestId, isAllowedWebhookMethod } from "./request";
import {
  configMissingResponse,
  invalidJsonResponse,
  invalidPayloadResponse,
  invalidSignatureResponse,
  jsonResponse,
  methodNotAllowedResponse,
  queueUnavailableResponse,
  signatureExpiredResponse
} from "./responses";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname.startsWith("/delivery/")) {
      return handleDeliveryQuery(request, env);
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return handleHealthCheck(env);
    }

    return handleWebhook(request, env);
  },

  async queue(batch: MessageBatch<NotificationEvent>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const event = message.body;
      const attemptNumber = message.attempts + 1;
      const target = getDefaultTarget(env);

      if (attemptNumber === 1 && env.DB) {
        try {
          await createDeliveryRecord(env.DB, event, target.id);
        } catch {
          // delivery record creation failure should not block delivery
        }
      }

      const result = await deliverNotificationEvent(env, event, attemptNumber);
      logDeliveryAttempt(result.attempt, event.requestId);

      if (env.DB) {
        try {
          await updateDeliveryRecord(env.DB, event.id, result.attempt, attemptNumber);
        } catch {
          // delivery record update failure should not block delivery
        }
      }

      if (shouldRetryDelivery(result.classification, attemptNumber)) {
        message.retry();
        continue;
      }

      message.ack();
    }
  }
};

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const requestId = createRequestId();

  if (!isAllowedWebhookMethod(request.method)) {
    logRequestLifecycle({
      requestId,
      outcome: "rejected",
      code: "WEBHOOK_METHOD_NOT_ALLOWED"
    });
    return methodNotAllowedResponse(requestId);
  }

  if (!env.WEBHOOK_EVENTS) {
    logRequestLifecycle({
      requestId,
      outcome: "rejected",
      code: "WEBHOOK_CONFIG_MISSING"
    });
    return configMissingResponse(requestId, "The Cloudflare Queue binding is missing.");
  }

  const rawBody = await request.text();
  const authentication = await authenticateWebhook(request, rawBody, env.WEBHOOK_SECRET);

  if (!authentication.ok) {
    if (authentication.reason === "missing_secret") {
      logRequestLifecycle({
        requestId,
        outcome: "rejected",
        code: "WEBHOOK_CONFIG_MISSING"
      });
      return configMissingResponse(requestId, "The webhook signing secret is missing.");
    }

    if (authentication.reason === "expired") {
      logRequestLifecycle({
        requestId,
        outcome: "rejected",
        code: "WEBHOOK_SIGNATURE_EXPIRED"
      });
      return signatureExpiredResponse(requestId);
    }

    logRequestLifecycle({
      requestId,
      outcome: "rejected",
      code: "WEBHOOK_INVALID_SIGNATURE"
    });
    return invalidSignatureResponse(requestId);
  }

  const parsed = parseWebhookPayload(rawBody);

  if (!parsed.ok) {
    if (parsed.reason === "invalid_json") {
      logRequestLifecycle({
        requestId,
        producerId: authentication.producerId,
        outcome: "rejected",
        code: "WEBHOOK_INVALID_JSON"
      });
      return invalidJsonResponse(requestId);
    }

    logRequestLifecycle({
      requestId,
      producerId: authentication.producerId,
      outcome: "rejected",
      code: "WEBHOOK_INVALID_PAYLOAD"
    });
    return invalidPayloadResponse(requestId, parsed.fields);
  }

  const event = normalizeNotificationEvent({
    requestId,
    producerId: authentication.producerId,
    defaultEventType: env.DEFAULT_EVENT_TYPE || "webhook.received",
    payload: parsed.payload
  });

  const enqueueResult = await enqueueNotificationEvent(env, event);

  if (!enqueueResult.ok) {
    if (enqueueResult.reason === "missing_binding") {
      logRequestLifecycle({
        requestId,
        producerId: event.producerId,
        eventType: event.type,
        outcome: "rejected",
        code: "WEBHOOK_CONFIG_MISSING"
      });
      return configMissingResponse(requestId, "The Cloudflare Queue binding is missing.");
    }

    logQueueFailure(requestId, event);
    logRequestLifecycle({
      requestId,
      producerId: event.producerId,
      eventType: event.type,
      outcome: "rejected",
      code: "WEBHOOK_QUEUE_UNAVAILABLE"
    });
    return queueUnavailableResponse(requestId);
  }

  logRequestLifecycle({
    requestId,
    producerId: event.producerId,
    eventType: event.type,
    outcome: "accepted"
  });

  return jsonResponse({ eventId: event.id, requestId }, 202, requestId);
}

async function handleDeliveryQuery(request: Request, env: Env): Promise<Response> {
  if (!env.DB) {
    return jsonResponse({ error: "D1 database not configured" }, 500, "");
  }

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);

  if (pathParts.length === 2) {
    const eventId = pathParts[1];
    const record = await getDeliveryRecord(env.DB, eventId);

    if (!record) {
      return jsonResponse({ error: "Delivery record not found" }, 404, "");
    }

    return jsonResponse(record, 200, record.requestId);
  }

  if (pathParts.length === 3 && pathParts[1] === "by-request") {
    const requestId = pathParts[2];
    const records = await getDeliveryRecordsByRequestId(env.DB, requestId);
    return jsonResponse({ records, count: records.length }, 200, requestId);
  }

  return jsonResponse({ error: "Invalid delivery query path" }, 400, "");
}

async function handleHealthCheck(env: Env): Promise<Response> {
  const health: Record<string, unknown> = {
    status: "ok",
    queue: !!env.WEBHOOK_EVENTS,
    database: !!env.DB,
    timestamp: new Date().toISOString()
  };

  return jsonResponse(health, 200, "");
}
