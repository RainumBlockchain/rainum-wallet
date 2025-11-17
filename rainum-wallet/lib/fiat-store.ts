/**
 * Fiat Store
 *
 * Zustand store for managing fiat gateway state
 */

import { create } from 'zustand';
import axios from 'axios';

// Types
export type Provider = 'MODULR' | 'MOONPAY';
export type TransactionType = 'BUY' | 'SELL';
export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type KYCStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export interface FiatTransaction {
  id: string;
  type: TransactionType;
  provider: Provider;
  status: TransactionStatus;
  fiatAmount: number;
  fiatCurrency: string;
  cryptoAmount: number;
  exchangeRate: number;
  feeAmount: number;
  rainumTxHash?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface ExchangeRate {
  rainum_to_usd: number;
  rainum_to_eur: number;
  rainum_to_gbp: number;
}

export interface QuoteResult {
  baseCurrency: string;
  baseCurrencyAmount: number;
  quoteCurrency: string;
  quoteCurrencyAmount: number;
  exchangeRate: number;
  feeAmount: number;
  totalAmount: number;
  provider: Provider;
}

interface FiatState {
  // User KYC status
  kycStatus: KYCStatus | null;
  kycProvider: string | null;

  // Modulr account info
  modulrCustomerId: string | null;
  modulrAccountId: string | null;
  modulrAccountNumber: string | null;
  modulrSortCode: string | null;

  // Exchange rates
  exchangeRates: ExchangeRate | null;

  // Transactions
  transactions: FiatTransaction[];
  isLoadingTransactions: boolean;

  // Quote/pricing
  currentQuote: QuoteResult | null;
  isLoadingQuote: boolean;

  // UI state
  selectedProvider: Provider;
  selectedTransactionType: TransactionType;

  // Actions
  setKYCStatus: (status: KYCStatus, provider?: string) => void;
  setModulrAccount: (customerId: string, accountId: string, accountNumber?: string, sortCode?: string) => void;
  setSelectedProvider: (provider: Provider) => void;
  setSelectedTransactionType: (type: TransactionType) => void;

  // API actions
  fetchKYCStatus: (walletAddress: string) => Promise<void>;
  createModulrCustomer: (data: any) => Promise<any>;
  createMoonPayTransaction: (data: any) => Promise<any>;
  getQuote: (provider: Provider, baseCurrency: string, amount: number) => Promise<QuoteResult | null>;
  fetchTransactions: (walletAddress: string) => Promise<void>;
  initiateWithdrawal: (data: any) => Promise<any>;
}

export const useFiatStore = create<FiatState>((set, get) => ({
  // Initial state
  kycStatus: null,
  kycProvider: null,
  modulrCustomerId: null,
  modulrAccountId: null,
  modulrAccountNumber: null,
  modulrSortCode: null,
  exchangeRates: null,
  transactions: [],
  isLoadingTransactions: false,
  currentQuote: null,
  isLoadingQuote: false,
  selectedProvider: 'MOONPAY',
  selectedTransactionType: 'BUY',

  // Simple setters
  setKYCStatus: (status, provider) => set({ kycStatus: status, kycProvider: provider || null }),

  setModulrAccount: (customerId, accountId, accountNumber, sortCode) => set({
    modulrCustomerId: customerId,
    modulrAccountId: accountId,
    modulrAccountNumber: accountNumber || null,
    modulrSortCode: sortCode || null,
  }),

  setSelectedProvider: (provider) => set({ selectedProvider: provider }),

  setSelectedTransactionType: (type) => set({ selectedTransactionType: type }),

  // Fetch user's KYC status
  fetchKYCStatus: async (walletAddress) => {
    try {
      const response = await axios.get(`/api/fiat/kyc-status?address=${walletAddress}`);

      if (response.data.success) {
        set({
          kycStatus: response.data.kycStatus,
          kycProvider: response.data.kycProvider,
          modulrCustomerId: response.data.modulrCustomerId,
          modulrAccountId: response.data.modulrAccountId,
        });
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
    }
  },

  // Create Modulr customer
  createModulrCustomer: async (data) => {
    try {
      const response = await axios.post('/api/fiat/modulr/create-customer', data);

      if (response.data.success) {
        set({
          kycStatus: response.data.kycStatus,
          kycProvider: 'modulr',
          modulrCustomerId: response.data.customerId,
          modulrAccountId: response.data.accountId,
          modulrAccountNumber: response.data.accountNumber,
          modulrSortCode: response.data.sortCode,
        });
      }

      return response.data;
    } catch (error: any) {
      console.error('Failed to create Modulr customer:', error);
      throw error;
    }
  },

  // Create MoonPay transaction
  createMoonPayTransaction: async (data) => {
    try {
      const response = await axios.post('/api/fiat/moonpay/create-transaction', data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create MoonPay transaction:', error);
      throw error;
    }
  },

  // Get price quote
  getQuote: async (provider, baseCurrency, amount) => {
    set({ isLoadingQuote: true });

    try {
      let quote: QuoteResult | null = null;

      if (provider === 'MOONPAY') {
        const response = await axios.get('/api/fiat/moonpay/get-quote', {
          params: {
            baseCurrency,
            baseCurrencyAmount: amount,
          },
        });

        if (response.data.success) {
          quote = {
            ...response.data.quote,
            provider: 'MOONPAY',
          };
        }
      } else if (provider === 'MODULR') {
        // Calculate Modulr quote locally based on exchange rates
        const rateKey = `rainum_to_${baseCurrency.toLowerCase()}`;
        const rate = parseFloat(process.env[`NEXT_PUBLIC_RAINUM_${baseCurrency}_RATE`] || '10');
        const feePercent = parseFloat(process.env.NEXT_PUBLIC_MODULR_FEE_PERCENT || '0.5');
        const fee = (amount * feePercent) / 100;
        const netAmount = amount - fee;
        const rainumAmount = netAmount * rate;

        quote = {
          baseCurrency,
          baseCurrencyAmount: amount,
          quoteCurrency: 'RAINUM',
          quoteCurrencyAmount: rainumAmount,
          exchangeRate: rainumAmount / amount,
          feeAmount: fee,
          totalAmount: amount,
          provider: 'MODULR',
        };
      }

      set({ currentQuote: quote, isLoadingQuote: false });
      return quote;

    } catch (error) {
      console.error('Failed to get quote:', error);
      set({ isLoadingQuote: false });
      return null;
    }
  },

  // Fetch user's fiat transactions
  fetchTransactions: async (walletAddress) => {
    set({ isLoadingTransactions: true });

    try {
      const response = await axios.get(`/api/fiat/transactions?address=${walletAddress}`);

      if (response.data.success) {
        set({
          transactions: response.data.transactions,
          isLoadingTransactions: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      set({ isLoadingTransactions: false });
    }
  },

  // Initiate withdrawal (sell)
  initiateWithdrawal: async (data) => {
    try {
      const { selectedProvider } = get();

      if (selectedProvider === 'MODULR') {
        const response = await axios.post('/api/fiat/modulr/initiate-payment', data);
        return response.data;
      } else {
        // MoonPay sell
        const response = await axios.post('/api/fiat/moonpay/create-transaction', {
          ...data,
          type: 'SELL',
        });
        return response.data;
      }
    } catch (error: any) {
      console.error('Failed to initiate withdrawal:', error);
      throw error;
    }
  },
}));
