import type { Env, NotificationEvent } from "./types";
import { logQueueFailure as writeQueueFailureLog } from "./logger";

export type EnqueueResult = { ok: true } | { ok: false; reason: "missing_binding" | "send_failed" };

export async function enqueueNotificationEvent(
  env: Env,
  event: NotificationEvent
): Promise<EnqueueResult> {
  if (!env.WEBHOOK_EVENTS) {
    return { ok: false, reason: "missing_binding" };
  }

  try {
    await env.WEBHOOK_EVENTS.send(event);
    return { ok: true };
  } catch {
    return { ok: false, reason: "send_failed" };
  }
}

export function logQueueFailure(requestId: string, event: NotificationEvent | undefined): void {
  writeQueueFailureLog(requestId, event?.id);
}
