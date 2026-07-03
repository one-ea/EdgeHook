import type { NotificationEvent, DownstreamTarget } from "../types";
import type { DownstreamAdapter } from "./index";

interface WecomMessageBody {
  msgtype: "markdown" | "text";
  markdown?: {
    content: string;
  };
  text?: {
    content: string;
    mentioned_list?: string[];
  };
}

function buildWecomMessage(event: NotificationEvent): WecomMessageBody {
  const lines = [
    `## [${event.type}] Webhook Notification`,
    "",
    `> Event ID: ${event.id}`,
    `> Request ID: ${event.requestId}`,
    `> Producer: ${event.producerId}`,
    `> Source: ${event.source}`,
    `> Received At: ${event.receivedAt}`
  ];

  if (Object.keys(event.payload).length > 0) {
    lines.push("");
    lines.push("**Payload:**");
    lines.push("```");
    lines.push(JSON.stringify(event.payload, null, 2));
    lines.push("```");
  }

  if (Object.keys(event.metadata).length > 0) {
    lines.push("");
    lines.push("**Metadata:**");
    lines.push("```");
    lines.push(JSON.stringify(event.metadata, null, 2));
    lines.push("```");
  }

  return {
    msgtype: "markdown",
    markdown: {
      content: lines.join("\n")
    }
  };
}

export const wecomAdapter: DownstreamAdapter = {
  name: "wecom",
  buildRequest(event: NotificationEvent, target: DownstreamTarget): Request {
    const body = buildWecomMessage(event);
    return new Request(target.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": event.requestId,
        "X-Webhook-Event-Id": event.id
      },
      body: JSON.stringify(body)
    });
  }
};
