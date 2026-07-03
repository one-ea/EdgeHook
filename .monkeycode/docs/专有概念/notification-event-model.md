# Notification Event 模型

## 概念定位

`NotificationEvent` 是 webhook 事件的标准化内部模型，贯穿入口链路、Queue 传输和下游投递。原始 payload 在 `normalizer` 中被升级为 `NotificationEvent`，此后系统内所有模块都基于该模型工作，不再直接处理原始请求体。

## 字段定义

| 字段 | 类型 | 来源 |
|------|------|------|
| `id` | `string` | `crypto.randomUUID()` |
| `requestId` | `string` | 入口生成的 `X-Request-Id` |
| `producerId` | `string` | 认证阶段的 `X-Webhook-Id` |
| `source` | `"webhook"` | 固定字面量 |
| `type` | `string` | payload `type` 或 `DEFAULT_EVENT_TYPE` |
| `payload` | `JsonObject` | 解析后的原始 JSON object |
| `metadata` | `JsonObject` | payload `metadata` 或空 object |
| `receivedAt` | `string` | 标准化时的 ISO 8601 时间戳 |

## 标准化规则

- `type` 缺失或为空字符串时回退到 `DEFAULT_EVENT_TYPE`，默认值为 `webhook.received`。
- `metadata` 缺失或不是 JSON object 时回退到空 object。
- `payload` 字段直接保留，不做额外脱敏；脱敏只发生在日志输出环节。
- `receivedAt` 使用 `new Date().toISOString()`，支持测试注入 `now` 参数。

## 生命周期

1. `normalizer.ts` 创建实例。
2. `queue.ts` 通过 `env.WEBHOOK_EVENTS.send(event)` 将实例作为 Queue 消息体发送。
3. `index.ts` 的 `queue` handler 从 `message.body` 取回实例。
4. `delivery.ts` 将实例序列化为 JSON 并 POST 到 `TARGET_URL`，同时在请求头携带 `X-Webhook-Event-Id`。

## 相关代码

- 类型定义：`src/types.ts:15`
- 标准化实现：`src/normalizer.ts:12`
- 入队调用：`src/queue.ts:15`
- 投递序列化：`src/delivery.ts:27`
