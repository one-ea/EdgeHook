import type { ErrorResponseBody, FieldError, WebhookErrorCode } from "./types";
import { ALLOWED_WEBHOOK_METHOD, REQUEST_ID_HEADER } from "./request";

export interface ErrorResponseOptions {
  code: WebhookErrorCode;
  message: string;
  requestId: string;
  status: number;
  fields?: FieldError[];
  headers?: HeadersInit;
}

export function jsonResponse(
  body: unknown,
  status: number,
  requestId: string,
  headers: HeadersInit = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      [REQUEST_ID_HEADER]: requestId,
      ...headers
    }
  });
}

export function errorResponse(options: ErrorResponseOptions): Response {
  const body: ErrorResponseBody = {
    error: {
      code: options.code,
      message: options.message,
      ...(options.fields ? { fields: options.fields } : {})
    },
    requestId: options.requestId
  };

  return jsonResponse(body, options.status, options.requestId, options.headers);
}

export function methodNotAllowedResponse(requestId: string): Response {
  return errorResponse({
    code: "WEBHOOK_METHOD_NOT_ALLOWED",
    message: "The webhook endpoint accepts POST requests only.",
    requestId,
    status: 405,
    headers: { Allow: ALLOWED_WEBHOOK_METHOD }
  });
}

export function configMissingResponse(requestId: string, message: string): Response {
  return errorResponse({
    code: "WEBHOOK_CONFIG_MISSING",
    message,
    requestId,
    status: 500
  });
}

export function invalidSignatureResponse(requestId: string): Response {
  return errorResponse({
    code: "WEBHOOK_INVALID_SIGNATURE",
    message: "The webhook signature is invalid.",
    requestId,
    status: 401
  });
}

export function signatureExpiredResponse(requestId: string): Response {
  return errorResponse({
    code: "WEBHOOK_SIGNATURE_EXPIRED",
    message: "The webhook timestamp is outside the accepted time window.",
    requestId,
    status: 401
  });
}

export function invalidJsonResponse(requestId: string): Response {
  return errorResponse({
    code: "WEBHOOK_INVALID_JSON",
    message: "The webhook request body must be valid JSON.",
    requestId,
    status: 400
  });
}

export function invalidPayloadResponse(requestId: string, fields: FieldError[] = []): Response {
  return errorResponse({
    code: "WEBHOOK_INVALID_PAYLOAD",
    message: "The webhook payload failed validation.",
    requestId,
    status: 422,
    fields
  });
}

export function queueUnavailableResponse(requestId: string): Response {
  return errorResponse({
    code: "WEBHOOK_QUEUE_UNAVAILABLE",
    message: "The webhook event could not be enqueued.",
    requestId,
    status: 503
  });
}
