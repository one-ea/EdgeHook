# 模块：logger

## 职责

`src/logger.ts` 提供结构化日志输出和敏感字段脱敏，是首版投递记录的唯一来源。

## 导出

- `logRequestLifecycle(entry)`：输出 `webhook_request` 日志。
- `logDeliveryAttempt(attempt, requestId)`：输出 `delivery_attempt` 日志。
- `logQueueFailure(requestId, eventId)`：输出 `queue_failure` 日志。
- `redactSensitiveFields(value)`：递归脱敏。

## 日志格式

所有日志通过 `writeLog` 输出为单行 JSON：

1. `compactLogEntry` 剔除 `undefined` 字段。
2. `redactSensitiveFields` 递归脱敏。
3. `JSON.stringify` 序列化。
4. `info` 级别用 `console.log`，`error` 级别用 `console.error`。

## 脱敏正则

```typescript
const SENSITIVE_KEY_PATTERN = /(authorization|secret|signature|token|password|key)/i;
```

命中字段值替换为 `"[REDACTED]"`，递归处理嵌套 object 和 array。

## RequestLogEntry

```typescript
{
  requestId: string;
  producerId?: string;
  eventType?: string;
  outcome: "accepted" | "rejected";
  code?: WebhookErrorCode;
}
```

## 相关概念

- [结构化日志与脱敏](../专有概念/structured-logging-and-redaction.md)
