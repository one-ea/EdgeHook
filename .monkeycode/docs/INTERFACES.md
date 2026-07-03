# 接口文档

## Worker Env

`src/types.ts` 中的 `Env` 定义 Cloudflare Worker 运行时绑定：

- `WEBHOOK_EVENTS`：Cloudflare Queue producer binding，消息类型为 `NotificationEvent`。
- `WEBHOOK_SECRET`：可选 webhook HMAC 密钥，后续认证任务会使用。
- `DEFAULT_EVENT_TYPE`：默认事件类型。
- `TARGET_URL`：默认下游 HTTP endpoint URL。

## NotificationEvent

`NotificationEvent` 是 webhook 事件的标准化模型：

- `id`：事件标识。
- `requestId`：请求标识。
- `producerId`：生产方标识。
- `source`：固定为 `webhook`。
- `type`：事件类型。
- `payload`：JSON payload。
- `metadata`：JSON metadata。
- `receivedAt`：接收时间。

## DeliveryAttempt

`DeliveryAttempt` 描述一次下游投递尝试：

- `eventId`：关联事件标识。
- `targetId`：下游目标标识。
- `attempt`：尝试次数。
- `status`：`success`、`transient_failure` 或 `terminal_failure`。
- `httpStatus`：可选 HTTP 状态码。
- `latencyMs`：投递耗时。
- `completedAt`：完成时间。

## HTTP 响应

当前 `src/responses.ts` 提供 JSON 响应格式，并在响应头加入 `X-Request-Id`。

错误响应遵循 `ErrorResponseBody`：

```json
{
  "error": {
    "code": "WEBHOOK_METHOD_NOT_ALLOWED",
    "message": "The webhook endpoint accepts POST requests only."
  },
  "requestId": "request-id"
}
```

## 请求工具

`src/request.ts` 当前导出：

- `REQUEST_ID_HEADER`：固定响应头名称 `X-Request-Id`。
- `ALLOWED_WEBHOOK_METHOD`：固定允许方法 `POST`。
- `createRequestId()`：生成 request identifier。
- `isAllowedWebhookMethod(method)`：校验 webhook 请求方法。

## HMAC 认证接口

`src/auth.ts` 当前导出：

- `WEBHOOK_TIMESTAMP_HEADER`：固定为 `X-Webhook-Timestamp`。
- `WEBHOOK_SIGNATURE_HEADER`：固定为 `X-Webhook-Signature`。
- `WEBHOOK_ID_HEADER`：固定为 `X-Webhook-Id`。
- `SIGNATURE_TOLERANCE_SECONDS`：固定为 `300` 秒。
- `buildSignedPayload(timestamp, rawBody)`：生成签名输入 `timestamp + "." + rawBody`。
- `authenticateWebhook(request, rawBody, secret, now)`：校验密钥、签名头、时间窗口和 HMAC-SHA256 签名。

签名可以使用纯 hex 字符串，也可以使用 `sha256=<hex>` 格式。

## Payload Parser

`src/parser.ts` 当前导出：

- `parseWebhookPayload(rawBody)`：将 raw body 解析为 JSON object，并执行 payload 字段验证。
- `validateWebhookPayload(payload)`：校验 `type` 和 `metadata` 字段类型。
- `isJsonObject(value)`：判断值是否为 JSON object。

payload 约定：

- 请求体必须是 JSON object。
- `type` 可选，存在时必须是字符串。
- `metadata` 可选，存在时必须是 JSON object。

## Event Normalizer

`src/normalizer.ts` 当前导出：

- `normalizeNotificationEvent(options)`：生成 `NotificationEvent`。

标准化规则：

- `id` 使用 `crypto.randomUUID()` 生成。
- `source` 固定为 `webhook`。
- `type` 优先使用 payload 中的字符串 `type`。
- `type` 缺失时使用 `DEFAULT_EVENT_TYPE`。
- `metadata` 优先使用 payload 中的 object `metadata`。
- `metadata` 缺失时使用空 object。

## Queue Producer

`src/queue.ts` 当前导出：

- `enqueueNotificationEvent(env, event)`：将 `NotificationEvent` 发送到 `WEBHOOK_EVENTS` Queue。
- `logQueueFailure(requestId, event)`：记录 Queue send 失败的结构化错误日志。

入队结果：

- `ok: true`：发送成功。
- `reason: missing_binding`：Queue binding 缺失。
- `reason: send_failed`：Queue send 调用失败。

## Delivery Orchestrator

`src/delivery.ts` 当前导出：

- `DEFAULT_TARGET_ID`：默认目标标识 `default-http-target`。
- `MAX_DELIVERY_ATTEMPTS`：最大投递尝试次数 `5`。
- `deliverNotificationEvent(env, event, attemptNumber)`：将 `NotificationEvent` 以 HTTP POST JSON body 投递到 `TARGET_URL`。
- `getDefaultTarget(env)`：从 `Env` 读取默认下游目标。
- `classifyDeliveryResponse(status)`：按 HTTP 状态码分类投递结果。
- `shouldRetryDelivery(classification, attemptNumber)`：判断是否调用 Cloudflare Queue retry。
- `logDeliveryAttempt(result, requestId)`：输出投递尝试结构化日志。

投递分类规则：

- HTTP `2xx`：`success`。
- HTTP `408`、`429`、`5xx`：`transient_failure`。
- 其他 HTTP 状态码：`terminal_failure`。

## Logger

`src/logger.ts` 当前导出：

- `logRequestLifecycle(entry)`：记录 webhook 请求生命周期。
- `logDeliveryAttempt(attempt, requestId)`：记录一次下游投递尝试。
- `logQueueFailure(requestId, eventId)`：记录 Queue send 失败。
- `redactSensitiveFields(value)`：递归脱敏敏感字段。

脱敏字段匹配规则：

- 字段名包含 `authorization`。
- 字段名包含 `secret`。
- 字段名包含 `signature`。
- 字段名包含 `token`。
- 字段名包含 `password`。
- 字段名包含 `key`。

## Wrangler 配置

`wrangler.toml` 当前包含：

- Worker 名称：`webhook-worker-channel`
- 入口：`src/index.ts`
- 默认变量：`DEFAULT_EVENT_TYPE`、`TARGET_URL`
- Queue producer：`WEBHOOK_EVENTS` → `webhook-events`
- Queue consumer：`webhook-events`
