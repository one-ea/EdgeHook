# 模块：parser

## 职责

`src/parser.ts` 负责将 raw body 解析为 JSON object，并对 payload 字段做轻量验证。

## 导出

- `parseWebhookPayload(rawBody)`：返回 `ParsePayloadResult`。
- `validateWebhookPayload(payload)`：返回 `FieldError[]`。
- `isJsonObject(value)`：类型守卫，判断值是否为 JSON object。

## ParsePayloadResult

```typescript
| { ok: true; payload: JsonObject }
| { ok: false; reason: "invalid_json" | "invalid_payload"; fields?: FieldError[] }
```

## 验证规则

- 请求体必须是 JSON object，否则返回 `object_required`（`path: "$"`）。
- `type` 字段存在时必须是 string，否则 `string_required`。
- `metadata` 字段存在时必须是 JSON object，否则 `object_required`。
- 多字段错误会一次性收集返回。

## 调用方

- `src/index.ts` 在认证成功后调用 `parseWebhookPayload`。
- `src/normalizer.ts` 复用 `isJsonObject` 判断 `metadata`。

## 相关概念

- [Notification Event 模型](../专有概念/notification-event-model.md)
