import { cookies } from "next/headers";
import { timingSafeEqualString } from "@/lib/security/timing-safe";

const COOKIE_NAME = "internal_admin_session";

export function getExpectedAdminToken(): string {
  return process.env.INTERNAL_ADMIN_TOKEN ?? "";
}

export { timingSafeEqualString };

/**
 * Resolve bearer token for internal API routes: Authorization header or HttpOnly session cookie.
 */
export async function getInternalBearerFromRequest(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(COOKIE_NAME)?.value;
  return fromCookie ?? null;
}

export function isValidInternalToken(token: string | null | undefined): boolean {
  const expected = getExpectedAdminToken();
  if (!expected || !token) return false;
  return timingSafeEqualString(token, expected);
}

export { COOKIE_NAME as INTERNAL_SESSION_COOKIE_NAME };
