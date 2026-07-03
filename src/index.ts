import type { Env, NotificationEvent } from "./types";
import { authenticateWebhook } from "./auth";
import { deliverNotificationEvent, shouldRetryDelivery } from "./delivery";
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
  },

  async queue(batch: MessageBatch<NotificationEvent>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const attemptNumber = message.attempts + 1;
      const result = await deliverNotificationEvent(env, message.body, attemptNumber);
      logDeliveryAttempt(result.attempt, message.body.requestId);

      if (shouldRetryDelivery(result.classification, attemptNumber)) {
        message.retry();
        continue;
      }

      message.ack();
    }
  }
};
