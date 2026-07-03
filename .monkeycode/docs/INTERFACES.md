# 接口文档

## Worker Env

`src/types.ts` 中的 `Env` 定义 Cloudflare Worker 运行时绑定：

- `WEBHOOK_EVENTS`：Cloudflare Queue producer binding，消息类型为 `NotificationEvent`。
- `WEBHOOK_SECRET`：可选 webhook HMAC 密钥，通过 `wrangler secret put` 设置。
- `DEFAULT_EVENT_TYPE`：默认事件类型，`wrangler.toml` 中为 `webhook.received`。
- `TARGET_URL`：默认下游 HTTP endpoint URL。

## NotificationEvent

`NotificationEvent` 是 webhook 事件的标准化模型：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | `crypto.randomUUID()` |
| `requestId` | `string` | 入口生成的 `X-Request-Id` |
| `producerId` | `string` | 认证阶段的 `X-Webhook-Id` |
| `source` | `"webhook"` | 固定字面量 |
| `type` | `string` | payload `type` 或 `DEFAULT_EVENT_TYPE` |
| `payload` | `JsonObject` | 解析后的原始 JSON object |
| `metadata` | `JsonObject` | payload `metadata` 或空 object |
| `receivedAt` | `string` | ISO 8601 时间戳 |

## DeliveryAttempt

`DeliveryAttempt` 描述一次下游投递尝试：

| 字段 | 类型 | 说明 |
|------|------|------|
| `eventId` | `string` | 关联事件标识 |
| `targetId` | `string` | 下游目标标识 |
| `attempt` | `number` | 尝试次数（从 1 开始） |
| `status` | `DeliveryStatus` | `success` / `transient_failure` / `terminal_failure` |
| `httpStatus` | `number?` | 可选 HTTP 状态码 |
| `latencyMs` | `number` | 投递耗时 |
| `completedAt` | `string` | 完成时间 |

## HTTP 接口

### 入口端点

- 方法：`POST`
- 请求头：`X-Webhook-Timestamp`、`X-Webhook-Signature`、`X-Webhook-Id`
- 请求体：JSON object，可选 `type`（string）和 `metadata`（object）

### 成功响应

```json
HTTP/1.1 202
Content-Type: application/json; charset=utf-8
X-Request-Id: <uuid>

{
  "eventId": "<uuid>",
  "requestId": "<uuid>"
}
```

### 错误响应

统一遵循 `ErrorResponseBody`：

```json
{
  "error": {
    "code": "WEBHOOK_INVALID_PAYLOAD",
    "message": "The webhook payload failed validation.",
    "fields": [
      { "path": "type", "code": "string_required" }
    ]
  },
  "requestId": "<uuid>"
}
```

### 错误码与状态码

| 错误码 | HTTP 状态 | 触发条件 |
|--------|-----------|----------|
| `WEBHOOK_METHOD_NOT_ALLOWED` | 405 | 非 POST 请求 |
| `WEBHOOK_CONFIG_MISSING` | 500 | secret 或 Queue binding 缺失 |
| `WEBHOOK_SIGNATURE_EXPIRED` | 401 | timestamp 超过 5 分钟窗口 |
| `WEBHOOK_INVALID_SIGNATURE` | 401 | 签名错误或签名头缺失 |
| `WEBHOOK_INVALID_JSON` | 400 | 请求体不是合法 JSON |
| `WEBHOOK_INVALID_PAYLOAD` | 422 | payload 不是 object 或字段类型错误 |
| `WEBHOOK_QUEUE_UNAVAILABLE` | 503 | Queue send 失败 |

> `WEBHOOK_UNAUTHORIZED` 和 `WEBHOOK_DELIVERY_FAILED` 已在类型中保留，当前运行路径未使用。

## 下游投递请求

Queue consumer 以 HTTP POST 投递 `NotificationEvent` 到 `TARGET_URL`：

- 方法：`POST`
- 请求头：
  - `Content-Type: application/json`
  - `X-Request-Id: <event.requestId>`
  - `X-Webhook-Event-Id: <event.id>`
- 请求体：`NotificationEvent` 的 JSON 序列化

### 下游响应分类

| 下游 HTTP 状态 | 分类 | 后续动作 |
|----------------|------|----------|
| `2xx` | `success` | ack |
| `408` / `429` / `5xx` | `transient_failure` | 5 次内 retry，否则 ack |
| 其他 | `terminal_failure` | ack |

## 请求工具

`src/request.ts` 导出：

