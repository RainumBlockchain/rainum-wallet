/**
 * Authentication Manager
 * Handles encryption/decryption of sensitive data (mnemonics)
 */

import CryptoJS from 'crypto-js';

/**
 * PBKDF2 configuration constants (OWASP recommendations)
 */
const PBKDF2_ITERATIONS = 100000; // 100,000 iterations minimum
const KEY_SIZE = 256 / 32; // 256-bit key (8 words)
const SALT_SIZE = 128 / 8; // 128-bit salt (16 bytes)

/**
 * Encrypt mnemonic with user password using AES-256 and PBKDF2
 * @param mnemonic - The BIP39 mnemonic phrase
 * @param password - User's password (used as encryption key)
 * @returns Object with encrypted data and salt
 */
export function encryptMnemonic(mnemonic: string, password: string): { encrypted: string; salt: string } {
  if (!mnemonic || !password) {
    throw new Error('Mnemonic and password are required');
  }

  try {
    // Generate random salt for PBKDF2
    const salt = CryptoJS.lib.WordArray.random(SALT_SIZE);

    // Derive key from password using PBKDF2 with high iteration count
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: KEY_SIZE,
      iterations: PBKDF2_ITERATIONS
    });

    // Convert key to base64 string for CryptoJS.AES.encrypt
    // CryptoJS.AES.encrypt works best with string keys and handles IV automatically
    const keyString = key.toString(CryptoJS.enc.Base64);

    // Encrypt mnemonic with derived key (uses AES-256-CBC with auto IV)
    const encrypted = CryptoJS.AES.encrypt(mnemonic, keyString);

    const encryptedString = encrypted.toString();
    const saltString = salt.toString();

    if (!encryptedString || !saltString) {
      throw new Error('Encryption failed - invalid output');
    }

    return {
      encrypted: encryptedString,
      salt: saltString
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error(`Failed to encrypt wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt mnemonic with user password
 * @param encryptedMnemonic - The encrypted mnemonic string
 * @param password - User's password
 * @param salt - The salt used during encryption
 * @returns Decrypted mnemonic or null if password is incorrect
 */
export function decryptMnemonic(encryptedMnemonic: string, password: string, salt: string): string | null {
  if (!encryptedMnemonic || !password || !salt) {
    return null;
  }

  try {
    // Parse salt from hex string
    const saltWordArray = CryptoJS.enc.Hex.parse(salt);

    // Derive same key from password using stored salt
    const key = CryptoJS.PBKDF2(password, saltWordArray, {
      keySize: KEY_SIZE,
      iterations: PBKDF2_ITERATIONS
    });

    // Convert key to base64 string to match encryption
    const keyString = key.toString(CryptoJS.enc.Base64);

    // Decrypt mnemonic with derived key (AES-256-CBC with auto IV extraction)
    const decrypted = CryptoJS.AES.decrypt(encryptedMnemonic, keyString);

    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

    // If password is wrong, decryption returns empty string
    if (!decryptedString || decryptedString.length === 0) {
      return null;
    }

    return decryptedString;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

/**
 * Create SHA-256 hash of mnemonic for validation
 * Used to verify that decrypted mnemonic is correct
 * @param mnemonic - The BIP39 mnemonic phrase
 * @returns Hex-encoded hash
 */
export function hashMnemonic(mnemonic: string): string {
  if (!mnemonic) {
    throw new Error('Mnemonic is required');
  }

  // Use CryptoJS SHA256 instead
  return CryptoJS.SHA256(mnemonic).toString();
}

/**
 * Validate that a mnemonic matches its hash
 * @param mnemonic - The mnemonic to validate
 * @param hash - The expected hash
 * @returns True if mnemonic is valid
 */
export function validateMnemonicHash(mnemonic: string, hash: string): boolean {
  if (!mnemonic || !hash) {
    return false;
  }

  return hashMnemonic(mnemonic) === hash;
}

/**
 * Wallet data structure stored in localStorage
 */
export interface StoredWallet {
  address: string;
  encryptedMnemonic: string;
  salt: string; // PBKDF2 salt for key derivation
  mnemonicHash: string;
  createdAt: number;
  version?: number; // For future migration support
}

/**
 * Save encrypted wallet to localStorage
 * @param address - Wallet address
 * @param mnemonic - Plain text mnemonic
 * @param password - User's password for encryption
 */
export function saveWallet(address: string, mnemonic: string, password: string): void {
  // SECURITY: Validate inputs (async import to avoid circular dependencies)
  if (!address || typeof address !== 'string') {
    throw new Error('Invalid wallet address');
  }

  if (!mnemonic || typeof mnemonic !== 'string') {
    throw new Error('Invalid mnemonic phrase');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const { encrypted, salt } = encryptMnemonic(mnemonic, password);
  const mnemonicHash = hashMnemonic(mnemonic);

  const wallet: StoredWallet = {
    address,
    encryptedMnemonic: encrypted,
    salt,
    mnemonicHash,
    createdAt: Date.now(),
    version: 2 // Version 2 uses PBKDF2 with 100k iterations
  };

  localStorage.setItem('wallet', JSON.stringify(wallet));
}

/**
 * Load and decrypt wallet from localStorage
 * @param password - User's password
 * @returns Decrypted wallet data or null if wrong password
 */
export function loadWallet(password: string): { address: string; mnemonic: string } | null {
  const walletData = localStorage.getItem('wallet');
  if (!walletData) {
    return null;
  }

  try {
    const wallet: StoredWallet = JSON.parse(walletData);

    let mnemonic: string | null = null;

    // Check wallet version for backward compatibility
    if (!wallet.version || wallet.version === 1 || !wallet.salt) {
      // Old version (v1): Use legacy CryptoJS.AES.decrypt (less secure)
      console.warn('⚠️ Loading wallet with legacy encryption. Please re-import to upgrade security.');
      try {
        const bytes = CryptoJS.AES.decrypt(wallet.encryptedMnemonic, password);
        mnemonic = bytes.toString(CryptoJS.enc.Utf8);
      } catch (error) {
        console.error('Legacy decryption failed:', error);
        return null;
      }
    } else {
      // New version (v2): Use PBKDF2 with salt
      mnemonic = decryptMnemonic(wallet.encryptedMnemonic, password, wallet.salt);
    }

    if (!mnemonic || mnemonic.length === 0) {
      return null; // Wrong password
    }

    // Validate decrypted mnemonic
    if (!validateMnemonicHash(mnemonic, wallet.mnemonicHash)) {
      console.error('Wallet data corrupted: hash mismatch');
      return null;
    }

    return {
      address: wallet.address,
      mnemonic
    };
  } catch (error) {
    console.error('Failed to load wallet:', error);
    return null;
  }
}

/**
 * Check if a wallet exists in localStorage
 * @returns True if wallet data exists
 */
export function hasStoredWallet(): boolean {
  return localStorage.getItem('wallet') !== null;
}

/**
 * Delete wallet from localStorage
 */
export function deleteWallet(): void {
  localStorage.removeItem('wallet');
}

/**
 * Change wallet password
 * @param oldPassword - Current password
 * @param newPassword - New password
 * @returns True if password was changed successfully
 */
export function changePassword(oldPassword: string, newPassword: string): boolean {
  // Validate new password
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters');
  }

  // Load wallet with old password
  const wallet = loadWallet(oldPassword);
  if (!wallet) {
    throw new Error('Incorrect current password');
  }

  // Re-encrypt with new password
  try {
    saveWallet(wallet.address, wallet.mnemonic, newPassword);
    return true;
  } catch (error) {
    console.error('Failed to change password:', error);
    throw new Error('Failed to update password');
  }
}

/**
 * Export encrypted wallet backup to JSON
 * @returns JSON string of encrypted wallet data
 */
export function exportWalletBackup(): string {
  const walletData = localStorage.getItem('wallet');
  if (!walletData) {
    throw new Error('No wallet found to export');
  }

  const wallet: StoredWallet = JSON.parse(walletData);

  // Create backup object with metadata
  const backup = {
    version: wallet.version || 2,
    address: wallet.address,
    encryptedMnemonic: wallet.encryptedMnemonic,
    salt: wallet.salt,
    mnemonicHash: wallet.mnemonicHash,
    createdAt: wallet.createdAt,
    exportedAt: Date.now(),
    backupVersion: '1.0.0',
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Verify wallet backup without importing
 * @param backupJson - JSON string of backup data
 * @param password - Password to verify the backup
 * @returns Object with verification result and details
 */
export function verifyWalletBackup(backupJson: string, password: string): {
  valid: boolean;
  address?: string;
  createdAt?: number;
  version?: number;
  error?: string;
} {
  try {
    const backup = JSON.parse(backupJson);

    // Validate backup structure
    if (!backup.address || !backup.encryptedMnemonic || !backup.mnemonicHash) {
      return {
        valid: false,
        error: 'Invalid backup file format - missing required fields',
      };
    }

    // Verify we can decrypt with the provided password
    const mnemonic = backup.salt
      ? decryptMnemonic(backup.encryptedMnemonic, password, backup.salt)
      : null;

    if (!mnemonic) {
      return {
        valid: false,
        error: 'Incorrect password for this backup',
      };
    }

    // Validate decrypted mnemonic
    if (!validateMnemonicHash(mnemonic, backup.mnemonicHash)) {
      return {
        valid: false,
        error: 'Backup data is corrupted - hash mismatch',
      };
    }

    // Backup is valid
    return {
      valid: true,
      address: backup.address,
      createdAt: backup.createdAt,
      version: backup.version || 1,
    };
  } catch (error) {
    console.error('Failed to verify backup:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to verify backup',
    };
  }
}

/**
 * Import encrypted wallet backup from JSON
 * @param backupJson - JSON string of backup data
 * @param password - Password to verify the backup
 * @returns True if import successful
 */
export function importWalletBackup(backupJson: string, password: string): boolean {
  try {
    const backup = JSON.parse(backupJson);

    // Validate backup structure
    if (!backup.address || !backup.encryptedMnemonic || !backup.mnemonicHash) {
      throw new Error('Invalid backup file format');
    }

    // Verify we can decrypt with the provided password
    const mnemonic = backup.salt
      ? decryptMnemonic(backup.encryptedMnemonic, password, backup.salt)
      : null;

    if (!mnemonic) {
      throw new Error('Incorrect password for this backup');
    }

    // Validate decrypted mnemonic
    if (!validateMnemonicHash(mnemonic, backup.mnemonicHash)) {
      throw new Error('Backup data is corrupted');
    }

    // Create wallet object
    const wallet: StoredWallet = {
      address: backup.address,
      encryptedMnemonic: backup.encryptedMnemonic,
      salt: backup.salt,
      mnemonicHash: backup.mnemonicHash,
      createdAt: backup.createdAt || Date.now(),
      version: backup.version || 2,
    };

    // Save to localStorage
    localStorage.setItem('wallet', JSON.stringify(wallet));
    return true;
  } catch (error) {
    console.error('Failed to import backup:', error);
    throw error;
  }
}

/**
 * Verify that a password is correct for the current wallet
 * @param password - Password to verify
 * @returns True if password is correct, false otherwise
 */
export function verifyPassword(password: string): boolean {
  const wallet = loadWallet(password);
  return wallet !== null;
}
