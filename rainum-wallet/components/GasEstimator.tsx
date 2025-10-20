"use client";

import { useState, useEffect } from "react";
import { estimateGas, getGasPriorityLabel, formatGas, type GasEstimateResponse } from "@/lib/rainum-api";
import { Zap, Clock, TrendingDown } from "lucide-react";

interface GasEstimatorProps {
  from: string;
  to: string;
  amount: string;
  onPriorityChange?: (priority: string) => void;
  onGasEstimate?: (estimate: GasEstimateResponse | null) => void;
}

export function GasEstimator({ from, to, amount, onPriorityChange, onGasEstimate }: GasEstimatorProps) {
  const [selectedPriority, setSelectedPriority] = useState<string>("standard");
  const [gasEstimate, setGasEstimate] = useState<GasEstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Initial loading animation on mount (2-3 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2500); // 2.5 seconds
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log('GasEstimator useEffect triggered:', { from, to, amount, selectedPriority });

    if (!from || !to || !amount || parseFloat(amount) <= 0) {
      console.log('GasEstimator: Invalid input, clearing estimate');
      setGasEstimate(null);
      if (onGasEstimate) onGasEstimate(null);
      return;
    }

    const fetchGasEstimate = async () => {
      console.log('GasEstimator: Fetching estimate...');
      setLoading(true);
      setError(null);

      try {
        // Strip commas from amount before sending to API
        const cleanAmount = amount.replace(/,/g, '');
        console.log('GasEstimator: Cleaned amount:', cleanAmount);

        const estimate = await estimateGas({
          from,
          to,
          amount: cleanAmount,
          priority: selectedPriority,
          tier: 1, // Default tier, can be made dynamic
        });

        console.log('GasEstimator: Got estimate:', estimate);
        setGasEstimate(estimate);
        if (onGasEstimate) onGasEstimate(estimate);
      } catch (err: any) {
        console.error('GasEstimator error:', err);
        const errorMessage = err.message || "Failed to estimate gas";
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
          setError("Cannot connect to blockchain. Please check your network selection.");
        } else {
          setError(errorMessage);
        }
        if (onGasEstimate) onGasEstimate(null);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchGasEstimate, 500);
    return () => clearTimeout(debounce);
  }, [from, to, amount, selectedPriority, onGasEstimate]);

  const handlePriorityChange = (priority: string) => {
    setSelectedPriority(priority);
    if (onPriorityChange) onPriorityChange(priority);
  };

  // Show initial loading animation
  if (initialLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-semibold text-gray-900">Transaction Speed</label>
          <div className="grid grid-cols-3 gap-3">
            {['Economy', 'Standard', 'Express'].map((name, idx) => (
              <div key={name} className="flex flex-col items-center p-4 rounded bg-white border border-gray-300 animate-pulse">
                <div className="w-6 h-6 mb-2 bg-gray-200 rounded"></div>
                <div className="h-3 w-16 mb-1 bg-gray-200 rounded"></div>
                <div className="h-3 w-12 mb-1 bg-gray-200 rounded"></div>
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-300 rounded p-4 space-y-3 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="text-center text-sm text-gray-600">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          Fetching current gas prices...
        </div>
      </div>
    );
  }

  // Show loading state or empty state
  if (!gasEstimate || !gasEstimate.success) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-gray-700">Transaction Speed</label>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" disabled className="flex flex-col items-center p-3 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed">
              <TrendingDown className="w-5 h-5 mb-1 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500">Economy</span>
              <span className="text-xs text-gray-400">~30s</span>
              <span className="text-xs font-bold text-gray-400 mt-1">--- RAIN</span>
            </button>
            <button type="button" disabled className="flex flex-col items-center p-3 rounded-lg border-2 border-blue-300 bg-blue-50 opacity-50 cursor-not-allowed">
              <Clock className="w-5 h-5 mb-1 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500">Standard</span>
              <span className="text-xs text-gray-400">~12s</span>
              <span className="text-xs font-bold text-gray-400 mt-1">--- RAIN</span>
            </button>
            <button type="button" disabled className="flex flex-col items-center p-3 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed">
              <Zap className="w-5 h-5 mb-1 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500">Express</span>
              <span className="text-xs text-gray-400">~6s</span>
              <span className="text-xs font-bold text-gray-400 mt-1">--- RAIN</span>
            </button>
          </div>
        </div>
        {loading && (
          <div className="text-center text-sm text-gray-500">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Calculating gas fees...
          </div>
        )}
        {!loading && !error && !from && !to && !amount && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">Enter recipient address and amount to see gas fees</p>
          </div>
        )}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-red-800 mb-1">Gas Estimation Failed</p>
            <p className="text-xs text-red-700">{error}</p>
            <p className="text-xs text-red-600 mt-2">Make sure you're connected to Devnet (localhost:8080)</p>
          </div>
        )}
      </div>
    );
  }

  const { priority_options, from_balance, sufficient_balance } = gasEstimate.estimate;

  return (
    <div className="space-y-4">
      {/* Priority Selector */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-semibold text-gray-900">Transaction Speed</label>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handlePriorityChange("economy")}
            className={`flex flex-col items-center p-4 rounded transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
              selectedPriority === "economy"
                ? "bg-blue-600 ring-2 ring-blue-600 ring-offset-2 scale-105 shadow-lg"
                : "bg-white border border-gray-300 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md"
            }`}
          >
            <TrendingDown className={`w-6 h-6 mb-2 transition-transform duration-300 ${
              selectedPriority === "economy" ? "text-white animate-pulse" : "text-gray-700 group-hover:scale-110"
            }`} />
            <span className={`text-xs font-semibold mb-1 transition-colors ${
              selectedPriority === "economy" ? "text-white" : "text-gray-900"
            }`}>Economy</span>
            <span className={`text-xs mb-1 transition-colors ${
              selectedPriority === "economy" ? "text-blue-100" : "text-gray-600"
            }`}>~30s</span>
            <span className={`text-sm font-bold transition-all ${
              selectedPriority === "economy" ? "text-white scale-110" : "text-gray-900"
            }`}>
              {formatGas(priority_options.economy.total_gas_cost)} RAIN
            </span>
          </button>

          <button
            type="button"
            onClick={() => handlePriorityChange("standard")}
            className={`flex flex-col items-center p-4 rounded transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
              selectedPriority === "standard"
                ? "bg-blue-600 ring-2 ring-blue-600 ring-offset-2 scale-105 shadow-lg"
                : "bg-white border border-gray-300 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md"
            }`}
          >
            <Clock className={`w-6 h-6 mb-2 transition-transform duration-300 ${
              selectedPriority === "standard" ? "text-white animate-pulse" : "text-gray-700"
            }`} />
            <span className={`text-xs font-semibold mb-1 transition-colors ${
              selectedPriority === "standard" ? "text-white" : "text-gray-900"
            }`}>Standard</span>
            <span className={`text-xs mb-1 transition-colors ${
              selectedPriority === "standard" ? "text-blue-100" : "text-gray-600"
            }`}>~12s</span>
            <span className={`text-sm font-bold transition-all ${
              selectedPriority === "standard" ? "text-white scale-110" : "text-gray-900"
            }`}>
              {formatGas(priority_options.standard.total_gas_cost)} RAIN
            </span>
          </button>

          <button
            type="button"
            onClick={() => handlePriorityChange("express")}
            className={`flex flex-col items-center p-4 rounded transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
              selectedPriority === "express"
                ? "bg-blue-600 ring-2 ring-blue-600 ring-offset-2 scale-105 shadow-lg"
                : "bg-white border border-gray-300 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md"
            }`}
          >
            <Zap className={`w-6 h-6 mb-2 transition-transform duration-300 ${
              selectedPriority === "express" ? "text-white animate-pulse" : "text-gray-700"
            }`} />
            <span className={`text-xs font-semibold mb-1 transition-colors ${
              selectedPriority === "express" ? "text-white" : "text-gray-900"
            }`}>Express</span>
            <span className={`text-xs mb-1 transition-colors ${
              selectedPriority === "express" ? "text-blue-100" : "text-gray-600"
            }`}>~6s</span>
            <span className={`text-sm font-bold transition-all ${
              selectedPriority === "express" ? "text-white scale-110" : "text-gray-900"
            }`}>
              {formatGas(priority_options.express.total_gas_cost)} RAIN
            </span>
          </button>
        </div>
      </div>

      {/* Gas Breakdown */}
      <div className="bg-white border border-gray-300 rounded p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">Gas Limit:</span>
          <span className="font-mono text-gray-900 font-semibold">{gasEstimate.estimate.gas_limit.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">Base Fee:</span>
          <span className="font-mono text-gray-900">
            {formatGas(priority_options[selectedPriority as keyof typeof priority_options].base_fee, true)} RAIN/gas
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">Priority Fee:</span>
          <span className="font-mono text-gray-900">
            {formatGas(priority_options[selectedPriority as keyof typeof priority_options].priority_fee, true)} RAIN/gas
          </span>
        </div>
        <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
          <span className="text-gray-800 font-semibold">Total Gas Fee:</span>
          <span className="font-mono text-blue-600 font-bold">
            {formatGas(priority_options[selectedPriority as keyof typeof priority_options].total_gas_cost)} RAIN
          </span>
        </div>
        <div className="border-t-2 border-gray-300 pt-2 flex justify-between bg-blue-50 rounded -mx-4 -mb-4 px-4 py-3 mt-3">
          <span className="text-gray-900 font-bold">Total Cost:</span>
          <span className="font-mono text-gray-900 font-bold text-lg">
            {(() => {
              // Calculate correct total: transfer amount + gas cost
              const transferAmount = gasEstimate.estimate.transfer_amount || 0;
              const gasCost = priority_options[selectedPriority as keyof typeof priority_options].total_gas_cost / 1_000_000;
              const total = transferAmount + gasCost;
              return total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            })()} RAIN
          </span>
        </div>
      </div>

      {/* Balance Warning */}
      {!sufficient_balance && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">
            ⚠️ Insufficient balance. You need{" "}
            {(() => {
              const transferAmount = gasEstimate.estimate.transfer_amount || 0;
              const gasCost = priority_options[selectedPriority as keyof typeof priority_options].total_gas_cost / 1_000_000;
              const total = transferAmount + gasCost;
              return total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            })()} RAIN
            but only have {formatGas(from_balance)} RAIN
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center text-sm text-gray-500">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          Calculating gas fees...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}
