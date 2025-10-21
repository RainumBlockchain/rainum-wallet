/**
 * Rainum Blockchain API Client
 * Connects to blockchain backend via network store
 */

import { useNetworkStore } from './network-store';

// All amounts are now in RAIN directly (no micro-RAIN conversion)

/**
 * Get current API base URL from network store
 * This allows dynamic network switching (mainnet/testnet/custom)
 */
function getApiBase(): string {
  // In browser context, we can directly access the store
  if (typeof window !== 'undefined' && useNetworkStore) {
    return useNetworkStore.getState().getCurrentRpcUrl();
  }
  // Fallback for SSR or if store not available
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080';
}

// IMPORTANT: Always use getApiBase() in fetch calls, not a constant
// This ensures network switching works correctly

export interface WalletCreateResponse {
  success: boolean;
  address: string;
  mnemonic: string;
  message: string;
}

export interface WalletLoginRequest {
  mnemonic: string;
}

export type VMType = 'evm' | 'move';

export interface TransactionRequest {
  from: string;
  to: string;
  amount: string;
  priority?: string;
  vm_type?: VMType;  // Which VM to use (default: evm)
  signature?: {
    signature_hex: string;
    public_key_hex: string;
  };
  timestamp?: number;
  nonce?: number;
}

export interface TransactionResponse {
  success: boolean;
  message: string;
  shard_id?: number;
}

export interface AccountBalance {
  address: string;
  balance: number;
}

/**
 * Create a new wallet
 * Generates new mnemonic + address from Rust backend
 */
export async function createWallet(): Promise<WalletCreateResponse> {
  try {
    const res = await fetch(`${getApiBase()}/wallet/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Failed to create wallet:', error);
    throw error;
  }
}

/**
 * Login/Import wallet using mnemonic
 * Validates mnemonic and returns address
 */
export async function loginWallet(mnemonic: string): Promise<WalletCreateResponse> {
  try {
    const res = await fetch(`${getApiBase()}/wallet/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mnemonic }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Failed to login wallet:', error);
    throw error;
  }
}

/**
 * Check if account exists
 */
export async function accountExists(address: string): Promise<boolean> {
  try {
    // Normalize address to lowercase for consistent backend lookup
    const normalizedAddress = address.toLowerCase();
    const res = await fetch(`${getApiBase()}/account/${normalizedAddress}`);

    console.log('accountExists API response status:', res.status);

    if (!res.ok) {
      console.log('accountExists: Account not found (response not ok)');
      return false;
    }

    const data = await res.json();
    console.log('accountExists API response data:', JSON.stringify(data, null, 2));
    console.log('data.exists =', data.exists);
    console.log('data.balance =', data.balance);
    console.log('data.address =', data.address);

    // Use the exists field from API response
    const exists = data.exists === true;
    console.log('accountExists final result:', exists);

    return exists;
  } catch (error) {
    console.error('Failed to check account:', error);
    return false;
  }
}

/**
 * Get account balance
 */
export async function getBalance(address: string): Promise<number> {
  try {
    // Normalize address to lowercase for consistent backend lookup
    const normalizedAddress = address.toLowerCase();
    const res = await fetch(`${getApiBase()}/account/${normalizedAddress}`);

    if (!res.ok) {
      return 0;
    }

    const account = await res.json();
    return account.balance || 0;
  } catch (error) {
    console.error('Failed to get balance:', error);
    return 0;
  }
}

/**
 * Get account nonce for transaction signing
 */
export async function getAccountNonce(address: string): Promise<number> {
  try {
    // Normalize address to lowercase for consistent backend lookup
    const normalizedAddress = address.toLowerCase();
    const res = await fetch(`${getApiBase()}/account/nonce/${normalizedAddress}`);

    if (!res.ok) {
      return 0;
    }

    const data = await res.json();
    return data.nonce || 0;
  } catch (error) {
    console.error('Failed to get nonce:', error);
    return 0;
  }
}

/**
 * Send transaction with Ed25519 signature
 */
