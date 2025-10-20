/**
 * Wallet Settings Manager
 * Manages all configurable wallet settings with localStorage persistence
 */

export interface WalletSettings {
  security: {
    sessionTimeout: number; // in minutes (0 = disabled)
    sessionTimeoutEnabled: boolean;
    loginRateLimit: {
      enabled: boolean;
      maxAttempts: number;
      lockoutDuration: number; // in minutes
    };
    transactionLimits: {
      enabled: boolean;
      warningThreshold: number; // RAIN amount
      criticalThreshold: number; // RAIN amount
    };
  };
  privacy: {
    // Future privacy settings
  };
  advanced: {
    // Future advanced settings
  };
}

const STORAGE_KEY = 'rainum_wallet_settings';

const DEFAULT_SETTINGS: WalletSettings = {
  security: {
    sessionTimeout: 60, // 1 hour - more reasonable default
    sessionTimeoutEnabled: true,
    loginRateLimit: {
      enabled: true,
      maxAttempts: 5,
      lockoutDuration: 15,
    },
    transactionLimits: {
      enabled: true,
      warningThreshold: 100000,
      criticalThreshold: 1000000,
    },
  },
  privacy: {},
  advanced: {},
};

/**
 * Get wallet settings from localStorage
 */
export function getWalletSettings(): WalletSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return DEFAULT_SETTINGS;
    }
    const settings = JSON.parse(data);
    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_SETTINGS,
      ...settings,
      security: {
        ...DEFAULT_SETTINGS.security,
        ...settings.security,
        loginRateLimit: {
          ...DEFAULT_SETTINGS.security.loginRateLimit,
          ...settings.security?.loginRateLimit,
        },
        transactionLimits: {
          ...DEFAULT_SETTINGS.security.transactionLimits,
          ...settings.security?.transactionLimits,
        },
      },
    };
  } catch (error) {
    console.error('Failed to parse wallet settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save wallet settings to localStorage
 */
export function saveWalletSettings(settings: WalletSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save wallet settings:', error);
  }
}

/**
 * Update specific security setting
 */
export function updateSecuritySetting(
  key: keyof WalletSettings['security'],
  value: any
): void {
  const settings = getWalletSettings();
  settings.security[key] = value;
  saveWalletSettings(settings);
}

/**
 * Reset settings to defaults
 */
export function resetToDefaultSettings(): void {
  saveWalletSettings(DEFAULT_SETTINGS);
}

/**
 * Get session timeout in milliseconds
 */
export function getSessionTimeoutMs(): number {
  const settings = getWalletSettings();

  // If sessionTimeout is 0, it means "Never" - return 0
  if (settings.security.sessionTimeout === 0) {
    return 0;
  }

  // If timeout is disabled, return 0
  if (!settings.security.sessionTimeoutEnabled) {
    return 0; // Disabled
  }

  return settings.security.sessionTimeout * 60 * 1000;
}

/**
 * Get login rate limit settings
 */
export function getLoginRateLimitSettings() {
  const settings = getWalletSettings();
  return settings.security.loginRateLimit;
}

/**
 * Get transaction limit settings
 */
export function getTransactionLimitSettings() {
  const settings = getWalletSettings();
  return settings.security.transactionLimits;
}
