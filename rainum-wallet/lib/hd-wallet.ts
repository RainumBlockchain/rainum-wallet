import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from 'bip39';
import nacl from 'tweetnacl';
import { deriveAddressFromPublicKey } from './crypto';

/**
 * HD Wallet implementation for Ed25519 using BIP32
 * Derivation path: m/44'/60'/0'/0/{index}
 * - 44' = BIP44
 * - 60' = Ethereum coin type (we use same for compatibility)
 * - 0' = Account 0 (hardened)
 * - 0 = External chain
 * - index = Account index (0, 1, 2, ...)
 */

export interface DerivedAccount {
  index: number;
  address: string;
  publicKey: Uint8Array;
  privateKey: Uint8Array; // 32-byte seed for Ed25519
}

/**
 * Securely clear sensitive data from memory by zeroing out the buffer
 * This prevents private keys from lingering in memory after use
 * @param buffer - Uint8Array containing sensitive data (e.g., private keys, seeds)
 */
export function securelyWipeMemory(buffer: Uint8Array): void {
  if (!buffer || buffer.length === 0) return;

  // Overwrite all bytes with zeros
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = 0;
  }

  // Note: In JavaScript, we can't force garbage collection or guarantee
  // memory is immediately freed, but zeroing prevents the data from being
  // readable if the memory is accessed later
}

/**
 * Derive HD wallet master key from mnemonic
 */
export function getMasterKeyFromMnemonic(mnemonic: string): HDKey {
  const seed = mnemonicToSeedSync(mnemonic, '');

  // 🔒 CRITICAL SECURITY: Wipe seed after deriving master key
  try {
    const masterKey = HDKey.fromMasterSeed(seed);
    return masterKey;
  } finally {
    // Wipe the full BIP39 seed from memory
    if (seed instanceof Buffer) {
      seed.fill(0);
    } else if (seed instanceof Uint8Array) {
      for (let i = 0; i < seed.length; i++) {
        seed[i] = 0;
      }
    }
  }
}

/**
 * Derive account at specific index from mnemonic
 * Path: m/44'/60'/0'/0/{index}
 */
export function deriveAccountFromMnemonic(
  mnemonic: string,
  index: number
): DerivedAccount {
  const masterKey = getMasterKeyFromMnemonic(mnemonic);
  return deriveAccountFromMasterKey(masterKey, index);
}

/**
 * Derive account at specific index from master key
 */
export function deriveAccountFromMasterKey(
  masterKey: HDKey,
  index: number
): DerivedAccount {
  // 🔒 SECURITY: Validate account index bounds (prevent overflow/underflow)
  if (!Number.isInteger(index)) {
    throw new Error('Account index must be an integer');
  }

  if (index < 0) {
    throw new Error('Account index must be non-negative');
  }

  // BIP44 specifies index range 0 to 2^31 - 1 (non-hardened)
  const MAX_INDEX = 2147483647; // 2^31 - 1
  if (index > MAX_INDEX) {
    throw new Error(`Account index must not exceed ${MAX_INDEX}`);
  }

  // Derivation path: m/44'/60'/0'/0/{index}
  const path = `m/44'/60'/0'/0/${index}`;
  const derived = masterKey.derive(path);

  if (!derived.privateKey) {
    throw new Error('Failed to derive private key');
  }

  // For Ed25519, we use the derived private key as seed
  const privateKeySeed = derived.privateKey.slice(0, 32);

  // Generate Ed25519 keypair from seed
  const keypair = nacl.sign.keyPair.fromSeed(privateKeySeed);

  // Derive address from public key
  const address = deriveAddressFromPublicKey(keypair.publicKey);

  return {
    index,
    address,
    publicKey: keypair.publicKey,
    privateKey: keypair.secretKey, // 64-byte secret key (seed + public key)
  };
}

/**
 * Derive multiple accounts from mnemonic
 */
export function deriveMultipleAccounts(
  mnemonic: string,
  count: number
): DerivedAccount[] {
  const masterKey = getMasterKeyFromMnemonic(mnemonic);
  const accounts: DerivedAccount[] = [];

  for (let i = 0; i < count; i++) {
    accounts.push(deriveAccountFromMasterKey(masterKey, i));
  }

  return accounts;
}

/**
 * Get next account index (for creating new accounts)
 */
export function getNextAccountIndex(existingAccounts: { index: number }[]): number {
  if (existingAccounts.length === 0) return 0;
  const maxIndex = Math.max(...existingAccounts.map(a => a.index));
  return maxIndex + 1;
}
