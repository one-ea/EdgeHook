# 开发者指南

## 项目结构

```text
src/
  index.ts        Worker fetch + queue 入口
  auth.ts         HMAC-SHA256 认证
  parser.ts       raw body 解析与 payload 验证
  normalizer.ts   NotificationEvent 标准化
  queue.ts        Queue producer 适配
  delivery.ts     下游 HTTP 投递与分类
  logger.ts       结构化日志与脱敏
  request.ts      request id 与方法校验
  responses.ts    统一 JSON 响应
  types.ts        核心类型与错误码
package.json
tsconfig.json
wrangler.toml
```

各模块职责详见 [模块文档](./模块/)。

## 常用命令

```bash
# 本地启动 Cloudflare Worker
npm run dev

# 类型检查
npm run typecheck

# 当前测试入口（复用类型检查）
npm test

# 完整校验入口
npm run check

# 部署到 Cloudflare Workers
npm run deploy
```

等价底层命令：

```bash
tsc --noEmit
wrangler dev
wrangler deploy
```

## 环境说明

本仓库使用 TypeScript 和 Cloudflare Workers 类型。当前开发环境中工具按全局安装方式提供，`tsconfig.json` 已配置 `typeRoots` 指向全局 `@types` 和 node_modules，以解析 `@cloudflare/workers-types`。

## Cloudflare 配置

部署前需要在 Cloudflare 中创建名为 `webhook-events` 的 Queue，并设置 Worker secret：

```bash
# 设置 webhook HMAC 密钥
wrangler secret put WEBHOOK_SECRET
```

`wrangler.toml` 中的 `TARGET_URL` 默认为占位地址 `https://example.com/webhook-target`，部署前应替换为真实下游 endpoint。`WEBHOOK_SECRET` 不在 `wrangler.toml` 中明文存储，仅通过 `wrangler secret` 设置。

## 测试状态

当前代码已通过：

```bash
npm run typecheck
npm test
```

`npm test` 当前复用类型检查入口。单元测试和集成测试属于可选任务（tasklist 中标记为 `- [ ]*`），后续启用 Vitest/Workers 测试环境后可替换为测试运行命令。

## 开发规范

- TypeScript 严格模式，所有导出函数均有显式类型。
- 错误通过 `WebhookErrorCode` 枚举式类型统一管理，禁止使用魔法字符串。
- 日志一律走 `src/logger.ts`，禁止直接 `console.log` 业务数据。
- 敏感字段脱敏在 `writeLog` 中统一执行，新增日志类型时无需重复实现。
- 代码注释保持精简，仅在解释"为什么"时添加。

## 投递记录

首版不引入 D1/KV，投递记录依赖结构化日志：

- `webhook_request`：入口请求生命周期终态。
- `delivery_attempt`：每次下游投递尝试。
- `queue_failure`：Queue send 失败。

日志为单行 JSON，字段名命中 `authorization|secret|signature|token|password|key` 的值会被替换为 `[REDACTED]`。详见 [结构化日志与脱敏](./专有概念/structured-logging-and-redaction.md)。

## 调试链路

排查 webhook 问题时按以下链路逐层确认：

1. 前置：请求方法是否为 `POST`，签名三件套头是否齐全。
2. 认证：`X-Webhook-Timestamp` 是否在 5 分钟窗口内，签名输入是否为 `timestamp + "." + rawBody`。
3. 解析：raw body 是否为合法 JSON object，`type`/`metadata` 字段类型是否正确。
4. 入队：`WEBHOOK_EVENTS` binding 是否存在，Queue 是否已创建。
5. 投递：`TARGET_URL` 是否可达，下游响应状态码属于哪类分类。
6. 日志：通过 `requestId` 串联 `webhook_request`、`queue_failure`、`delivery_attempt`。

## 文档导航

- [文档索引](./INDEX.md)
- [系统架构](./ARCHITECTURE.md)
- [接口文档](./INTERFACES.md)
- [专有概念](./专有概念/)
- [模块文档](./模块/)
