import type { NotificationEvent, DownstreamTarget } from "../types";
import type { DownstreamAdapter } from "./index";

interface FeishuCardHeader {
  title: { content: string; tag: string };
  template?: string;
}

interface FeishuCardElement {
  tag: string;
  text?: { content: string; tag: string };
  content?: string;
}

interface FeishuCardBody {
  msg_type: "interactive";
  card: {
    header: FeishuCardHeader;
    elements: FeishuCardElement[];
  };
  timestamp?: string;
  sign?: string;
}

function buildFeishuCard(event: NotificationEvent): FeishuCardBody {
  const elements: FeishuCardElement[] = [
    {
      tag: "div",
      text: {
        tag: "lark_md",
        content: `**Event Type:** ${event.type}\n**Event ID:** ${event.id}\n**Request ID:** ${event.requestId}\n**Producer:** ${event.producerId}`
      }
    }
  ];

  if (Object.keys(event.payload).length > 0) {
    elements.push({
      tag: "div",
      text: {
        tag: "lark_md",
        content: `**Payload:**\n\`\`\`json\n${JSON.stringify(event.payload, null, 2)}\n\`\`\``
      }
    });
  }

  return {
    msg_type: "interactive",
    card: {
      header: {
        title: {
          content: `[${event.type}] Webhook Notification`,
          tag: "plain_text"
        },
        template: "blue"
      },
      elements
    }
  };
}

export const feishuAdapter: DownstreamAdapter = {
  name: "feishu",
  buildRequest(event: NotificationEvent, target: DownstreamTarget): Request {
    const body = buildFeishuCard(event);
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
