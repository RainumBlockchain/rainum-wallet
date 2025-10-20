/**
 * Export Security System
 *
 * Implements multi-layer security for sensitive data exports:
 * - Rate limiting with exponential backoff
 * - Export audit logging with timestamps
 * - Cooldown periods between exports
 * - Per-wallet tracking using mnemonic hash
 */

import CryptoJS from 'crypto-js';

/**
 * Hash mnemonic for storage key
 */
function hashMnemonic(mnemonic: string): string {
  return CryptoJS.SHA256(mnemonic).toString();
}

export interface ExportAttempt {
  timestamp: number;
  type: 'seed_phrase' | 'private_key';
  accountIndex?: number;
  success: boolean;
}

export interface ExportSecurityState {
  attempts: ExportAttempt[];
  lastExportTime: number;
  blockUntil: number; // Timestamp when user can export again
}

// Security Configuration
const SECURITY_CONFIG = {
  // Rate Limiting
  MAX_EXPORTS_PER_HOUR: 3,
  MAX_EXPORTS_PER_DAY: 10,

  // Cooldown (in milliseconds)
  COOLDOWN_BETWEEN_EXPORTS: 10 * 60 * 1000, // 10 minutes

  // Exponential Backoff (in milliseconds)
  BACKOFF_LEVELS: [
    1 * 60 * 60 * 1000,  // 1st violation: 1 hour
    3 * 60 * 60 * 1000,  // 2nd violation: 3 hours
    24 * 60 * 60 * 1000, // 3rd+ violation: 24 hours
  ],

  // Audit Log
  MAX_AUDIT_LOG_ENTRIES: 100,
};

/**
 * Get storage key for export security state
 */
function getStorageKey(mnemonic: string): string {
  const hash = hashMnemonic(mnemonic);
  return `export_security_${hash}`;
}

/**
 * Load export security state from localStorage
 */
export function loadExportSecurityState(mnemonic: string): ExportSecurityState {
  try {
    const key = getStorageKey(mnemonic);
    const stored = localStorage.getItem(key);

    if (stored) {
      const parsed = JSON.parse(stored) as ExportSecurityState;
      return parsed;
    }
  } catch (error) {
    console.error('Failed to load export security state:', error);
  }

  // Return default state
  return {
    attempts: [],
    lastExportTime: 0,
    blockUntil: 0,
  };
}

/**
 * Save export security state to localStorage
 */
export function saveExportSecurityState(mnemonic: string, state: ExportSecurityState): void {
  try {
    const key = getStorageKey(mnemonic);

    // Trim audit log to max entries (keep most recent)
    if (state.attempts.length > SECURITY_CONFIG.MAX_AUDIT_LOG_ENTRIES) {
      state.attempts = state.attempts.slice(-SECURITY_CONFIG.MAX_AUDIT_LOG_ENTRIES);
    }

    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save export security state:', error);
  }
}

/**
 * Check if cooldown period is active
 */
export function isInCooldown(state: ExportSecurityState): boolean {
  const now = Date.now();

  // Check if blocked by exponential backoff
  if (state.blockUntil > now) {
    return true;
  }

  // Check if in cooldown period
  if (state.lastExportTime > 0) {
    const timeSinceLastExport = now - state.lastExportTime;
    if (timeSinceLastExport < SECURITY_CONFIG.COOLDOWN_BETWEEN_EXPORTS) {
      return true;
    }
  }

  return false;
}

/**
 * Get remaining cooldown time in milliseconds
 */
export function getRemainingCooldown(state: ExportSecurityState): number {
  const now = Date.now();

  // Check exponential backoff first (higher priority)
  if (state.blockUntil > now) {
    return state.blockUntil - now;
  }

  // Check normal cooldown
  if (state.lastExportTime > 0) {
    const timeSinceLastExport = now - state.lastExportTime;
    const remaining = SECURITY_CONFIG.COOLDOWN_BETWEEN_EXPORTS - timeSinceLastExport;
    return Math.max(0, remaining);
  }

  return 0;
}

/**
 * Check if rate limit is exceeded
 * Returns { allowed: boolean, reason?: string, blockUntil?: number }
 */
