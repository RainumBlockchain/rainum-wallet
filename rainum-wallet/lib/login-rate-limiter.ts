/**
 * Login Rate Limiter
 * Protects against brute force attacks by limiting login attempts
 *
 * Rules (configurable):
 * - Maximum N failed attempts (default: 5)
 * - M minute lockout after max failures (default: 15)
 * - Attempts reset on successful login
 */

import { getLoginRateLimitSettings } from './wallet-settings';

const STORAGE_KEY = 'rainum_login_attempts';

interface LoginAttemptData {
  attempts: number;
  lastAttemptTime: number;
  lockedUntil: number | null;
}

/**
 * Get current login attempt data from localStorage
 */
function getAttemptData(): LoginAttemptData {
  if (typeof window === 'undefined') {
    return { attempts: 0, lastAttemptTime: 0, lockedUntil: null };
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return { attempts: 0, lastAttemptTime: 0, lockedUntil: null };
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to parse login attempt data:', error);
    return { attempts: 0, lastAttemptTime: 0, lockedUntil: null };
  }
}

/**
 * Save login attempt data to localStorage
 */
function saveAttemptData(data: LoginAttemptData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save login attempt data:', error);
  }
}

/**
 * Check if login is currently blocked
 * @returns true if blocked, false if allowed
 */
export function isLoginBlocked(): boolean {
  const settings = getLoginRateLimitSettings();

  // If rate limiting is disabled, never block
  if (!settings.enabled) {
    return false;
  }

  const data = getAttemptData();

  if (!data.lockedUntil) {
    return false;
  }

  const now = Date.now();

  // Check if lockout period has expired
  if (now >= data.lockedUntil) {
    // Lockout expired, reset attempts
    resetAttempts();
    return false;
  }

  return true;
}

/**
 * Get time remaining on lockout in milliseconds
 * @returns milliseconds until lockout expires, or 0 if not locked
 */
export function getLockoutTimeRemaining(): number {
  const data = getAttemptData();

  if (!data.lockedUntil) {
    return 0;
  }

  const now = Date.now();
  const remaining = data.lockedUntil - now;

  return remaining > 0 ? remaining : 0;
}

/**
 * Get formatted time remaining on lockout
 * @returns string like "14m 32s" or empty string if not locked
 */
export function getLockoutTimeRemainingFormatted(): string {
  const remaining = getLockoutTimeRemaining();

  if (remaining === 0) {
    return '';
  }

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Record a failed login attempt
 * Locks account if max attempts reached
 */
export function recordFailedAttempt(): void {
  const settings = getLoginRateLimitSettings();

  // If rate limiting is disabled, don't track attempts
  if (!settings.enabled) {
    return;
  }

  const data = getAttemptData();
  const now = Date.now();

  data.attempts += 1;
  data.lastAttemptTime = now;

  // Check if we've reached max attempts
  if (data.attempts >= settings.maxAttempts) {
    data.lockedUntil = now + (settings.lockoutDuration * 60 * 1000);
  }

  saveAttemptData(data);
}

/**
 * Get number of remaining login attempts before lockout
 * @returns number of attempts remaining
 */
export function getRemainingAttempts(): number {
  const settings = getLoginRateLimitSettings();

  // If rate limiting is disabled, return unlimited
  if (!settings.enabled) {
    return 999;
  }

  const data = getAttemptData();

  // If locked, no attempts remaining
  if (isLoginBlocked()) {
    return 0;
  }

  const remaining = settings.maxAttempts - data.attempts;
  return Math.max(0, remaining);
}

/**
 * Reset login attempts (call on successful login)
 */
export function resetAttempts(): void {
  saveAttemptData({
    attempts: 0,
    lastAttemptTime: 0,
    lockedUntil: null
  });
}

/**
 * Get current attempt count
 */
export function getAttemptCount(): number {
  const data = getAttemptData();
  return data.attempts;
}
