# Cloudflare Workers 入口链路

## 概念定位

Webhook Worker Channel 的 `fetch` handler 是整个系统的同步入口。生产者通过 HTTP `POST` 将原始 webhook 投递到 Worker，入口在单次请求生命周期内完成认证、解析、标准化和入队，随后立即返回 `202`，避免阻塞生产者。

## 链路阶段

| 阶段 | 模块 | 失败错误码 |
|------|------|------------|
| Request ID 生成 | `src/request.ts` | - |
| Method 校验 | `src/request.ts` | `WEBHOOK_METHOD_NOT_ALLOWED` |
| Queue binding 校验 | `src/index.ts` | `WEBHOOK_CONFIG_MISSING` |
| HMAC-SHA256 认证 | `src/auth.ts` | `WEBHOOK_CONFIG_MISSING` / `WEBHOOK_SIGNATURE_EXPIRED` / `WEBHOOK_INVALID_SIGNATURE` |
| Payload 解析与验证 | `src/parser.ts` | `WEBHOOK_INVALID_JSON` / `WEBHOOK_INVALID_PAYLOAD` |
| 事件标准化 | `src/normalizer.ts` | - |
| Queue 入队 | `src/queue.ts` | `WEBHOOK_CONFIG_MISSING` / `WEBHOOK_QUEUE_UNAVAILABLE` |
| 请求生命周期日志 | `src/logger.ts` | - |

## 关键约束

- 入口只做同步预处理，不直接投递下游。投递由 Queue consumer 异步完成。
- `WEBHOOK_EVENTS` binding 缺失会在认证前就被拦截，避免在配置不完整时暴露认证细节。
- 成功入队后响应体包含 `eventId` 和 `requestId`，供生产者关联事件与请求。
- 所有响应头携带 `X-Request-Id`，与日志中的 `requestId` 对齐。

## 相关代码

- 入口编排：`src/index.ts:20`
- 认证实现：`src/auth.ts:14`
- 解析实现：`src/parser.ts:7`
- 标准化实现：`src/normalizer.ts:12`
- 入队实现：`src/queue.ts:6`
