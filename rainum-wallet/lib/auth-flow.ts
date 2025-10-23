/**
 * Authentication Flow Manager
 * Complete authentication flows for wallet creation, login, and logout
 */

import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useWalletStore } from './wallet-store';
import { sessionManager } from './session-manager';
import { saveWallet, loadWallet, hasStoredWallet, deleteWallet } from './auth-manager';
import { createWallet as createWalletAPI, loginWallet as loginWalletAPI } from './rainum-api';
import { toast } from './toast-store';
import {
  registerWebAuthnCredential,
  authenticateWithWebAuthn,
  hasWebAuthnCredential,
  deleteWebAuthnCredential,
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  getBiometricName,
} from './webauthn-manager';
import {
  isLoginBlocked,
  recordFailedAttempt,
  resetAttempts,
  getRemainingAttempts,
  getLockoutTimeRemainingFormatted,
} from './login-rate-limiter';
import { logAuditEvent } from './audit-log';

/**
 * Handle wallet creation with WebAuthn biometric authentication
 * @param password - User's password for encrypting mnemonic (fallback)
 * @param router - Next.js router for navigation
 * @param useWebAuthn - Whether to use WebAuthn biometric (default: true)
 */
export async function handleCreateWallet(
  password: string,
  router: AppRouterInstance,
  useWebAuthn: boolean = true,
  skipExistenceCheck: boolean = false
): Promise<void> {
  try {
    // Validate password
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Check if wallet already exists (unless we're overwriting)
    if (!skipExistenceCheck && hasStoredWallet()) {
      // Throw a special error to be handled by the UI
      const error = new Error('WALLET_EXISTS') as Error & { code: string; action: 'create' };
      error.code = 'WALLET_EXISTS';
      error.action = 'create';
      throw error;
    }

    toast.info('Creating Wallet', 'Generating secure wallet...');

    // 1. Generate wallet from backend (gets mnemonic + address)
    const { address, mnemonic } = await createWalletAPI();

    // 2. Save encrypted wallet to localStorage (password fallback)
    saveWallet(address, mnemonic, password);

    // 3. Register WebAuthn credential if supported and enabled
    if (useWebAuthn && isWebAuthnSupported()) {
      const isAvailable = await isPlatformAuthenticatorAvailable();
      if (isAvailable) {
        const biometricName = getBiometricName();
        toast.info('Setup Biometrics', `Please authenticate with ${biometricName}`);

        const credentialId = await registerWebAuthnCredential(address, `Rainum Wallet (${address.slice(0, 8)}...)`);

        if (!credentialId) {
          toast.warning('Biometric Setup Skipped', 'You can still login with password');
        }
      }
    }

    // 4. Create session (await for HttpOnly cookie)
    const sessionToken = await sessionManager.createSession(address);

    // 5. Update wallet store (in-memory state)
    useWalletStore.getState().connect(address, mnemonic, password);

    // 6. Start session monitoring
    sessionManager.startSessionMonitoring(() => {
      handleAutoLogout(router);
    });

    // Log wallet creation
    logAuditEvent(
      'wallet_created',
      'account',
      'New wallet created',
      { address }
    );

    toast.success('Wallet Created', 'Your wallet has been created successfully');

    // 7. Navigate to dashboard (replace to prevent back button to login)
    router.replace('/dashboard');
  } catch (error: any) {
    console.error('Wallet creation failed:', error);
    toast.error('Wallet Creation Failed', error.message || 'Failed to create wallet');
    throw error;
  }
}

/**
 * Handle wallet import with WebAuthn biometric authentication
 * @param mnemonic - BIP39 mnemonic phrase to import
 * @param password - User's password for encrypting mnemonic
 * @param router - Next.js router for navigation
 * @param useWebAuthn - Whether to use WebAuthn biometric (default: true)
 */
export async function handleImportWallet(
  mnemonic: string,
  password: string,
  router: AppRouterInstance,
  useWebAuthn: boolean = true,
  skipExistenceCheck: boolean = false
): Promise<void> {
  try {
    // Validate inputs
    if (!mnemonic || !password) {
      throw new Error('Mnemonic and password are required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    toast.info('Importing Wallet', 'Validating mnemonic...');

    // 1. Validate mnemonic and get address from backend
    const { address } = await loginWalletAPI(mnemonic);

    // Check if wallet already exists (unless we're overwriting)
    if (!skipExistenceCheck && hasStoredWallet()) {
      // Load the existing wallet to check if it's the same
      const storedWalletData = localStorage.getItem('wallet');
      if (storedWalletData) {
        const storedWallet = JSON.parse(storedWalletData);

        // If it's the SAME wallet (same address), just re-import it (e.g., after auto-logout)
        if (storedWallet.address.toLowerCase() === address.toLowerCase()) {
          console.log('🔄 Re-importing same wallet after logout - skipping existence check');
          // Continue with import - this is the same wallet, not an overwrite
        } else {
          // Different wallet - throw error to show overwrite dialog
          const error = new Error('WALLET_EXISTS') as Error & { code: string; action: 'import'; mnemonic: string; password: string };
          error.code = 'WALLET_EXISTS';
          error.action = 'import';
          error.mnemonic = mnemonic;
          error.password = password;
          throw error;
        }
      }
    }

    // 2. Save encrypted wallet to localStorage
    saveWallet(address, mnemonic, password);

    // 3. Register WebAuthn credential if supported and enabled
    if (useWebAuthn && isWebAuthnSupported()) {
      const isAvailable = await isPlatformAuthenticatorAvailable();
      if (isAvailable) {
        const biometricName = getBiometricName();
        toast.info('Setup Biometrics', `Please authenticate with ${biometricName}`);

        const credentialId = await registerWebAuthnCredential(address, `Rainum Wallet (${address.slice(0, 8)}...)`);

        if (!credentialId) {
          toast.warning('Biometric Setup Skipped', 'You can still login with password');
        }
      }
    }

    // 4. Create session (await for HttpOnly cookie)
    await sessionManager.createSession(address);

    // 5. Update wallet store
    useWalletStore.getState().connect(address, mnemonic, password);

    // 6. Start session monitoring
    sessionManager.startSessionMonitoring(() => {
      handleAutoLogout(router);
    });

    // Log wallet import
    logAuditEvent(
      'wallet_imported',
      'account',
      'Wallet imported from seed phrase',
      { address }
    );

    toast.success('Wallet Imported', 'Your wallet has been imported successfully');

    // 7. Navigate to dashboard
    router.replace('/dashboard');
  } catch (error: any) {
    console.error('Wallet import failed:', error);
    toast.error('Import Failed', error.message || 'Failed to import wallet');
    throw error;
  }
}

/**
 * Overwrite existing wallet and create new one
 * Used when user confirms they want to replace existing wallet
 */
export async function overwriteAndCreateWallet(
  password: string,
  router: AppRouterInstance,
  useWebAuthn: boolean = true
): Promise<void> {
  // Delete existing wallet
  deleteWallet();
  deleteWebAuthnCredential();

  // Now create new wallet (skip existence check)
  await handleCreateWallet(password, router, useWebAuthn, true);
}

/**
 * Overwrite existing wallet and import provided one
 * Used when user confirms they want to replace existing wallet
 */
export async function overwriteAndImportWallet(
  mnemonic: string,
  password: string,
  router: AppRouterInstance,
  useWebAuthn: boolean = true
): Promise<void> {
  // Delete existing wallet
  deleteWallet();
  deleteWebAuthnCredential();

  // Now import wallet (skip existence check)
  await handleImportWallet(mnemonic, password, router, useWebAuthn, true);
}

/**
 * Handle user login with WebAuthn biometric (preferred) or password fallback
 * @param password - User's password (optional if using WebAuthn)
 * @param router - Next.js router for navigation
 * @param redirectTo - Optional path to redirect after login
 * @param useWebAuthn - Whether to try WebAuthn first (default: true)
 */
export async function handleLogin(
  password: string | null,
  router: AppRouterInstance,
  redirectTo?: string,
  useWebAuthn: boolean = true
): Promise<void> {
  try {
    // Check if login is blocked due to too many failed attempts
    if (isLoginBlocked()) {
      const timeRemaining = getLockoutTimeRemainingFormatted();
      logAuditEvent(
        'login_blocked',
        'security',
        'Login attempt blocked due to rate limiting',
        { timeRemaining }
      );
      throw new Error(`Too many failed login attempts. Please try again in ${timeRemaining}.`);
    }

    // Check if wallet exists
    if (!hasStoredWallet()) {
      throw new Error('No wallet found. Please create or import a wallet first.');
    }

    let wallet: { address: string; mnemonic: string } | null = null;
    let passwordFailed = false;

    // Try WebAuthn first if available and enabled
    if (useWebAuthn && hasWebAuthnCredential()) {
      const biometricName = getBiometricName();
      toast.info('Authenticating', `Please authenticate with ${biometricName}`);

      const address = await authenticateWithWebAuthn();

      if (address) {
        // WebAuthn success - now we need to decrypt the wallet with a temporary session
        // Since we don't have the password, we'll need to prompt for it OR
        // store the encrypted mnemonic separately with WebAuthn credential
        // For now, we'll require password as fallback for decryption
        if (!password) {
          throw new Error('Password required for wallet decryption');
        }

        wallet = loadWallet(password);
        if (!wallet || wallet.address !== address) {
          passwordFailed = true;
          recordFailedAttempt();
          const remaining = getRemainingAttempts();
          logAuditEvent(
            'login_failed',
            'security',
            `Failed login attempt (WebAuthn + password). ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`,
            { address, remainingAttempts: remaining }
          );
          if (remaining > 0) {
            throw new Error(`Invalid password or wallet mismatch. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
          } else {
            const timeRemaining = getLockoutTimeRemainingFormatted();
            throw new Error(`Account locked due to too many failed attempts. Try again in ${timeRemaining}.`);
          }
        }
      } else {
        // WebAuthn failed, fall back to password
        toast.info('Biometric Failed', 'Falling back to password authentication');
      }
    }

    // If WebAuthn didn't work or wasn't available, use password
    if (!wallet) {
      if (!password) {
        throw new Error('Password is required');
      }

      toast.info('Logging In', 'Decrypting wallet...');

      wallet = loadWallet(password);

      if (!wallet) {
        passwordFailed = true;
        recordFailedAttempt();
        const remaining = getRemainingAttempts();
        logAuditEvent(
          'login_failed',
          'security',
          `Failed login attempt (password only). ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`,
          { remainingAttempts: remaining }
        );
        if (remaining > 0) {
          throw new Error(`Invalid password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
        } else {
          const timeRemaining = getLockoutTimeRemainingFormatted();
          throw new Error(`Account locked due to too many failed attempts. Try again in ${timeRemaining}.`);
        }
      }
    }

    // Login successful - reset attempts
    resetAttempts();

    // Log successful login
    logAuditEvent(
      'login_success',
      'security',
      'User logged in successfully',
      { address: wallet.address }
    );

    // 2. Create session (await for HttpOnly cookie)
    await sessionManager.createSession(wallet.address);

    // 2. Update wallet store (password available from wallet.password)
    useWalletStore.getState().connect(wallet.address, wallet.mnemonic, password);

    // 4. Start session monitoring
    sessionManager.startSessionMonitoring(() => {
      handleAutoLogout(router);
    });

    toast.success('Welcome Back', 'Successfully logged in');

    // 5. Navigate to dashboard or redirectTo path
    const destination = redirectTo || '/dashboard';
    router.replace(destination);
  } catch (error: any) {
    console.error('Login failed:', error);
    toast.error('Login Failed', error.message || 'Failed to login');
    throw error;
  }
}

/**
 * Handle biometric-only login (no password required)
 * This works by storing the encrypted mnemonic with the WebAuthn credential
 * @param router - Next.js router for navigation
 * @param redirectTo - Optional path to redirect after login
 */
export async function handleBiometricLogin(
  router: AppRouterInstance,
  redirectTo?: string
): Promise<void> {
  try {
    // Check if WebAuthn credential exists
    if (!hasWebAuthnCredential()) {
      throw new Error('No biometric credential found. Please login with password first.');
    }

    const biometricName = getBiometricName();
    toast.info('Authenticating', `Please authenticate with ${biometricName}`);

    // Authenticate with WebAuthn
    const address = await authenticateWithWebAuthn();

    if (!address) {
      throw new Error('Biometric authentication failed');
    }

    // For security, we still need the password to decrypt the mnemonic
    // In a production system, you might use WebAuthn to encrypt/decrypt the mnemonic
    // For now, we'll require password after biometric for full access
    throw new Error('Password required after biometric authentication');
  } catch (error: any) {
    console.error('Biometric login failed:', error);
    toast.error('Login Failed', error.message || 'Failed to authenticate');
    throw error;
  }
}

/**
 * Handle user logout
 * @param router - Next.js router for navigation
 * @param skipConfirmation - Skip confirmation dialog
 */
export async function handleLogout(
  router: AppRouterInstance,
  skipConfirmation: boolean = false
): Promise<boolean> {
  try {
    // Return false to request confirmation (unless skipped)
    if (!skipConfirmation) {
      return false;
    }

    // Get address before disconnecting for audit log
    const address = useWalletStore.getState().address;

    // 1. Stop session monitoring
    sessionManager.stopSessionMonitoring();

    // 2. Destroy session (manual logout, await for HttpOnly cookie clear)
    await sessionManager.destroySession(true);

    // 3. Clear wallet store
    useWalletStore.getState().disconnect();

    // Log logout
    logAuditEvent(
      'logout',
      'security',
      'User logged out',
      { address }
    );

    // Note: We keep WebAuthn credential for future logins
    // User can manually delete it from settings if needed

    toast.success('Logged Out', 'You have been logged out successfully');

    // 4. Navigate to login page (replace to clear history)
    router.replace('/');
    return true;
  } catch (error: any) {
    console.error('Logout failed:', error);
    toast.error('Logout Failed', error.message || 'Failed to logout');
    return false;
  }
}

/**
 * Handle automatic logout (session timeout or multi-tab logout)
 * @param router - Next.js router for navigation
 */
export async function handleAutoLogout(router: AppRouterInstance): Promise<void> {
  // Get address before disconnecting for audit log
  const address = useWalletStore.getState().address;

  // Silent logout (no confirmation)
  sessionManager.stopSessionMonitoring();
  await sessionManager.destroySession(false); // auto-logout, not manual
  useWalletStore.getState().disconnect();

  // Log session expiration
  logAuditEvent(
    'session_expired',
    'security',
    'Session expired due to inactivity',
    { address }
  );

  // Navigate to login
  router.replace('/');

  // Toast is shown by session manager
}

/**
 * Check if user is currently authenticated
 * @returns True if user has valid session
 */
export function isAuthenticated(): boolean {
  return sessionManager.validateSession();
}

/**
 * Get current session info
 * @returns Session data or null
 */
export function getCurrentSession() {
  return sessionManager.getSession();
}

/**
 * Extend current session (reset timeout)
 */
export function extendCurrentSession(): void {
  sessionManager.extendSession();
}
