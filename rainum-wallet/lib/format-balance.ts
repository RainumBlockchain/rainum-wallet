/**
 * Format large numbers for balance display
 * Handles millions, billions, trillions with proper abbreviations
 */

export interface FormattedBalance {
  main: string;        // Main number (e.g., "1.5M")
  full: string;        // Full number with commas (e.g., "1,500,000")
  abbreviated: boolean; // Whether the number is abbreviated
  suffix: string;      // Suffix (M, B, T, etc.)
}

/**
 * Format balance that's already in RAIN units (wallet store uses this)
 * All amounts are now in RAIN directly (no micro-RAIN conversion)
 */
export function formatBalance(balanceInRain: number | undefined | null): FormattedBalance {
  // Handle undefined/null values
  if (balanceInRain === undefined || balanceInRain === null || isNaN(balanceInRain)) {
    return {
      main: '0',
      full: '0',
      abbreviated: false,
      suffix: '',
    };
  }

  const balance = balanceInRain;
  // Format with US locale (commas for thousands, NO decimals for whole numbers)
  const full = balance.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Determine if we need abbreviation (>= 1 million)
  if (balance >= 1_000_000_000_000) {
    // Trillions
    return {
      main: (balance / 1_000_000_000_000).toFixed(0),
      full,
      abbreviated: true,
      suffix: 'T',
    };
  } else if (balance >= 1_000_000_000) {
    // Billions
    return {
      main: (balance / 1_000_000_000).toFixed(0),
      full,
      abbreviated: true,
      suffix: 'B',
    };
  } else if (balance >= 1_000_000) {
    // Millions
    return {
      main: (balance / 1_000_000).toFixed(0),
      full,
      abbreviated: true,
      suffix: 'M',
    };
  } else if (balance >= 1_000) {
    // Thousands
    return {
      main: (balance / 1_000).toFixed(0),
      full,
      abbreviated: true,
      suffix: 'K',
    };
  } else {
    // Less than 1000
    return {
      main: balance.toFixed(0),
      full,
      abbreviated: false,
      suffix: '',
    };
  }
}
