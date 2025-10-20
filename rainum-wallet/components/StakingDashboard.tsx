/**
 * Staking Dashboard Component
 * Validator registration, delegation, and rewards tracking
 */

'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Shield,
  Award,
  Plus,
  ArrowRight,
  AlertCircle,
  Clock,
  DollarSign,
  Activity,
  Loader2,
  Check,
  X,
  ChevronDown,
  ExternalLink,
  Zap,
  Edit,
  ArrowUp,
  ArrowDown,
  CheckCircle
} from 'lucide-react';
import { useWalletStore } from '@/lib/wallet-store';
import {
  getValidators,
  getValidatorInfo,
  getDelegations,
  registerValidator,
  delegateToValidator,
  undelegateFromValidator,
  unjailValidator,
  updateValidatorProfile,
  addValidatorStake,
  upgradeValidatorTier,
  unstakeValidator,
  withdrawValidator,
  getUnbondingStatus,
  type ValidatorInfo,
  type DelegationInfo,
  type UnbondingStatus
} from '@/lib/rainum-api';
import { toast } from '@/lib/toast-store';
import { formatBalance } from '@/lib/format-balance';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';

import { createAvatar } from '@dicebear/core';
import { identicon, shapes, thumbs, bottts, pixelArt, rings } from '@dicebear/collection';

// Avatar style presets with crypto-inspired designs
const AVATAR_STYLES = [
  {
    id: 'identicon',
    name: 'Identicon',
    description: 'Ethereum-style',
    generator: (seed: string) => createAvatar(identicon, { seed, backgroundColor: ['0008ff', '000000', 'ffffff'] }).toDataUri()
  },
  {
    id: 'pixelart',
    name: 'Pixel Art',
    description: 'Retro crypto punk',
    generator: (seed: string) => createAvatar(pixelArt, { seed, backgroundColor: ['0008ff', '000000', 'ffffff'] }).toDataUri()
  },
  {
    id: 'bottts',
    name: 'Bottts',
    description: 'Robot avatar',
    generator: (seed: string) => createAvatar(bottts, { seed, backgroundColor: ['0008ff', '000000', 'ffffff'] }).toDataUri()
  },
  {
    id: 'shapes',
    name: 'Shapes',
    description: 'Geometric',
    generator: (seed: string) => createAvatar(shapes, { seed, backgroundColor: ['0008ff'] }).toDataUri()
  },
  {
    id: 'rings',
    name: 'Rings',
    description: 'Abstract rings',
    generator: (seed: string) => createAvatar(rings, { seed, backgroundColor: ['0008ff'] }).toDataUri()
  },
  {
    id: 'thumbs',
    name: 'Thumbs',
    description: 'Hand signs',
    generator: (seed: string) => createAvatar(thumbs, { seed, backgroundColor: ['0008ff', '000000', 'ffffff'] }).toDataUri()
  },
];

