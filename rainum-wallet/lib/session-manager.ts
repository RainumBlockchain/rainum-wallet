/**
 * Session Manager
 * Handles user sessions with automatic timeout and monitoring
 */

import { toast } from './toast-store';
import { getSessionTimeoutMs } from './wallet-settings';

const CHECK_INTERVAL = 5000; // Check every 5 seconds

/**
 * Session data structure
 */
export interface Session {
  token: string;
  address: string;
  createdAt: number;
  lastActivity: number;
  expiresIn: number;
}

/**
 * Session Manager (Singleton pattern)
 * Manages user sessions with automatic timeout and cross-tab synchronization
 */
export class SessionManager {
  private static instance: SessionManager;
  private checkInterval: NodeJS.Timeout | null = null;
  private activityListeners: (() => void)[] = [];
  private hasShownExpiredToast: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Create a new session
   * @param address - Wallet address
   * @returns Session token
   */
  async createSession(address: string): Promise<string> {
    const sessionToken = this.generateToken();
    const sessionTimeout = getSessionTimeoutMs();

    // 🔒 CRITICAL SECURITY: Store minimal data in localStorage (NO TOKEN)
    // Token is stored ONLY in HttpOnly cookie to prevent XSS theft
    const sessionData = {
      address,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresIn: sessionTimeout
      // ❌ REMOVED: token (security vulnerability - XSS can steal from localStorage)
    };

    // Save session metadata to localStorage (without token)
    localStorage.setItem('session', JSON.stringify(sessionData));

    // Set HttpOnly cookie via API route for security
    // If timeout is 0 (disabled), set cookie for 30 days (2592000 seconds)
    const cookieMaxAge = sessionTimeout === 0 ? 2592000 : sessionTimeout / 1000;
    await this.setCookie('session_token', sessionToken, cookieMaxAge);

    return sessionToken;
  }

  /**
   * Get current session
   * @returns Session data or null if no valid session
   * 🔒 SECURITY: Token not included (stored only in HttpOnly cookie)
   */
  getSession(): Session | null {
    const sessionData = localStorage.getItem('session');
    if (!sessionData) {
      return null;
    }

    try {
      const session = JSON.parse(sessionData);
      const now = Date.now();
      const sessionTimeout = getSessionTimeoutMs();

      // Check if session has expired (if timeout is enabled)
      if (sessionTimeout > 0 && now - session.lastActivity > sessionTimeout) {
        this.destroySession();
        return null;
      }

      // 🔒 SECURITY: Return session WITHOUT token
      // Actual token is in HttpOnly cookie and verified server-side
      return {
        token: '', // Empty - token stored only in HttpOnly cookie
        address: session.address,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        expiresIn: session.expiresIn
      };
    } catch (error) {
      console.error('Failed to parse session:', error);
      return null;
    }
  }

  /**
   * Validate current session
   * @returns True if session is valid
   */
  validateSession(): boolean {
    return this.getSession() !== null;
  }

  /**
   * Extend session by updating last activity timestamp
   */
  extendSession(): void {
    const session = this.getSession();
    if (!session) {
      return;
    }

    session.lastActivity = Date.now();
    localStorage.setItem('session', JSON.stringify(session));
  }

  /**
   * Destroy current session (logout)
   * @param isManualLogout - True if user clicked logout, false if auto-expired
   */
  async destroySession(isManualLogout: boolean = true): Promise<void> {
    // Remove session from localStorage (but keep wallet!)
    localStorage.removeItem('session');
    // NOTE: We keep 'wallet' in localStorage so user can login again
    // Only delete wallet if user explicitly wants to (via settings)

    // Clear HttpOnly cookies via API route
    await this.clearCookie('session_token');

    // Stop monitoring
    this.stopSessionMonitoring();

    // Clear activity listeners
    this.removeActivityListeners();

    // Reset toast flag if manual logout
    if (isManualLogout) {
      this.hasShownExpiredToast = false;
    }
  }

  /**
   * Start monitoring session for timeout and activity
   * @param onSessionExpired - Callback when session expires
   */
  startSessionMonitoring(onSessionExpired: () => void): void {
    // Reset toast flag when starting monitoring
    this.hasShownExpiredToast = false;

    // Setup activity listeners to extend session on user interaction
    this.setupActivityListeners();

    // Check session every 5 seconds
    this.checkInterval = setInterval(() => {
      const session = this.getSession();

      if (!session) {
        // Session expired or destroyed
        this.stopSessionMonitoring();

        // Only show toast and call callback once
        if (!this.hasShownExpiredToast) {
          this.hasShownExpiredToast = true;
          toast.warning('Session Expired', 'You have been logged out due to inactivity');
          onSessionExpired();
        }
      }
    }, CHECK_INTERVAL);

    // Also listen to storage events (for multi-tab synchronization)
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  /**
   * Stop session monitoring
   */
  stopSessionMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    window.removeEventListener('storage', this.handleStorageChange.bind(this));
    this.removeActivityListeners();
  }

