# 模块：types

## 职责

`src/types.ts` 定义 Worker 环境绑定、核心领域模型、投递记录、错误响应和 JSON 类型别名，是跨模块共享的契约层。

## 核心类型

### Env

```typescript
interface Env {
  WEBHOOK_EVENTS: Queue<NotificationEvent>;
  WEBHOOK_SECRET?: string;
  DEFAULT_EVENT_TYPE: string;
  TARGET_URL: string;
}
```

### NotificationEvent

```typescript
interface NotificationEvent {
  id: string;
  requestId: string;
  producerId: string;
  source: "webhook";
  type: string;
  payload: JsonObject;
  metadata: JsonObject;
  receivedAt: string;
}
```

### DeliveryAttempt

```typescript
interface DeliveryAttempt {
  eventId: string;
  targetId: string;
  attempt: number;
  status: DeliveryStatus;
  httpStatus?: number;
  latencyMs: number;
  completedAt: string;
}
```

### DeliveryStatus

```typescript
type DeliveryStatus = "success" | "transient_failure" | "terminal_failure";
```

### WebhookErrorCode

```typescript
type WebhookErrorCode =
  | "WEBHOOK_METHOD_NOT_ALLOWED"
  | "WEBHOOK_UNAUTHORIZED"
  | "WEBHOOK_SIGNATURE_EXPIRED"
  | "WEBHOOK_INVALID_SIGNATURE"
  | "WEBHOOK_INVALID_JSON"
  | "WEBHOOK_INVALID_PAYLOAD"
  | "WEBHOOK_CONFIG_MISSING"
  | "WEBHOOK_QUEUE_UNAVAILABLE"
  | "WEBHOOK_DELIVERY_FAILED";
```

> 注：`WEBHOOK_UNAUTHORIZED` 和 `WEBHOOK_DELIVERY_FAILED` 已在类型中保留，当前运行路径尚未使用，作为后续扩展占位。

## JSON 类型别名

- `JsonPrimitive`：`string | number | boolean | null`。
- `JsonValue`：`JsonPrimitive | JsonObject | JsonValue[]`。
- `JsonObject`：`{ [key: string]: JsonValue }`。

## 其他类型

- `DownstreamTarget`：`{ id: string; url: string }`。
- `FieldError`：`{ path: string; code: string }`。
- `ErrorResponseBody`：`{ error: { code; message; fields? }; requestId }`。
- `QueueMessageBody`：`{ event: NotificationEvent }`，预留用于显式消息体类型。

## 相关概念

- [Notification Event 模型](../专有概念/notification-event-model.md)
- [结构化日志与脱敏](../专有概念/structured-logging-and-redaction.md)
