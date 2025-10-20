import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TransactionCategory =
  | 'payment'
  | 'transfer'
  | 'received'
  | 'exchange'
  | 'staking'
  | 'other';

export const TRANSACTION_CATEGORIES: { value: TransactionCategory; label: string; color: string }[] = [
  { value: 'payment', label: 'Payment', color: 'blue' },
  { value: 'transfer', label: 'Transfer', color: 'purple' },
  { value: 'received', label: 'Received', color: 'green' },
  { value: 'exchange', label: 'Exchange', color: 'yellow' },
  { value: 'staking', label: 'Staking', color: 'indigo' },
  { value: 'other', label: 'Other', color: 'gray' },
];

export interface TransactionLabel {
  txHash: string;
  note?: string;
  category?: TransactionCategory;
  createdAt: number;
  updatedAt: number;
}

interface TransactionLabelsState {
  labels: Record<string, TransactionLabel>; // keyed by transaction hash

  // Actions
  addLabel: (txHash: string, note?: string, category?: TransactionCategory) => void;
  updateLabel: (txHash: string, note?: string, category?: TransactionCategory) => void;
  removeLabel: (txHash: string) => void;
  getLabel: (txHash: string) => TransactionLabel | undefined;
  getLabelsByCategory: (category: TransactionCategory) => TransactionLabel[];
}

export const useTransactionLabelsStore = create<TransactionLabelsState>()(
  persist(
    (set, get) => ({
      labels: {},

      addLabel: (txHash: string, note?: string, category?: TransactionCategory) => {
        const now = Date.now();
        set((state) => ({
          labels: {
            ...state.labels,
            [txHash]: {
              txHash,
              note,
              category,
              createdAt: now,
              updatedAt: now,
            },
          },
        }));
      },

      updateLabel: (txHash: string, note?: string, category?: TransactionCategory) => {
        set((state) => {
          const existing = state.labels[txHash];
          if (!existing) {
            // If doesn't exist, create it
            return {
              labels: {
                ...state.labels,
                [txHash]: {
                  txHash,
                  note,
                  category,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
              },
            };
          }

          return {
            labels: {
              ...state.labels,
              [txHash]: {
                ...existing,
                note: note !== undefined ? note : existing.note,
                category: category !== undefined ? category : existing.category,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      removeLabel: (txHash: string) => {
        set((state) => {
          const { [txHash]: removed, ...rest } = state.labels;
          return { labels: rest };
        });
      },

      getLabel: (txHash: string) => {
        return get().labels[txHash];
      },

      getLabelsByCategory: (category: TransactionCategory) => {
        const { labels } = get();
        return Object.values(labels).filter(label => label.category === category);
      },
    }),
    {
      name: 'rainum-transaction-labels',
    }
  )
);
