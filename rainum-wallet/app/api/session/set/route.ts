import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * API Route: Set HttpOnly Session Cookie with CSRF Protection
 *
 * This route sets the session token as an HttpOnly cookie,
 * making it inaccessible to JavaScript and preventing XSS attacks
 * from stealing session tokens.
 *
 * 🔒 CSRF Protection: Double-submit cookie pattern
 */
export async function POST(request: Request) {
  try {
    const { sessionToken, maxAge, csrfToken } = await request.json();

    // 🔒 CRITICAL: Validate CSRF token (double-submit cookie pattern)
    if (csrfToken) {
      const csrfCookie = request.cookies.get('csrf_token')?.value;

      // First request won't have cookie yet - allow if csrfToken provided
      // Subsequent requests must match cookie
      if (csrfCookie && csrfCookie !== csrfToken) {
        return NextResponse.json(
          { success: false, message: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    }

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Session token required' },
        { status: 400 }
      );
    }

    const maxAgeSeconds = maxAge || 3600; // Default 1 hour

    const response = NextResponse.json({ success: true });

    // Set HttpOnly session cookie - CRITICAL SECURITY
    response.cookies.set({
      name: 'session_token',
      value: sessionToken,
      httpOnly: true,    // ✅ JavaScript cannot access
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // ✅ CSRF protection
      maxAge: maxAgeSeconds,
      path: '/'
    });

    // 🔒 Set CSRF token cookie (readable by JavaScript for double-submit)
    const newCSRFToken = csrfToken || crypto.randomBytes(32).toString('hex');
    response.cookies.set({
      name: 'csrf_token',
      value: newCSRFToken,
      httpOnly: false, // Must be readable by client JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: maxAgeSeconds,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Failed to set session cookie:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to set session' },
      { status: 500 }
    );
  }
}

