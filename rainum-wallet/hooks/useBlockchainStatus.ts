/**
 * useBlockchainStatus Hook
 * Fetches live blockchain status (block height, network, connection status)
 * and updates periodically
 */

import { useState, useEffect } from 'react';
import { getBlockchainStatus } from '@/lib/rainum-api';
import { useNetworkStore } from '@/lib/network-store';

interface BlockchainStatus {
  blockHeight: number;
  networkName: string;
  connected: boolean;
  loading: boolean;
}

/**
 * Hook to fetch and monitor blockchain status
 * @param refreshInterval - How often to refresh data in milliseconds (default: 10000ms = 10 seconds)
 */
export function useBlockchainStatus(refreshInterval: number = 10000): BlockchainStatus {
  const currentNetwork = useNetworkStore((state) => state.currentNetwork);

  const [status, setStatus] = useState<BlockchainStatus>({
    blockHeight: 0,
    networkName: currentNetwork.name,
    connected: false,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchStatus = async () => {
      try {
        const data = await getBlockchainStatus();

        if (!isMounted) return;

        if (data && data.connected) {
          setStatus({
            blockHeight: data.block_height,
            networkName: currentNetwork.name,
            connected: true,
            loading: false,
          });
        } else {
          setStatus({
            blockHeight: 0,
            networkName: currentNetwork.name,
            connected: false,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Failed to fetch blockchain status:', error);

        if (!isMounted) return;

        setStatus({
          blockHeight: 0,
          networkName: currentNetwork.name,
          connected: false,
          loading: false,
        });
      }
    };

    // Fetch immediately on mount
    fetchStatus();

    // Set up periodic refresh
    intervalId = setInterval(fetchStatus, refreshInterval);

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentNetwork.name, refreshInterval]);

  // Update network name when network changes
  useEffect(() => {
    setStatus((prev) => ({
      ...prev,
      networkName: currentNetwork.name,
    }));
  }, [currentNetwork.name]);

  return status;
}
