# 模块：delivery

## 职责

`src/delivery.ts` 在 Queue consumer 中将 `NotificationEvent` 以 HTTP POST 投递到下游 `TARGET_URL`，并对响应分类以决定重试策略。

## 导出

- `DEFAULT_TARGET_ID`：`"default-http-target"`。
- `MAX_DELIVERY_ATTEMPTS`：`5`。
- `deliverNotificationEvent(env, event, attemptNumber)`：返回 `DeliveryResult`。
- `getDefaultTarget(env)`：返回 `DownstreamTarget`。
- `classifyDeliveryResponse(status)`：返回 `DeliveryClassification`。
- `shouldRetryDelivery(classification, attemptNumber)`：返回 `boolean`。

## 投递请求

- 方法：`POST`。
- 请求头：`Content-Type: application/json`、`X-Request-Id`、`X-Webhook-Event-Id`。
- 请求体：`JSON.stringify(event)`。
- 超时：依赖 Workers `fetch` 默认行为，未显式设置超时。

## 响应分类

| HTTP 状态 | 分类 |
|-----------|------|
| `2xx` | `success` |
| `408` / `429` / `5xx` | `transient_failure` |
| 其他 | `terminal_failure` |

## 重试判断

- 仅 `transient_failure` 会重试。
- `attemptNumber < MAX_DELIVERY_ATTEMPTS` 时调用 `message.retry()`。
- 达到上限后即使仍为 `transient_failure` 也会 `message.ack()`。

## DeliveryResult

```typescript
{
  classification: DeliveryClassification;
  attempt: DeliveryAttempt;
}
```

`DeliveryAttempt` 字段包括 `eventId`、`targetId`、`attempt`、`status`、`httpStatus`、`latencyMs`、`completedAt`。

## 相关概念

- [Cloudflare Queue 投递语义](../专有概念/cloudflare-queue-delivery-semantics.md)
- [Notification Event 模型](../专有概念/notification-event-model.md)
