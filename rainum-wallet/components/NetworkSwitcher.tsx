"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Check, Plus, Trash2, WifiOff, AlertCircle, Wifi } from "lucide-react";
import {
  useNetworkStore,
  getAllNetworks,
  checkNetworkHealth,
  validateNetwork,
  type Network,
} from "@/lib/network-store";

interface NetworkSwitcherProps {
  compact?: boolean;
}

export default function NetworkSwitcher({ compact = false }: NetworkSwitcherProps) {
  const { currentNetwork, switchNetwork, customNetworks, removeCustomNetwork, networkHealth } = useNetworkStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const allNetworks = getAllNetworks();

  // Check network health on mount and when current network changes
  useEffect(() => {
    checkCurrentNetworkHealth();
  }, [currentNetwork.id]);

  const checkCurrentNetworkHealth = async () => {
    setIsCheckingHealth(true);
    const health = await checkNetworkHealth(currentNetwork.rpcUrl);
    useNetworkStore.getState().updateNetworkHealth(currentNetwork.id, health);
    setIsCheckingHealth(false);
  };

  const handleSwitchNetwork = async (network: Network) => {
    switchNetwork(network);
    setShowDropdown(false);

    // Check health of new network
    const health = await checkNetworkHealth(network.rpcUrl);
    useNetworkStore.getState().updateNetworkHealth(network.id, health);
  };

  const handleRemoveCustomNetwork = (networkId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this custom network?')) {
      removeCustomNetwork(networkId);
    }
  };

  const getHealthColor = (networkId: string) => {
    const health = networkHealth[networkId];
    if (!health) return 'text-gray-400';
    if (health === 'healthy') return 'text-green-400';
    if (health === 'degraded') return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthIcon = (networkId: string) => {
    const health = networkHealth[networkId];
    if (isCheckingHealth && networkId === currentNetwork.id) {
      return <Wifi size={14} className="text-cyan-400 animate-pulse" />;
    }
    if (!health) return <WifiOff size={14} className="text-gray-400" />;
    if (health === 'healthy') return <Wifi size={14} className="text-green-400" />;
    if (health === 'degraded') return <AlertCircle size={14} className="text-yellow-400" />;
    return <WifiOff size={14} className="text-red-400" />;
  };

  if (compact) {
    return (
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 border-2 border-white/10 rounded-md hover:bg-white/10 transition-all text-sm"
        >
          {getHealthIcon(currentNetwork.id)}
          <span className="font-medium truncate max-w-[120px]">{currentNetwork.name}</span>
        </motion.button>

        <AnimatePresence>
          {showDropdown && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDropdown(false)}
                className="fixed inset-0 z-40"
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-2 right-0 w-64 bg-gray-900 border-2 border-white/20 rounded-lg shadow-2xl overflow-hidden z-50"
              >
                <NetworkDropdownContent
                  allNetworks={allNetworks}
                  currentNetwork={currentNetwork}
                  onSelectNetwork={handleSwitchNetwork}
                  onRemoveNetwork={handleRemoveCustomNetwork}
                  onAddCustom={() => {
                    setShowDropdown(false);
                    setShowAddModal(true);
                  }}
                  getHealthIcon={getHealthIcon}
                  getHealthColor={getHealthColor}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {showAddModal && (
          <AddCustomNetworkModal
            onClose={() => setShowAddModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white/80">Active Network</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-1.5 hover:bg-white/10 rounded-md transition-all"
        >
          <Plus size={16} className="text-cyan-400" />
        </button>
      </div>

      <div className="space-y-2">
        {allNetworks.map((network) => (
          <motion.button
            key={network.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => handleSwitchNetwork(network)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
              currentNetwork.id === network.id
                ? 'bg-cyan-500/10 border-cyan-500/50'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {getHealthIcon(network.id)}
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold truncate">{network.name}</p>
                <p className="text-xs text-white/40 truncate">{network.rpcUrl}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {currentNetwork.id === network.id && (
                <Check size={18} className="text-cyan-400" />
              )}
              {network.isCustom && (
                <button
                  onClick={(e) => handleRemoveCustomNetwork(network.id, e)}
                  className="p-1 hover:bg-red-500/20 rounded transition-all"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {showAddModal && (
        <AddCustomNetworkModal
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// Dropdown content component
function NetworkDropdownContent({
  allNetworks,
  currentNetwork,
  onSelectNetwork,
  onRemoveNetwork,
  onAddCustom,
  getHealthIcon,
  getHealthColor,
}: {
  allNetworks: Network[];
  currentNetwork: Network;
  onSelectNetwork: (network: Network) => void;
  onRemoveNetwork: (networkId: string, e: React.MouseEvent) => void;
  onAddCustom: () => void;
  getHealthIcon: (networkId: string) => JSX.Element;
  getHealthColor: (networkId: string) => string;
}) {
  return (
    <>
      <div className="p-3 border-b border-white/10">
        <p className="text-xs font-bold text-white/60 uppercase">Select Network</p>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {allNetworks.map((network) => (
          <motion.button
            key={network.id}
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            onClick={() => onSelectNetwork(network)}
            className="w-full flex items-center justify-between p-3 border-b border-white/5 transition-all text-left"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {getHealthIcon(network.id)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{network.name}</p>
                <p className="text-xs text-white/40 truncate">{network.rpcUrl}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {currentNetwork.id === network.id && (
                <Check size={16} className="text-cyan-400" />
              )}
              {network.isCustom && (
                <button
                  onClick={(e) => onRemoveNetwork(network.id, e)}
                  className="p-1 hover:bg-red-500/20 rounded transition-all"
                >
                  <Trash2 size={12} className="text-red-400" />
                </button>
              )}
            </div>
          </motion.button>
        ))}
      </div>

      <motion.button
        whileHover={{ backgroundColor: 'rgba(6, 182, 212, 0.1)' }}
        onClick={onAddCustom}
        className="w-full flex items-center justify-center gap-2 p-3 border-t border-white/10 text-cyan-400 font-medium text-sm"
      >
        <Plus size={16} />
        Add Custom Network
      </motion.button>
    </>
  );
}

// Add custom network modal
function AddCustomNetworkModal({ onClose }: { onClose: () => void }) {
  const { addCustomNetwork } = useNetworkStore();
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    rpcUrl: '',
    explorerUrl: '',
    chainId: '',
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setIsSubmitting(true);

    // Generate ID from name if not provided
    const networkId = formData.id || formData.name.toLowerCase().replace(/\s+/g, '-');

    const network: Network = {
      id: networkId,
      name: formData.name,
      rpcUrl: formData.rpcUrl,
      explorerUrl: formData.explorerUrl || '',
      chainId: formData.chainId || undefined,
      isCustom: true,
    };

    // Validate
    const validation = validateNetwork(network);
    if (!validation.valid) {
      setErrors(validation.errors);
      setIsSubmitting(false);
      return;
    }

    // Test connection
    const health = await checkNetworkHealth(network.rpcUrl);
    if (health === 'offline') {
      setErrors(['Cannot connect to RPC URL. Please check the URL and try again.']);
      setIsSubmitting(false);
      return;
    }

    try {
      addCustomNetwork(network);
      onClose();
    } catch (error: any) {
      setErrors([error.message || 'Failed to add custom network']);
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-gray-900 via-gray-800 to-black border-2 border-cyan-500/30 rounded-xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <Globe className="text-cyan-400" size={24} />
          <h2 className="text-xl font-bold text-white">Add Custom Network</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.length > 0 && (
            <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-3">
              {errors.map((error, idx) => (
                <p key={idx} className="text-sm text-red-400">{error}</p>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Network Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Custom Network"
              className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-cyan-500 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              RPC URL *
            </label>
            <input
              type="url"
              value={formData.rpcUrl}
              onChange={(e) => setFormData({ ...formData, rpcUrl: e.target.value })}
              placeholder="https://rpc.example.com"
              className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-cyan-500 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Explorer URL (optional)
            </label>
            <input
              type="url"
              value={formData.explorerUrl}
              onChange={(e) => setFormData({ ...formData, explorerUrl: e.target.value })}
              placeholder="https://explorer.example.com"
              className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Chain ID (optional)
            </label>
            <input
              type="text"
              value={formData.chainId}
              onChange={(e) => setFormData({ ...formData, chainId: e.target.value })}
              placeholder="1"
              className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/5 border-2 border-white/10 text-white font-bold rounded-lg hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Network'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