export async function sendTransaction(
  from: string,
  to: string,
  amount: string,
  priority: string = 'standard',
  mnemonic?: string,
  enableZKP: boolean = false,
  privacyLevel: string = 'full',
  accountIndex: number = 0,
  vmType: VMType = 'evm'
): Promise<TransactionResponse> {
  try {
    // SECURITY: Sanitize all user inputs
    const { sanitizeAddress, sanitizeAmount, sanitizeMnemonic, sanitizeInteger } = await import('./input-sanitizer');

    // Validate and sanitize addresses
    const sanitizedFrom = sanitizeAddress(from);
    if (!sanitizedFrom) {
      throw new Error('Invalid sender address format');
    }

    const sanitizedTo = sanitizeAddress(to);
    if (!sanitizedTo) {
      throw new Error('Invalid recipient address format');
    }

    // Validate and sanitize amount
    const sanitizedAmount = sanitizeAmount(amount);
    if (!sanitizedAmount) {
      throw new Error('Invalid transaction amount');
    }

    // Validate account index
    const sanitizedAccountIndex = sanitizeInteger(accountIndex, 0, 999);
    if (sanitizedAccountIndex === null) {
      throw new Error('Invalid account index');
    }

    // Validate and sanitize mnemonic if provided
    let sanitizedMnemonic: string | undefined = undefined;
    if (mnemonic) {
      const validated = sanitizeMnemonic(mnemonic);
      if (!validated) {
        throw new Error('Invalid mnemonic phrase format');
      }
      sanitizedMnemonic = validated;
    }

    // Use sanitized values from here on
    from = sanitizedFrom;
    to = sanitizedTo;
    amount = sanitizedAmount;
    accountIndex = sanitizedAccountIndex;
    mnemonic = sanitizedMnemonic;

    // 🔒 SECURITY: Mnemonic is REQUIRED for all transactions (signature verification is mandatory)
    if (!mnemonic) {
      throw new Error('Transaction signing required: Please unlock your wallet to send transactions');
    }

    let signature = undefined;
    let nonce = 0;
    let timestamp = 0;

    // Gas price and limit based on priority (in RAIN)
    const gasPrices: Record<string, number> = {
      low: 1,      // 1 RAIN per gas = 21,000 RAIN fee
      standard: 2,  // 2 RAIN per gas = 42,000 RAIN fee
      high: 5,      // 5 RAIN per gas = 105,000 RAIN fee
    };
    const gasLimit = 21000; // Standard transaction gas limit
    const gasPrice = gasPrices[priority] || 2;

    // Sign the transaction with Ed25519 (REQUIRED by blockchain)
    const { deriveAccountFromMnemonic, securelyWipeMemory } = await import('./hd-wallet');
    const {
      signTransaction: signTx,
      getPublicKey,
      deriveAddressFromPublicKey,
    } = await import('./crypto');

    // Get nonce and timestamp
    nonce = await getAccountNonce(from);
    timestamp = Math.floor(Date.now() / 1000);

    // Derive private key from mnemonic using HD wallet path
    const derivedAccount = deriveAccountFromMnemonic(mnemonic, accountIndex);
    const privateKey = derivedAccount.privateKey;

    // Get public key
    const publicKey = await getPublicKey(privateKey);

    // Derive address from public key (should match 'from')
    const derivedAddress = deriveAddressFromPublicKey(publicKey);

    // Case-insensitive comparison (Ethereum addresses are case-insensitive)
    if (derivedAddress.toLowerCase() !== from.toLowerCase()) {
      // SECURITY: Clear private key before throwing error
      securelyWipeMemory(privateKey);
      throw new Error('Derived address does not match transaction "from" address');
    }

    // Sign transaction with ALL fields including gas_price and gas_limit
    const sig = await signTx(
      privateKey,
      from,
      to,
      amount,
      nonce,
      timestamp,
      gasPrice,
      gasLimit
    );

    // SECURITY: Immediately wipe private key from memory after signing
    securelyWipeMemory(privateKey);
    securelyWipeMemory(derivedAccount.publicKey); // Also wipe public key buffer

    signature = {
      signature_hex: sig.signature,
      public_key_hex: sig.publicKey,
    };

    // Amount is already in RAIN (backend uses RAIN directly)
    // Round to whole RAIN since blockchain uses u64 (no decimals)
    const amountInRain = Math.floor(parseFloat(amount));

    if (amountInRain <= 0 || !isFinite(amountInRain)) {
      throw new Error('Amount must be greater than 0');
    }

    const res = await fetch(`${getApiBase()}/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        amount: amountInRain.toString(),
        priority,
        signature,  // Always present (mnemonic is required)
        timestamp,  // Always present (mnemonic is required)
        nonce,      // Always present (mnemonic is required)
        gas_price: gasPrice,
        gas_limit: gasLimit,
        zkp_enabled: enableZKP,
        privacy_level: privacyLevel,
        vm_type: vmType,  // Include VM type
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error('Failed to send transaction:', error);
    throw error;
  }
}

/**
 * Get transaction history for address
 */
export async function getTransactions(address: string): Promise<any[]> {
  try {
    // Normalize address to lowercase for consistent backend lookup
    const normalizedAddress = address.toLowerCase();
    const res = await fetch(`${getApiBase()}/transactions/${normalizedAddress}`, {
      cache: 'no-store',  // Disable caching to always get fresh transaction data
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();

    // API returns {incoming: [...], outgoing: [...]}
    // Combine them into a single array
    if (data && typeof data === 'object' && 'incoming' in data && 'outgoing' in data) {
      const allTransactions = [
        ...data.outgoing.map((tx: any) => ({ ...tx, direction: 'outgoing' })),
        ...data.incoming.map((tx: any) => ({ ...tx, direction: 'incoming' }))
      ];

      // Sort by timestamp (most recent first)
      return allTransactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    // Fallback if API format changes
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to get transactions:', error);
    return [];
  }
}

/**
 * Request tokens from faucet (for testing)
 */
export async function requestFromFaucet(address: string): Promise<any> {
  try {
    // Normalize address to lowercase for consistent backend lookup
    const normalizedAddress = address.toLowerCase();
    const res = await fetch(`${getApiBase()}/faucet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address: normalizedAddress }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Failed to request from faucet:', error);
    throw error;
  }
}

