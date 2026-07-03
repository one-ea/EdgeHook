# HMAC Webhook 认证

## 概念定位

HMAC-SHA256 认证是入口链路中唯一的安全边界。生产者在发送 webhook 时使用共享密钥对 `timestamp + "." + rawBody` 计算 HMAC-SHA256，并将签名、时间戳、生产者标识通过请求头提交。Worker 使用同一密钥重算签名并比对。

## 请求头约定

| 请求头 | 含义 |
|--------|------|
| `X-Webhook-Timestamp` | Unix 秒级时间戳，用于防重放 |
| `X-Webhook-Signature` | HMAC-SHA256 hex 签名，支持 `sha256=<hex>` 前缀 |
| `X-Webhook-Id` | 生产者标识，认证通过后作为 `producerId` |

## 签名输入

签名输入字符串由 `buildSignedPayload(timestamp, rawBody)` 构造：

```text
timestamp + "." + rawBody
```

`rawBody` 是未做任何改写的原始请求体字符串，保证签名覆盖生产者实际发送的字节语义。

## 时间窗口

- `SIGNATURE_TOLERANCE_SECONDS = 300`（5 分钟）。
- 时间戳与当前时间差超过 5 分钟（正向或反向）即视为过期，返回 `WEBHOOK_SIGNATURE_EXPIRED`。
- 时间戳无法解析为有限数值时同样视为过期。

## 比对策略

- 使用 `timingSafeEqual` 做常数时间比较，降低时序侧信道风险。
- 比对前对实际签名和期望签名都调用 `normalizeSignature`，剥离可选的 `sha256=` 前缀。
- 长度不一致直接返回失败，但仍走逐字节异或累加路径以保持常数时间特性。

## 失败原因映射

| `AuthenticationResult.reason` | HTTP 错误码 |
|-------------------------------|------------|
| `missing_secret` | `WEBHOOK_CONFIG_MISSING` |
| `missing_headers` | `WEBHOOK_INVALID_SIGNATURE` |
| `expired` | `WEBHOOK_SIGNATURE_EXPIRED` |
| `invalid` | `WEBHOOK_INVALID_SIGNATURE` |

## 密钥管理

- `WEBHOOK_SECRET` 通过 `wrangler secret put WEBHOOK_SECRET` 设置，不在 `wrangler.toml` 中明文存储。
- 文档示例中密钥一律使用占位符，禁止泄露真实值。

## 相关代码

- 认证主流程：`src/auth.ts:14`
- 签名输入构造：`src/auth.ts:10`
- 时间窗口判断：`src/auth.ts:45`
- 常数时间比较：`src/auth.ts:74`
