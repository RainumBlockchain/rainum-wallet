/**
 * WebAuthn Manager
 * Handles biometric authentication using WebAuthn/FIDO2 standard
 *
 * Supports:
 * - Touch ID (macOS/iOS)
 * - Face ID (iOS)
 * - Windows Hello
 * - Fingerprint sensors (Android)
 * - Hardware security keys (YubiKey)
 */

import { toast } from './toast-store';

/**
 * Check if WebAuthn is supported in the current browser
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    navigator.credentials !== undefined
  );
}

/**
 * Check if platform authenticator (biometrics) is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.error('Failed to check platform authenticator:', error);
    return false;
  }
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate random challenge for WebAuthn
 */
function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * WebAuthn Credential stored in localStorage
 */
export interface StoredWebAuthnCredential {
  credentialId: string; // Base64 encoded
  publicKey: string; // Base64 encoded
  address: string; // Wallet address associated with this credential
  createdAt: number;
  lastUsed: number;
}

/**
 * Register a new WebAuthn credential (biometric)
 * Called during wallet creation
 *
 * @param address - Wallet address to associate with this credential
 * @param walletName - Display name for the wallet
 * @returns Credential ID or null if failed
 */
export async function registerWebAuthnCredential(
  address: string,
  walletName: string = 'Rainum Wallet'
): Promise<string | null> {
  if (!isWebAuthnSupported()) {
    toast.error('WebAuthn Not Supported', 'Your browser does not support biometric authentication');
    return null;
  }

  try {
    const challenge = generateChallenge();

    // Create credential options
    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'Rainum Wallet',
        id: window.location.hostname, // e.g., "localhost" or "wallet.rainum.io"
      },
      user: {
        id: new TextEncoder().encode(address),
        name: address,
        displayName: walletName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256 (ECDSA with SHA-256)
        { type: 'public-key', alg: -257 }, // RS256 (RSA with SHA-256)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Force platform authenticator (biometrics)
        userVerification: 'required', // Require biometric verification
        requireResidentKey: false,
      },
      timeout: 60000, // 60 seconds
      attestation: 'none', // We don't need attestation for a wallet
    };

    // Show browser biometric prompt
    const credential = (await navigator.credentials.create({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      toast.error('Registration Failed', 'Failed to create biometric credential');
      return null;
    }

    // Extract credential data
    const response = credential.response as AuthenticatorAttestationResponse;
    const credentialId = arrayBufferToBase64(credential.rawId);
    const publicKey = arrayBufferToBase64(response.getPublicKey()!);

    // Store credential in localStorage
    const storedCredential: StoredWebAuthnCredential = {
      credentialId,
      publicKey,
      address,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };

    localStorage.setItem('webauthn_credential', JSON.stringify(storedCredential));

    toast.success('Biometric Registered', 'Your biometric authentication has been set up');
    return credentialId;
  } catch (error: any) {
    console.error('WebAuthn registration failed:', error);

    // Handle common errors
    if (error.name === 'NotAllowedError') {
      toast.error('Registration Cancelled', 'Biometric registration was cancelled');
    } else if (error.name === 'InvalidStateError') {
      toast.warning('Already Registered', 'This device is already registered');
    } else {
      toast.error('Registration Failed', error.message || 'Failed to register biometric');
    }

    return null;
  }
}

/**
 * Authenticate using WebAuthn credential (biometric)
 * Called during wallet unlock
 *
 * @returns Wallet address if successful, null if failed
 */
export async function authenticateWithWebAuthn(): Promise<string | null> {
  if (!isWebAuthnSupported()) {
    toast.error('WebAuthn Not Supported', 'Your browser does not support biometric authentication');
    return null;
  }

  // Load stored credential
  const credentialData = localStorage.getItem('webauthn_credential');
  if (!credentialData) {
    toast.error('No Credential Found', 'Please create a wallet first');
    return null;
  }

  try {
    const storedCredential: StoredWebAuthnCredential = JSON.parse(credentialData);
    const challenge = generateChallenge();

    // Create authentication options
    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [
        {
          type: 'public-key',
          id: base64ToArrayBuffer(storedCredential.credentialId),
          transports: ['internal'], // Platform authenticator
        },
      ],
      userVerification: 'required', // Require biometric verification
      timeout: 60000, // 60 seconds
    };

    // Show browser biometric prompt
    const assertion = (await navigator.credentials.get({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;

    if (!assertion) {
      toast.error('Authentication Failed', 'Failed to authenticate with biometric');
      return null;
    }

    // Update last used timestamp
    storedCredential.lastUsed = Date.now();
    localStorage.setItem('webauthn_credential', JSON.stringify(storedCredential));

    toast.success('Authenticated', 'Biometric authentication successful');
    return storedCredential.address;
  } catch (error: any) {
    console.error('WebAuthn authentication failed:', error);

    // Handle common errors
    if (error.name === 'NotAllowedError') {
      toast.error('Authentication Cancelled', 'Biometric authentication was cancelled');
    } else if (error.name === 'InvalidStateError') {
      toast.error('Invalid Credential', 'Please re-register your biometric');
    } else {
      toast.error('Authentication Failed', error.message || 'Failed to authenticate');
    }

    return null;
  }
}

/**
 * Check if WebAuthn credential exists
 */
export function hasWebAuthnCredential(): boolean {
  return localStorage.getItem('webauthn_credential') !== null;
}

/**
 * Get stored WebAuthn credential
 */
export function getWebAuthnCredential(): StoredWebAuthnCredential | null {
  const credentialData = localStorage.getItem('webauthn_credential');
  if (!credentialData) {
    return null;
  }

  try {
    return JSON.parse(credentialData);
  } catch (error) {
    console.error('Failed to parse WebAuthn credential:', error);
    return null;
  }
}

/**
 * Delete WebAuthn credential
 */
export function deleteWebAuthnCredential(): void {
  localStorage.removeItem('webauthn_credential');
}

/**
 * Get user-friendly biometric name based on platform
 */
export function getBiometricName(): string {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('mac') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
    // Apple devices
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'Face ID or Touch ID';
    }
    return 'Touch ID';
  } else if (userAgent.includes('windows')) {
    return 'Windows Hello';
  } else if (userAgent.includes('android')) {
    return 'Fingerprint or Face Unlock';
  } else {
    return 'Biometric';
  }
}
