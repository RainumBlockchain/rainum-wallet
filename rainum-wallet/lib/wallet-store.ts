import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deriveAccountFromMnemonic, getNextAccountIndex } from './hd-wallet';

export interface WalletAccount {
  index: number;
  name: string;
  address: string;
  createdAt: number;
}

interface WalletState {
  // Legacy fields (for backward compatibility during migration)
  address: string | null;
  mnemonic: string | null;  // Kept in memory ONLY (not persisted to localStorage for security)
  encryptedMnemonic: string | null; // Encrypted mnemonic (persisted safely)
  mnemonicSalt: string | null; // Salt for decryption
  isConnected: boolean;
  balance: number;

  // New HD Wallet fields
  accounts: WalletAccount[];
  activeAccountIndex: number;

  // Actions
  connect: (address: string, mnemonic?: string, password?: string) => Promise<void>;
  disconnect: () => void;
  setBalance: (balance: number) => void;
  updateBalance: () => Promise<void>;
  unlockMnemonic: (password: string) => boolean;

  // New HD Wallet actions
  createAccount: (name?: string) => void;
  switchAccount: (index: number) => void;
  renameAccount: (index: number, name: string) => void;
  getActiveAccount: () => WalletAccount | null;
  getPrivateKey: (accountIndex: number) => Uint8Array | null;
  discoverAccounts: () => Promise<void>;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      address: null,
      mnemonic: null,
      encryptedMnemonic: null,
      mnemonicSalt: null,
      isConnected: false,
      balance: 0,
      accounts: [],
      activeAccountIndex: 0,

      connect: async (address: string, mnemonic?: string, password?: string) => {
        const state = get();

        // If mnemonic is provided, validate and initialize accounts
        if (mnemonic) {
          const derived = deriveAccountFromMnemonic(mnemonic, 0);

          // CRITICAL SECURITY FIX: Validate that existing accounts match this mnemonic
          let validAccounts = state.accounts;
          if (state.accounts.length > 0) {
            // Check if first account matches - if not, clear all accounts (prevent cross-wallet contamination)
            const firstAccount = state.accounts[0];
            if (firstAccount.address !== derived.address) {
              console.warn('⚠️ SECURITY: Detected accounts from different wallet - clearing stale data');
              validAccounts = [];
            }
          }

          // Initialize first account if we have no valid accounts
          if (validAccounts.length === 0) {
            validAccounts = [{
              index: 0,
              name: 'Account 1',
              address: derived.address,
              createdAt: Date.now()
            }];
          }

          // Encrypt mnemonic if password provided
          let encryptedData = null;
          let saltData = null;
          if (password) {
            const { encryptMnemonic } = await import('./auth-manager');
            const encrypted = encryptMnemonic(mnemonic, password);
            encryptedData = encrypted.encrypted;
            saltData = encrypted.salt;
          }

          set({
            address: derived.address,
            mnemonic,
            encryptedMnemonic: encryptedData,
            mnemonicSalt: saltData,
            isConnected: true,
            accounts: validAccounts,
            activeAccountIndex: 0
          });

          // 🔒 SECURITY: Mnemonic stored in memory AND encrypted in localStorage
          // This allows seed phrase export while maintaining security

          // AUTO-DISCOVERY: Scan blockchain for all accounts with activity
          console.log('🔍 Running auto-discovery for existing accounts...');
          setTimeout(async () => {
            await get().discoverAccounts();
            await get().updateBalance();
          }, 100);
        } else {
          // Legacy connect (backward compatibility)
          set({
            address,
            mnemonic: mnemonic || null,
            isConnected: true
          });

          // Fetch initial balance
          get().updateBalance();
        }
      },

      disconnect: () => {
        // CRITICAL: Explicitly clear localStorage to prevent data leakage between wallets
        if (typeof window !== 'undefined') {
          localStorage.removeItem('rainum-wallet-storage');
          // 🔒 SECURITY: No sessionStorage used for mnemonic (memory-only)
        }

        set({
          address: null,
          mnemonic: null,
          encryptedMnemonic: null,
          mnemonicSalt: null,
          isConnected: false,
          balance: 0,
          accounts: [],
          activeAccountIndex: 0
        });
      },

      unlockMnemonic: (password: string) => {
        const { encryptedMnemonic, mnemonicSalt } = get();
        if (!encryptedMnemonic || !mnemonicSalt) {
          console.error('No encrypted mnemonic available');
          return false;
        }

        const { decryptMnemonic } = require('./auth-manager');
        const decrypted = decryptMnemonic(encryptedMnemonic, password, mnemonicSalt);

        if (decrypted) {
          set({ mnemonic: decrypted });
          return true;
        }
        return false;
      },

      setBalance: (balance: number) => {
        set({ balance });
      },

      updateBalance: async () => {
        const { address } = get();
        if (!address) return;

        try {
          const { getBalance } = await import('./rainum-api');
          const balanceInRain = await getBalance(address);
          // Balance is already in RAIN (no conversion needed)
          set({ balance: balanceInRain });
        } catch (error) {
          console.error('Failed to update balance:', error);
        }
      },

      // HD Wallet actions
      createAccount: (name?: string) => {
        const { mnemonic, accounts } = get();
        if (!mnemonic) {
          console.error('No mnemonic available');
          return;
        }

        const nextIndex = getNextAccountIndex(accounts);
        const derived = deriveAccountFromMnemonic(mnemonic, nextIndex);
        const accountName = name || `Account ${accounts.length + 1}`;

        const newAccount: WalletAccount = {
          index: nextIndex,
          name: accountName,
          address: derived.address,
          createdAt: Date.now()
        };

        set({
          accounts: [...accounts, newAccount]
        });
      },