export function checkRateLimit(state: ExportSecurityState): {
  allowed: boolean;
  reason?: string;
  blockUntil?: number;
} {
  const now = Date.now();

  // Filter attempts from last hour and last day
  const oneHourAgo = now - (60 * 60 * 1000);
  const oneDayAgo = now - (24 * 60 * 60 * 1000);

  const attemptsLastHour = state.attempts.filter(a => a.timestamp >= oneHourAgo && a.success);
  const attemptsLastDay = state.attempts.filter(a => a.timestamp >= oneDayAgo && a.success);

  // Check hourly limit
  if (attemptsLastHour.length >= SECURITY_CONFIG.MAX_EXPORTS_PER_HOUR) {
    // Calculate when the oldest attempt expires
    const oldestAttempt = Math.min(...attemptsLastHour.map(a => a.timestamp));
    const blockUntil = oldestAttempt + (60 * 60 * 1000);

    return {
      allowed: false,
      reason: `Rate limit exceeded: Maximum ${SECURITY_CONFIG.MAX_EXPORTS_PER_HOUR} exports per hour`,
      blockUntil,
    };
  }

  // Check daily limit
  if (attemptsLastDay.length >= SECURITY_CONFIG.MAX_EXPORTS_PER_DAY) {
    const oldestAttempt = Math.min(...attemptsLastDay.map(a => a.timestamp));
    const blockUntil = oldestAttempt + (24 * 60 * 60 * 1000);

    return {
      allowed: false,
      reason: `Rate limit exceeded: Maximum ${SECURITY_CONFIG.MAX_EXPORTS_PER_DAY} exports per day`,
      blockUntil,
    };
  }

  return { allowed: true };
}

/**
 * Record an export attempt
 */
export function recordExportAttempt(
  mnemonic: string,
  type: 'seed_phrase' | 'private_key',
  success: boolean,
  accountIndex?: number
): void {
  const state = loadExportSecurityState(mnemonic);

  const attempt: ExportAttempt = {
    timestamp: Date.now(),
    type,
    success,
    accountIndex,
  };

  state.attempts.push(attempt);

  if (success) {
    state.lastExportTime = Date.now();
  }

  saveExportSecurityState(mnemonic, state);
}

/**
 * Apply exponential backoff after rate limit violation
 */
export function applyExponentialBackoff(mnemonic: string): number {
  const state = loadExportSecurityState(mnemonic);
  const now = Date.now();

  // Count recent violations (failed attempts due to rate limiting in last 24 hours)
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const recentViolations = state.attempts.filter(
    a => a.timestamp >= oneDayAgo && !a.success
  ).length;

  // Determine backoff duration based on violation count
  const backoffIndex = Math.min(recentViolations, SECURITY_CONFIG.BACKOFF_LEVELS.length - 1);
  const backoffDuration = SECURITY_CONFIG.BACKOFF_LEVELS[backoffIndex];

  // Set block until time
  state.blockUntil = now + backoffDuration;
  saveExportSecurityState(mnemonic, state);

  return backoffDuration;
}

/**
 * Get audit log for display (most recent first)
 */
export function getAuditLog(mnemonic: string, limit: number = 10): ExportAttempt[] {
  const state = loadExportSecurityState(mnemonic);
  return state.attempts
    .filter(a => a.success) // Only show successful exports
    .slice(-limit)
    .reverse();
}

/**
 * Format remaining time for display
 * Example: "9m 32s", "1h 23m", "2d 5h"
 */
export function formatRemainingTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Check if export is allowed (combines all checks)
 */
export function canExport(mnemonic: string): {
  allowed: boolean;
  reason?: string;
  remainingTime?: number;
} {
  const state = loadExportSecurityState(mnemonic);

  // Check cooldown first
  if (isInCooldown(state)) {
    const remaining = getRemainingCooldown(state);
    return {
      allowed: false,
      reason: `Please wait ${formatRemainingTime(remaining)} before next export`,
      remainingTime: remaining,
    };
  }

  // Check rate limits
  const rateLimitCheck = checkRateLimit(state);
  if (!rateLimitCheck.allowed) {
    // Apply exponential backoff
    const backoffDuration = applyExponentialBackoff(mnemonic);
    return {
      allowed: false,
      reason: rateLimitCheck.reason,
      remainingTime: backoffDuration,
    };
  }

  return { allowed: true };
}