  /**
   * Setup event listeners for user activity
   */
  private setupActivityListeners(): void {
    const updateActivity = () => {
      this.extendSession();
    };

    // Update session on any user interaction
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      window.addEventListener(event, updateActivity);
      this.activityListeners.push(() => {
        window.removeEventListener(event, updateActivity);
      });
    });
  }

  /**
   * Remove activity listeners
   */
  private removeActivityListeners(): void {
    this.activityListeners.forEach(remove => remove());
    this.activityListeners = [];
  }

  /**
   * Handle localStorage changes (multi-tab synchronization)
   */
  private handleStorageChange(event: StorageEvent): void {
    // Session was deleted in another tab
    if (event.key === 'session' && event.newValue === null) {
      this.stopSessionMonitoring();
      // Let the caller handle redirect
    }
  }

  /**
   * Generate a cryptographically secure random session token
   * Uses Web Crypto API's getRandomValues for maximum entropy
   * @returns 256-bit (32-byte) hex-encoded token
   */
  private generateToken(): string {
    // Use crypto.getRandomValues for cryptographically secure randomness
    // Generate 32 bytes (256 bits) for session token
    const buffer = new Uint8Array(32);
    crypto.getRandomValues(buffer);

    // Convert to hex string
    return Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Set a cookie via API route (HttpOnly) with CSRF protection
   * 🔒 SECURITY: Uses server-side route to set HttpOnly cookies
   */
  private async setCookie(name: string, value: string, maxAgeSeconds: number): Promise<void> {
    try {
      const { generateCSRFToken, getCSRFToken } = await import('./csrf');

      // Get or generate CSRF token
      let csrfToken = getCSRFToken();
      if (!csrfToken) {
        csrfToken = generateCSRFToken();
      }

      await fetch('/api/session/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: value,
          maxAge: maxAgeSeconds,
          csrfToken // Include CSRF token for validation
        })
      });
    } catch (error) {
      console.error('Failed to set session cookie:', error);
      // Fallback to client-side cookie (less secure but ensures functionality)
      document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; samesite=strict`;
    }
  }

  /**
   * Clear a cookie via API route with CSRF protection
   */
  private async clearCookie(name: string): Promise<void> {
    try {
      const { getCSRFToken, clearCSRFToken } = await import('./csrf');

      const csrfToken = getCSRFToken();

      await fetch('/api/session/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrfToken })
      });

      // Clear CSRF token from sessionStorage
      clearCSRFToken();
    } catch (error) {
      console.error('Failed to clear session cookie:', error);
      // Fallback to client-side clear
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }

  /**
   * Get time until session expires
   * @returns Milliseconds until expiration, or null if no session
   */
  getTimeUntilExpiry(): number | null {
    const session = this.getSession();
    if (!session) {
      return null;
    }

    const sessionTimeout = getSessionTimeoutMs();
    if (sessionTimeout === 0) {
      return null; // No timeout configured
    }

    const timeElapsed = Date.now() - session.lastActivity;
    const timeRemaining = sessionTimeout - timeElapsed;

    return Math.max(0, timeRemaining);
  }

  /**
   * Check if session will expire soon (within 5 minutes)
   * @returns True if session expires in less than 5 minutes
   */
  isExpiringSoon(): boolean {
    const timeRemaining = this.getTimeUntilExpiry();
    if (timeRemaining === null) {
      return false;
    }

    return timeRemaining < 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Update session cookie with new timeout
   * Call this after changing timeout settings
   */
  updateSessionTimeout(): void {
    const session = this.getSession();
    if (!session) {
      return;
    }

    const sessionTimeout = getSessionTimeoutMs();

    // Update cookie with new max-age
    const cookieMaxAge = sessionTimeout === 0 ? 2592000 : sessionTimeout / 1000;
    this.setCookie('session_token', session.token, cookieMaxAge);

    // Update session expiresIn in localStorage
    session.expiresIn = sessionTimeout;
    localStorage.setItem('session', JSON.stringify(session));
  }

}

/**
 * Export singleton instance for convenience
 */
export const sessionManager = SessionManager.getInstance();
