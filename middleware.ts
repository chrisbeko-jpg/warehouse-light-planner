import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LEDPANEEL_HOSTS = new Set(["ledpaneel.nl", "www.ledpaneel.nl"]);

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const { pathname } = request.nextUrl;

  if (LEDPANEEL_HOSTS.has(host)) {
    if (host === "www.ledpaneel.nl") {
      const url = request.nextUrl.clone();
      url.host = "ledpaneel.nl";
      return NextResponse.redirect(url, 308);
    }
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/wizard";
      return NextResponse.rewrite(url);
    }
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
  matcher: ["/", "/wizard/:path*", "/internal/:path*"],
};
