# 模块：queue

## 职责

`src/queue.ts` 是 Cloudflare Queue producer 侧适配器，封装入队操作和失败日志。

## 导出

- `enqueueNotificationEvent(env, event)`：返回 `EnqueueResult`。
- `logQueueFailure(requestId, event?)`：调用 logger 写入 `queue_failure` 日志。

## EnqueueResult

```typescript
| { ok: true }
| { ok: false; reason: "missing_binding" | "send_failed" }
```

## 行为

- `env.WEBHOOK_EVENTS` 缺失时返回 `missing_binding`，不抛错。
- `env.WEBHOOK_EVENTS.send(event)` 抛错时捕获并返回 `send_failed`。
- `logQueueFailure` 透传 `event?.id` 给 `logQueueFailure`（logger），与响应输出同时发生。

## 调用方

- `src/index.ts` 的 `fetch` handler 在标准化后调用 `enqueueNotificationEvent`。
- 入队失败时调用 `logQueueFailure`，再返回 `queueUnavailableResponse`。

## 相关概念

- [Cloudflare Queue 投递语义](../专有概念/cloudflare-queue-delivery-semantics.md)
