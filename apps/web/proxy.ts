import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const authProxy = withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (path.startsWith("/umpire") && token?.role !== "umpire") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export default function proxy(req: any, event: any) {
  if (process.env.NODE_ENV !== "production") {
    const bypassRole = req.headers.get("x-playwright-role");
    const path = req.nextUrl.pathname;

    if (path.startsWith("/admin") && bypassRole === "admin") {
      return NextResponse.next();
    }

    if (path.startsWith("/umpire") && bypassRole === "umpire") {
      return NextResponse.next();
    }
  }

  return authProxy(req, event);
}

export const config = {
  matcher: ["/admin/:path*", "/umpire/:path*"],
};
