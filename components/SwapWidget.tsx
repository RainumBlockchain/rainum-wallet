/**
 * Swap Widget (Wallet)
 */

'use client';

import React, { useState } from 'react';
import { ArrowDownUp, Settings } from 'lucide-react';

export function SwapWidget() {
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Swap</h2>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {/* From */}
        <div className="p-4 border-2 border-gray-200 rounded-xl focus-within:border-blue-500">
          <div className="text-sm text-gray-500 mb-2">From</div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="flex-1 text-3xl font-bold outline-none"
            />
            <button className="px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg font-semibold text-blue-600">
              RAIN
            </button>
          </div>
        </div>

        {/* Swap Icon */}
        <div className="flex justify-center">
          <button className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors">
            <ArrowDownUp size={20} />
          </button>
        </div>

        {/* To */}
        <div className="p-4 border-2 border-gray-200 rounded-xl">
          <div className="text-sm text-gray-500 mb-2">To</div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="0.0"
              value={toAmount}
              disabled
              className="flex-1 text-3xl font-bold outline-none text-gray-400"
            />
            <button className="px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg font-semibold text-blue-600">
              Select
            </button>
          </div>
        </div>

        {/* Swap Button */}
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-bold text-lg transition-colors">
          Swap
        </button>
      </div>
    </div>
  );
}
