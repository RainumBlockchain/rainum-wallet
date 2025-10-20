/**
 * Production-Safe Logger Utility
 * 🔒 SECURITY: Prevents sensitive data leakage via console in production
 */

import * as Sentry from '@sentry/nextjs';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = {
  /**
   * Log debug information (only in development)
   */
  log: (...args: any[]): void => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Log errors (always sent to Sentry, console only in development)
   */
  error: (message: string, error?: any): void => {
    if (isDevelopment) {
      console.error('[ERROR]', message, error);
    }

    // Always report errors to Sentry for monitoring
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: { message }
      });
    } else {
      Sentry.captureMessage(message, {
        level: 'error',
        extra: { error }
      });
    }
  },

  /**
   * Log warnings (only in development)
   */
  warn: (...args: any[]): void => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Log info (only in development)
   */
  info: (...args: any[]): void => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Log important events (always to Sentry, console only in development)
   */
  event: (eventName: string, data?: any): void => {
    if (isDevelopment) {
      console.log(`[EVENT] ${eventName}`, data);
    }

    // Track important events in Sentry
    Sentry.addBreadcrumb({
      category: 'event',
      message: eventName,
      data,
      level: 'info'
    });
  }
};

/**
 * Sanitize sensitive data before logging
 * Replaces addresses, keys, and mnemonics with masked versions
 */
export function sanitizeForLog(data: any): any {
  if (typeof data === 'string') {
    // Mask Ethereum addresses (0x + 40 hex chars)
    data = data.replace(/0x[a-fA-F0-9]{40}/g, '0x****');

    // Mask potential private keys (64 hex chars)
    data = data.replace(/[a-fA-F0-9]{64}/g, '****');

    // Mask mnemonic phrases (12-24 words)
    if (data.split(' ').length >= 12) {
      return '[MNEMONIC REDACTED]';
    }
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = Array.isArray(data) ? [] : {};

    for (const key in data) {
      // Skip sensitive fields entirely
      if (['mnemonic', 'privateKey', 'private_key', 'password', 'secret'].includes(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLog(data[key]);
      }
    }

    return sanitized;
  }

  return data;
}

export default logger;