      switchAccount: (index: number) => {
        const { accounts, mnemonic } = get();
        const account = accounts.find(a => a.index === index);

        if (!account) {
          console.error(`Account with index ${index} not found`);
          return;
        }

        set({
          activeAccountIndex: index,
          address: account.address
        });

        // Update balance for new account
        get().updateBalance();
      },

      renameAccount: (index: number, name: string) => {
        const { accounts } = get();
        const updatedAccounts = accounts.map(account =>
          account.index === index ? { ...account, name } : account
        );
        set({ accounts: updatedAccounts });
      },

      getActiveAccount: () => {
        const { accounts, activeAccountIndex } = get();
        return accounts.find(a => a.index === activeAccountIndex) || null;
      },

      /**
       * Get private key for specific account index
       *
       * ⚠️ CRITICAL SECURITY WARNING ⚠️
       * Caller MUST securely wipe the returned private key from memory after use
       * by calling securelyWipeMemory() from hd-wallet.ts
       *
       * Example:
       *   const privateKey = getPrivateKey(0);
       *   // ... use private key ...
       *   securelyWipeMemory(privateKey);
       */
      getPrivateKey: (accountIndex: number) => {
        const { mnemonic } = get();
        if (!mnemonic) return null;

        try {
          const derived = deriveAccountFromMnemonic(mnemonic, accountIndex);
          // Note: Caller MUST wipe this from memory after use
          return derived.privateKey;
        } catch (error) {
          console.error('Failed to derive private key:', error);
          return null;
        }
      },

      /**
       * Auto-discover all accounts with activity on the blockchain
       * Scans accounts 0-99 and loads any that have balance or transactions
       * Stops after finding 20 consecutive empty accounts
       */
      discoverAccounts: async () => {
        const { mnemonic } = get();
        if (!mnemonic) {
          console.error('No mnemonic available for account discovery');
          return;
        }

        console.log('🔍 Starting account discovery...');

        const { accountExists } = await import('./rainum-api');
        const discoveredAccounts: WalletAccount[] = [];
        const MAX_SCAN = 100;
        const MAX_EMPTY_STREAK = 20;
        let emptyStreak = 0;

        for (let index = 0; index < MAX_SCAN; index++) {
          try {
            // Derive account address
            const derived = deriveAccountFromMnemonic(mnemonic, index);

            // Check if account exists on blockchain
            const exists = await accountExists(derived.address);

            if (exists) {
              console.log(`✅ Found account ${index}: ${derived.address}`);
              discoveredAccounts.push({
                index,
                name: `Account ${index + 1}`,
                address: derived.address,
                createdAt: Date.now()
              });
              emptyStreak = 0; // Reset streak when we find an account
            } else {
              emptyStreak++;
              console.log(`⚪ Empty account ${index} (streak: ${emptyStreak}/${MAX_EMPTY_STREAK})`);

              // Stop if we've found MAX_EMPTY_STREAK consecutive empty accounts
              if (emptyStreak >= MAX_EMPTY_STREAK) {
                console.log(`🛑 Stopping discovery after ${MAX_EMPTY_STREAK} empty accounts`);
                break;
              }
            }
          } catch (error) {
            console.error(`Failed to check account ${index}:`, error);
            // Continue scanning even if one check fails
          }
        }

        console.log(`✨ Discovery complete! Found ${discoveredAccounts.length} accounts`);

        // Update store with discovered accounts
        if (discoveredAccounts.length > 0) {
          set({
            accounts: discoveredAccounts,
            activeAccountIndex: 0,
            address: discoveredAccounts[0].address
          });
        }
      },
    }),
    {
      name: 'rainum-wallet-storage',
      partialize: (state) => ({
        address: state.address,
        // CRITICAL SECURITY: Do NOT persist mnemonic in localStorage
        // mnemonic: state.mnemonic, // ❌ REMOVED - security vulnerability
        // ✅ SAFE: Persist encrypted mnemonic with salt for seed phrase export
        encryptedMnemonic: state.encryptedMnemonic,
        mnemonicSalt: state.mnemonicSalt,
        isConnected: state.isConnected,
        accounts: state.accounts,
        activeAccountIndex: state.activeAccountIndex,
        // Don't persist balance - always fetch fresh
      }),
      skipHydration: false,
      onRehydrateStorage: () => (state) => {
        // 🔒 SECURITY: Mnemonic NOT restored from storage

        // MIGRATION: If user has old wallet without encrypted mnemonic, try to load from auth-manager
        if (state && state.isConnected && !state.encryptedMnemonic && state.address) {
          try {
            const { loadWallet } = require('./auth-manager');
            const wallet = loadWallet();

            if (wallet && wallet.address === state.address && wallet.mnemonic) {
              console.log('🔄 Migrating wallet to encrypted storage...');
              // Set mnemonic in memory (will be encrypted on next login)
              state.mnemonic = wallet.mnemonic;
            }
          } catch (error) {
            console.error('Migration failed:', error);
          }
        }
        // User must re-authenticate after page refresh for maximum security
        // This prevents XSS attacks from stealing mnemonics from browser storage
        if (typeof window !== 'undefined' && state?.isConnected && !state.mnemonic) {
          console.log('🔐 Wallet requires re-authentication after page refresh (security feature)');
        }
      },
    }
  )
);
