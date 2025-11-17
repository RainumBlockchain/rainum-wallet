"use client";

/**
 * BuySellPanel Component
 *
 * Main UI for buying and selling RAINUM with fiat currency
 */

import { useState, useEffect } from 'react';
import { useFiatStore } from '@/lib/fiat-store';
import { useWalletStore } from '@/lib/wallet-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  ArrowRightLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Info,
} from 'lucide-react';

type TabType = 'buy' | 'sell';

export default function BuySellPanel() {
  const { address } = useWalletStore();
  const {
    selectedProvider,
    selectedTransactionType,
    currentQuote,
    isLoadingQuote,
    setSelectedProvider,
    setSelectedTransactionType,
    getQuote,
    createModulrCustomer,
    createMoonPayTransaction,
    initiateWithdrawal,
  } = useFiatStore();

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('buy');
  const [fiatAmount, setFiatAmount] = useState<string>('100');
  const [fiatCurrency, setFiatCurrency] = useState<string>('EUR');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get quote when amount or currency changes
  useEffect(() => {
    const amount = parseFloat(fiatAmount);
    if (amount > 0 && !isNaN(amount)) {
      const timer = setTimeout(() => {
        getQuote(selectedProvider, fiatCurrency, amount);
      }, 500); // Debounce

      return () => clearTimeout(timer);
    }
  }, [fiatAmount, fiatCurrency, selectedProvider]);

  // Update transaction type when tab changes
  useEffect(() => {
    setSelectedTransactionType(activeTab === 'buy' ? 'BUY' : 'SELL');
  }, [activeTab]);

  const handleBuy = async () => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const amount = parseFloat(fiatAmount);

      if (selectedProvider === 'MOONPAY') {
        // MoonPay: Generate widget URL
        const result = await createMoonPayTransaction({
          walletAddress: address,
          type: 'BUY',
          baseCurrency: fiatCurrency,
          baseCurrencyAmount: amount,
        });

        // Open MoonPay widget in new window
        window.open(result.widgetUrl, '_blank');

        setSuccess('MoonPay widget opened! Complete the purchase there.');

      } else {
        // Modulr: Show account details for bank transfer
        setSuccess('Opening Modulr setup...');
        // TODO: Show modal with Modulr account details
        alert('Modulr integration: Show bank account details for transfer');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to process purchase');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSell = async () => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const rainumAmount = currentQuote?.quoteCurrencyAmount || 0;

      if (selectedProvider === 'MOONPAY') {
        // MoonPay sell
        const result = await createMoonPayTransaction({
          walletAddress: address,
          type: 'SELL',
          baseCurrency: fiatCurrency,
        });

        window.open(result.widgetUrl, '_blank');
        setSuccess('MoonPay sell widget opened!');

      } else {
        // Modulr withdrawal
        // TODO: Get user's bank details
        alert('Please provide your bank account details for withdrawal');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to process sale');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-indigo-400" />
          Buy / Sell RAINUM
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-800/50 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('buy')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'buy'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Buy RAINUM
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'sell'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sell RAINUM
        </button>
      </div>

      {/* Provider Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Payment Provider
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedProvider('MOONPAY')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedProvider === 'MOONPAY'
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="font-semibold text-white mb-1">MoonPay</div>
            <div className="text-xs text-slate-400">2.9% fee • Fast • Global</div>
          </button>
          <button
            onClick={() => setSelectedProvider('MODULR')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedProvider === 'MODULR'
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="font-semibold text-white mb-1">Modulr</div>
            <div className="text-xs text-slate-400">0.5% fee • EU/UK only</div>
          </button>
        </div>
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {activeTab === 'buy' ? 'You Pay' : 'You Receive'}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              value={fiatAmount}
              onChange={(e) => setFiatAmount(e.target.value)}
              placeholder="100"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={fiatCurrency}
            onChange={(e) => setFiatCurrency(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      </div>

      {/* Exchange Arrow */}
      <div className="flex justify-center my-4">
        <div className="bg-slate-800 rounded-full p-2">
          <ArrowRightLeft className="w-5 h-5 text-slate-400" />
        </div>
      </div>

      {/* Quote Display */}
      <div className="mb-6 bg-slate-800/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">
            {activeTab === 'buy' ? 'You Receive' : 'You Pay'}
          </span>
          {isLoadingQuote && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
        </div>

        {currentQuote ? (
          <>
            <div className="text-2xl font-bold text-white mb-3">
              {currentQuote.quoteCurrencyAmount.toFixed(2)} RAINUM
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Exchange Rate</span>
                <span className="text-white">
                  1 {currentQuote.baseCurrency} = {currentQuote.exchangeRate.toFixed(2)} RAINUM
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Fee ({selectedProvider})</span>
                <span className="text-white">
                  {currentQuote.feeAmount.toFixed(2)} {currentQuote.baseCurrency}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-slate-500 text-center py-4">
            Enter an amount to see quote
          </div>
        )}
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-2"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-200">{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg flex items-start gap-2"
          >
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-green-200">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Button */}
      <button
        onClick={activeTab === 'buy' ? handleBuy : handleSell}
        disabled={isProcessing || !currentQuote || parseFloat(fiatAmount) <= 0}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            {activeTab === 'buy' ? 'Buy RAINUM' : 'Sell RAINUM'}
            <ExternalLink className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Info Note */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-200">
          {selectedProvider === 'MOONPAY'
            ? 'MoonPay will open in a new window. Complete KYC and payment there. RAINUM will be credited to your wallet automatically.'
            : 'Modulr requires a one-time account setup. You\'ll receive bank details to transfer funds.'}
        </p>
      </div>
    </div>
  );
}
