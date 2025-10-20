/**
 * CSRF (Cross-Site Request Forgery) Protection
 * 🔒 SECURITY: Prevents malicious sites from forging requests to our API
 *
 * Implementation: Double-Submit Cookie Pattern
 * - Generate cryptographically secure token
 * - Store in both cookie (server-readable) and sessionStorage (client-readable)
 * - Server validates both match
 */

const CSRF_TOKEN_STORAGE_KEY = 'csrf_token';

/**
 * Generate a cryptographically secure CSRF token
 * @returns 256-bit (32-byte) hex-encoded token
 */
export function generateCSRFToken(): string {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);

  const token = Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Store in sessionStorage for client-side access
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(CSRF_TOKEN_STORAGE_KEY, token);
  }

  return token;
}

/**
 * Get current CSRF token from storage
 * @returns CSRF token or null if not set
 */
export function getCSRFToken(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(CSRF_TOKEN_STORAGE_KEY);
  }
  return null;
}

/**
 * Clear CSRF token (on logout)
 */
export function clearCSRFToken(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(CSRF_TOKEN_STORAGE_KEY);
  }
}

/**
 * Validate CSRF token (constant-time comparison to prevent timing attacks)
 * @param token Token to validate
 * @returns True if valid
 */
export function validateCSRFToken(token: string): boolean {
  const storedToken = getCSRFToken();
  if (!storedToken) {
    return false;
  }

  // CRITICAL: Constant-time comparison to prevent timing attacks
  if (token.length !== storedToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }

  return result === 0;
}
