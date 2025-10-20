/**
 * Transaction Display Utilities
 * Consistent formatting for ZKP and regular transactions across all UI components
 */

export interface TransactionDisplayData {
  amount: string;
  from: string;
  to: string;
  isPrivate: boolean;
  commitment?: string;
  privacyLevel?: string;
}

/**
 * Format number with thousand separators and max 2 decimals
 * @param num - Number to format
 * @param compact - Use compact notation for large numbers (default: false)
 */
export function formatNumber(num: number | string, compact: boolean = false): string {
  const number = typeof num === 'string' ? parseFloat(num) : num;

  if (isNaN(number)) {
    return '0';
  }

  // For very large numbers (over 1 million), use compact notation ONLY if requested
  if (compact && number >= 1_000_000) {
    return new Intl.NumberFormat('da-DK', {
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(number);
  }

  // Show full number with thousand separators (US format: 10,000,000)
  // RAIN tokens are whole numbers only (no decimals)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
}

/**
 * Format transaction amount - handles both regular and ZKP transactions
 * For ZKP transactions, shows the decrypted amount if available
 * All amounts are now in RAIN directly (no conversion needed)
 */
export function formatTransactionAmount(tx: any, withFormatting: boolean = true): string {
  // If ZKP enabled, prefer amount_visible (decrypted for owner)
  if (tx.zkp_enabled) {
    if (tx.amount_visible !== null && tx.amount_visible !== undefined) {
      const formatted = withFormatting ? formatNumber(tx.amount_visible) : tx.amount_visible;
      return `${formatted} RAIN`;
    }
    // If no visible amount, check if amount was decrypted (non-zero)
    if (tx.amount !== null && tx.amount !== undefined && tx.amount !== 0) {
      const formatted = withFormatting ? formatNumber(tx.amount) : tx.amount;
      return `${formatted} RAIN`;
    }
    // Truly encrypted
    return '[ENCRYPTED]';
  }

  // Regular transaction - amount already in RAIN
  const formatted = withFormatting ? formatNumber(tx.amount) : tx.amount;
  return `${formatted} RAIN`;
}

/**
 * Format transaction addresses - handles privacy
 */
export function getTransactionAddresses(tx: any): {
  from: string;
  to: string;
  fromEncrypted: boolean;
  toEncrypted: boolean;
} {
  const isEncrypted = (addr: string) => addr === '0x0000000000000000000000000000000000000000' || addr === '0x0000000000000000';

  const fromAddr = isEncrypted(tx.from) ? '[ENCRYPTED]' : (tx.sender_visible || tx.from || '[PRIVATE]');
  const toAddr = isEncrypted(tx.to) ? '[ENCRYPTED]' : (tx.receiver_visible || tx.to || '[PRIVATE]');

  return {
    from: fromAddr,
    to: toAddr,
    fromEncrypted: fromAddr === '[ENCRYPTED]' || fromAddr === '[PRIVATE]',
    toEncrypted: toAddr === '[ENCRYPTED]' || toAddr === '[PRIVATE]'
  };
}

/**
 * Get privacy badge text and color
 */
export function getPrivacyBadge(tx: any): { text: string; className: string } | null {
  if (!tx.zkp_enabled) {
    return null;
  }

  const level = tx.privacy_level || 'full';

  switch (level) {
    case 'none':
      return {
        text: 'PUBLIC',
        className: 'bg-gray-100 text-gray-700 border-gray-200'
      };
    case 'partial':
      return {
        text: 'PARTIAL PRIVACY',
        className: 'bg-blue-50 text-blue-700 border-blue-200'
      };
    case 'standard':
      return {
        text: 'STANDARD PRIVACY',
        className: 'bg-purple-50 text-purple-700 border-purple-200'
      };
    case 'full':
      return {
        text: 'FULL PRIVACY',
        className: 'bg-purple-100 text-purple-900 border-purple-300'
      };
    default:
      return {
        text: 'PRIVATE',
        className: 'bg-purple-100 text-purple-900 border-purple-200'
      };
  }
}

/**
 * Get commitment display string (shortened)
 */
export function formatCommitment(commitment?: string): string {
  if (!commitment) return 'N/A';
  if (commitment.length <= 20) return commitment;
  return `${commitment.slice(0, 10)}...${commitment.slice(-8)}`;
}

/**
 * Check if transaction has ZKP proof
 */
export function hasZKPProof(tx: any): boolean {
  return tx.zkp_enabled && !!tx.zkp_proof;
}

/**
 * Get ZKP info summary for display
 */
export function getZKPSummary(tx: any): {
  enabled: boolean;
  hasCommitment: boolean;
  hasNullifier: boolean;
  hasProof: boolean;
  privacyLevel: string;
} {
  return {
    enabled: tx.zkp_enabled || false,
    hasCommitment: !!tx.amount_commitment,
    hasNullifier: !!tx.nullifier,
    hasProof: !!tx.zkp_proof,
    privacyLevel: tx.privacy_level || 'none'
  };
}
