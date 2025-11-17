/**
 * Rainum Blockchain Admin API Client
 *
 * Handles administrative operations on the Rainum blockchain
 * (minting and burning tokens for fiat gateway)
 */

import axios, { AxiosInstance } from 'axios';

// Types
export interface MintParams {
  address: string;
  amount: number;
  memo?: string;
}

export interface BurnParams {
  address: string;
  amount: number;
  memo?: string;
}

export interface TransactionResponse {
  success: boolean;
  txHash: string;
  blockHeight?: number;
  timestamp?: string;
}

export interface BalanceResponse {
  address: string;
  balance: number;
  currency: string;
}

class RainumAdminAPI {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.RAINUM_ADMIN_API_KEY || '';
    this.baseUrl = process.env.RAINUM_API_URL || 'http://localhost:8080';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      timeout: 30000,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[Rainum Admin] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Rainum Admin] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[Rainum Admin] Response ${response.status}`);
        return response;
      },
      (error) => {
        console.error('[Rainum Admin] API Error:', error.response?.data || error.message);
        throw new Error(
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Rainum blockchain API request failed'
        );
      }
    );
  }

  /**
   * Mint RAINUM tokens to an address
   */
  async mint(params: MintParams): Promise<TransactionResponse> {
    try {
      console.log(`[Rainum] Minting ${params.amount} RAINUM to ${params.address}`);

      const response = await this.client.post('/api/admin/mint', {
        address: params.address,
        amount: params.amount,
        memo: params.memo || 'Fiat deposit',
      });

      const txHash = response.data.txHash || response.data.hash || response.data.tx_hash;

      if (!txHash) {
        throw new Error('No transaction hash returned from blockchain');
      }

      console.log(`[Rainum] ✓ Minted ${params.amount} RAINUM, tx: ${txHash}`);

      return {
        success: true,
        txHash,
        blockHeight: response.data.blockHeight || response.data.block_height,
        timestamp: response.data.timestamp,
      };
    } catch (error: any) {
      console.error('[Rainum] Mint failed:', error);
      throw new Error(`Mint failed: ${error.message}`);
    }
  }

  /**
   * Burn RAINUM tokens from an address
   */
  async burn(params: BurnParams): Promise<TransactionResponse> {
    try {
      console.log(`[Rainum] Burning ${params.amount} RAINUM from ${params.address}`);

      const response = await this.client.post('/api/admin/burn', {
        address: params.address,
        amount: params.amount,
        memo: params.memo || 'Fiat withdrawal',
      });

      const txHash = response.data.txHash || response.data.hash || response.data.tx_hash;

      if (!txHash) {
        throw new Error('No transaction hash returned from blockchain');
      }

      console.log(`[Rainum] ✓ Burned ${params.amount} RAINUM, tx: ${txHash}`);

      return {
        success: true,
        txHash,
        blockHeight: response.data.blockHeight || response.data.block_height,
        timestamp: response.data.timestamp,
      };
    } catch (error: any) {
      console.error('[Rainum] Burn failed:', error);
      throw new Error(`Burn failed: ${error.message}`);
    }
  }

  /**
   * Get balance for an address
   */
  async getBalance(address: string): Promise<BalanceResponse> {
    try {
      const response = await this.client.get(`/api/balances/${address}`);

      return {
        address,
        balance: response.data.balance || 0,
        currency: 'RAINUM',
      };
    } catch (error: any) {
      console.error('[Rainum] Get balance failed:', error);
      throw new Error(`Get balance failed: ${error.message}`);
    }
  }

  /**
   * Verify a transaction exists on the blockchain
   */
  async verifyTransaction(txHash: string): Promise<boolean> {
    try {
      const response = await this.client.get(`/api/transactions/${txHash}`);
      return response.status === 200 && !!response.data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Health check - verify blockchain API is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/status');
      console.log('[Rainum] Health check passed ✓');
      return response.status === 200;
    } catch (error) {
      console.error('[Rainum] Health check failed ✗');
      return false;
    }
  }

  /**
   * Get blockchain status
   */
  async getStatus(): Promise<any> {
    try {
      const response = await this.client.get('/api/status');
      return response.data;
    } catch (error: any) {
      console.error('[Rainum] Get status failed:', error);
      throw error;
    }
  }
}

// Singleton instance
export const rainumAdminAPI = new RainumAdminAPI();

// Helper function to validate Rainum address format
export function isValidRainumAddress(address: string): boolean {
  // Adjust regex based on your actual address format
  // This is a placeholder - update based on Rainum specs
  return /^rainum[a-zA-Z0-9]{40,}$/.test(address) || /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Helper function to format Rainum amount (handle decimals)
export function formatRainumAmount(amount: number, decimals: number = 8): number {
  return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
