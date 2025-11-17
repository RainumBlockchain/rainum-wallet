"use client";

/**
 * FiatTransactionHistory Component
 *
 * Displays user's fiat transaction history (buys/sells)
 */

import { useEffect } from 'react';
import { useFiatStore, type FiatTransaction } from '@/lib/fiat-store';
import { useWalletStore } from '@/lib/wallet-store';
import { motion } from 'framer-motion';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';

export default function FiatTransactionHistory() {
  const { address } = useWalletStore();
  const { transactions, isLoadingTransactions, fetchTransactions } = useFiatStore();

  useEffect(() => {
    if (address) {
      fetchTransactions(address);
    }
  }, [address]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'FAILED':
      case 'CANCELLED':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'PROCESSING':
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-400';
      case 'FAILED':
      case 'CANCELLED':
        return 'text-red-400';
      case 'PROCESSING':
      case 'PENDING':
        return 'text-yellow-400';
      default:
        return 'text-slate-400';
    }
  };

  const getProviderBadge = (provider: string) => {
    const colors = {
      MOONPAY: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      MODULR: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    };

    return colors[provider as keyof typeof colors] || colors.MOONPAY;
  };

  if (isLoadingTransactions) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading transactions...</span>
        </div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
        <div className="text-center text-slate-400">
          <p className="mb-2">No fiat transactions yet</p>
          <p className="text-sm">Buy or sell RAINUM to see your transaction history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
      <h3 className="text-xl font-bold text-white mb-4">Transaction History</h3>

      <div className="space-y-3">
        {transactions.map((tx: FiatTransaction, index: number) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-start justify-between">
              {/* Left side */}
              <div className="flex items-start gap-3">
                {/* Type icon */}
                <div className={`p-2 rounded-lg ${
                  tx.type === 'BUY' ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {tx.type === 'BUY' ? (
                    <ArrowDownCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <ArrowUpCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>

                {/* Details */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">
                      {tx.type === 'BUY' ? 'Buy' : 'Sell'} RAINUM
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getProviderBadge(tx.provider)}`}>
                      {tx.provider}
                    </span>
                  </div>

                  <div className="text-sm text-slate-400 space-y-1">
                    <div>
                      {tx.fiatAmount.toFixed(2)} {tx.fiatCurrency} → {tx.cryptoAmount.toFixed(2)} RAINUM
                    </div>
                    <div className="text-xs">
                      Rate: 1 {tx.fiatCurrency} = {tx.exchangeRate.toFixed(4)} RAINUM
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Blockchain TX hash */}
                  {tx.rainumTxHash && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-indigo-400">
                      <ExternalLink className="w-3 h-3" />
                      <span className="font-mono">{tx.rainumTxHash.slice(0, 16)}...</span>
                    </div>
                  )}

                  {/* Error message */}
                  {tx.errorMessage && (
                    <div className="mt-2 text-xs text-red-400">
                      Error: {tx.errorMessage}
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - Status */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1">
                  {getStatusIcon(tx.status)}
                  <span className={`text-sm font-medium ${getStatusColor(tx.status)}`}>
                    {tx.status}
                  </span>
                </div>

                {tx.feeAmount > 0 && (
                  <div className="text-xs text-slate-500">
                    Fee: {tx.feeAmount.toFixed(2)} {tx.fiatCurrency}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