// ============================================================================
// STAKING & VALIDATOR API
// ============================================================================

export interface ValidatorInfo {
  address: string;
  stake: number;
  tier: number;
  active: boolean;
  jailed: boolean;
  missed_blocks: number;
  total_rewards: number;
  delegators_count?: number;
  commission_rate?: number;
  nickname?: string;
  avatar_url?: string;
  description?: string;
  website?: string;
}

export interface DelegationInfo {
  validator: string;
  amount: number;
  rewards: number;
  delegated_at?: number;
}

/**
 * Register as a validator
 */
export async function registerValidator(
  address: string,
  stake: number,
  tier: number
): Promise<any> {
  try {
    // Stake is already in RAIN (backend uses RAIN directly)
    const res = await fetch(`${getApiBase()}/validator/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, stake, tier }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || `HTTP error! status: ${res.status}`);
    }

    return data;
  } catch (error) {
    console.error('Failed to register validator:', error);
    throw error;
  }
}

/**
 * Get all validators
 */
export async function getValidators(): Promise<ValidatorInfo[]> {
  try {
    const res = await fetch(`${getApiBase()}/validators`);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    const validators = Array.isArray(data) ? data : (data.validators || []);

    // Map backend fields to frontend interface (backend now returns RAIN directly)
    return validators.map((v: any) => ({
      address: v.address,
      stake: v.staked_amount || v.stake || 0,
      tier: v.tier || 1,
      active: v.is_active ?? v.active ?? false,
      jailed: v.jailed || false,
      missed_blocks: v.missed_blocks || 0,
      total_rewards: v.total_rewards || 0,
      delegators_count: v.delegators_count,
      commission_rate: v.commission_rate,
      nickname: v.nickname,
      avatar_url: v.avatar_url,
      description: v.description,
      website: v.website,
    }));
  } catch (error) {
    console.error('Failed to fetch validators:', error);
    return [];
  }
}

/**
 * Get specific validator info
 */
export async function getValidatorInfo(address: string): Promise<ValidatorInfo | null> {
  try {
    const res = await fetch(`${getApiBase()}/validator/${address}`);

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();

    // Check if backend returned success: false (validator not found)
    if (data.success === false) {
      return null;
    }

    // Backend returns { success: true, validator: {...} }
    const v = data.validator || data;

    // Map backend fields to frontend interface (backend now returns RAIN directly)
    return {
      address: v.address,
      stake: v.staked_amount || v.stake || 0,
      tier: v.tier || 1,
      active: v.is_active ?? v.active ?? false,
      jailed: v.jailed || false,
      missed_blocks: v.missed_blocks || 0,
      total_rewards: v.total_rewards || 0,
      delegators_count: v.delegators_count,
      commission_rate: v.commission_rate,
      nickname: v.nickname,
      avatar_url: v.avatar_url,
      description: v.description,
      website: v.website,
    };
  } catch (error) {
    console.error('Failed to fetch validator info:', error);
    return null;
  }
}

/**
 * Delegate tokens to a validator
 * 🔒 SECURITY: Client-side signing (private keys NEVER sent to backend)
 */
export async function delegateToValidator(
  delegatorAddress: string,
  validatorAddress: string,
  amount: number,
  mnemonic: string,
  accountIndex: number = 0
): Promise<any> {
  try {
    // TODO: Backend needs to accept signatures for delegation
    // For now, we remove private_key transmission (critical security fix)
    // Backend needs to be updated to accept signature + public_key instead

    // Amount is already in RAIN (backend uses RAIN directly)
    const res = await fetch(`${getApiBase()}/delegate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delegator: delegatorAddress,
        validator: validatorAddress,
        amount: amount.toString(),
        // 🔒 REMOVED: private_key (critical security vulnerability)
        // Backend needs update to verify signature instead
      }),
    });

    // Try to parse as JSON, fall back to text if it fails
    let data;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      // If response is not JSON, wrap it in an error object
      data = { success: false, message: text };
    }

    if (!res.ok || !data.success) {
      throw new Error(data.message || `HTTP error! status: ${res.status}`);
    }

    return data;
  } catch (error) {
    console.error('Failed to delegate:', error);
    throw error;
  }
}

