# Cloudflare Queue 投递语义

## 概念定位

Cloudflare Queues 是入口与下游投递之间的异步缓冲。入口请求只负责把 `NotificationEvent` 入队，真正调用下游 HTTP endpoint 的工作由 Queue consumer 在 `queue` handler 中完成。这种拆分让生产者请求生命周期短、可预测，同时让下游故障可以通过 Queue 重试机制吸收。

## Producer 侧

- binding：`WEBHOOK_EVENTS`，对应 Queue `webhook-events`。
- 入队方法：`env.WEBHOOK_EVENTS.send(event)`。
- 入队失败分为 `missing_binding` 和 `send_failed` 两类：
  - `missing_binding` 映射为 `WEBHOOK_CONFIG_MISSING`，返回 500。
  - `send_failed` 映射为 `WEBHOOK_QUEUE_UNAVAILABLE`，返回 503，并额外写入 `queue_failure` 日志。

## Consumer 侧

- `wrangler.toml` 声明 `max_batch_size = 10`、`max_batch_timeout = 5`、`max_retries = 5`。
- `queue` handler 遍历 `batch.messages`，对每条消息调用 `deliverNotificationEvent`。
- 投递结果分类：
  - `success` → `message.ack()`。
  - `transient_failure` 且未达上限 → `message.retry()`。
  - `terminal_failure` 或已达上限 → `message.ack()`。

## 重试边界

- `MAX_DELIVERY_ATTEMPTS = 5`，与 Queue `max_retries` 对齐。
- `attemptNumber = message.attempts + 1`，首次投递即为 1。
- 超过 5 次仍 `transient_failure` 的消息会被 ack，避免无限重试。

## 下游请求约定

- 方法：`POST`。
- Content-Type：`application/json`。
- 自定义头：`X-Request-Id`、`X-Webhook-Event-Id`。
- 请求体：`NotificationEvent` 的 JSON 序列化。

## 相关代码

- Producer 适配：`src/queue.ts:6`
- Consumer 编排：`src/index.ts:136`
- 投递实现：`src/delivery.ts:13`
- 重试判断：`src/delivery.ts:64`
- Queue 配置：`wrangler.toml:9`
