import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from '@/lib/toast-store';
import { useNetworkStore } from '@/lib/network-store';
import { formatBalance } from '@/lib/format-balance';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface NewTransactionEvent {
  type: 'new_transaction';
  transaction: any;
  direction: 'incoming' | 'outgoing';
  address: string;
}

export interface BalanceUpdateEvent {
  type: 'balance_update';
  address: string;
  old_balance: number;
  new_balance: number;
  change: number;
}

export interface NewBlockEvent {
  type: 'new_block';
  block_id: number;
  hash: string;
  transactions: number;
  timestamp: number;
}

export interface ConnectedEvent {
  type: 'connected';
  message: string;
}

export type BlockchainEvent =
  | NewTransactionEvent
  | BalanceUpdateEvent
  | NewBlockEvent
  | ConnectedEvent;

interface UseWebSocketOptions {
  address?: string;
  onNewTransaction?: (event: NewTransactionEvent) => void;
  onBalanceUpdate?: (event: BalanceUpdateEvent) => void;
  onNewBlock?: (event: NewBlockEvent) => void;
  onConnected?: (event: ConnectedEvent) => void;
  autoReconnect?: boolean;
  showNotifications?: boolean;
}

export function useWebSocket({
  address,
  onNewTransaction,
  onBalanceUpdate,
  onNewBlock,
  onConnected,
  autoReconnect = true,
  showNotifications = true,
}: UseWebSocketOptions = {}) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<BlockchainEvent | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const isUnmountingRef = useRef(false);
  const addressRef = useRef(address);
  const callbacksRef = useRef({ onNewTransaction, onBalanceUpdate, onNewBlock, onConnected });

  // Update refs when props change
  useEffect(() => {
    addressRef.current = address;
    callbacksRef.current = { onNewTransaction, onBalanceUpdate, onNewBlock, onConnected };
  }, [address, onNewTransaction, onBalanceUpdate, onNewBlock, onConnected]);

  const connect = useCallback(() => {
    // Only run in browser
    if (typeof window === 'undefined') {
      return;
    }

    // Don't reconnect if component is unmounting
    if (isUnmountingRef.current) {
      return;
    }

    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('Connecting to WebSocket...');

    // Get WebSocket URL from current network (convert http to ws)
    const rpcUrl = useNetworkStore.getState().getCurrentRpcUrl();
    const wsUrl = rpcUrl.replace(/^http/, 'ws') + '/ws';

    try {
      ws.current = new WebSocket(wsUrl);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      return;
    }

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;

      // Subscribe to address if provided (wait for connection to be fully open)
      if (addressRef.current && ws.current?.readyState === WebSocket.OPEN) {
        console.log(`Subscribing to address: ${addressRef.current}`);
        ws.current.send(
          JSON.stringify({
            type: 'subscribe',
            address: addressRef.current,
          })
        );
      }
    };

    ws.current.onmessage = (event) => {
      try {
        console.log('Raw WebSocket message:', event.data);
        const message: BlockchainEvent = JSON.parse(event.data);
        console.log('Parsed WebSocket message:', message);
        setLastMessage(message);

        // Handle different message types
        switch (message.type) {
          case 'new_transaction':
            const txEvent = message as NewTransactionEvent;
            callbacksRef.current.onNewTransaction?.(txEvent);

            // Show notification for incoming funds
            if (txEvent.direction === 'incoming' && showNotifications) {
              const amount = txEvent.transaction.amount;
              const formatted = formatBalance(amount);
              const displayAmount = formatted.full; // Use full format with commas (e.g., "343,444")

              toast.success(`Received ${displayAmount} RAIN`, undefined, 5000);

              // Browser notification if permitted (only in browser)
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('Rainum Wallet - Funds Received', {
                  body: `You received ${displayAmount} RAIN`,
                  icon: '/favicon.ico',
                  tag: txEvent.transaction.hash,
                });
              }
            }
            break;

          case 'balance_update':
            callbacksRef.current.onBalanceUpdate?.(message as BalanceUpdateEvent);
            break;

          case 'new_block':
            callbacksRef.current.onNewBlock?.(message as NewBlockEvent);
            break;

          case 'connected':
            console.log('WebSocket subscription confirmed');
            callbacksRef.current.onConnected?.(message as ConnectedEvent);
            break;

          default:
            console.warn('Unknown WebSocket message type:', message.type);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.current.onerror = (error) => {
      // Only log if this is not a connection refusal (which is common during dev)
      if (ws.current?.readyState !== WebSocket.CLOSED) {
        console.error('WebSocket error:', error);
        console.error('WebSocket URL:', wsUrl);
        console.error('WebSocket state:', ws.current?.readyState);
      } else {
        console.log('WebSocket connection failed - blockchain node may not be running');
      }
    };

    ws.current.onclose = (event) => {
      const isCleanClose = event.wasClean && event.code === 1000;

      if (!isCleanClose && !isUnmountingRef.current) {
        console.log('WebSocket disconnected unexpectedly', {
          code: event.code,
          reason: event.reason || 'No reason provided',
        });
      }

      setIsConnected(false);

      // Don't reconnect if component is unmounting
      if (isUnmountingRef.current) {
        return;
      }

      // Auto-reconnect with exponential backoff (only if not a clean close)
      if (autoReconnect && !isCleanClose) {
        // Longer initial delay to avoid overwhelming the server
        const baseDelay = 5000; // Start with 5 seconds
        const delay = Math.min(baseDelay * Math.pow(1.5, reconnectAttemptsRef.current), 60000);

        if (reconnectAttemptsRef.current === 0) {
          console.log(`Will attempt to reconnect to blockchain node in ${delay/1000}s...`);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          connect();
        }, delay);
      }
    };
  }, [autoReconnect, showNotifications]); // Removed callbacks from dependencies

  const disconnect = useCallback(() => {
    isUnmountingRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    ws.current?.close(1000, 'Component unmounting'); // Clean close
    ws.current = null;
    setIsConnected(false);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    isUnmountingRef.current = false;

    // Small delay to avoid React strict mode double-mount issues
    const timer = setTimeout(() => {
      connect();
    }, 100);

    return () => {
      clearTimeout(timer);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Resubscribe when address changes
  useEffect(() => {
    if (isConnected && addressRef.current && ws.current?.readyState === WebSocket.OPEN) {
      console.log(`Subscribing to new address: ${addressRef.current}`);
      ws.current.send(
        JSON.stringify({
          type: 'subscribe',
          address: addressRef.current,
        })
      );
    }
  }, [address, isConnected]); // Keep address in deps to trigger on change

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
  };
}

// Hook to request browser notification permission
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if running in browser (not SSR)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return permission;
  }, [permission]);

  return {
    permission,
    requestPermission,
    isSupported,
  };
}
