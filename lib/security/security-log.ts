export type SecurityEventType =
  | "honeypot_triggered"
  | "turnstile_failed"
  | "rate_limited"
  | "validation_failed"
  | "body_too_large"
  | "internal_unauthorized";

export type SecurityEventDetail = Record<string, string | number | boolean | undefined>;

/**
 * Structured security log line (no passwords, no tokens, no full form bodies).
 */
export function logSecurityEvent(
  type: SecurityEventType,
  detail: SecurityEventDetail = {},
): void {
  const payload = JSON.stringify({ ts: new Date().toISOString(), type, ...detail });
  console.warn(`[security] ${payload}`);
}
