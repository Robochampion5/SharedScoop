import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const protectedPaths = ["/dashboard", "/community/create", "/onboarding"];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  const session = request.cookies.get("__session");

  if (!session && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
