# 结构化日志与脱敏

## 概念定位

首版不引入 D1/KV 持久化存储，投递记录与请求生命周期完全依赖结构化日志。日志输出为单行 JSON，便于 Cloudflare Workers 日志管道消费和后续聚合。

## 日志类型

| `kind` | 触发位置 | 级别 |
|--------|----------|------|
| `webhook_request` | 入口链路每个终态分支 | `info` |
| `delivery_attempt` | Queue consumer 每次投递 | `info` |
| `queue_failure` | Queue `send` 抛错 | `error` |

## webhook_request

记录请求生命周期的最终结果，字段包括 `requestId`、`producerId`、`eventType`、`outcome`、`code`。

- `outcome` 取值 `accepted` 或 `rejected`。
- `code` 在 `rejected` 时为对应 `WebhookErrorCode`。
- `producerId` 和 `eventType` 在认证通过前缺失时省略。

## delivery_attempt

记录一次下游投递尝试，字段包括 `requestId`、`eventId`、`targetId`、`attempt`、`status`、`httpStatus`、`latencyMs`、`completedAt`。

- `status` 与 `DeliveryStatus` 对齐：`success`、`transient_failure`、`terminal_failure`。
- `httpStatus` 在响应可用时填充。

## queue_failure

在 `send_failed` 时与 `WEBHOOK_QUEUE_UNAVAILABLE` 响应同时输出，字段包括 `requestId`、`eventId`、`code`、`status`。

## 脱敏规则

- `redactSensitiveFields` 递归处理 object 和 array。
- 字段名命中正则 `/(authorization|secret|signature|token|password|key)/i` 时，值替换为 `[REDACTED]`。
- 脱敏发生在 `writeLog` 序列化前，所有日志输出都经过该流程。
- `payload` 字段在 `delivery_attempt` 中不输出，避免业务数据进入日志。

## 紧凑化

- `compactLogEntry` 在序列化前剔除值为 `undefined` 的字段，保证日志行紧凑。
- 嵌套 `error.fields` 在无字段时不出现，避免空数组噪声。

## 相关代码

- 请求生命周期日志：`src/logger.ts:13`
- 投递尝试日志：`src/logger.ts:24`
- Queue 失败日志：`src/logger.ts:38`
- 脱敏实现：`src/logger.ts:48`
- 紧凑化实现：`src/logger.ts:78`
