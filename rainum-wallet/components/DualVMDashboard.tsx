'use client';

import { useState } from 'react';
import { Code, Shield, Box, FileCode, Coins, TrendingUp } from 'lucide-react';
import { VMTypeBadge } from './shared/VMSelector';

interface DualVMDashboardProps {
  address: string;
  balance: number;
}

export function DualVMDashboard({ address, balance }: DualVMDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'evm' | 'move'>('overview');

  // Mock data - will be fetched from API
  const evmContracts = 2;  // TODO: Fetch from /contract/list?vm=evm
  const moveModules = 0;   // TODO: Fetch from /move/account/:addr/modules
  const moveResources = 0; // TODO: Fetch from /move/account/:addr/resources

  return (
    <div className="dual-vm-dashboard">
      {/* Header - Shared Account Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Rainum Account</div>
            <div className="text-2xl font-bold text-gray-900 font-mono">{address.slice(0, 10)}...{address.slice(-8)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Balance</div>
            <div className="text-3xl font-bold text-gray-900">{balance.toLocaleString()} <span className="text-xl text-gray-500">RAIN</span></div>
            <div className="text-xs text-gray-500 mt-1">Shared across all VMs</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('evm')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'evm'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Code className="w-4 h-4" />
          EVM
          <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">{evmContracts}</span>
        </button>
        <button
          onClick={() => setActiveTab('move')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'move'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Move
          <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">{moveResources}</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          {/* EVM Assets Card */}
          <div className="bg-white rounded-lg border-2 border-blue-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Code className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">EVM Assets</div>
                <div className="text-xs text-gray-500">Ethereum-compatible</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Contracts Deployed</span>
                <span className="font-semibold">{evmContracts}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">ERC-20 Tokens</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">ERC-721 NFTs</span>
                <span className="font-semibold">0</span>
              </div>
            </div>

            <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Deploy EVM Contract
            </button>
          </div>

          {/* Move Assets Card */}
          <div className="bg-white rounded-lg border-2 border-purple-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Move Assets</div>
                <div className="text-xs text-gray-500">Formally verified</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Modules Published</span>
                <span className="font-semibold">{moveModules}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Resources Owned</span>
                <span className="font-semibold">{moveResources}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Fungible Tokens</span>
                <span className="font-semibold">0</span>
              </div>
            </div>

            <button className="w-full mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Publish Move Module
            </button>
          </div>
        </div>
      )}

      {activeTab === 'evm' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">EVM Contracts & Assets</h3>
          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
            <Code className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No EVM contracts deployed yet</p>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Deploy Your First Contract
            </button>
          </div>
        </div>
      )}

      {activeTab === 'move' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Move Modules & Resources</h3>

          {/* Coming Soon Notice */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-4">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-purple-600 flex-shrink-0" />
              <div>
                <div className="font-semibold text-purple-900 mb-1">Move VM Coming Soon</div>
                <div className="text-sm text-purple-700">
                  Rainum Move VM is currently in development (Phase 1 complete).
                  Full Move language support will be available in Q2 2026.
                </div>
                <div className="mt-3 text-xs text-purple-600">
                  ✅ Phase 1: Foundation complete
                  <br />
                  🚧 Phase 2-7: Runtime integration in progress
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
            <Box className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No Move resources owned yet</p>
            <button
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              disabled
            >
              Publish Move Module (Coming Soon)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
