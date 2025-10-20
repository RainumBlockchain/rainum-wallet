/**
 * Rainum Blockchain Unit Conversions
 *
 * All amounts are stored and displayed in RAIN directly (no micro-RAIN conversion)
 * Balance and amounts are represented as numbers in whole RAIN tokens
 */

/**
 * Format RAIN amount for display
 *
 * @param rain - Amount in RAIN
 * @param decimals - Number of decimal places to show (default: 2)
 * @returns Formatted string with RAIN suffix
 *
 * @example
 * formatRain(1000)        // "1,000.00 RAIN"
 * formatRain(500.5, 2)    // "500.50 RAIN"
 * formatRain(1234567, 0)  // "1,234,567 RAIN"
 */
export function formatRain(rain: number, decimals: number = 2): string {
  return `${rain.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })} RAIN`;
}
