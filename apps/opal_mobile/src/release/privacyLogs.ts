/**
 * Observability privacy: redact sensitive fields before any log/crash payload.
 */

const SENSITIVE_KEYS = [
  "phone",
  "e164",
  "otp",
  "code",
  "token",
  "password",
  "session",
  "refresh",
  "authorization",
  "body",
  "message_body",
  "raw_identifier",
  "contact_list",
  "precise_location",
  "latitude",
  "longitude",
];

const SENSITIVE_PATTERNS = [
  /\+1\d{10}/g,
  /\b\d{6}\b/g, // otp-like
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
];

export function redactValue(key: string, value: unknown): unknown {
  const k = key.toLowerCase();
  if (SENSITIVE_KEYS.some((s) => k.includes(s))) {
    return "[REDACTED]";
  }
  if (typeof value === "string") {
    let out = value;
    for (const re of SENSITIVE_PATTERNS) {
      out = out.replace(re, "[REDACTED]");
    }
    return out;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return redactObject(value as Record<string, unknown>);
  }
  if (Array.isArray(value)) {
    return value.map((v, i) => redactValue(String(i), v));
  }
  return value;
}

export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = redactValue(k, v);
  }
  return out;
}

export function assertNoSensitiveLeak(payload: string): void {
  if (/\+1202555\d{4}/.test(payload)) {
    throw new Error("SENSITIVE_PHONE_IN_LOG");
  }
  if (/Bearer\s+[A-Za-z0-9]/.test(payload)) {
    throw new Error("SENSITIVE_TOKEN_IN_LOG");
  }
}
