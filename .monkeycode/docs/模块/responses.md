# 模块：responses

## 职责

`src/responses.ts` 提供统一的 JSON 响应构造器，保证所有 HTTP 响应都携带 `X-Request-Id` 并遵循 `ErrorResponseBody` 结构。

## 导出

- `jsonResponse(body, status, requestId, headers?)`：基础 JSON 响应。
- `errorResponse(options)`：错误响应，封装 `ErrorResponseBody`。
- `methodNotAllowedResponse(requestId)`：405，带 `Allow: POST`。
- `configMissingResponse(requestId, message)`：500。
- `invalidSignatureResponse(requestId)`：401。
- `signatureExpiredResponse(requestId)`：401。
- `invalidJsonResponse(requestId)`：400。
- `invalidPayloadResponse(requestId, fields?)`：422。
- `queueUnavailableResponse(requestId)`：503。

## ErrorResponseBody

```json
{
  "error": {
    "code": "WEBHOOK_INVALID_PAYLOAD",
    "message": "The webhook payload failed validation.",
    "fields": [
      { "path": "type", "code": "string_required" }
    ]
  },
  "requestId": "request-id"
}
```

`fields` 仅在 `invalidPayloadResponse` 中出现，其他错误响应省略该字段。

## 响应头

所有响应头固定包含：

- `Content-Type: application/json; charset=utf-8`
- `X-Request-Id: <requestId>`

`methodNotAllowedResponse` 额外包含 `Allow: POST`。

## 依赖

- `src/request.ts` 的 `ALLOWED_WEBHOOK_METHOD` 和 `REQUEST_ID_HEADER`。
- `src/types.ts` 的 `ErrorResponseBody`、`FieldError`、`WebhookErrorCode`。
