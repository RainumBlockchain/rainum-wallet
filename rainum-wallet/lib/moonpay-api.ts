/**
 * MoonPay API Client
 *
 * Handles all interactions with MoonPay API
 * Docs: https://docs.moonpay.com/
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

// Types
export interface MoonPayTransaction {
  id: string;
  status: string;
  cryptoCurrency: string;
  baseCurrency: string;
  baseCurrencyAmount: number;
  cryptoCurrencyAmount: number;
  feeAmount: number;
  extraFeeAmount: number;
  walletAddress: string;
  redirectUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MoonPayQuote {
  baseCurrency: string;
  quoteCurrency: string;
  baseCurrencyAmount: number;
  quoteCurrencyAmount: number;
  feeAmount: number;
  extraFeeAmount: number;
  totalAmount: number;
  networkFeeAmount: number;
}

export interface CreateTransactionParams {
  walletAddress: string;
  baseCurrency: string; // EUR, USD, GBP
  baseCurrencyAmount?: number;
  quoteCurrency?: string; // Our custom currency (if supported) or use external swap
  redirectUrl?: string;
  email?: string;
}

export interface MoonPayWebhookPayload {
  type: 'transaction_created' | 'transaction_updated' | 'transaction_completed' | 'transaction_failed';
  data: MoonPayTransaction;
}

class MoonPayAPI {
  private client: AxiosInstance;
  private apiKey: string;
  private secretKey: string;
  private webhookSecret: string;
  private mode: 'sandbox' | 'production';
  private widgetUrl: string;

  constructor() {
    this.apiKey = process.env.MOONPAY_API_KEY || '';
    this.secretKey = process.env.MOONPAY_SECRET_KEY || '';
    this.webhookSecret = process.env.MOONPAY_WEBHOOK_SECRET || '';
    this.mode = (process.env.MOONPAY_MODE as 'sandbox' | 'production') || 'sandbox';

    const baseURL = this.mode === 'sandbox'
      ? 'https://api.moonpay.com'
      : 'https://api.moonpay.com';

    this.widgetUrl = this.mode === 'sandbox'
      ? process.env.MOONPAY_SANDBOX_URL || 'https://buy-sandbox.moonpay.com'
      : process.env.MOONPAY_PRODUCTION_URL || 'https://buy.moonpay.com';

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add API key to all requests
        config.params = {
          ...config.params,
          apiKey: this.apiKey,
        };
        console.log(`[MoonPay] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[MoonPay] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[MoonPay] Response ${response.status}`);
        return response;
      },
      (error) => {
        console.error('[MoonPay] API Error:', error.response?.data || error.message);
        throw new Error(
          error.response?.data?.message ||
          error.response?.data?.error ||
          'MoonPay API request failed'
        );
      }
    );
  }

  /**
   * Generate a signed URL for MoonPay widget (BUY flow)
   *
   * Users will be redirected to this URL to complete the purchase
   */
  generateBuyUrl(params: CreateTransactionParams): string {
    const queryParams = new URLSearchParams({
      apiKey: this.apiKey,
      currencyCode: 'USDC', // MoonPay doesn't support custom tokens, use USDC as proxy
      walletAddress: params.walletAddress,
      baseCurrencyCode: params.baseCurrency,
      ...(params.baseCurrencyAmount && {
        baseCurrencyAmount: params.baseCurrencyAmount.toString(),
      }),
      ...(params.email && { email: params.email }),
      ...(params.redirectUrl && { redirectURL: params.redirectUrl }),
      colorCode: '#4F46E5', // Indigo color (customize for Rainum branding)
      theme: 'dark',
      showWalletAddressForm: 'false',
    });

    // Generate signature
    const signature = this.generateSignature(queryParams.toString());
    queryParams.append('signature', signature);

    return `${this.widgetUrl}?${queryParams.toString()}`;
  }

  /**
   * Generate a signed URL for MoonPay widget (SELL flow)
   *
   * Note: MoonPay sell feature may have limited availability
   */
  generateSellUrl(params: CreateTransactionParams): string {
    const queryParams = new URLSearchParams({
      apiKey: this.apiKey,
      baseCurrencyCode: params.baseCurrency,
      defaultCurrencyCode: 'USDC', // Use USDC as proxy
      refundWalletAddress: params.walletAddress,
      ...(params.email && { email: params.email }),
      ...(params.redirectUrl && { redirectURL: params.redirectUrl }),
      colorCode: '#4F46E5',
      theme: 'dark',
    });

    const signature = this.generateSignature(queryParams.toString());
    queryParams.append('signature', signature);

    // MoonPay sell uses a different endpoint
    return `https://sell${this.mode === 'sandbox' ? '-sandbox' : ''}.moonpay.com?${queryParams.toString()}`;
  }

  /**
   * Get a price quote for a transaction
   */
  async getQuote(params: {
    baseCurrency: string;
    quoteCurrency: string;
    baseCurrencyAmount?: number;
    quoteCurrencyAmount?: number;
  }): Promise<MoonPayQuote> {
    try {
      const queryParams = {
        baseCurrency: params.baseCurrency,
        quoteCurrency: params.quoteCurrency,
        ...(params.baseCurrencyAmount && {
          baseCurrencyAmount: params.baseCurrencyAmount.toString(),
        }),
        ...(params.quoteCurrencyAmount && {
          quoteCurrencyAmount: params.quoteCurrencyAmount.toString(),
        }),
      };

      const response = await this.client.get('/v3/currencies/quote', {
        params: queryParams,
      });

      return response.data;
    } catch (error) {
      console.error('[MoonPay] Get quote failed:', error);
      throw error;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionId: string): Promise<MoonPayTransaction> {
    try {
      const response = await this.client.get(`/v1/transactions/${transactionId}`);
      return response.data;
    } catch (error) {
      console.error('[MoonPay] Get transaction failed:', error);
      throw error;
    }
  }

  /**
   * List transactions
   */
  async listTransactions(params?: {
    limit?: number;
    offset?: number;
    walletAddress?: string;
  }): Promise<MoonPayTransaction[]> {
    try {
      const response = await this.client.get('/v1/transactions', {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('[MoonPay] List transactions failed:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   *
   * MoonPay sends webhooks with a signature in the moonpay-signature header
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
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
      console.error('[MoonPay] Webhook verification failed:', error);
      return false;
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhook(payload: any): MoonPayWebhookPayload {
    return {
      type: payload.type,
      data: payload.data,
    };
  }

  /**
   * Generate signature for URL parameters
   */
  private generateSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('base64');
  }

  /**
   * Health check - verify API credentials
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to get supported currencies (should work if credentials are valid)
      await this.client.get('/v3/currencies');
      console.log('[MoonPay] Health check passed ✓');
      return true;
    } catch (error) {
      console.error('[MoonPay] Health check failed ✗');
      return false;
    }
  }
}

// Singleton instance
export const moonpayAPI = new MoonPayAPI();

// Helper functions
export function calculateMoonPayFee(amount: number): number {
  const feePercent = parseFloat(process.env.MOONPAY_FEE_PERCENT || '2.9');
  return (amount * feePercent) / 100;
}

/**
 * Calculate RAINUM amount from USDC
 *
 * MoonPay buys USDC, we swap it to RAINUM internally
 * Assuming 1 USDC ≈ 1 USD
 */
export function calculateRainumFromUSDC(usdcAmount: number): number {
  const usdRate = parseFloat(process.env.RAINUM_USD_RATE || '10');
  return usdcAmount * usdRate;
}

/**
 * Calculate USDC amount from RAINUM
 */
export function calculateUSDCFromRainum(rainumAmount: number): number {
  const usdRate = parseFloat(process.env.RAINUM_USD_RATE || '10');
  return rainumAmount / usdRate;
}
