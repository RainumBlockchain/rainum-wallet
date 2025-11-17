/**
 * useExtensionDetection Hook
 * Detects and monitors Rainum browser extension status
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isExtensionInstalled,
  isExtensionEnabled,
  getExtensionInfo,
  subscribeToExtensionEvents,
} from '@/lib/extension-bridge';

export type ExtensionStatus =
  | 'not-installed'  // Extension not detected
  | 'disabled'       // Extension installed but disabled
  | 'ready'          // Extension enabled but not connected
  | 'active'         // Extension connected and working
  | 'error';         // Connection error

export interface ExtensionState {
  status: ExtensionStatus;
  isInstalled: boolean;
  isEnabled: boolean;
  isConnected: boolean;
  walletAddress?: string;
  version?: string;
  error?: string;
  loading: boolean;
}

/**
 * Hook to detect and monitor browser extension
 * @param checkInterval - How often to check for extension (ms)
 */
export function useExtensionDetection(checkInterval: number = 3000): ExtensionState {
  const [state, setState] = useState<ExtensionState>({
    status: 'not-installed',
    isInstalled: false,
    isEnabled: false,
    isConnected: false,
    loading: true,
  });

  // Check extension status
  const checkExtension = useCallback(async () => {
    try {
      const installed = isExtensionInstalled();

      if (!installed) {
        setState({
          status: 'not-installed',
          isInstalled: false,
          isEnabled: false,
          isConnected: false,
          loading: false,
        });
        return;
      }

      // Extension is installed, check if enabled
      const enabled = await isExtensionEnabled();

      if (!enabled) {
        setState({
          status: 'disabled',
          isInstalled: true,
          isEnabled: false,
          isConnected: false,
          loading: false,
        });
        return;
      }

      // Extension is enabled, get info
      const info = await getExtensionInfo();

      if (info) {
        // Check if connected (has wallet address)
        const connected = !!info.walletAddress;

        setState({
          status: connected ? 'active' : 'ready',
          isInstalled: true,
          isEnabled: true,
          isConnected: connected,
          walletAddress: info.walletAddress,
          version: info.version,
          loading: false,
        });
      } else {
        // Failed to get info - extension might be having issues
        setState({
          status: 'error',
          isInstalled: true,
          isEnabled: true,
          isConnected: false,
          error: 'Failed to communicate with extension',
          loading: false,
        });
      }
    } catch (error) {
      console.error('Extension check failed:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      }));
    }
  }, []);

  // Initial check
  useEffect(() => {
    checkExtension();
  }, [checkExtension]);

  // Periodic polling (adjust based on current status)
  useEffect(() => {
    // Don't poll if active (use events instead)
    if (state.status === 'active') {
      return;
    }

    // Poll more frequently for not-installed and disabled states
    const interval = state.status === 'not-installed' || state.status === 'disabled'
      ? checkInterval
      : checkInterval * 2; // Less frequent for other states

    const intervalId = setInterval(checkExtension, interval);

    return () => clearInterval(intervalId);
  }, [state.status, checkInterval, checkExtension]);

  // Subscribe to extension events when active
  useEffect(() => {
    if (!state.isInstalled || !state.isEnabled) {
      return;
    }

    const unsubscribe = subscribeToExtensionEvents(
      // On connect
      (address: string) => {
        setState(prev => ({
          ...prev,
          status: 'active',
          isConnected: true,
          walletAddress: address,
          error: undefined,
        }));
      },
      // On disconnect
      () => {
        setState(prev => ({
          ...prev,
          status: 'ready',
          isConnected: false,
          walletAddress: undefined,
        }));
      },
      // On account change
      (address: string) => {
        setState(prev => ({
          ...prev,
          walletAddress: address,
        }));
      }
    );

    return unsubscribe;
  }, [state.isInstalled, state.isEnabled]);

  // Listen for extension installation (check when window regains focus)
  useEffect(() => {
    const handleFocus = () => {
      // User might have just installed extension
      if (state.status === 'not-installed') {
        checkExtension();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [state.status, checkExtension]);

  return state;
}
