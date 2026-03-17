import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // RBAC: Protect Admin Routes
    if (path.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // RBAC: Protect Umpire Routes (Strictly umpires only)
    if (path.startsWith("/umpire") && token?.role !== "umpire") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  },
  {
    callbacks: {
      // Return true if the user has a token, ensuring the middleware function runs
      authorized: ({ token }) => !!token,
    },
  }
);

// Define which routes the middleware should apply to
export const config = {
  matcher: ["/admin/:path*", "/umpire/:path*"],
};