'use client';

import { useState } from 'react';
import { Code, Shield, Zap, Lock, CheckCircle2 } from 'lucide-react';

export type VMType = 'evm' | 'move';

interface VMSelectorProps {
  value: VMType;
  onChange: (vm: VMType) => void;
  disabled?: boolean;
}

export function VMSelector({ value, onChange, disabled = false }: VMSelectorProps) {
  return (
    <div className="vm-selector">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Execution Method
      </label>

      <div className="grid grid-cols-2 gap-3">
        {/* EVM Option */}
        <button
          type="button"
          onClick={() => onChange('evm')}
          disabled={disabled}
          className={`
            relative p-4 rounded-lg border-2 transition-all
            ${value === 'evm'
              ? 'border-blue-500 bg-blue-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-gray-300'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-start gap-3">
            <Code className={`w-5 h-5 flex-shrink-0 ${value === 'evm' ? 'text-blue-600' : 'text-gray-400'}`} />
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-900">EVM</div>
              <div className="text-xs text-gray-500 mt-0.5">Ethereum Virtual Machine</div>

              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  <span>Fast execution</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Code className="w-3 h-3 text-blue-500" />
                  <span>Solidity compatible</span>
                </div>
              </div>
            </div>

            {value === 'evm' && (
              <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-blue-600" />
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
              Standard
            </span>
          </div>
        </button>

        {/* Move VM Option */}
        <button
          type="button"
          onClick={() => onChange('move')}
          disabled={disabled}
          className={`
            relative p-4 rounded-lg border-2 transition-all
            ${value === 'move'
              ? 'border-purple-500 bg-purple-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-gray-300'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-start gap-3">
            <Shield className={`w-5 h-5 flex-shrink-0 ${value === 'move' ? 'text-purple-600' : 'text-gray-400'}`} />
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-900">Move VM</div>
              <div className="text-xs text-gray-500 mt-0.5">Rainum Move Language</div>

              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Lock className="w-3 h-3 text-purple-500" />
                  <span>Formally verified</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Shield className="w-3 h-3 text-green-500" />
                  <span>Resource-safe</span>
                </div>
              </div>
            </div>

            {value === 'move' && (
              <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-purple-600" />
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
              Enterprise Security
            </span>
          </div>
        </button>
      </div>

      {/* Info box */}
      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-xs text-gray-600">
          {value === 'evm' ? (
            <>
              <strong>EVM Mode:</strong> Compatible with Ethereum tools and contracts. Fast execution, massive ecosystem.
            </>
          ) : (
            <>
              <strong>Move VM Mode:</strong> Mathematically verified security. Assets cannot be lost, copied, or double-spent.
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/// VM Type Badge - Shows which VM was used
export function VMTypeBadge({ type }: { type: VMType }) {
  if (type === 'evm') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
        <Code className="w-3 h-3" />
        EVM
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
        <Shield className="w-3 h-3" />
        Move
      </span>
    );
  }
}
