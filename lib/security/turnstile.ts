import { logSecurityEvent } from "@/lib/security/security-log";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

export function isTurnstileEnforced(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!secret || !siteKey) {
    return true;
  }

  if (!token || typeof token !== "string" || token.length < 10) {
    return false;
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp && remoteIp !== "unknown") {
    body.set("remoteip", remoteIp);
  }

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await res.json()) as TurnstileVerifyResponse;
  if (!data.success) {
    logSecurityEvent("turnstile_failed", {
      reason: (data["error-codes"] ?? []).join(",") || "verify_failed",
    });
  }
  return data.success === true;
}
