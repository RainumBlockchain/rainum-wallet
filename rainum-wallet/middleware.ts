/**
 * Next.js Middleware
 * Server-side route protection and automatic redirects
 *
 * This middleware runs on EVERY request to protected routes
 * and enforces authentication before pages load
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware function - runs on every request
 * @param request - Incoming request
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session token from cookie (set by SessionManager)
  const sessionToken = request.cookies.get('session_token')?.value;

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Public routes that should redirect if already authenticated
  const publicRoutes = ['/'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // === SCENARIO 1: Trying to access protected route WITHOUT session ===
  if (isProtectedRoute && !sessionToken) {
    console.log('[Middleware] Blocked access to', pathname, '- No session');

    const url = request.nextUrl.clone();
    url.pathname = '/';
    // Save where user was trying to go
    url.searchParams.set('redirectTo', pathname);

    return NextResponse.redirect(url);
  }

  // === SCENARIO 2: Trying to access public route (login) WITH active session ===
  if (isPublicRoute && sessionToken) {
    console.log('[Middleware] Redirecting to dashboard - Already authenticated');

    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';

    return NextResponse.redirect(url);
  }

  // === SCENARIO 3: Valid access - allow request to proceed ===
  return NextResponse.next();
}

/**
 * Configure which routes middleware should run on
 * Uses matcher to optimize performance
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
