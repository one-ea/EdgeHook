# 模块：index

## 职责

`src/index.ts` 是 Worker 的默认导出入口，同时实现 `fetch` 和 `queue` 两个 handler，串联完整入口链路和投递链路。

## fetch handler

按顺序编排以下步骤，任一步骤失败即写入 `webhook_request` 日志并返回对应错误响应：

1. `createRequestId()` 生成 `X-Request-Id`。
2. `isAllowedWebhookMethod` 校验方法，非 `POST` 返回 `WEBHOOK_METHOD_NOT_ALLOWED`。
3. 校验 `env.WEBHOOK_EVENTS` 存在，缺失返回 `WEBHOOK_CONFIG_MISSING`。
4. `await request.text()` 读取 raw body。
5. `authenticateWebhook` 执行 HMAC 认证，按失败原因分流。
6. `parseWebhookPayload` 解析并验证 payload。
7. `normalizeNotificationEvent` 生成 `NotificationEvent`。
8. `enqueueNotificationEvent` 入队，失败分流 `missing_binding` 与 `send_failed`。
9. 成功时写入 `accepted` 日志并返回 `202`，响应体为 `{ eventId, requestId }`。

## queue handler

遍历 `batch.messages`，对每条消息：

1. `attemptNumber = message.attempts + 1`。
2. `deliverNotificationEvent` 投递到下游。
3. `logDeliveryAttempt` 输出投递尝试日志。
4. `shouldRetryDelivery` 判断是否 `message.retry()`，否则 `message.ack()`。

## 依赖

- `src/auth.ts`、`src/delivery.ts`、`src/logger.ts`、`src/normalizer.ts`、`src/parser.ts`、`src/queue.ts`、`src/request.ts`、`src/responses.ts`、`src/types.ts`

## 相关概念

- [Cloudflare Workers 入口链路](../专有概念/cloudflare-workers-entry-pipeline.md)
- [Cloudflare Queue 投递语义](../专有概念/cloudflare-queue-delivery-semantics.md)