/**
 * Undelegate tokens from a validator
 * 🔒 SECURITY: Client-side signing (private keys NEVER sent to backend)
 */
export async function undelegateFromValidator(
  delegatorAddress: string,
  validatorAddress: string,
  amount: number,
  mnemonic: string,
  accountIndex: number = 0
): Promise<any> {
  try {
    // TODO: Backend needs to accept signatures for undelegation
    // For now, we remove private_key transmission (critical security fix)

    // Amount is already in RAIN (backend uses RAIN directly)
    const res = await fetch(`${getApiBase()}/undelegate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delegator: delegatorAddress,
        validator: validatorAddress,
        amount: amount.toString(),
        // 🔒 REMOVED: private_key (critical security vulnerability)
      }),
    });

    // Try to parse as JSON, fall back to text if it fails
    let data;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      // If response is not JSON, wrap it in an error object
      data = { success: false, message: text };
    }

    if (!res.ok || !data.success) {
      throw new Error(data.message || `HTTP error! status: ${res.status}`);
    }

    return data;
  } catch (error) {
    console.error('Failed to undelegate:', error);
    throw error;
  }
}

/**
 * Get delegations for an address
 */
export async function getDelegations(address: string): Promise<DelegationInfo[]> {
  try {
    const res = await fetch(`${getApiBase()}/delegations/${address}`);

    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    const delegations = data.delegations || [];

    // Map backend fields to frontend interface (backend now returns RAIN directly)
    return delegations.map((d: any) => ({
      validator: d.validator,
      amount: d.amount || 0,
      rewards: d.rewards || 0,
      delegated_at: d.delegated_at,
    }));
  } catch (error) {
    console.error('Failed to fetch delegations:', error);
    return [];
  }
}

/**
 * Unjail a validator
 * 🔒 SECURITY: Client-side signing (private keys NEVER sent to backend)
 */
export async function unjailValidator(
  address: string,
  mnemonic: string,
  accountIndex: number = 0
): Promise<any> {
  try {
    // TODO: Backend needs to accept signatures for unjail
    const res = await fetch(`${getApiBase()}/validator/unjail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        // 🔒 REMOVED: private_key (critical security vulnerability)
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || `HTTP error! status: ${res.status}`);
    }

    return data;
  } catch (error) {
    console.error('Failed to unjail validator:', error);
    throw error;
  }
}