- `REQUEST_ID_HEADER`：`"X-Request-Id"`。
- `ALLOWED_WEBHOOK_METHOD`：`"POST"`。
- `createRequestId()`：返回 `crypto.randomUUID()`。
- `isAllowedWebhookMethod(method)`：校验方法是否为 `POST`。

## HMAC 认证接口

`src/auth.ts` 导出：

- `WEBHOOK_TIMESTAMP_HEADER`：`"X-Webhook-Timestamp"`。
- `WEBHOOK_SIGNATURE_HEADER`：`"X-Webhook-Signature"`。
- `WEBHOOK_ID_HEADER`：`"X-Webhook-Id"`。
- `SIGNATURE_TOLERANCE_SECONDS`：`300`。
- `buildSignedPayload(timestamp, rawBody)`：返回 `timestamp + "." + rawBody`。
- `authenticateWebhook(request, rawBody, secret, now?)`：返回 `AuthenticationResult`。

签名支持纯 hex 字符串和 `sha256=<hex>` 格式。

## Payload Parser

`src/parser.ts` 导出：

- `parseWebhookPayload(rawBody)`：解析 raw body 为 JSON object，执行字段验证。
- `validateWebhookPayload(payload)`：校验 `type` 和 `metadata` 字段类型。
- `isJsonObject(value)`：判断值是否为 JSON object。

payload 约定：

- 请求体必须是 JSON object。
- `type` 可选，存在时必须是 string。
- `metadata` 可选，存在时必须是 JSON object。

## Event Normalizer

`src/normalizer.ts` 导出：

- `normalizeNotificationEvent(options)`：生成 `NotificationEvent`。

标准化规则：

- `id` 使用 `crypto.randomUUID()`。
- `source` 固定为 `"webhook"`。
- `type` 优先使用 payload 中的非空字符串 `type`，否则使用 `DEFAULT_EVENT_TYPE`。
- `metadata` 优先使用 payload 中的 object `metadata`，否则使用空 object。
- `receivedAt` 使用 `(options.now || new Date()).toISOString()`。

## Queue Producer

`src/queue.ts` 导出：

- `enqueueNotificationEvent(env, event)`：将 `NotificationEvent` 发送到 `WEBHOOK_EVENTS` Queue。
- `logQueueFailure(requestId, event?)`：记录 Queue send 失败。

入队结果：

- `ok: true`：发送成功。
- `reason: missing_binding`：Queue binding 缺失。
- `reason: send_failed`：Queue send 调用失败。

## Delivery Orchestrator

`src/delivery.ts` 导出：

- `DEFAULT_TARGET_ID`：`"default-http-target"`。
- `MAX_DELIVERY_ATTEMPTS`：`5`。
- `deliverNotificationEvent(env, event, attemptNumber)`：投递 `NotificationEvent` 到 `TARGET_URL`。
- `getDefaultTarget(env)`：从 `Env` 读取默认下游目标。
- `classifyDeliveryResponse(status)`：按 HTTP 状态码分类。
- `shouldRetryDelivery(classification, attemptNumber)`：判断是否 retry。

投递分类规则：

- HTTP `2xx` → `success`。
- HTTP `408`、`429`、`5xx` → `transient_failure`。
- 其他 HTTP 状态码 → `terminal_failure`。

## Logger

`src/logger.ts` 导出：

- `logRequestLifecycle(entry)`：记录 `webhook_request` 日志。
- `logDeliveryAttempt(attempt, requestId)`：记录 `delivery_attempt` 日志。
- `logQueueFailure(requestId, eventId)`：记录 `queue_failure` 日志。
- `redactSensitiveFields(value)`：递归脱敏。

脱敏字段匹配规则（正则，大小写不敏感）：

- `authorization`
- `secret`
- `signature`
- `token`
- `password`
- `key`

## Wrangler 配置

`wrangler.toml` 当前包含：

- Worker 名称：`webhook-worker-channel`
- 入口：`src/index.ts`
- `compatibility_date`：`2026-07-02`
- 默认变量：`DEFAULT_EVENT_TYPE`、`TARGET_URL`
- Queue producer：`WEBHOOK_EVENTS` → `webhook-events`
- Queue consumer：`webhook-events`
  - `max_batch_size = 10`
  - `max_batch_timeout = 5`
  - `max_retries = 5`

## 相关文档

- [Notification Event 模型](./专有概念/notification-event-model.md)
- [HMAC Webhook 认证](./专有概念/hmac-webhook-authentication.md)
- [Cloudflare Queue 投递语义](./专有概念/cloudflare-queue-delivery-semantics.md)
