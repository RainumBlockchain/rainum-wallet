/**
 * Modulr API Client
 *
 * Handles all interactions with Modulr Finance API
 * Docs: https://modulr.readme.io/
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

// Types
export interface ModulrCustomer {
  id: string;
  type: 'PERSON' | 'COMPANY';
  expectedMonthlySpend?: string;
  expectedActivityCountry?: string;
  verified: boolean;
}

export interface ModulrAccount {
  id: string;
  customerId: string;
  name: string;
  balance: number;
  currency: string;
  accountNumber: string;
  sortCode: string;
  iban?: string;
  bic?: string;
}

export interface CreateCustomerParams {
  type: 'PERSON' | 'COMPANY';
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email: string;
  phone?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  nationality?: string;
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postcode: string;
    country: string; // ISO 3166-1 alpha-2
  };
}

export interface CreateAccountParams {
  customerId: string;
  name: string;
  currency?: string; // EUR, GBP, USD
}

export interface InitiatePaymentParams {
  sourceAccountId: string;
  destinationAccountNumber: string;
  destinationSortCode?: string;
  destinationIban?: string;
  amount: number;
  currency: string;
  reference: string;
}

export interface WebhookPayload {
  type: 'PAYIN' | 'PAYOUT' | 'CUSTOMER_VERIFICATION';
  id: string;
  timestamp: string;
  data: any;
}

class ModulrAPI {
  private client: AxiosInstance;
  private apiKey: string;
  private apiSecret: string;
  private webhookSecret: string;
  private mode: 'sandbox' | 'production';

  constructor() {
    this.apiKey = process.env.MODULR_API_KEY || '';
    this.apiSecret = process.env.MODULR_API_SECRET || '';
    this.webhookSecret = process.env.MODULR_WEBHOOK_SECRET || '';
    this.mode = (process.env.MODULR_MODE as 'sandbox' | 'production') || 'sandbox';

    const baseURL = this.mode === 'sandbox'
      ? process.env.MODULR_SANDBOX_URL
      : process.env.MODULR_PRODUCTION_URL;

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${this.apiKey}:${this.apiSecret}`,
      },
      timeout: 30000,
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[Modulr] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Modulr] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[Modulr] Response ${response.status}`);
        return response;
      },
      (error) => {
        console.error('[Modulr] API Error:', error.response?.data || error.message);
        throw new Error(
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Modulr API request failed'
        );
      }
    );
  }

  /**
   * Create a new customer in Modulr
   */
  async createCustomer(params: CreateCustomerParams): Promise<ModulrCustomer> {
    try {
      const payload = {
        type: params.type,
        ...(params.type === 'PERSON' ? {
          firstName: params.firstName,
          lastName: params.lastName,
          dateOfBirth: params.dateOfBirth,
        } : {
          companyName: params.companyName,
        }),
        email: params.email,
        phone: params.phone,
        address: params.address,
        expectedMonthlySpend: 'LESS_THAN_10000',
        expectedActivityCountry: params.address.country,
      };

      const response = await this.client.post('/customers', payload);
      return response.data;
    } catch (error) {
      console.error('[Modulr] Create customer failed:', error);
      throw error;
    }
  }

  /**
   * Get customer details
   */
  async getCustomer(customerId: string): Promise<ModulrCustomer> {
    try {
      const response = await this.client.get(`/customers/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('[Modulr] Get customer failed:', error);
      throw error;
    }
  }

  /**
   * Create a new account for a customer
   */
  async createAccount(params: CreateAccountParams): Promise<ModulrAccount> {
    try {
      const payload = {
        name: params.name,
        currency: params.currency || 'EUR',
        productCode: 'STANDARD',
      };

      const response = await this.client.post(
        `/customers/${params.customerId}/accounts`,
        payload
      );
      return response.data;
    } catch (error) {
      console.error('[Modulr] Create account failed:', error);
      throw error;
    }
  }

  /**
   * Get account details
   */
  async getAccount(accountId: string): Promise<ModulrAccount> {
    try {
      const response = await this.client.get(`/accounts/${accountId}`);
      return response.data;
    } catch (error) {
      console.error('[Modulr] Get account failed:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: string): Promise<number> {
    try {
      const account = await this.getAccount(accountId);
      return account.balance;
    } catch (error) {
      console.error('[Modulr] Get balance failed:', error);
      throw error;
    }
  }

  /**
   * Initiate a payment (for withdrawals/sells)
   */
  async initiatePayment(params: InitiatePaymentParams): Promise<any> {
    try {
      const payload = {
        sourceAccountId: params.sourceAccountId,
        destination: {
          type: params.destinationIban ? 'SEPA' : 'FASTER_PAYMENTS',
          ...(params.destinationIban ? {
            iban: params.destinationIban,
          } : {
            accountNumber: params.destinationAccountNumber,
            sortCode: params.destinationSortCode,
          }),
        },
        amount: params.amount,
        currency: params.currency,
        reference: params.reference,
      };

      const response = await this.client.post('/payments', payload);
      return response.data;
    } catch (error) {
      console.error('[Modulr] Initiate payment failed:', error);
      throw error;
    }
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: string): Promise<any> {
    try {
      const response = await this.client.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      console.error('[Modulr] Get payment failed:', error);
      throw error;
    }
  }

  /**
   * List transactions for an account
   */
  async getAccountTransactions(
    accountId: string,
    options?: {
      from?: string; // ISO date
      to?: string;   // ISO date
      page?: number;
      size?: number;
    }
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (options?.from) params.append('from', options.from);
      if (options?.to) params.append('to', options.to);
      if (options?.page) params.append('page', options.page.toString());
      if (options?.size) params.append('size', options.size.toString());

      const response = await this.client.get(
        `/accounts/${accountId}/transactions?${params.toString()}`
      );
      return response.data.content || [];
    } catch (error) {
      console.error('[Modulr] Get transactions failed:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   *
   * Modulr sends webhooks with a signature in the x-modulr-signature header
   */
  verifyWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('[Modulr] Webhook verification failed:', error);
      return false;
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhook(payload: any): WebhookPayload {
    return {
      type: payload.type,
      id: payload.id,
      timestamp: payload.timestamp,
      data: payload.data || payload,
    };
  }

  /**
   * Health check - verify API credentials
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to list customers (should work if credentials are valid)
      await this.client.get('/customers?page=0&size=1');
      console.log('[Modulr] Health check passed ✓');
      return true;
    } catch (error) {
      console.error('[Modulr] Health check failed ✗');
      return false;
    }
  }
}

// Singleton instance
export const modulrAPI = new ModulrAPI();

// Helper functions
export function calculateModulrFee(amount: number): number {
  const feePercent = parseFloat(process.env.MODULR_FEE_PERCENT || '0.5');
  return (amount * feePercent) / 100;
}

export function calculateRainumAmount(
  fiatAmount: number,
  fiatCurrency: string
): number {
  const rateKey = `RAINUM_${fiatCurrency}_RATE`;
  const rate = parseFloat(process.env[rateKey] || '10');
  const fee = calculateModulrFee(fiatAmount);
  const netAmount = fiatAmount - fee;
  return netAmount * rate;
}

export function calculateFiatAmount(
  rainumAmount: number,
  fiatCurrency: string
): number {
  const rateKey = `RAINUM_${fiatCurrency}_RATE`;
  const rate = parseFloat(process.env[rateKey] || '10');
  const grossAmount = rainumAmount / rate;
  const fee = calculateModulrFee(grossAmount);
  return grossAmount - fee;
}
