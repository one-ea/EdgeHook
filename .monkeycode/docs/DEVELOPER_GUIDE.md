# 开发者指南

## 项目结构

```text
src/
  auth.ts
  delivery.ts
  index.ts
  logger.ts
  normalizer.ts
  parser.ts
  queue.ts
  request.ts
  responses.ts
  types.ts
package.json
tsconfig.json
wrangler.toml
```

## 常用命令

```bash
# 本地启动 Cloudflare Worker
npm run dev

# 类型检查
npm run typecheck

# 当前测试入口
npm test

# 完整校验入口
npm run check

# 部署到 Cloudflare Workers
npm run deploy
```

## 环境说明

本仓库使用 TypeScript 和 Cloudflare Workers 类型。当前开发环境中工具按全局安装方式提供，`tsconfig.json` 已配置全局类型路径以解析 `@cloudflare/workers-types`。

## Cloudflare 配置

部署前需要在 Cloudflare 中创建名为 `webhook-events` 的 Queue，并设置 Worker secret：

```bash
# 设置 webhook HMAC 密钥
wrangler secret put WEBHOOK_SECRET
```

## 当前验证状态

当前代码已通过：

```bash
npm run typecheck
npm test
```

当前 `npm test` 复用类型检查入口。单元测试和集成测试属于可选任务，后续启用测试框架后可替换为测试运行命令。

等价底层命令：

```bash
tsc --noEmit
```
