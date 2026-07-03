# 模块：request

## 职责

`src/request.ts` 提供 request identifier 生成和 webhook 方法校验，是入口链路的第一步。

## 导出

- `REQUEST_ID_HEADER`：`"X-Request-Id"`。
- `ALLOWED_WEBHOOK_METHOD`：`"POST"`。
- `createRequestId()`：返回 `crypto.randomUUID()`。
- `isAllowedWebhookMethod(method)`：返回 `method === "POST"`。

## 使用方

- `src/index.ts` 在 `fetch` 入口调用 `createRequestId` 和 `isAllowedWebhookMethod`。
- `src/responses.ts` 引用 `REQUEST_ID_HEADER` 和 `ALLOWED_WEBHOOK_METHOD` 构造响应头。
- `src/delivery.ts` 在下游请求头中使用 `X-Request-Id`，通过 `event.requestId` 传递。

## 相关概念

- [Cloudflare Workers 入口链路](../专有概念/cloudflare-workers-entry-pipeline.md)
