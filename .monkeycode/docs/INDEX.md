# Webhook Worker Channel 文档索引

## 项目概览

Webhook Worker Channel 是运行在 Cloudflare Workers 上的 webhook 通知渠道。生产者通过 HTTP `POST` 提交 webhook，入口在单次请求内完成 HMAC-SHA256 认证、payload 解析与标准化，随后将事件写入 Cloudflare Queue 异步投递到下游 HTTP endpoint。首版不引入 D1/KV，投递记录依赖结构化日志。

## 核心价值

- 同步入口只做认证与入队，生产者请求生命周期短且可预测。
- Cloudflare Queue 提供异步缓冲和内置重试，下游故障可被吸收。
- HMAC-SHA256 + 5 分钟时间窗口防御伪造与重放。
- 结构化日志 + 敏感字段脱敏作为首版可观测性来源。

## 技术选型

| 类别 | 选择 | 理由 |
|------|------|------|
| 运行时 | Cloudflare Workers | 边缘执行，全球低延迟 |
| 语言 | TypeScript | 类型安全，生态成熟 |
| 异步通道 | Cloudflare Queues | 原生集成，内置重试 |
| 认证 | HMAC-SHA256 | 验证请求体完整性，防伪造 |
| 投递记录 | 结构化日志 | 首版零存储依赖，后续可扩展 |

## 文档导航

### 入口文档

- [系统架构](./ARCHITECTURE.md) - 整体架构、请求链路和运行行为
- [接口文档](./INTERFACES.md) - 类型定义、环境绑定和模块导出
- [开发者指南](./DEVELOPER_GUIDE.md) - 项目结构、命令和部署

### 专有概念

- [Cloudflare Workers 入口链路](./专有概念/cloudflare-workers-entry-pipeline.md)
- [HMAC Webhook 认证](./专有概念/hmac-webhook-authentication.md)
- [Notification Event 模型](./专有概念/notification-event-model.md)
- [Cloudflare Queue 投递语义](./专有概念/cloudflare-queue-delivery-semantics.md)
- [结构化日志与脱敏](./专有概念/structured-logging-and-redaction.md)

### 模块文档

- [index](./模块/index.md)
- [auth](./模块/auth.md)
- [parser](./模块/parser.md)
- [normalizer](./模块/normalizer.md)
- [queue](./模块/queue.md)
- [delivery](./模块/delivery.md)
- [logger](./模块/logger.md)
- [responses](./模块/responses.md)
- [request](./模块/request.md)
- [types](./模块/types.md)

## 规格文档

- `.monkeycode/specs/webhook-worker-channel/requirements.md`：需求规格
- `.monkeycode/specs/webhook-worker-channel/design.md`：技术设计
- `.monkeycode/specs/webhook-worker-channel/tasklist.md`：实施任务清单
