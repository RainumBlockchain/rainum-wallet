import { useEffect, useRef } from 'react';
import { useScheduledTxStore } from '@/lib/scheduled-tx-store';
import { sendTransaction } from '@/lib/rainum-api';
import { toast } from '@/lib/toast-store';

interface UseScheduledTransactionsProps {
  address?: string;
  mnemonic?: string;
  activeAccountIndex: number;
  onExecuted?: () => void;
}

export function useScheduledTransactions({
  address,
  mnemonic,
  activeAccountIndex,
  onExecuted,
}: UseScheduledTransactionsProps) {
  const { getDueTransactions, markExecuted, deleteScheduled } = useScheduledTxStore();
  const checkIntervalRef = useRef<NodeJS.Timeout>();
  const isExecutingRef = useRef(false);

  useEffect(() => {
    // Only run if we have address and mnemonic
    if (!address || !mnemonic) {
      return;
    }

    const checkAndExecute = async () => {
      // Prevent concurrent executions
      if (isExecutingRef.current) {
        return;
      }

      const dueTransactions = getDueTransactions();

      if (dueTransactions.length === 0) {
        return;
      }

      isExecutingRef.current = true;

      try {
        for (const tx of dueTransactions) {
          try {
            console.log('Executing scheduled transaction:', tx);

            const result = await sendTransaction(
              address,
              tx.to,
              tx.amount,
              tx.priority || 'standard',
              mnemonic,
              tx.enableZKP || false,
              tx.privacyLevel || 'partial',
              activeAccountIndex
            );

            if (result.success) {
              // Mark as executed
              markExecuted(tx.id);

              toast.success(
                'Scheduled Transaction Sent',
                `${tx.amount} RAIN sent to ${tx.to.slice(0, 8)}...${tx.to.slice(-6)}${tx.label ? ` (${tx.label})` : ''}`,
                7000
              );

              // Call callback
              onExecuted?.();
            } else {
              // Failed - keep it for retry
              console.error('Scheduled transaction failed:', result.message);
              toast.error(
                'Scheduled Transaction Failed',
                result.message || 'Transaction execution failed',
                7000
              );
            }
          } catch (error: any) {
            console.error('Error executing scheduled transaction:', error);
            toast.error(
              'Scheduled Transaction Error',
              error.message || 'Failed to execute transaction',
              7000
            );
          }
        }
      } finally {
        isExecutingRef.current = false;
      }
    };

    // Check every 10 seconds
    checkIntervalRef.current = setInterval(checkAndExecute, 10000);

    // Also check immediately on mount
    checkAndExecute();

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [address, mnemonic, activeAccountIndex, getDueTransactions, markExecuted, onExecuted]);
}
