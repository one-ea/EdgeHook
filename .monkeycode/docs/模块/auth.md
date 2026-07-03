# 模块：auth

## 职责

`src/auth.ts` 实现 webhook 的 HMAC-SHA256 认证，包括签名输入构造、时间窗口校验、签名归一化比较和生产者标识提取。

## 导出

- `WEBHOOK_TIMESTAMP_HEADER`：`"X-Webhook-Timestamp"`。
- `WEBHOOK_SIGNATURE_HEADER`：`"X-Webhook-Signature"`。
- `WEBHOOK_ID_HEADER`：`"X-Webhook-Id"`。
- `SIGNATURE_TOLERANCE_SECONDS`：`300`。
- `buildSignedPayload(timestamp, rawBody)`：返回 `timestamp + "." + rawBody`。
- `authenticateWebhook(request, rawBody, secret, now?)`：返回 `AuthenticationResult`。

## AuthenticationResult

```typescript
| { ok: true; producerId: string }
| { ok: false; reason: "missing_secret" | "missing_headers" | "expired" | "invalid" }
```

## 内部实现

- `createHmacSha256` 使用 `crypto.subtle` 导入 HMAC key 并签名，输出 hex 字符串。
- `timingSafeEqual` 在归一化后做逐字节异或累加，长度不等直接返回。
- `normalizeSignature` 剥离可选的 `sha256=` 前缀。
- `isTimestampExpired` 将秒级时间戳换算为毫秒，与 `now` 比较差值，超过 `SIGNATURE_TOLERANCE_SECONDS` 视为过期。

## 相关概念

- [HMAC Webhook 认证](../专有概念/hmac-webhook-authentication.md)
