# Webhook Worker Channel 文档索引

## 项目概览

本项目是运行在 Cloudflare Workers 上的 webhook 通知渠道。当前代码提供 Cloudflare Workers TypeScript 项目骨架、Cloudflare Queue 绑定配置、核心运行时类型，以及最小 Worker 入口和 Queue consumer。

## 文档目录

- `ARCHITECTURE.md`：系统架构和运行链路
- `INTERFACES.md`：核心类型、环境绑定和接口定义
- `DEVELOPER_GUIDE.md`：本地开发、类型检查和部署入口

## 规格文档

- `.monkeycode/specs/webhook-worker-channel/requirements.md`：需求规格
- `.monkeycode/specs/webhook-worker-channel/design.md`：技术设计
- `.monkeycode/specs/webhook-worker-channel/tasklist.md`：实施任务清单
