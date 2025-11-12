/**
 * Governance Widget (Wallet)
 */

'use client';

import React from 'react';
import { FileText, Plus, Vote } from 'lucide-react';

export function GovernanceWidget() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Governance</h2>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
          <Plus size={18} />
          <span className="font-semibold">Create Proposal</span>
        </button>
      </div>

      <div className="text-center py-12">
        <Vote size={48} className="mx-auto text-gray-300 mb-4" />
        <div className="text-gray-500 mb-2">No active proposals</div>
        <div className="text-sm text-gray-400">
          Participate in network governance by voting on proposals
        </div>
      </div>
    </div>
  );
}
