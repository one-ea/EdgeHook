import type { DeliveryAttempt, DownstreamTarget, Env, NotificationEvent } from "./types";
import { buildAdapterRequest } from "./adapters/router";

export const DEFAULT_TARGET_ID = "default-http-target";
export const MAX_DELIVERY_ATTEMPTS = 5;

export type DeliveryClassification = "success" | "transient_failure" | "terminal_failure";

export interface DeliveryResult {
  classification: DeliveryClassification;
  attempt: DeliveryAttempt;
}

export async function deliverNotificationEvent(
  env: Env,
  event: NotificationEvent,
  attemptNumber: number
): Promise<DeliveryResult> {
  const target = getDefaultTarget(env);
  const startedAt = Date.now();
  const request = buildAdapterRequest(event, target);
  const response = await fetch(request);
  const classification = classifyDeliveryResponse(response.status);

  return {
    classification,
    attempt: {
      eventId: event.id,
      targetId: target.id,
      attempt: attemptNumber,
      status: classification,
      httpStatus: response.status,
      latencyMs: Date.now() - startedAt,
      completedAt: new Date().toISOString()
    }
  };
}

export function getDefaultTarget(env: Env): DownstreamTarget {
  return {
    id: DEFAULT_TARGET_ID,
    url: env.TARGET_URL
  };
}

export function classifyDeliveryResponse(status: number): DeliveryClassification {
  if (status >= 200 && status < 300) {
    return "success";
  }

  if (status === 408 || status === 429 || status >= 500) {
    return "transient_failure";
  }

  return "terminal_failure";
}

export function shouldRetryDelivery(classification: DeliveryClassification, attemptNumber: number): boolean {
  return classification === "transient_failure" && attemptNumber < MAX_DELIVERY_ATTEMPTS;
}
