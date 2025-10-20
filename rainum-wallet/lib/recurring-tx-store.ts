import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';

export interface RecurringTransaction {
  id: string;
  to: string;
  amount: string;
  frequency: RecurringFrequency;
  label?: string;
  isActive: boolean;
  lastExecuted?: number;
  nextExecution: number;
  createdAt: number;
}

interface RecurringTxState {
  transactions: RecurringTransaction[];

  // Actions
  addRecurring: (to: string, amount: string, frequency: RecurringFrequency, label?: string) => void;
  toggleActive: (id: string) => void;
  deleteRecurring: (id: string) => void;
  updateLastExecuted: (id: string) => void;
  getDueTransactions: () => RecurringTransaction[];
}

const getNextExecutionTime = (frequency: RecurringFrequency, from: number = Date.now()): number => {
  const date = new Date(from);

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
  }

  return date.getTime();
};

export const useRecurringTxStore = create<RecurringTxState>()(
  persist(
    (set, get) => ({
      transactions: [],

      addRecurring: (to: string, amount: string, frequency: RecurringFrequency, label?: string) => {
        const now = Date.now();
        const newTx: RecurringTransaction = {
          id: now.toString(),
          to,
          amount,
          frequency,
          label,
          isActive: true,
          nextExecution: getNextExecutionTime(frequency, now),
          createdAt: now,
        };

        set((state) => ({
          transactions: [...state.transactions, newTx],
        }));
      },

      toggleActive: (id: string) => {
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id
              ? { ...tx, isActive: !tx.isActive }
              : tx
          ),
        }));
      },

      deleteRecurring: (id: string) => {
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
        }));
      },

      updateLastExecuted: (id: string) => {
        const now = Date.now();
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id
              ? {
                  ...tx,
                  lastExecuted: now,
                  nextExecution: getNextExecutionTime(tx.frequency, now),
                }
              : tx
          ),
        }));
      },

      getDueTransactions: () => {
        const { transactions } = get();
        const now = Date.now();
        return transactions.filter(
          (tx) => tx.isActive && tx.nextExecution <= now
        );
      },
    }),
    {
      name: 'rainum-recurring-transactions',
    }
  )
);
