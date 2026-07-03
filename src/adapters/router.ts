import type { NotificationEvent, DownstreamTarget } from "../types";
import type { DownstreamAdapter } from "./index";
import { feishuAdapter } from "./feishu";
import { wecomAdapter } from "./wecom";
import { dingtalkAdapter } from "./dingtalk";

export function resolveAdapter(target: DownstreamTarget): DownstreamAdapter | undefined {
  if (target.id.startsWith("feishu")) return feishuAdapter;
  if (target.id.startsWith("wecom")) return wecomAdapter;
  if (target.id.startsWith("dingtalk")) return dingtalkAdapter;
  return undefined;
}

export function buildAdapterRequest(
  event: NotificationEvent,
  target: DownstreamTarget
): Request {
  const adapter = resolveAdapter(target);

  if (adapter) {
    return adapter.buildRequest(event, target);
  }

  return new Request(target.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": event.requestId,
      "X-Webhook-Event-Id": event.id
    },
    body: JSON.stringify(event)
  });
}
