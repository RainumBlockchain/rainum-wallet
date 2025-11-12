/**
 * Privacy Widget (Wallet)
 */

'use client';

import React, { useState } from 'react';
import { Shield, Lock, Eye, EyeOff } from 'lucide-react';

export function PrivacyWidget() {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Shield size={32} />
          <div>
            <h3 className="text-xl font-bold">Privacy Mode</h3>
            <p className="text-sm opacity-90">
              {enabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setEnabled(!enabled)}
          className={`w-16 h-9 rounded-full transition-colors ${
            enabled ? 'bg-white' : 'bg-white/30'
          }`}
        >
          <div
            className={`w-7 h-7 bg-green-600 rounded-full transition-transform ${
              enabled ? 'translate-x-8' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-2 mt-6 pt-4 border-t border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EyeOff size={18} />
              <span>Shielded Balance</span>
            </div>
            <span className="font-bold">0 RAIN</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={18} />
              <span>Public Balance</span>
            </div>
            <span className="font-bold">0 RAIN</span>
          </div>
        </div>
      )}
    </div>
  );
}
