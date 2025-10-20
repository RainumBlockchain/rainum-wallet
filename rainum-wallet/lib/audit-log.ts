/**
 * Audit Log System
 * Tracks security events, login history, and transaction activity
 */

export type AuditEventType =
  | 'login_success'
  | 'login_failed'
  | 'login_blocked'
  | 'logout'
  | 'wallet_created'
  | 'wallet_imported'
  | 'transaction_sent'
  | 'transaction_received'
  | 'password_changed'
  | 'biometric_enabled'
  | 'biometric_disabled'
  | 'session_expired'
  | 'high_amount_transaction'
  | 'very_high_amount_transaction';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  type: AuditEventType;
  category: 'security' | 'transaction' | 'account';
  description: string;
  metadata?: {
    address?: string;
    amount?: number;
    recipient?: string;
    transactionHash?: string;
    attemptNumber?: number;
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
}

const STORAGE_KEY = 'rainum_audit_log';
const MAX_ENTRIES = 1000; // Keep last 1000 entries

/**
 * Get all audit log entries from localStorage
 */
function getAuditLog(): AuditLogEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to parse audit log:', error);
    return [];
  }
}

/**
 * Save audit log entries to localStorage
 */
function saveAuditLog(entries: AuditLogEntry[]): void {
  if (typeof window === 'undefined') return;

  try {
    // Keep only the most recent MAX_ENTRIES
    const trimmedEntries = entries.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedEntries));
  } catch (error) {
    console.error('Failed to save audit log:', error);
  }
}

/**
 * Generate a unique ID for audit log entry
 */
function generateId(): string {
  // 🔒 SECURITY: Use cryptographically secure random values (not Math.random)
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const randomHex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${Date.now()}-${randomHex}`;
}

/**
 * Add an entry to the audit log
 */
export function logAuditEvent(
  type: AuditEventType,
  category: 'security' | 'transaction' | 'account',
  description: string,
  metadata?: AuditLogEntry['metadata']
): void {
  const entry: AuditLogEntry = {
    id: generateId(),
    timestamp: Date.now(),
    type,
    category,
    description,
    metadata: {
      ...metadata,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    },
  };

  const log = getAuditLog();
  log.push(entry);
  saveAuditLog(log);
}

/**
 * Get all audit log entries, sorted by timestamp (newest first)
 */
export function getAuditLogEntries(): AuditLogEntry[] {
  return getAuditLog().sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get audit log entries filtered by category
 */
export function getAuditLogByCategory(category: 'security' | 'transaction' | 'account'): AuditLogEntry[] {
  return getAuditLog()
    .filter(entry => entry.category === category)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get audit log entries filtered by type
 */
export function getAuditLogByType(type: AuditEventType): AuditLogEntry[] {
  return getAuditLog()
    .filter(entry => entry.type === type)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get audit log entries within a time range
 */
export function getAuditLogByTimeRange(startTime: number, endTime: number): AuditLogEntry[] {
  return getAuditLog()
    .filter(entry => entry.timestamp >= startTime && entry.timestamp <= endTime)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get recent audit log entries (last N entries)
 */
export function getRecentAuditLog(count: number = 50): AuditLogEntry[] {
  return getAuditLog()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, count);
}

/**
 * Clear all audit log entries
 */
export function clearAuditLog(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export audit log as JSON
 */
export function exportAuditLog(): string {
  return JSON.stringify(getAuditLog(), null, 2);
}

/**
 * Get audit log statistics
 */
export function getAuditLogStats() {
  const log = getAuditLog();
  const now = Date.now();
  const last24Hours = now - 24 * 60 * 60 * 1000;
  const last7Days = now - 7 * 24 * 60 * 60 * 1000;

  const stats = {
    total: log.length,
    last24Hours: log.filter(e => e.timestamp >= last24Hours).length,
    last7Days: log.filter(e => e.timestamp >= last7Days).length,
    byCategory: {
      security: log.filter(e => e.category === 'security').length,
      transaction: log.filter(e => e.category === 'transaction').length,
      account: log.filter(e => e.category === 'account').length,
    },
    byType: {} as Record<AuditEventType, number>,
    recentLogins: log.filter(e => e.type === 'login_success').slice(0, 5),
    failedLogins: log.filter(e => e.type === 'login_failed').length,
    blockedAttempts: log.filter(e => e.type === 'login_blocked').length,
  };

  // Count by type
  const types: AuditEventType[] = [
    'login_success',
    'login_failed',
    'login_blocked',
    'logout',
    'wallet_created',
    'wallet_imported',
    'transaction_sent',
    'transaction_received',
    'password_changed',
    'biometric_enabled',
    'biometric_disabled',
    'session_expired',
    'high_amount_transaction',
    'very_high_amount_transaction',
  ];

  types.forEach(type => {
    stats.byType[type] = log.filter(e => e.type === type).length;
  });

  return stats;
}

/**
 * Helper function to format timestamp for display
 */
export function formatAuditTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Helper function to get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
}
