import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ScheduledTransaction {
  id: string;
  to: string;
  amount: string;
  label?: string;
  scheduledTime: number; // Unix timestamp
  executed: boolean;
  createdAt: number;
  priority?: string;
  enableZKP?: boolean;
  privacyLevel?: string;
}

interface ScheduledTxState {
  transactions: ScheduledTransaction[];

  // Actions
  addScheduled: (
    to: string,
    amount: string,
    scheduledTime: number,
    label?: string,
    priority?: string,
    enableZKP?: boolean,
    privacyLevel?: string
  ) => void;
  markExecuted: (id: string) => void;
  deleteScheduled: (id: string) => void;
  getPendingTransactions: () => ScheduledTransaction[];
  getDueTransactions: () => ScheduledTransaction[];
}

export const useScheduledTxStore = create<ScheduledTxState>()(
  persist(
    (set, get) => ({
      transactions: [],

      addScheduled: (
        to: string,
        amount: string,
        scheduledTime: number,
        label?: string,
        priority?: string,
        enableZKP?: boolean,
        privacyLevel?: string
      ) => {
        const newTx: ScheduledTransaction = {
          id: Date.now().toString(),
          to,
          amount,
          scheduledTime,
          label,
          executed: false,
          createdAt: Date.now(),
          priority,
          enableZKP,
          privacyLevel,
        };

        set((state) => ({
          transactions: [...state.transactions, newTx],
        }));
      },

      markExecuted: (id: string) => {
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id ? { ...tx, executed: true } : tx
          ),
        }));
      },

      deleteScheduled: (id: string) => {
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
        }));
      },

      getPendingTransactions: () => {
        const { transactions } = get();
        return transactions.filter((tx) => !tx.executed);
      },

      getDueTransactions: () => {
        const { transactions } = get();
        const now = Date.now();
        return transactions.filter(
          (tx) => !tx.executed && tx.scheduledTime <= now
        );
      },
    }),
    {
      name: 'rainum-scheduled-transactions',
    }
  )
);
