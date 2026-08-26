import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LEDPANEEL_HOSTS = new Set(["ledpaneel.nl", "www.ledpaneel.nl"]);

function isLedpaneelSite(host: string): boolean {
  return LEDPANEEL_HOSTS.has(host) || process.env.NEXT_PUBLIC_SITE_MODE === "ledpaneel";
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const { pathname } = request.nextUrl;

  if (isLedpaneelSite(host) && pathname === "/") {
    return NextResponse.rewrite(new URL("/home", request.url));
  }

  if (pathname === "/wizard" || pathname.startsWith("/wizard/")) {
    return NextResponse.redirect(new URL("/lichtadvies", request.url));
  }

  if (pathname.startsWith("/internal") && !pathname.startsWith("/internal/login")) {
    const expectedToken = process.env.INTERNAL_ADMIN_TOKEN ?? "";
    const cookieToken = request.cookies.get("internal_admin_token")?.value ?? "";
    const authHeader = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
    const isAuthorized =
      expectedToken.length > 0 &&
      (cookieToken === expectedToken || authHeader === expectedToken);
    if (!isAuthorized) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/internal/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/wizard", "/wizard/:path*", "/internal/:path*"],
};
