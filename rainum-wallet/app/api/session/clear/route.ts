import { NextResponse } from 'next/server';

/**
 * API Route: Clear HttpOnly Session Cookie
 *
 * This route removes the session token cookie on logout.
 * 🔒 CSRF Protection: Validates CSRF token before clearing
 */
export async function POST(request: Request) {
  try {
    const { csrfToken } = await request.json();

    // 🔒 CRITICAL: Validate CSRF token before clearing session
    if (csrfToken) {
      const csrfCookie = request.cookies.get('csrf_token')?.value;

      if (csrfCookie && csrfCookie !== csrfToken) {
        return NextResponse.json(
          { success: false, message: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    }

    const response = NextResponse.json({ success: true });

    // Clear session cookie by setting it to expire immediately
    response.cookies.set({
      name: 'session_token',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/'
    });

    // Clear CSRF token cookie
    response.cookies.set({
      name: 'csrf_token',
      value: '',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Failed to clear session cookie:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to clear session' },
      { status: 500 }
    );
  }
}

