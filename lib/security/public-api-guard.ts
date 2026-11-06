import { NextResponse } from "next/server";
import type { z } from "zod";
import { readJsonWithLimit } from "@/lib/security/json-body-limit";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request-ip";
import { logSecurityEvent } from "@/lib/security/security-log";
import { isTurnstileEnforced, verifyTurnstileToken } from "@/lib/security/turnstile";

const SILENT_REJECT = new NextResponse(null, { status: 204 });

export async function guardPublicJsonPost<T>(
  request: Request,
  options: {
    routeKey: string;
    maxBytes: number;
    rateLimit: { max: number; windowSec: number };
    schema: z.ZodType<T>;
    honeypotFilled?: (data: T) => boolean;
    getTurnstileToken: (data: T) => string | undefined;
  },
): Promise<
  | { ok: true; data: T; ip: string }
  | { ok: false; response: NextResponse }
> {
  if (request.method !== "POST") {
    return { ok: false, response: NextResponse.json({ error: "Method not allowed" }, { status: 405 }) };
  }

  const ip = getClientIp(request);
  const rl = await rateLimit(options.routeKey, ip, options.rateLimit);
  if (!rl.ok) {
    logSecurityEvent("rate_limited", { route: options.routeKey });
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: "Te veel aanvragen. Probeer het later opnieuw." }, { status: 429 }),
    };
  }

  const raw = await readJsonWithLimit<unknown>(request, options.maxBytes);
  if (!raw.ok) {
    logSecurityEvent("body_too_large", { route: options.routeKey });
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: "Aanvraag te groot." }, { status: 413 }),
    };
  }

  const parsed = options.schema.safeParse(raw.data);
  if (!parsed.success) {
    logSecurityEvent("validation_failed", { route: options.routeKey });
    const firstIssue = parsed.error.issues[0];
    const msg =
      parsed.error.flatten().formErrors[0] ??
      (typeof firstIssue?.message === "string" ? firstIssue.message : null) ??
      "Ongeldige invoer.";
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: msg }, { status: 400 }),
    };
  }

  const data = parsed.data;
  if (options.honeypotFilled?.(data)) {
    logSecurityEvent("honeypot_triggered", { route: options.routeKey });
    return { ok: false, response: SILENT_REJECT };
  }

  const token = options.getTurnstileToken(data);
  if (isTurnstileEnforced() && !token) {
    logSecurityEvent("turnstile_failed", { route: options.routeKey, reason: "missing_token" });
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: "Beveiligingscontrole ontbreekt." }, { status: 400 }),
    };
  }

  const turnstileOk = await verifyTurnstileToken(token, ip);
  if (!turnstileOk) {
    logSecurityEvent("turnstile_failed", { route: options.routeKey });
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: "Beveiligingscontrole mislukt." }, { status: 400 }),
    };
  }

  return { ok: true, data, ip };
}
