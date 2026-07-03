import type { FieldError, JsonObject, JsonValue } from "./types";

export type ParsePayloadResult =
  | { ok: true; payload: JsonObject }
  | { ok: false; reason: "invalid_json" | "invalid_payload"; fields?: FieldError[] };

export function parseWebhookPayload(rawBody: string): ParsePayloadResult {
  let parsed: JsonValue;

  try {
    parsed = JSON.parse(rawBody) as JsonValue;
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  if (!isJsonObject(parsed)) {
    return {
      ok: false,
      reason: "invalid_payload",
      fields: [{ path: "$", code: "object_required" }]
    };
  }

  const fields = validateWebhookPayload(parsed);

  if (fields.length > 0) {
    return { ok: false, reason: "invalid_payload", fields };
  }

  return { ok: true, payload: parsed };
}

export function validateWebhookPayload(payload: JsonObject): FieldError[] {
  const fields: FieldError[] = [];

  if ("type" in payload && typeof payload.type !== "string") {
    fields.push({ path: "type", code: "string_required" });
  }

  if ("metadata" in payload && !isJsonObject(payload.metadata)) {
    fields.push({ path: "metadata", code: "object_required" });
  }

  return fields;
}

export function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
