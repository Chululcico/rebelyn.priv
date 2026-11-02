import { NextResponse, type NextRequest } from "next/server";

/**
 * Protección coarse de /admin en edge. La verificación REAL del rol se hace
 * en servidor (src/app/admin/layout.tsx → requireAdmin). Aquí solo evitamos
 * renderizar nada a quien ni siquiera tiene cookie de sesión.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const session = request.cookies.get("rb_session")?.value;
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