export async function updateValidatorProfile(params: {
  address: string;
  nickname?: string;
  avatar_url?: string;
  description?: string;
  website?: string;
}): Promise<any> {
  try {
    const res = await fetch(`${getApiBase()}/validator/update-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || `HTTP error! status: ${res.status}`);
    }

    return data;
  } catch (error) {
    console.error('Failed to update validator profile:', error);
    throw error;
  }
}

// ========================================
// VALIDATOR STAKING API
// ========================================

export interface ValidatorStakeRequest {
  address: string;
  amount: number;
}

export interface ValidatorUpgradeRequest {
  address: string;
  new_tier: number;
}

export interface ValidatorUnstakeRequest {
  address: string;
  amount: number;
}

export interface ValidatorStakeResponse {
  success: boolean;
  message: string;
}

export interface UnbondingStatus {
  has_unbonding: boolean;
  amount?: number;
  start_timestamp?: number;
  completion_timestamp?: number;
  remaining_seconds?: number;
  can_withdraw?: boolean;
}

/**
 * Add more stake to existing validator
 */
export async function addValidatorStake(address: string, amount: number): Promise<ValidatorStakeResponse> {
  try {
    const res = await fetch(`${getApiBase()}/validator/add-stake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, amount }),
    });

    // Check response status before parsing JSON
    if (!res.ok) {
      // Try to read error message from response text
      const errorText = await res.text();
      let errorMessage = `HTTP error! status: ${res.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If not JSON, use the text as error message
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to add validator stake');
    }

    return data;
  } catch (error) {
    console.error('Failed to add validator stake:', error);
    throw error;
  }
}

/**
 * Upgrade validator tier
 */
export async function upgradeValidatorTier(address: string, newTier: number): Promise<ValidatorStakeResponse> {
  try {
    const res = await fetch(`${getApiBase()}/validator/upgrade-tier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, new_tier: newTier }),
    });

    // Check response status before parsing JSON
    if (!res.ok) {
      // Try to read error message from response text
      const errorText = await res.text();
      let errorMessage = `HTTP error! status: ${res.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If not JSON, use the text as error message
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to upgrade validator tier');
    }

    return data;
  } catch (error) {
    console.error('Failed to upgrade validator tier:', error);
    throw error;
  }
}

/**
 * Start unbonding (unstaking)
 */
export async function unstakeValidator(address: string, amount: number): Promise<ValidatorStakeResponse> {
  try {
    const res = await fetch(`${getApiBase()}/validator/unstake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, amount }),
    });

    // Check response status before parsing JSON
    if (!res.ok) {
      // Try to read error message from response text
      const errorText = await res.text();
      let errorMessage = `HTTP error! status: ${res.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If not JSON, use the text as error message
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to unstake validator');
    }

    return data;
  } catch (error) {
    console.error('Failed to unstake validator:', error);
    throw error;
  }
}

/**
 * Withdraw completed unbonding
 */
export async function withdrawValidator(address: string): Promise<ValidatorStakeResponse> {
  try {
    const res = await fetch(`${getApiBase()}/validator/withdraw/${address}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Check response status before parsing JSON
    if (!res.ok) {
      // Try to read error message from response text
      const errorText = await res.text();
      let errorMessage = `HTTP error! status: ${res.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If not JSON, use the text as error message
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to withdraw validator');
    }

    return data;
  } catch (error) {
    console.error('Failed to withdraw validator:', error);
    throw error;
  }
}

/**
 * Get unbonding status for validator
 */
export async function getUnbondingStatus(address: string): Promise<UnbondingStatus> {
  try {
    const res = await fetch(`${getApiBase()}/validator/${address}/unbonding`);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Failed to get unbonding status:', error);
    throw error;
  }
}

// ==================== GAS FEE SYSTEM ====================

export interface GasPrice {
  base_fee: number;
  priority_fee: number;
  max_fee_per_gas: number;
  block_utilization: number;
  estimated_confirmation_time: number;
}

export interface GasPriceResponse {
  base_fee_per_gas: number;
  priority_fees: {
    express: number;
    standard: number;
    economy: number;
  };
  total_gas_price: {
    express: number;
    standard: number;
    economy: number;
  };
  tier_multipliers: {
    tier_1_standard: number;
    tier_2_premium: number;
    tier_3_enterprise: number;
  };
  tier_adjusted_prices: {
    tier_1: {
      express: number;
      standard: number;
      economy: number;
    };
    tier_2: {
      express: number;
      standard: number;
      economy: number;
    };
    tier_3: {
      express: number;
      standard: number;
      economy: number;
    };
  };
  gas_limits: {
    transfer: number;
    contract_call: number;
    contract_deploy: number;
  };
}

export interface GasEstimateRequest {
  from: string;
  to: string;
  amount: string;
  priority?: string;
  tx_type?: string;
  data_size?: number;
  tier?: number;
}

export interface GasEstimateResponse {
  success: boolean;
  estimate: {
    gas_limit: number;
    estimated_cost: number;
    priority_options: {
      economy: GasPrice & { total_gas_cost: number; total_cost: number };
      standard: GasPrice & { total_gas_cost: number; total_cost: number };
      express: GasPrice & { total_gas_cost: number; total_cost: number };
    };
    selected_priority: string;
    transfer_amount: number;
    from_balance: number;
    sufficient_balance: boolean;
    tier: number;
    tx_type: string;
  };
}

/**
 * Get current gas prices with tier-based multipliers
 */
export async function getGasPrice(): Promise<GasPriceResponse> {
  try {
    const res = await fetch(`${getApiBase()}/gas/price`);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Failed to get gas price:', error);
    throw error;
  }
}

/**
 * Estimate gas for a transaction with priority options
 */
export async function estimateGas(request: GasEstimateRequest): Promise<GasEstimateResponse> {
  try {
    const res = await fetch(`${getApiBase()}/gas/estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Failed to estimate gas:', error);
    throw error;
  }
}

