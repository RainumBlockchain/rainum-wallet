/**
 * Network Store - Manages blockchain network selection
 * Supports mainnet, testnet, and custom RPC networks
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Network {
  id: string;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  chainId?: string;
  isCustom?: boolean;
}

interface NetworkStore {
  currentNetwork: Network;
  customNetworks: Network[];
  networkHealth: Record<string, 'healthy' | 'degraded' | 'offline'>;

  // Actions
  switchNetwork: (network: Network) => void;
  addCustomNetwork: (network: Network) => void;
  removeCustomNetwork: (networkId: string) => void;
  updateNetworkHealth: (networkId: string, status: 'healthy' | 'degraded' | 'offline') => void;
  getNetworkById: (networkId: string) => Network | undefined;
  getCurrentRpcUrl: () => string;
}

// Default networks with official Rainum Chain IDs
// Chain ID Structure:
// - Mainnet: 999 (3 nines - official Rainum mainnet)
// - Testnet: 9999 (4 nines - official Rainum testnet)
// - Devnet: 99999 (5 nines - official Rainum devnet)
// - Local: 999999 (6 nines - local development)
export const NETWORKS = {
  LOCAL: {
    id: 'local',
    name: 'Local',
    rpcUrl: 'http://localhost:8080',
    explorerUrl: 'http://localhost:3000',
    chainId: '999999',
    isCustom: false,
  } as Network,
  DEVNET: {
    id: 'devnet',
    name: 'Devnet',
    rpcUrl: 'https://api.rainum.com',
    explorerUrl: 'https://explorer.rainum.com',
    chainId: '99999',
    isCustom: false,
  } as Network,
  TESTNET: {
    id: 'testnet',
    name: 'Testnet',
    rpcUrl: 'https://testnet-rpc.rainum.network',
    explorerUrl: 'https://testnet-explorer.rainum.network',
    chainId: '9999',
    isCustom: false,
  } as Network,
  MAINNET: {
    id: 'mainnet',
    name: 'Mainnet',
    rpcUrl: 'https://rpc.rainum.network',
    explorerUrl: 'https://explorer.rainum.network',
    chainId: '999',
    isCustom: false,
  } as Network,
};

// Use LOCAL for development, DEVNET for production
export const DEFAULT_NETWORK = process.env.NODE_ENV === 'development'
  ? NETWORKS.LOCAL
  : NETWORKS.DEVNET;

export const useNetworkStore = create<NetworkStore>()(
  persist(
    (set, get) => ({
      currentNetwork: DEFAULT_NETWORK,
      customNetworks: [],
      networkHealth: {},

      switchNetwork: (network: Network) => {
        console.log(`Switching to network: ${network.name} (${network.rpcUrl})`);
        set({ currentNetwork: network });

        // Emit event for components to react to network change
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('rainum:network-changed', {
            detail: { network }
          }));
        }
      },

      addCustomNetwork: (network: Network) => {
        const customNetworks = get().customNetworks;

        // Check if network with same ID already exists
        if (customNetworks.some(n => n.id === network.id)) {
          throw new Error('Network with this ID already exists');
        }

        const newNetwork = { ...network, isCustom: true };
        set({ customNetworks: [...customNetworks, newNetwork] });

        console.log(`Added custom network: ${network.name}`);
      },

      removeCustomNetwork: (networkId: string) => {
        const customNetworks = get().customNetworks;
        const currentNetwork = get().currentNetwork;

        // If removing current network, switch to default
        if (currentNetwork.id === networkId) {
          get().switchNetwork(DEFAULT_NETWORK);
        }

        set({
          customNetworks: customNetworks.filter(n => n.id !== networkId)
        });

        console.log(`Removed custom network: ${networkId}`);
      },

      updateNetworkHealth: (networkId: string, status: 'healthy' | 'degraded' | 'offline') => {
        set((state) => ({
          networkHealth: {
            ...state.networkHealth,
            [networkId]: status,
          },
        }));
      },

      getNetworkById: (networkId: string) => {
        const builtInNetworks = Object.values(NETWORKS);
        const customNetworks = get().customNetworks;

        return [...builtInNetworks, ...customNetworks].find(n => n.id === networkId);
      },

      getCurrentRpcUrl: () => {
        return get().currentNetwork.rpcUrl;
      },
    }),
    {
      name: 'rainum-network-storage',
      partialize: (state) => ({
        currentNetwork: state.currentNetwork,
        customNetworks: state.customNetworks,
      }),
    }
  )
);

/**
 * Get all available networks (built-in + custom)
 */
export function getAllNetworks(): Network[] {
  const customNetworks = useNetworkStore.getState().customNetworks;
  return [...Object.values(NETWORKS), ...customNetworks];
}

/**
 * Check if a network is reachable
 */
export async function checkNetworkHealth(rpcUrl: string): Promise<'healthy' | 'degraded' | 'offline'> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const startTime = Date.now();
    const response = await fetch(`${rpcUrl}/status`, {
      signal: controller.signal,
    });
    const responseTime = Date.now() - startTime;

    clearTimeout(timeoutId);

    if (!response.ok) {
      return 'offline';
    }

    // Healthy if response time < 1s, degraded if 1-3s
    if (responseTime < 1000) {
      return 'healthy';
    } else if (responseTime < 3000) {
      return 'degraded';
    } else {
      return 'offline';
    }
  } catch (error) {
    console.error('Network health check failed:', error);
    return 'offline';
  }
}

/**
 * Validate custom network configuration
 */
export function validateNetwork(network: Partial<Network>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!network.name || network.name.trim().length === 0) {
    errors.push('Network name is required');
  }

  if (!network.rpcUrl || network.rpcUrl.trim().length === 0) {
    errors.push('RPC URL is required');
  } else if (!network.rpcUrl.startsWith('http://') && !network.rpcUrl.startsWith('https://')) {
    errors.push('RPC URL must start with http:// or https://');
  }

  if (network.explorerUrl && network.explorerUrl.trim().length > 0) {
    if (!network.explorerUrl.startsWith('http://') && !network.explorerUrl.startsWith('https://')) {
      errors.push('Explorer URL must start with http:// or https://');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
