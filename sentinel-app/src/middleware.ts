import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Inject pathname for server components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);

    // Handle CORS for browser extension and allow API routes through
    if (pathname.startsWith("/api/")) {
        const response = NextResponse.next({
            request: { headers: requestHeaders }
        });
        response.headers.set("Access-Control-Allow-Origin", "*");
        response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if (request.method === "OPTIONS") {
            return new NextResponse(null, { status: 200, headers: response.headers });
        }

        return response;
    }

    // Protect Dashboard UI routes
    const isAuthPage = pathname === "/login" || pathname === "/unauthorized";
    const isLoginPage = pathname === "/login";
    const sessionToken = request.cookies.get("better-auth.session_token") || request.cookies.get("__Secure-better-auth.session_token");

    if (!sessionToken && !isAuthPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (sessionToken && isLoginPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next({
        request: { headers: requestHeaders }
    });
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"], // run on all paths except static assets
};
