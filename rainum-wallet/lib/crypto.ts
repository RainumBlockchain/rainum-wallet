import { sha256 } from '@noble/hashes/sha2.js';
import { validateMnemonic, mnemonicToSeedSync } from 'bip39';
import nacl from 'tweetnacl';
// All amounts are now in RAIN directly (no micro-RAIN conversion)

/**
 * Derive Ed25519 private key from mnemonic using BIP39
 * MATCHES Rust implementation: mnemonic.to_seed("") -> first 32 bytes
 *
 * SECURITY NOTE: Caller must securely wipe the returned key from memory after use
 * using securelyWipeMemory() from hd-wallet.ts
 */
export function derivePrivateKeyFromMnemonic(mnemonic: string): Uint8Array {
  // Validate mnemonic
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }

  // Convert mnemonic to seed (BIP39 standard, empty passphrase)
  const seed = mnemonicToSeedSync(mnemonic, '');

  // 🔒 CRITICAL SECURITY: Use try-finally to ensure seed is ALWAYS wiped
  try {
    // Take first 32 bytes as Ed25519 seed (matches Rust)
    const privateKeySeed = new Uint8Array(seed.slice(0, 32));

    try {
      // TweetNaCl requires 64-byte secret key, generate from 32-byte seed
      const keypair = nacl.sign.keyPair.fromSeed(privateKeySeed);

      // Return the full 64-byte secret key (seed + public key)
      return keypair.secretKey;
    } finally {
      // SECURITY: Clear the intermediate 32-byte seed
      for (let i = 0; i < privateKeySeed.length; i++) {
        privateKeySeed[i] = 0;
      }
    }
  } finally {
    // 🔒 CRITICAL FIX: Wipe the FULL 64-byte BIP39 seed buffer
    // Previously only wiped first 32 bytes, leaving 32 bytes exposed
    if (seed instanceof Buffer) {
      seed.fill(0);
    } else if (seed instanceof Uint8Array) {
      for (let i = 0; i < seed.length; i++) {
        seed[i] = 0;
      }
    } else {
      // Fallback for unknown buffer types
      const seedArray = new Uint8Array(seed);
      for (let i = 0; i < seedArray.length; i++) {
        seedArray[i] = 0;
      }
    }
  }
}

/**
 * Get Ed25519 public key from private key (64-byte secret key)
 */
export async function getPublicKey(secretKey: Uint8Array): Promise<Uint8Array> {
  // TweetNaCl secret key is 64 bytes: [32-byte seed][32-byte public key]
  // Extract public key (last 32 bytes)
  return secretKey.slice(32, 64);
}

/**
 * Create transaction signing message that matches Rust implementation
 * MATCHES Dashboard implementation exactly (all u64)
 *
 * Rust code (persistence.rs:167-173):
 * hasher.update(tx.from.as_bytes());
 * hasher.update(tx.to.as_bytes());
 * hasher.update(&tx.amount.to_le_bytes());      // u64 little-endian
 * hasher.update(&tx.timestamp.to_le_bytes());   // u64 little-endian
 * hasher.update(&tx.nonce.to_le_bytes());       // u64 little-endian
 * hasher.update(&tx.gas_price.to_le_bytes());   // u64 little-endian
 * hasher.update(&tx.gas_limit.to_le_bytes());   // u64 little-endian
 */
function createTransactionMessage(
  from: string,
  to: string,
  amount: string,
  timestamp: number,
  nonce: number,
  gasPrice: number,
  gasLimit: number
): Uint8Array {
  // Create buffers for each field - MATCHING Dashboard implementation exactly
  const encoder = new TextEncoder();

  // 1. from address (UTF-8 bytes)
  const fromBytes = encoder.encode(from);

  // 2. to address (UTF-8 bytes)
  const toBytes = encoder.encode(to);

  // 3-7. All numeric fields as u64 little-endian (matching Dashboard)
  const buffer = new ArrayBuffer(8 * 5); // 5 u64 fields
  const view = new DataView(buffer);

  // Amount is already in RAIN (parseFloat handles string amounts)
  // Round to whole RAIN tokens since blockchain uses u64 (no decimals)
  const amountInRain = Math.floor(parseFloat(amount));
  view.setBigUint64(0, BigInt(amountInRain), true);      // amount as u64 RAIN
  view.setBigUint64(8, BigInt(timestamp), true);   // timestamp as u64
  view.setBigUint64(16, BigInt(nonce), true);      // nonce as u64
  view.setBigUint64(24, BigInt(gasPrice), true);   // gas_price as u64 RAIN
  view.setBigUint64(32, BigInt(gasLimit), true);   // gas_limit as u64

  // Concatenate: from + to + buffer (matching Dashboard exactly)
  const messageData = new Uint8Array([
    ...fromBytes,
    ...toBytes,
    ...new Uint8Array(buffer),
  ]);

  // SHA256 hash (matches Rust's Sha256::new() -> finalize())
  const hash = sha256(messageData);
  return hash;
}

/**
 * Sign transaction data with Ed25519 private key using TweetNaCl
 * Matches Rust blockchain's signature verification
 *
 * SECURITY NOTE: Caller must securely wipe the secretKey from memory after use
 * using securelyWipeMemory() from hd-wallet.ts
 */
export async function signTransaction(
  secretKey: Uint8Array,
  from: string,
  to: string,
  amount: string,
  nonce: number,
  timestamp: number,
  gasPrice: number = 0.0,
  gasLimit: number = 21000
): Promise<{ signature: string; publicKey: string }> {
  // Create signing message (SHA256 hash of transaction data)
  const message = createTransactionMessage(
    from,
    to,
    amount,
    timestamp,
    nonce,
    gasPrice,
    gasLimit
  );

  // Sign the HASHED message with TweetNaCl (detached signature)
  const signature = nacl.sign.detached(message, secretKey);

  // Get public key from secret key
  const publicKey = await getPublicKey(secretKey);

  // SECURITY: Clear sensitive message buffer from memory
  for (let i = 0; i < message.length; i++) {
    message[i] = 0;
  }

  return {
    signature: bytesToHex(signature),
    publicKey: bytesToHex(publicKey),
  };
}

/**
 * Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derive wallet address from public key
 * MATCHES Rust implementation: 0x + first 20 bytes of SHA256(public_key)
 */
export function deriveAddressFromPublicKey(publicKey: Uint8Array): string {
  const hash = sha256(publicKey);
  const addressBytes = hash.slice(0, 20);
  return '0x' + bytesToHex(addressBytes);
}

/**
 * Verify Ed25519 signature using TweetNaCl (for testing)
 */
export async function verifySignature(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array
): Promise<boolean> {
  return nacl.sign.detached.verify(message, signature, publicKey);
}
