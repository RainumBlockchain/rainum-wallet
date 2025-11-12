/**
 * Tokens List Component (Wallet)
 */

'use client';

import React from 'react';
import { useTokenStore } from '../lib/token-store';
import { Plus, TrendingUp } from 'lucide-react';

export function TokensList() {
  const tokens = useTokenStore((state) => state.tokens);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Tokens</h2>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors">
          <Plus size={18} />
          <span className="font-semibold">Add Token</span>
        </button>
      </div>

      <div className="space-y-3">
        {tokens.map((token) => (
          <div
            key={token.address}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xl font-bold text-blue-600">
                    {token.symbol[0]}
                  </span>
                </div>
                <div>
                  <div className="font-bold text-gray-900">{token.symbol}</div>
                  <div className="text-sm text-gray-500">{token.name}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-gray-900">
                  {token.balance || '0'} {token.symbol}
                </div>
                {token.balanceUSD && (
                  <div className="text-sm text-gray-500">
                    ${token.balanceUSD.toFixed(2)}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2">
              <span className={`text-xs px-2 py-1 rounded ${
                token.vm === 'evm'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {token.vm.toUpperCase()}
              </span>
            </div>
          </div>
        ))}

        {tokens.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No tokens added yet
          </div>
        )}
      </div>
    </div>
  );
}
