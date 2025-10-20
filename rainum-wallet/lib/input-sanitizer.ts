/**
 * Input Sanitization Utilities
 * Prevents XSS, injection attacks, and invalid input
 */

/**
 * Sanitize string input to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validate and sanitize Ethereum-style address (0x...)
 * @param address - Address to validate
 * @returns Validated address or null if invalid
 */
export function sanitizeAddress(address: string): string | null {
  if (typeof address !== 'string') {
    return null;
  }

  // Remove whitespace
  const trimmed = address.trim();

  // Must start with 0x
  if (!trimmed.startsWith('0x')) {
    return null;
  }

  // Must be exactly 42 characters (0x + 40 hex chars)
  if (trimmed.length !== 42) {
    return null;
  }

  // Must contain only valid hex characters after 0x
  const hexPart = trimmed.slice(2);
  if (!/^[0-9a-fA-F]{40}$/.test(hexPart)) {
    return null;
  }

  // Return lowercase normalized address
  return trimmed.toLowerCase();
}

/**
 * Validate and sanitize numeric amount
 * @param amount - Amount as string or number
 * @returns Sanitized numeric string or null if invalid
 */
export function sanitizeAmount(amount: string | number): string | null {
  if (typeof amount === 'number') {
    if (!isFinite(amount) || amount < 0) {
      return null;
    }
    return amount.toString();
  }

  if (typeof amount !== 'string') {
    return null;
  }

  // Remove whitespace
  const trimmed = amount.trim();

  // Must be a valid number (allow decimals)
  if (!/^[0-9]+(\.[0-9]+)?$/.test(trimmed)) {
    return null;
  }

  const parsed = parseFloat(trimmed);

  // Must be positive and finite
  if (!isFinite(parsed) || parsed < 0) {
    return null;
  }

  return trimmed;
}

/**
 * Validate and sanitize mnemonic phrase
 * @param mnemonic - BIP39 mnemonic phrase
 * @returns Sanitized mnemonic or null if invalid
 */
export function sanitizeMnemonic(mnemonic: string): string | null {
  if (typeof mnemonic !== 'string') {
    return null;
  }

  // Normalize whitespace and trim
  const normalized = mnemonic
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  // Must contain only letters and spaces
  if (!/^[a-z\s]+$/.test(normalized)) {
    return null;
  }

  const words = normalized.split(' ');

  // Must be 12, 15, 18, 21, or 24 words (BIP39 standard)
  if (![12, 15, 18, 21, 24].includes(words.length)) {
    return null;
  }

  return normalized;
}

/**
 * Validate and sanitize password
 * @param password - User password
 * @param minLength - Minimum password length (default: 8)
 * @returns Sanitized password or null if invalid
 */
export function sanitizePassword(password: string, minLength: number = 8): string | null {
  if (typeof password !== 'string') {
    return null;
  }

  // Password must meet minimum length
  if (password.length < minLength) {
    return null;
  }

  // Password must not contain null bytes (security risk)
  if (password.includes('\0')) {
    return null;
  }

  // Return password as-is (no trimming, passwords can have spaces)
  return password;
}

/**
 * Sanitize transaction hash
 * @param hash - Transaction hash
 * @returns Sanitized hash or null if invalid
 */
export function sanitizeTransactionHash(hash: string): string | null {
  if (typeof hash !== 'string') {
    return null;
  }

  const trimmed = hash.trim();

  // Must start with 0x
  if (!trimmed.startsWith('0x')) {
    return null;
  }

  // Must be 66 characters (0x + 64 hex chars) for SHA256 hash
  if (trimmed.length !== 66) {
    return null;
  }

  // Must contain only valid hex characters
  const hexPart = trimmed.slice(2);
  if (!/^[0-9a-fA-F]{64}$/.test(hexPart)) {
    return null;
  }

  return trimmed.toLowerCase();
}

/**
 * Sanitize integer input (nonce, gas limit, etc.)
 * @param value - Integer value
 * @param min - Minimum value (default: 0)
 * @param max - Maximum value (default: Number.MAX_SAFE_INTEGER)
 * @returns Sanitized integer or null if invalid
 */
export function sanitizeInteger(
  value: string | number,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): number | null {
  let num: number;

  if (typeof value === 'string') {
    // Must be valid integer string
    if (!/^-?\d+$/.test(value.trim())) {
      return null;
    }
    num = parseInt(value.trim(), 10);
  } else if (typeof value === 'number') {
    num = Math.floor(value);
  } else {
    return null;
  }

  // Check bounds
  if (!Number.isInteger(num) || num < min || num > max) {
    return null;
  }

  return num;
}

/**
 * Sanitize URL input
 * @param url - URL string
 * @param allowedProtocols - Allowed URL protocols (default: ['http:', 'https:'])
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(
  url: string,
  allowedProtocols: string[] = ['http:', 'https:']
): string | null {
  if (typeof url !== 'string') {
    return null;
  }

  try {
    const parsed = new URL(url.trim());

    // Check protocol is allowed
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize account name (for HD wallet accounts)
 * @param name - Account name
 * @param maxLength - Maximum name length (default: 50)
 * @returns Sanitized name or null if invalid
 */
export function sanitizeAccountName(name: string, maxLength: number = 50): string | null {
  if (typeof name !== 'string') {
    return null;
  }

  const trimmed = name.trim();

  // Must not be empty
  if (trimmed.length === 0) {
    return null;
  }

  // Must not exceed max length
  if (trimmed.length > maxLength) {
    return null;
  }

  // Allow alphanumeric, spaces, and common punctuation
  if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(trimmed)) {
    return null;
  }

  return sanitizeString(trimmed);
}