/**
 * Format gas amount for display (converts from smallest unit to RAIN)
 */
export function formatGas(gasAmount: number, showDecimals: boolean = false): string {
  // Convert from micro-RAIN to RAIN by dividing by 1,000,000
  const rainAmount = gasAmount / 1_000_000;

  if (showDecimals && rainAmount < 1) {
    // For small amounts (like per-gas fees), show up to 6 decimals
    return rainAmount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  }

  // Format as whole number with commas - NO decimals
  return rainAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Get gas priority label with emoji
 */
export function getGasPriorityLabel(priority: string): string {
  switch (priority) {
    case 'express':
      return '⚡ Express (~6s)';
    case 'economy':
      return '🐢 Economy (~30s)';
    default:
      return '⚙️ Standard (~12s)';
  }
}

/**
 * Get tier discount percentage
 */
export function getTierDiscount(tier: number): number {
  switch (tier) {
    case 3:
      return 50; // Enterprise: 50% discount
    case 2:
      return 20; // Premium: 20% discount
    default:
      return 0; // Standard: no discount
  }
}

/**
 * Get blockchain status (block height, network info)
 */
export async function getBlockchainStatus(): Promise<{
  block_height: number;
  network: string;
  connected: boolean;
} | null> {
  try {
    const res = await fetch(`${getApiBase()}/status`);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return {
      block_height: data.block_height || 0,
      network: data.network || 'mainnet',
      connected: true
    };
  } catch (error) {
    console.error('Failed to fetch blockchain status:', error);
    return { block_height: 0, network: 'mainnet', connected: false };
  }
}