export default function StakingDashboard() {
  const { address, mnemonic, getPrivateKey, activeAccountIndex, accounts } = useWalletStore();

  // State
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [myValidatorInfo, setMyValidatorInfo] = useState<ValidatorInfo | null>(null);
  const [delegations, setDelegations] = useState<DelegationInfo[]>([]);
  const [walletValidators, setWalletValidators] = useState<Map<string, number>>(new Map()); // address -> account index
  const [loading, setLoading] = useState(true);

  // UI State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [selectedValidator, setSelectedValidator] = useState<ValidatorInfo | null>(null);

  // Validator Staking Modals
  const [showAddStakeModal, setShowAddStakeModal] = useState(false);
  const [showUpgradeTierModal, setShowUpgradeTierModal] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [showWithdrawRewardsModal, setShowWithdrawRewardsModal] = useState(false);

  // Unbonding State
  const [unbondingStatus, setUnbondingStatus] = useState<UnbondingStatus | null>(null);

  // Form State
  const [registerStake, setRegisterStake] = useState('');
  const [registerTier, setRegisterTier] = useState(1);
  const [delegateAmount, setDelegateAmount] = useState('');
  const [addStakeAmount, setAddStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [upgradeToTier, setUpgradeToTier] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);

  // Profile Edit State
  const [profileNickname, setProfileNickname] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [profileDescription, setProfileDescription] = useState('');
  const [profileWebsite, setProfileWebsite] = useState('');
  const [avatarMode, setAvatarMode] = useState<'preset' | 'custom'>('preset');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [avatarSeed, setAvatarSeed] = useState<string>('');
  const [previewAvatar, setPreviewAvatar] = useState<string>('');

  // Format number with thousand separators (dots) and decimal comma
  const formatNumber = (value: string): string => {
    // Remove all non-digit and non-comma characters
    const cleaned = value.replace(/[^\d,]/g, '');

    // Split by comma to separate integer and decimal parts
    const parts = cleaned.split(',');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Add thousand separators (dots) to integer part
    const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // Return with decimal part if present
    return decimalPart !== undefined ? `${formatted},${decimalPart.slice(0, 2)}` : formatted;
  };

  // Parse formatted number back to plain number (remove dots, replace comma with dot)
  const parseFormattedNumber = (formatted: string): number => {
    if (!formatted || formatted.trim() === '') {
      return 0;
    }
    const cleaned = formatted.trim().replace(/\./g, '').replace(',', '.');
    const result = parseFloat(cleaned);
    return isNaN(result) ? 0 : result;
  };

  // Open register modal with proper initialization
  const openRegisterModal = () => {
    const tierInfo = TIER_INFO[registerTier as keyof typeof TIER_INFO];
    if (tierInfo) {
      setRegisterStake(formatNumber(tierInfo.stake.toString()));
    }
    setShowRegisterModal(true);
  };

  // Load data on mount
  useEffect(() => {
    if (address) {
      loadData();
    }
  }, [address]);

  // Poll unbonding status every 10 seconds if unbonding in progress
  useEffect(() => {
    if (!address || !myValidatorInfo) return;

    const loadUnbonding = async () => {
      try {
        const status = await getUnbondingStatus(address);
        setUnbondingStatus(status);
      } catch (error) {
        console.error('Failed to load unbonding status:', error);
      }
    };

    // Load immediately
    loadUnbonding();

    // Poll every 10 seconds if unbonding
    const interval = setInterval(() => {
      if (unbondingStatus?.has_unbonding) {
        loadUnbonding();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [address, myValidatorInfo, unbondingStatus?.has_unbonding]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Check all wallet accounts for validator status
      const walletValidatorChecks = await Promise.all(
        accounts.map(async (account) => {
          const validatorInfo = await getValidatorInfo(account.address);
          return { account, validatorInfo };
        })
      );

      // Build map of wallet addresses that are validators
      const walletValidatorMap = new Map<string, number>();
      const walletValidatorsList: ValidatorInfo[] = [];

      walletValidatorChecks.forEach(({ account, validatorInfo }) => {
        if (validatorInfo) {
          walletValidatorMap.set(validatorInfo.address.toLowerCase(), account.index);
          walletValidatorsList.push(validatorInfo);
        }
      });

      // Get delegations for current account
      const delegationsList = address ? await getDelegations(address) : [];

      // Get addresses of validators we've delegated to
      const delegatedValidatorAddresses = new Set(
        delegationsList.map(d => d.validator.toLowerCase())
      );

      // Fetch full info for delegated validators
      const delegatedValidatorsInfo = await Promise.all(
        Array.from(delegatedValidatorAddresses).map(addr => getValidatorInfo(addr))
      );

      // Combine wallet validators + delegated validators
      const relevantValidators = [
        ...walletValidatorsList,
        ...delegatedValidatorsInfo.filter(v => v !== null) as ValidatorInfo[]
      ].filter((v, index, self) =>
        // Remove duplicates by address
        index === self.findIndex(t => t.address.toLowerCase() === v.address.toLowerCase())
      );

      setValidators(relevantValidators);
      setWalletValidators(walletValidatorMap);
      setMyValidatorInfo(walletValidatorsList.find(v => v.address.toLowerCase() === address?.toLowerCase()) || null);
      setDelegations(delegationsList);
    } catch (error) {
      console.error('Failed to load staking data:', error);
      toast.error('Load Failed', 'Could not load staking data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total stats (handle undefined values)
  // Include validator's own stake + delegations
  const validatorStake = myValidatorInfo?.stake || 0;
  const delegationStake = delegations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalStaked = validatorStake + delegationStake;
  const totalRewards = (myValidatorInfo?.total_rewards || 0) + delegations.reduce((sum, d) => sum + (d.rewards || 0), 0);
  const activeValidatorsCount = validators.filter(v => v.active && !v.jailed).length;

  // Tier info
  const TIER_INFO = {
    1: { name: 'Bronze', stake: 10000, multiplier: '1x', color: 'from-orange-400 to-orange-600' },
    2: { name: 'Silver', stake: 50000, multiplier: '1.5x', color: 'from-gray-300 to-gray-500' },
    3: { name: 'Gold', stake: 100000, multiplier: '2x', color: 'from-yellow-400 to-yellow-600' },
  };

  const handleRegisterValidator = async () => {
    if (!address || !mnemonic) {
      toast.error('Wallet Required', 'Please connect your wallet');
      return;
    }

    console.log('Register validator - raw input:', registerStake);
    const stake = parseFormattedNumber(registerStake);
    console.log('Register validator - parsed stake:', stake);

    if (isNaN(stake) || stake <= 0) {
      console.error('Invalid stake amount:', { registerStake, stake, isNaN: isNaN(stake) });
      toast.error('Invalid Amount', 'Please enter a valid stake amount');
      return;
    }

    const tierInfo = TIER_INFO[registerTier as keyof typeof TIER_INFO];
    if (!tierInfo) {
      toast.error('Invalid Tier', 'Please select a valid validator tier');
      return;
    }

    console.log('Validating stake:', { stake, required: tierInfo.stake, tier: registerTier });
    if (stake < tierInfo.stake) {
      toast.error('Insufficient Stake', `${tierInfo.name} tier requires ${tierInfo.stake.toLocaleString()} RAIN minimum`);
      return;
    }

    try {
      setIsProcessing(true);
      await registerValidator(address, stake, registerTier);

      toast.success('Validator Registered', `You are now a ${tierInfo.name} validator`);
      setShowRegisterModal(false);
      setRegisterStake('');
      setRegisterTier(1);
      await loadData();
    } catch (error: any) {
      toast.error('Registration Failed', error.message || 'Failed to register as validator');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelegate = async () => {
    if (!address || !mnemonic || !selectedValidator) {
      toast.error('Error', 'Missing required information');
      return;
    }

    const amount = parseFormattedNumber(delegateAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    try {
      setIsProcessing(true);
      const privateKey = getPrivateKey(activeAccountIndex);

      if (!privateKey) {
        throw new Error('Could not retrieve private key');
      }

      await delegateToValidator(address, selectedValidator.address, amount, privateKey);

      toast.success('Delegation Success', `Delegated ${amount} RAIN to validator`);
      setShowDelegateModal(false);
      setDelegateAmount('');
      setSelectedValidator(null);
      await loadData();
    } catch (error: any) {
      toast.error('Delegation Failed', error.message || 'Failed to delegate');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditProfile = async () => {
    if (!address) {
      toast.error('Error', 'Wallet address required');
      return;
    }

    try {
      setIsProcessing(true);

      // Generate avatar based on mode
      let avatarUrl = profileAvatarUrl;
      if (avatarMode === 'preset' && selectedStyle && avatarSeed) {
        const style = AVATAR_STYLES.find(s => s.id === selectedStyle);
        if (style) {
          avatarUrl = style.generator(avatarSeed);
        }
      }

      await updateValidatorProfile({
        address,
        nickname: profileNickname || undefined,
        avatar_url: avatarUrl || undefined,
        description: profileDescription || undefined,
        website: profileWebsite || undefined,
      });

      toast.success('Profile Updated', 'Validator profile updated successfully');
      setShowEditProfileModal(false);
      await loadData();
    } catch (error: any) {
      toast.error('Update Failed', error.message || 'Failed to update profile');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndelegate = async (validatorAddress: string, amount: number) => {
    if (!address || !mnemonic) {
      toast.error('Wallet Required', 'Please connect your wallet');
      return;
    }

    if (!confirm(`Are you sure you want to undelegate ${amount} RAIN?`)) {
      return;
    }

    try {
      const privateKey = getPrivateKey(activeAccountIndex);

      if (!privateKey) {
        throw new Error('Could not retrieve private key');
      }

      await undelegateFromValidator(address, validatorAddress, amount, privateKey);

      toast.success('Undelegation Success', `Undelegated ${amount} RAIN`);
      await loadData();
    } catch (error: any) {
      toast.error('Undelegation Failed', error.message || 'Failed to undelegate');
    }
  };

  const handleUnjail = async () => {
    if (!address || !mnemonic) {
      toast.error('Wallet Required', 'Please connect your wallet');
      return;
    }

    if (!confirm('Are you sure you want to unjail your validator? This may require a fee.')) {
      return;
    }

    try {
      setIsProcessing(true);
      const privateKey = getPrivateKey(activeAccountIndex);

      if (!privateKey) {
        throw new Error('Could not retrieve private key');
      }

      await unjailValidator(address, privateKey);

      toast.success('Validator Unjailed', 'Your validator has been unjailed successfully');
      await loadData();
    } catch (error: any) {
      toast.error('Unjail Failed', error.message || 'Failed to unjail validator');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdrawRewards = async () => {
    if (!address || !myValidatorInfo) {
      toast.error('Wallet Required', 'Please connect your wallet');
      return;
    }

    if (myValidatorInfo.total_rewards <= 0) {
      toast.error('No Rewards', 'You have no rewards to withdraw');
      return;
    }

    // Open modal instead of browser confirm
    setShowWithdrawRewardsModal(true);
  };

  const confirmWithdrawRewards = async () => {
    try {
      setIsProcessing(true);

      if (!myValidatorInfo) {
        toast.error('Error', 'Validator info not found');
        return;
      }

      // Call new withdraw rewards endpoint
      const response = await fetch(`http://localhost:8080/validator/withdraw-rewards/${address}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Rewards Withdrawn!', `Successfully withdrew ${formatBalance(myValidatorInfo.total_rewards).main} RAIN`);
        setShowWithdrawRewardsModal(false);
        // Reload data to show updated balance and reset rewards
        await loadData();
        // Update main balance
        if (typeof window !== 'undefined') {
          const { useWalletStore } = await import('@/lib/wallet-store');
          await useWalletStore.getState().updateBalance();
        }
      } else {
        toast.error('Withdrawal Failed', data.message || 'Could not withdraw rewards');
      }
    } catch (error: any) {
      toast.error('Withdrawal Failed', error.message || 'Failed to withdraw rewards');
    } finally {
      setIsProcessing(false);
    }
  };

  const openDelegateModal = (validator: ValidatorInfo) => {
    setSelectedValidator(validator);
    setShowDelegateModal(true);
  };

  // Validator Staking Handlers
  const handleAddStake = async () => {
    if (!address) {
      toast.error('Wallet Required', 'Please connect your wallet');
      return;
    }

    const amount = parseFormattedNumber(addStakeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid stake amount');
      return;
    }

    try {
      setIsProcessing(true);
      await addValidatorStake(address, amount);

      toast.success('Stake Added', `Added ${formatBalance(amount).main}${formatBalance(amount).suffix} RAIN to your validator stake`);
      setShowAddStakeModal(false);
      setAddStakeAmount('');
      await loadData();
    } catch (error: any) {
      toast.error('Add Stake Failed', error.message || 'Failed to add stake');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgradeTier = async () => {
    if (!address || !myValidatorInfo) {
      toast.error('Wallet Required', 'Please connect your wallet');
      return;
    }

    const tierInfo = TIER_INFO[upgradeToTier as keyof typeof TIER_INFO];
    if (!tierInfo) {
      toast.error('Invalid Tier', 'Please select a valid tier');
      return;
    }

    if (myValidatorInfo.stake < tierInfo.stake) {
      toast.error('Insufficient Stake', `You need ${formatBalance(tierInfo.stake).main}${formatBalance(tierInfo.stake).suffix} RAIN staked to upgrade to ${tierInfo.name}`);
      return;
    }

    try {
      setIsProcessing(true);
      await upgradeValidatorTier(address, upgradeToTier);

      toast.success('Tier Upgraded', `Successfully upgraded to ${tierInfo.name} tier`);
      setShowUpgradeTierModal(false);
      await loadData();
    } catch (error: any) {
      toast.error('Upgrade Failed', error.message || 'Failed to upgrade tier');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnstake = async () => {
    if (!address || !myValidatorInfo) {
      toast.error('Wallet Required', 'Please connect your wallet');
      return;
    }

    const amount = parseFormattedNumber(unstakeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid amount to unstake');
      return;
    }

    if (amount > myValidatorInfo.stake) {
      toast.error('Insufficient Stake', 'Cannot unstake more than your current stake');
      return;
    }

    // Check if remaining stake meets tier minimum (unless unstaking all)
    const remaining = myValidatorInfo.stake - amount;
    const tierInfo = TIER_INFO[myValidatorInfo.tier as keyof typeof TIER_INFO];

    if (remaining > 0 && tierInfo && remaining < tierInfo.stake) {
      toast.error('Invalid Amount', `Remaining stake must be at least ${formatBalance(tierInfo.stake).main}${formatBalance(tierInfo.stake).suffix} RAIN for ${tierInfo.name} tier, or unstake all`);
      return;
    }

    try {
      setIsProcessing(true);
      await unstakeValidator(address, amount);

      toast.success('Unstaking Started', `Started unbonding ${formatBalance(amount).main}${formatBalance(amount).suffix} RAIN. Complete in 60 seconds (testing mode).`);
      setShowUnstakeModal(false);
      setUnstakeAmount('');
      await loadData();
    } catch (error: any) {
      toast.error('Unstake Failed', error.message || 'Failed to unstake');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!address) {
      toast.error('Wallet Required', 'Please connect your wallet');
      return;
    }

    if (!unbondingStatus?.can_withdraw) {
      toast.error('Cannot Withdraw', 'Unbonding period is not complete yet');
      return;
    }

    try {
      setIsProcessing(true);
      await withdrawValidator(address);

      toast.success('Withdrawal Complete', `Withdrew ${formatBalance(unbondingStatus.amount || 0).main}${formatBalance(unbondingStatus.amount || 0).suffix} RAIN`);
      setUnbondingStatus(null);
      await loadData();
    } catch (error: any) {
      toast.error('Withdrawal Failed', error.message || 'Failed to withdraw');
    } finally {
      setIsProcessing(false);
    }
  };

  // Format countdown timer
  const formatTimeRemaining = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#0019ff] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200  p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white  border border-blue-200">
              <TrendingUp className="w-5 h-5 text-[#0019ff]" />
            </div>
            <h3 className="text-sm font-semibold text-gray-600">Total Staked</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatBalance(totalStaked).main}{formatBalance(totalStaked).suffix} RAIN</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200  p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white  border border-green-200">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-600">Total Rewards</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatBalance(totalRewards).main}{formatBalance(totalRewards).suffix} RAIN</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200  p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white  border border-purple-200">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-600">Active Validators</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeValidatorsCount}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200  p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white  border border-orange-200">
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-600">My Delegations</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{delegations.length}</p>
        </div>
      </div>

      {/* Validator Status or Register Button */}
      {myValidatorInfo && myValidatorInfo.stake > 0 ? (
        <div className="bg-white border-2 border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Your Validator Status</h3>
              <div className="flex items-center gap-4">
                <div className={`px-3 py-1 text-xs font-bold ${
                  myValidatorInfo.active && !myValidatorInfo.jailed
                    ? 'bg-green-100 text-green-700'
                    : myValidatorInfo.jailed
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {myValidatorInfo.jailed ? 'JAILED' : myValidatorInfo.active ? 'ACTIVE' : 'INACTIVE'}
                </div>
                <span className="text-sm text-gray-600">
                  Tier {myValidatorInfo.tier} • {formatBalance(myValidatorInfo.stake).main}{formatBalance(myValidatorInfo.stake).suffix} RAIN staked
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Rewards</p>
              <p className="text-xl font-bold text-[#0019ff]">{formatBalance(myValidatorInfo.total_rewards).main}{formatBalance(myValidatorInfo.total_rewards).suffix} RAIN</p>
            </div>
          </div>

          {/* Manage Validator Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 flex-wrap">
            {myValidatorInfo.jailed && (
              <button
                onClick={handleUnjail}
                disabled={isProcessing}
                className="px-4 py-2 bg-[#0019ff] text-white font-semibold hover:bg-[#0028ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Unjail Validator
              </button>
            )}
            {!myValidatorInfo.jailed && (
              <>
                <button
                  onClick={() => setShowAddStakeModal(true)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-[#0019ff] text-white font-semibold hover:bg-[#0028ff] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <ArrowUp className="w-4 h-4" />
                  Add Stake
                </button>
                <button
                  onClick={() => {
                    setUpgradeToTier(myValidatorInfo.tier < 3 ? myValidatorInfo.tier + 1 : 3);
                    setShowUpgradeTierModal(true);
                  }}
                  disabled={isProcessing || myValidatorInfo.tier >= 3}
                  className="px-4 py-2 bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Upgrade Tier
                </button>
                <button
                  onClick={() => setShowUnstakeModal(true)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <ArrowDown className="w-4 h-4" />
                  Unstake
                </button>
              </>
            )}
            {myValidatorInfo.total_rewards > 0 && (
              <button
                onClick={handleWithdrawRewards}
                disabled={isProcessing}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Withdraw Rewards
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={openRegisterModal}
          className="w-full bg-gradient-to-r from-[#0019ff] to-[#0028ff] text-white  p-6 hover:shadow-lg hover:shadow-[#0019ff]/30 transition-all flex items-center justify-center gap-3 font-semibold"
        >
          <Shield className="w-6 h-6" />
          Become a Validator
          <ArrowRight className="w-5 h-5" />
        </button>
      )}

      {/* Unbonding Status Card */}
      {unbondingStatus?.has_unbonding && (
        <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white rounded border border-orange-300">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Unbonding in Progress</h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Amount Unbonding:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatBalance(unbondingStatus.amount || 0).main}{formatBalance(unbondingStatus.amount || 0).suffix} RAIN
                  </span>
                </div>

                {unbondingStatus.can_withdraw ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Ready to withdraw!</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Time Remaining:</span>
                      <span className="text-base font-semibold text-orange-600">
                        {formatTimeRemaining(unbondingStatus.remaining_seconds || 0)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Completion Date:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {unbondingStatus.completion_timestamp
                          ? new Date(unbondingStatus.completion_timestamp * 1000).toLocaleString()
                          : 'Unknown'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {!unbondingStatus.can_withdraw && (
                <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded text-xs text-orange-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>60-second unbonding period (testing):</strong> Your funds are being unbonded and will be available for withdrawal after the unbonding period completes.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {unbondingStatus.can_withdraw && (
            <div className="pt-4 border-t border-orange-200">
              <button
                onClick={handleWithdraw}
                disabled={isProcessing}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing Withdrawal...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Withdraw {formatBalance(unbondingStatus.amount || 0).main}{formatBalance(unbondingStatus.amount || 0).suffix} RAIN
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* My Validators & Delegations */}
      <div className="bg-white border-2 border-gray-200  overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">My Validators</h3>
          <p className="text-sm text-gray-500">Your validators and delegations</p>
        </div>

        <div className="divide-y divide-gray-200">
          {validators.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 mb-2">You don't have any validators yet</p>
              <p className="text-sm text-gray-400">Register as a validator or delegate to earn rewards</p>
            </div>
          ) : (
            validators
              .filter(v => v && v.address && v.stake > 0 && v.active) // Filter out invalid and inactive validators
              .sort((a, b) => {
                // Own validator always first
                if (a.address === address) return -1;
                if (b.address === address) return 1;
                return 0;
              })
              .map((validator) => (
              <div key={validator.address} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-2 h-2 rounded-full ${
                        validator.active && !validator.jailed ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      {validator.avatar_url && (
                        <img
                          src={validator.avatar_url}
                          alt={validator.nickname || 'Validator'}
                          className="w-8 h-8 rounded-full border-2 border-blue-500/20"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {validator.nickname && (
                            <span className="font-semibold text-sm text-gray-900">{validator.nickname}</span>
                          )}
                          {walletValidators.has(validator.address.toLowerCase()) && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#0019ff] text-white">
                              Your Validator {walletValidators.get(validator.address.toLowerCase()) !== activeAccountIndex && `(Account ${(walletValidators.get(validator.address.toLowerCase()) || 0) + 1})`}
                            </span>
                          )}
                          {delegations.some(d => d.validator.toLowerCase() === validator.address.toLowerCase()) && !walletValidators.has(validator.address.toLowerCase()) && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-600 text-white">
                              Delegated
                            </span>
                          )}
                        </div>
                        <code className="text-sm font-mono text-gray-600">
                          {validator.address.slice(0, 12)}...{validator.address.slice(-8)}
                        </code>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-xs font-bold bg-gradient-to-r ${
                        TIER_INFO[validator.tier as keyof typeof TIER_INFO]?.color || 'from-gray-400 to-gray-600'
                      } text-white`}>
                        {TIER_INFO[validator.tier as keyof typeof TIER_INFO]?.name || `Tier ${validator.tier}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatBalance(validator.stake).main}{formatBalance(validator.stake).suffix} RAIN staked</span>
                      <span>•</span>
                      <span>{validator.missed_blocks} missed blocks</span>
                      <span>•</span>
                      <span>{formatBalance(validator.total_rewards).main}{formatBalance(validator.total_rewards).suffix} RAIN rewards</span>
                    </div>
                    {(validator.description || validator.website) && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        {validator.description && (
                          <p className="text-xs text-gray-600 mb-1">{validator.description}</p>
                        )}
                        {validator.website && (
                          <a
                            href={validator.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            🌐 {validator.website}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {validator.address === address ? (
                      <button
                        onClick={() => {
                          setProfileNickname(validator.nickname || '');
                          setProfileAvatarUrl(validator.avatar_url || '');
                          setProfileDescription(validator.description || '');
                          setProfileWebsite(validator.website || '');
                          setShowEditProfileModal(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Profile
                      </button>
                    ) : validator.active && !validator.jailed && (
                      <button
                        onClick={() => openDelegateModal(validator)}
                        className="px-4 py-2 bg-[#0019ff] text-white  font-semibold hover:bg-[#0028ff] transition-colors flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Delegate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Link to Explorer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <a
            href="http://localhost:3001/validators"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm font-semibold text-[#0019ff] hover:text-[#0028ff] transition-colors"
          >
            <span>View All Validators in Explorer</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* My Delegations */}
      {delegations.length > 0 && (
        <div className="bg-white border-2 border-gray-200  overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">My Delegations</h3>
            <p className="text-sm text-gray-500">Your active delegations and rewards</p>
          </div>

          <div className="divide-y divide-gray-200">
            {delegations.map((delegation, index) => (
              <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <code className="text-sm font-mono text-gray-600 block mb-2">
                      {delegation.validator.slice(0, 12)}...{delegation.validator.slice(-8)}
                    </code>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-900 font-semibold">
                        {formatBalance(delegation.amount).main}{formatBalance(delegation.amount).suffix} RAIN delegated
                      </span>
                      <span className="text-green-600 font-semibold">
                        +{formatBalance(delegation.rewards).main}{formatBalance(delegation.rewards).suffix} RAIN rewards
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUndelegate(delegation.validator, delegation.amount)}
                    className="px-4 py-2 bg-red-50 text-red-600  font-semibold hover:bg-red-100 transition-colors"
                  >
                    Undelegate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Register Validator Modal */}
      <Dialog open={showRegisterModal} onClose={() => setShowRegisterModal(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md bg-white rounded-sm shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#0019ff] to-[#0028ff] px-6 py-4">
              <h3 className="text-xl font-bold text-white">Register as Validator</h3>
              <p className="text-white/80 text-sm mt-1">Stake tokens to become a network validator</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Stake Amount (RAIN)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={registerStake}
                    onChange={(e) => setRegisterStake(formatNumber(e.target.value))}
                    placeholder="10.000,00"
                    className="w-full px-4 py-3 pr-20 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#0019ff] outline-none transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-900 font-bold pointer-events-none">
                    RAIN
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Validator Tier
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TIER_INFO).map(([tier, info]) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setRegisterTier(Number(tier));
                        // Auto-fill the stake amount with the minimum required for this tier
                        setRegisterStake(formatNumber(info.stake.toString()));
                      }}
                      className={`p-3 border-2 transition-all cursor-pointer ${
                        registerTier === Number(tier)
                          ? 'border-[#0019ff] bg-blue-50 ring-2 ring-[#0019ff]/20'
                          : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`text-xs font-bold bg-gradient-to-r ${info.color} text-white px-2 py-1 rounded mb-1`}>
                        {info.name}
                      </div>
                      <div className="text-xs text-gray-900 font-semibold">{info.stake.toLocaleString()} RAIN</div>
                      <div className="text-xs text-gray-600">{info.multiplier}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowRegisterModal(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 border-2 border-gray-200  font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegisterValidator}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-[#0019ff] text-white  font-semibold hover:bg-[#0028ff] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Register'
                  )}
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Delegate Modal */}
      <Dialog open={showDelegateModal} onClose={() => setShowDelegateModal(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md bg-white rounded-sm shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#0019ff] to-[#0028ff] px-6 py-4">
              <h3 className="text-xl font-bold text-white">Delegate to Validator</h3>
              {selectedValidator && (
                <p className="text-white/80 text-sm mt-1 font-mono">
                  {selectedValidator.address.slice(0, 12)}...{selectedValidator.address.slice(-8)}
                </p>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Delegation Amount (RAIN)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={delegateAmount}
                    onChange={(e) => setDelegateAmount(formatNumber(e.target.value))}
                    placeholder="1.000,00"
                    className="w-full px-4 py-3 pr-20 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#0019ff] outline-none transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-900 font-bold pointer-events-none">
                    RAIN
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDelegateModal(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 border-2 border-gray-200  font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelegate}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-[#0019ff] text-white  font-semibold hover:bg-[#0028ff] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Delegate'
                  )}
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Edit Profile Modal */}
      <Dialog open={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-black p-6 border-b-4 border-[#0008ff]">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Edit Validator Profile</h3>
                <button
                  onClick={() => setShowEditProfileModal(false)}
                  className="text-white/70 hover:text-white transition-colors"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Nickname */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Validator Name <span className="text-gray-400 text-xs font-normal">(max 32 chars)</span>
                </label>
                <input
                  type="text"
                  value={profileNickname}
                  onChange={(e) => setProfileNickname(e.target.value)}
                  maxLength={32}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-black bg-white"
                  placeholder="e.g., Figment, Chorus One"
                />
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Avatar
                </label>

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setAvatarMode('preset')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      avatarMode === 'preset'
                        ? 'bg-[#0008ff] text-white shadow-md'
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-[#0008ff]'
                    }`}
                  >
                    Generate Avatar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarMode('custom')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      avatarMode === 'custom'
                        ? 'bg-[#0008ff] text-white shadow-md'
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-[#0008ff]'
                    }`}
                  >
                    Custom URL
                  </button>
                </div>

                {/* Avatar Generator */}
                {avatarMode === 'preset' ? (
                  <div className="space-y-4">
                    {/* Style Selection */}
                    <div className="grid grid-cols-3 gap-3">
                      {AVATAR_STYLES.map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => {
                            setSelectedStyle(style.id);
                            if (avatarSeed) {
                              setPreviewAvatar(style.generator(avatarSeed));
                            }
                          }}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            selectedStyle === style.id
                              ? 'border-[#0008ff] bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-[#0008ff]'
                          }`}
                        >
                          <div className="text-xs font-semibold text-gray-900 mb-1">{style.name}</div>
                          <div className="text-[10px] text-gray-500">{style.description}</div>
                        </button>
                      ))}
                    </div>

                    {/* Seed Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seed (your validator name or any text)
                      </label>
                      <input
                        type="text"
                        value={avatarSeed}
                        onChange={(e) => {
                          setAvatarSeed(e.target.value);
                          if (selectedStyle && e.target.value) {
                            const style = AVATAR_STYLES.find(s => s.id === selectedStyle);
                            if (style) {
                              setPreviewAvatar(style.generator(e.target.value));
                            }
                          }
                        }}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0008ff] focus:border-[#0008ff] transition-all text-black bg-white"
                        placeholder="Enter text to generate unique avatar"
                      />
                    </div>

                    {/* Preview */}
                    {previewAvatar && (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                        <img src={previewAvatar} alt="Preview" className="w-16 h-16 rounded-lg" />
                        <div className="text-sm text-gray-600">
                          <div className="font-semibold text-gray-900">Preview</div>
                          <div className="text-xs">This will be your validator avatar</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    value={profileAvatarUrl}
                    onChange={(e) => setProfileAvatarUrl(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-black bg-white"
                    placeholder="https://example.com/logo.png"
                  />
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description <span className="text-gray-400 text-xs font-normal">(max 256 chars)</span>
                </label>
                <textarea
                  value={profileDescription}
                  onChange={(e) => setProfileDescription(e.target.value)}
                  maxLength={256}
                  rows={3}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-black bg-white"
                  placeholder="Tell the community about your validator..."
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-gray-400">Brief description of your services</span>
                  <span className="text-xs font-medium text-gray-500">{profileDescription.length}/256</span>
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Website <span className="text-gray-400 text-xs font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={profileWebsite}
                  onChange={(e) => setProfileWebsite(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-black bg-white"
                  placeholder="https://your-validator.com"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  disabled={isProcessing}
                  className="flex-1 px-5 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditProfile}
                  disabled={isProcessing || (avatarMode === 'preset' && (!selectedStyle || !avatarSeed))}
                  className="flex-1 px-5 py-3 bg-[#0008ff] text-white rounded-lg font-semibold hover:bg-[#0006cc] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Save Profile
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Add Stake Modal */}
      <Dialog open={showAddStakeModal} onClose={() => setShowAddStakeModal(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md bg-white rounded-sm shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#0019ff] to-[#0028ff] px-6 py-4">
              <h3 className="text-xl font-bold text-white">Add Stake</h3>
              <p className="text-white/80 text-sm mt-1">Increase your validator stake</p>
            </div>

            <div className="p-6 space-y-4">
              {myValidatorInfo && (
                <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Current Stake:</span>
                    <span className="font-bold text-gray-900">
                      {formatBalance(myValidatorInfo.stake).main}{formatBalance(myValidatorInfo.stake).suffix} RAIN
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600">Current Tier:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold bg-gradient-to-r ${
                      TIER_INFO[myValidatorInfo.tier as keyof typeof TIER_INFO]?.color || 'from-gray-400 to-gray-600'
                    } text-white`}>
                      {TIER_INFO[myValidatorInfo.tier as keyof typeof TIER_INFO]?.name || `Tier ${myValidatorInfo.tier}`}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount to Add (RAIN)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={addStakeAmount}
                    onChange={(e) => setAddStakeAmount(formatNumber(e.target.value))}
                    placeholder="1.000,00"
                    className="w-full px-4 py-3 pr-20 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#0019ff] outline-none transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-900 font-bold pointer-events-none">
                    RAIN
                  </div>
                </div>
              </div>

              {addStakeAmount && myValidatorInfo && (
                <div className="bg-green-50 border-2 border-green-200 p-4 rounded">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">New Total Stake:</span>
                    <span className="font-bold text-green-700">
                      {formatBalance(myValidatorInfo.stake + parseFormattedNumber(addStakeAmount)).main}
                      {formatBalance(myValidatorInfo.stake + parseFormattedNumber(addStakeAmount)).suffix} RAIN
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAddStakeModal(false);
                    setAddStakeAmount('');
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStake}
                  disabled={isProcessing || !addStakeAmount || parseFormattedNumber(addStakeAmount) <= 0}
                  className="flex-1 px-4 py-3 bg-[#0019ff] text-white font-semibold hover:bg-[#0028ff] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowUp className="w-4 h-4" />
                      Add Stake
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Upgrade Tier Modal */}
      <Dialog open={showUpgradeTierModal} onClose={() => setShowUpgradeTierModal(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md bg-white rounded-sm shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white">Upgrade Validator Tier</h3>
              <p className="text-white/80 text-sm mt-1">Unlock better rewards and fee discounts</p>
            </div>

            <div className="p-6 space-y-4">
              {myValidatorInfo && (
                <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Current Tier:</span>
                    <span className={`px-3 py-1 rounded text-xs font-bold bg-gradient-to-r ${
                      TIER_INFO[myValidatorInfo.tier as keyof typeof TIER_INFO]?.color || 'from-gray-400 to-gray-600'
                    } text-white`}>
                      {TIER_INFO[myValidatorInfo.tier as keyof typeof TIER_INFO]?.name || `Tier ${myValidatorInfo.tier}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Stake:</span>
                    <span className="font-bold text-gray-900">
                      {formatBalance(myValidatorInfo.stake).main}{formatBalance(myValidatorInfo.stake).suffix} RAIN
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select New Tier
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(TIER_INFO)
                    .filter(([tier]) => myValidatorInfo && Number(tier) > myValidatorInfo.tier)
                    .map(([tier, info]) => {
                      const hasEnoughStake = myValidatorInfo && myValidatorInfo.stake >= info.stake;
                      return (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => setUpgradeToTier(Number(tier))}
                          disabled={!hasEnoughStake}
                          className={`p-4 border-2 rounded transition-all text-left ${
                            upgradeToTier === Number(tier)
                              ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600/20'
                              : hasEnoughStake
                              ? 'border-gray-200 hover:border-purple-400 hover:bg-gray-50'
                              : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`px-3 py-1 rounded text-sm font-bold bg-gradient-to-r ${info.color} text-white`}>
                              {info.name}
                            </span>
                            {hasEnoughStake ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <X className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mb-1">
                            Required: {formatBalance(info.stake).main}{formatBalance(info.stake).suffix} RAIN
                          </div>
                          <div className="text-sm font-semibold text-purple-600">
                            Rewards: {info.multiplier}
                          </div>
                          {!hasEnoughStake && (
                            <div className="text-xs text-red-600 mt-2">
                              Need {formatBalance(info.stake - (myValidatorInfo?.stake || 0)).main}
                              {formatBalance(info.stake - (myValidatorInfo?.stake || 0)).suffix} more RAIN
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>

                {myValidatorInfo && myValidatorInfo.tier >= 3 && (
                  <div className="text-center p-4 bg-yellow-50 border-2 border-yellow-200 rounded">
                    <Award className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-900">You're at the highest tier!</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowUpgradeTierModal(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpgradeTier}
                  disabled={
                    isProcessing ||
                    !myValidatorInfo ||
                    myValidatorInfo.stake < TIER_INFO[upgradeToTier as keyof typeof TIER_INFO]?.stake
                  }
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Upgrading...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      Upgrade Tier
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Unstake Modal */}
      <Dialog open={showUnstakeModal} onClose={() => setShowUnstakeModal(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md bg-white rounded-sm shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white">Unstake Validator</h3>
              <p className="text-white/80 text-sm mt-1">Withdraw stake from your validator</p>
            </div>

            <div className="p-6 space-y-4">
              {myValidatorInfo && (
                <div className="bg-red-50 border-2 border-red-200 p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Current Stake:</span>
                    <span className="font-bold text-gray-900">
                      {formatBalance(myValidatorInfo.stake).main}{formatBalance(myValidatorInfo.stake).suffix} RAIN
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Tier:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold bg-gradient-to-r ${
                      TIER_INFO[myValidatorInfo.tier as keyof typeof TIER_INFO]?.color || 'from-gray-400 to-gray-600'
                    } text-white`}>
                      {TIER_INFO[myValidatorInfo.tier as keyof typeof TIER_INFO]?.name || `Tier ${myValidatorInfo.tier}`}
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-orange-800">
                    <strong>Warning:</strong> Unstaking starts a 14-day unbonding period. You cannot use these funds until the period completes.
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount to Unstake (RAIN)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(formatNumber(e.target.value))}
                    placeholder="1.000,00"
                    className="w-full px-4 py-3 pr-20 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-red-500 outline-none transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-900 font-bold pointer-events-none">
                    RAIN
                  </div>
                </div>
                {myValidatorInfo && (
                  <button
                    type="button"
                    onClick={() => setUnstakeAmount(formatNumber(myValidatorInfo.stake.toString()))}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Unstake All ({formatBalance(myValidatorInfo.stake).main}{formatBalance(myValidatorInfo.stake).suffix} RAIN)
                  </button>
                )}
              </div>

              {unstakeAmount && myValidatorInfo && parseFormattedNumber(unstakeAmount) > 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Remaining Stake:</span>
                    <span className="font-bold text-gray-900">
                      {formatBalance(myValidatorInfo.stake - parseFormattedNumber(unstakeAmount)).main}
                      {formatBalance(myValidatorInfo.stake - parseFormattedNumber(unstakeAmount)).suffix} RAIN
                    </span>
                  </div>
                  {(() => {
                    const remaining = myValidatorInfo.stake - parseFormattedNumber(unstakeAmount);
                    const tierInfo = TIER_INFO[myValidatorInfo.tier as keyof typeof TIER_INFO];
                    if (remaining > 0 && tierInfo && remaining < tierInfo.stake) {
                      return (
                        <div className="text-xs text-red-600 mt-2">
                          Remaining stake must be at least {formatBalance(tierInfo.stake).main}
                          {formatBalance(tierInfo.stake).suffix} RAIN for {tierInfo.name} tier, or unstake all.
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowUnstakeModal(false);
                    setUnstakeAmount('');
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnstake}
                  disabled={isProcessing || !unstakeAmount || parseFormattedNumber(unstakeAmount) <= 0}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold hover:from-red-700 hover:to-orange-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-4 h-4" />
                      Start Unstaking
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Withdraw Rewards Confirmation Modal */}
      <Dialog open={showWithdrawRewardsModal} onClose={() => setShowWithdrawRewardsModal(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md bg-white rounded-sm shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white">Withdraw Rewards</h3>
              <p className="text-white/80 text-sm mt-1">Confirm withdrawal of validator rewards</p>
            </div>

            <div className="p-6 space-y-4">
              {myValidatorInfo && (
                <div className="bg-green-50 border-2 border-green-200 p-4 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Reward Amount:</span>
                    <span className="text-2xl font-bold text-green-700">
                      {formatBalance(myValidatorInfo.total_rewards).main}{formatBalance(myValidatorInfo.total_rewards).suffix} RAIN
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    Are you sure you want to withdraw your validator rewards? This will transfer the rewards to your wallet balance.
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowWithdrawRewardsModal(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmWithdrawRewards}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:from-green-700 hover:to-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      Confirm Withdrawal
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
