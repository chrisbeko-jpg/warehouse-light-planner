import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getExpectedAdminToken,
  INTERNAL_SESSION_COOKIE_NAME,
  timingSafeEqualString,
} from "@/lib/security/internal-auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request-ip";
import { logSecurityEvent } from "@/lib/security/security-log";
import { envInt } from "@/lib/security/env";

export const runtime = "nodejs";

function cookieOptions(maxAgeSec: number) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    secure,
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimit("internal_login", ip, {
    max: envInt("RATE_LIMIT_INTERNAL_LOGIN_MAX", 20),
    windowSec: envInt("RATE_LIMIT_INTERNAL_LOGIN_WINDOW_SEC", 900),
  });
  if (!rl.ok) {
    logSecurityEvent("rate_limited", { route: "internal_login", ip });
    return NextResponse.json({ ok: false, error: "Te veel pogingen." }, { status: 429 });
  }

  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const expected = getExpectedAdminToken();
  if (!expected) {
    return NextResponse.json({ ok: false, error: "Login niet geconfigureerd." }, { status: 503 });
  }

  const token = String(body.token ?? "").trim();
  if (!timingSafeEqualString(token, expected)) {
    logSecurityEvent("internal_unauthorized", { route: "internal_login" });
    return NextResponse.json({ ok: false, error: "Ongeldig token." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(
    INTERNAL_SESSION_COOKIE_NAME,
    token,
    cookieOptions(envInt("INTERNAL_SESSION_MAX_AGE_SEC", 86400)),
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set(INTERNAL_SESSION_COOKIE_NAME, "", { ...cookieOptions(0), maxAge: 0 });
  return NextResponse.json({ ok: true });
}
