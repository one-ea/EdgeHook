# 模块：normalizer

## 职责

`src/normalizer.ts` 将验证通过的 payload 升级为标准化 `NotificationEvent`。

## 导出

- `normalizeNotificationEvent(options)`：返回 `NotificationEvent`。
- `NormalizeEventOptions`：`requestId`、`producerId`、`defaultEventType`、`payload`、可选 `now`。

## 标准化规则

- `id` 使用 `crypto.randomUUID()`。
- `source` 固定为 `"webhook"`。
- `type` 优先取 payload `type`（非空字符串），否则取 `defaultEventType`。
- `metadata` 优先取 payload `metadata`（JSON object），否则取空 object。
- `receivedAt` 使用 `(options.now || new Date()).toISOString()`，便于测试注入时间。

## 依赖

- `src/parser.ts` 的 `isJsonObject`。
- `src/types.ts` 的 `JsonObject`、`NotificationEvent`。

## 相关概念

- [Notification Event 模型](../专有概念/notification-event-model.md)
