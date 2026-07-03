import type { Env, NotificationEvent, WebhookErrorCode } from "./types";
import { authenticateWebhook } from "./auth";
import { deliverNotificationEvent, getDefaultTarget, shouldRetryDelivery } from "./delivery";
import { createDeliveryRecord, updateDeliveryRecord, getDeliveryRecord, getDeliveryRecordsByRequestId, getFailedDeliveryRecords } from "./delivery_repo";
import { isIpAllowed } from "./ip_whitelist";
import { logDeliveryAttempt, logRequestLifecycle } from "./logger";
import { computeAndCheckAlerts, computeDeliveryMetrics } from "./monitor";
import { normalizeNotificationEvent } from "./normalizer";
import { parseWebhookPayload } from "./parser";
import { enqueueNotificationEvent, logQueueFailure } from "./queue";
import { globalRateLimiter } from "./rate_limit";
import { createRequestId, isAllowedWebhookMethod } from "./request";
import {
  configMissingResponse,
  errorResponse,
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

    if (request.method === "GET" && url.pathname === "/metrics") {
      return handleMetrics(env);
    }

    if (request.method === "GET" && url.pathname === "/alerts") {
      return handleAlerts(env);
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

  const clientIp = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const allowedCidrs = (env.WEBHOOK_ALLOWED_CIDRS || "").split(",").filter(Boolean);
  if (!isIpAllowed(clientIp, allowedCidrs)) {
    logRequestLifecycle({
      requestId,
      outcome: "rejected",
      code: "WEBHOOK_FORBIDDEN"
    });
    return errorResponse({
      code: "WEBHOOK_FORBIDDEN",
      message: "IP address not in whitelist.",
      requestId,
      status: 403
    });
  }

  const rateLimitKey = `rate:${clientIp}`;
  if (!globalRateLimiter.isAllowed(rateLimitKey, 60, 60)) {
    logRequestLifecycle({
      requestId,
      outcome: "rejected",
      code: "WEBHOOK_RATE_LIMITED"
    });
    return errorResponse({
      code: "WEBHOOK_RATE_LIMITED",
      message: "Rate limit exceeded. Maximum 60 requests per minute.",
      requestId,
      status: 429
    });
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
  const maxPayloadSize = parseInt(env.WEBHOOK_MAX_PAYLOAD_SIZE || "65536", 10);

  if (rawBody.length > maxPayloadSize) {
    logRequestLifecycle({
      requestId,
      outcome: "rejected",
      code: "WEBHOOK_PAYLOAD_TOO_LARGE"
    });
    return errorResponse({
      code: "WEBHOOK_PAYLOAD_TOO_LARGE",
      message: `Payload size ${rawBody.length} exceeds limit of ${maxPayloadSize} bytes.`,
      requestId,
      status: 413
    });
  }

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

async function handleMetrics(env: Env): Promise<Response> {
  if (!env.DB) {
    return jsonResponse({ error: "D1 database not configured" }, 500, "");
  }

  const records = await getFailedDeliveryRecords(env.DB, 200);
  const metrics = computeDeliveryMetrics(records);
  return jsonResponse(metrics, 200, "");
}

async function handleAlerts(env: Env): Promise<Response> {
  if (!env.DB) {
    return jsonResponse({ error: "D1 database not configured" }, 500, "");
  }

  const result = await computeAndCheckAlerts(env.DB);
  return jsonResponse(result, 200, "");
}
