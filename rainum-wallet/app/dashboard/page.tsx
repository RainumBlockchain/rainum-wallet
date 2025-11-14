"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useWalletStore } from "@/lib/wallet-store";
import { useAddressBookStore } from "@/lib/address-book-store";
import { useNetworkStore, NETWORKS } from "@/lib/network-store";
import { toast } from "@/lib/toast-store";
import { getTransactions, sendTransaction, requestFromFaucet, getBlockchainStatus } from "@/lib/rainum-api";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { sessionManager } from "@/lib/session-manager";
import { handleAutoLogout, handleLogout } from "@/lib/auth-flow";
import { logAuditEvent, getRecentAuditLog, getAuditLogStats, formatAuditTimestamp, getRelativeTime, type AuditLogEntry } from "@/lib/audit-log";
import { formatTransactionAmount, getTransactionAddresses, getPrivacyBadge, formatCommitment, getZKPSummary, hasZKPProof } from "@/lib/transaction-display";
import { formatBalance } from "@/lib/format-balance";
import { getWalletSettings, saveWalletSettings, getTransactionLimitSettings, getSessionTimeoutMs, getLoginRateLimitSettings, type WalletSettings } from "@/lib/wallet-settings";
import { useWebSocket, useNotificationPermission } from "@/hooks/useWebSocket";
import { TransactionCardSkeleton, BalanceSkeleton, AddressSkeleton } from "@/components/Skeleton";
import { QRScanner } from "@/components/QRScanner";
import SecuritySettings from "@/components/SecuritySettings";
import StakingDashboard from "@/components/StakingDashboard";
import AIChatWidget from "@/components/AIChatWidget";
import { GasEstimator } from "@/components/GasEstimator";
import CrossChainSwap from "@/components/CrossChainSwap";
import { DualVMDashboard } from "@/components/DualVMDashboard";
import { VMSelector, VMTypeBadge, type VMType } from "@/components/shared/VMSelector";
import { CrossVMIndicator } from "@/components/shared/CrossVMBadge";
import { MoveTransactionDetails } from "@/components/shared/MoveTransactionDetails";
import blockies from "ethereum-blockies-base64";
import QRCode from "react-qr-code";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
} from "@headlessui/react";
import {
  Wallet,
  ArrowRightLeft,
  GitBranch,
  Settings,
  Menu as MenuIcon,
  X,
  Bell,
  Search,
  ChevronDown,
  RefreshCw,
  LogOut,
  Copy,
  Check,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  AlertTriangle,
  Zap,
  Droplet,
  ExternalLink,
  Calendar,
  Hash,
  User,
  Shield,
  Database,
  Code,
  DollarSign,
  UserX,
  ShieldCheck,
  ShieldAlert,
  Info,
  Download,
  ChevronLeft,
  ChevronRight,
  Book,
  QrCode,
  Edit,
  Trash2,
  Plus,
  Save,
  MoreVertical,
  Clock,
  Activity,
  FileText,
  TrendingUp,
  Key,
} from "lucide-react";

const navigationItems = [
  { name: "Wallet", icon: Wallet },
  { name: "Transactions", icon: ArrowRightLeft },
  { name: "Staking", icon: TrendingUp },
  { name: "Bridge", icon: GitBranch },
  { name: "Settings", icon: Settings },
];

const userNavigation = [
  { name: "Your profile", href: "#" },
  { name: "Sign out", href: "#" },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    address,
    balance,
    mnemonic,
    isConnected,
    disconnect,
    updateBalance,
    accounts,
    activeAccountIndex,
    createAccount,
    switchAccount,
    getActiveAccount,
    renameAccount,
    discoverAccounts
  } = useWalletStore();
  const {
    addAddress,
    updateAddress,
    deleteAddress,
    searchAddresses,
    getAddressesForWallet
  } = useAddressBookStore();
  const {
    currentNetwork,
    switchNetwork
  } = useNetworkStore();

  // Get saved addresses for current wallet only
  const savedAddresses = address ? getAddressesForWallet(address) : [];
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // Address book modal
  const [showAddressBook, setShowAddressBook] = useState(false);
  const [addressBookSearch, setAddressBookSearch] = useState("");
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddr, setEditAddr] = useState("");

  // Save address modal
  const [showSaveAddress, setShowSaveAddress] = useState(false);
  const [saveAddressName, setSaveAddressName] = useState("");
  const [addressToSave, setAddressToSave] = useState("");

  // Rename account modal
  const [showRenameAccount, setShowRenameAccount] = useState(false);

  // Logout confirmation modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [renameAccountIndex, setRenameAccountIndex] = useState<number | null>(null);
  const [newAccountName, setNewAccountName] = useState("");

  // Re-authentication modal (for when mnemonic is missing after page refresh)
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthError, setReauthError] = useState("");

  // QR Scanner
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Export - now handled by dedicated page (/backup-export)

  // Account balances modal
  const [showAccountBalances, setShowAccountBalances] = useState(false);
  const [accountBalances, setAccountBalances] = useState<{ [address: string]: number }>({});

  // Account discovery state
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Audit log state
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [auditStats, setAuditStats] = useState<any>(null);

  // Settings sub-tabs
  const [settingsTab, setSettingsTab] = useState<"Security" | "Activity" | "Privacy" | "Advanced">("Security");

  // Settings management
  const [walletSettings, setWalletSettings] = useState<WalletSettings | null>(null);
  const [editingSessionTimeout, setEditingSessionTimeout] = useState(false);
  const [editingRateLimit, setEditingRateLimit] = useState(false);
  const [editingTransactionLimits, setEditingTransactionLimits] = useState(false);

  // Get initial tab from URL or default to "Wallet"
  const initialTab = searchParams.get("tab") || "Wallet";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/dashboard?${params.toString()}`, { scroll: false });
  };

  // Header stats state
  const [blockHeight, setBlockHeight] = useState<number>(0);
  const [networkStatus, setNetworkStatus] = useState<'connected' | 'disconnected'>('connected');
  const [rainPrice, setRainPrice] = useState<number>(0.10);
  const [priceChange24h, setPriceChange24h] = useState<number>(5.2);
  const [gasPrice, setGasPrice] = useState<number>(2.5);
  const [portfolioValue, setPortfolioValue] = useState<number>(0);
  const [portfolioChange24h, setPortfolioChange24h] = useState<number>(0);

  // Sync state with URL on navigation (back/forward)
  useEffect(() => {
    const tab = searchParams.get("tab") || "Wallet";
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Auto-refresh balance every 5 seconds
  useEffect(() => {
    if (!isConnected || !address) return;

    // Initial balance fetch
    updateBalance();

    // Set up interval for polling
    const interval = setInterval(() => {
      updateBalance();
    }, 5000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [isConnected, address, updateBalance]);

  // Fetch blockchain status and header stats
  useEffect(() => {
    const fetchHeaderStats = async () => {
      try {
        // Fetch blockchain status
        const status = await getBlockchainStatus();
        if (status) {
          setBlockHeight(status.block_height);
          setNetworkStatus(status.connected ? 'connected' : 'disconnected');
        }

        // Calculate portfolio value (balance * price)
        if (balance > 0) {
          const portfolioVal = balance * rainPrice;
          setPortfolioValue(portfolioVal);
          // Simulate 24h change (in a real app, this would be calculated from historical data)
          const change24h = portfolioVal * (priceChange24h / 100);
          setPortfolioChange24h(change24h);
        }
      } catch (error) {
        console.error('Failed to fetch header stats:', error);
      }
    };

    // Initial fetch
    fetchHeaderStats();

    // Update every 10 seconds
    const interval = setInterval(fetchHeaderStats, 10000);

    return () => clearInterval(interval);
  }, [balance, rainPrice, priceChange24h]);

  // Listen for network changes and show toast
  useEffect(() => {
    const handleNetworkChange = (event: any) => {
      const network = event.detail.network;
      toast.success(`Switched to ${network.name}`, `Now using ${network.rpcUrl}`);
      // Refresh data after network change
      if (isConnected) {
        updateBalance();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('rainum:network-changed', handleNetworkChange);
      return () => window.removeEventListener('rainum:network-changed', handleNetworkChange);
    }
  }, [isConnected, updateBalance]);

  // Priority options - defined early so functions can use it
  const priorityOptions = [
    {
      id: "low",
      name: "Low",
      fee: "0.0005",
      time: "~5 min",
      icon: Wallet,
    },
    {
      id: "standard",
      name: "Standard",
      fee: "0.001",
      time: "~2 min",
      icon: ArrowRightLeft,
    },
    {
      id: "high",
      name: "High",
      fee: "0.002",
      time: "~30 sec",
      icon: Zap,
    },
  ];

  // Validate recipient address in real-time
  const validateRecipientAddress = async (addr: string) => {
    // Reset states
    setAddressError("");
    setAddressExists(null);
    setAddressIsNew(false);

    // Check if sending to own address
    if (addr.toLowerCase() === address?.toLowerCase()) {
      setAddressError("You cannot send tokens to your own address");
      setAddressExists(false);
      return;
    }

    // Check if address format is valid (0x followed by 40 hex characters)
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(addr)) {
      setAddressError("Invalid address format. Must be 0x followed by 40 hex characters.");
      setAddressExists(false);
      return;
    }

    // Check if address has been used (has activity)
    setIsValidatingAddress(true);
    try {
      const { accountExists: checkAccount } = await import('@/lib/rainum-api');
      const hasActivity = await checkAccount(addr);

      console.log(`Address validation for ${addr}: hasActivity = ${hasActivity}`);

      if (hasActivity) {
        // Address has been used - show as verified
        setAddressExists(true);
        setAddressIsNew(false);
        setAddressError("");
      } else {
        // Valid format but no activity yet - treat as new/unused
        setAddressExists(true); // Still valid!
        setAddressIsNew(true);
        setAddressError("");
      }
    } catch (error) {
      console.error("Failed to validate address:", error);
      setAddressExists(true); // Assume valid on error (EVM compatible)
      setAddressIsNew(true);
      setAddressError("");
    } finally {
      setIsValidatingAddress(false);
    }
  };

  // Handle MAX button click
  const handleMaxAmount = () => {
    const selectedPriority = priorityOptions.find((p) => p.id === priority);
    const gasFee = parseFloat(selectedPriority?.fee || "0.001");
    const zkpFee = enableZKP ? 0.002 : 0;
    const totalFees = gasFee + zkpFee;
    const maxAmount = Math.max(0, balance - totalFees);

    console.log('MAX button clicked:', {
      priority,
      selectedPriority,
      gasFee,
      zkpFee,
      totalFees,
      balance,
      maxAmount
    });

    // If max amount is too small, show error
    if (maxAmount <= 0) {
      toast.error("Insufficient Balance", "You need enough RAIN to cover gas fees to send a transaction");
      return;
    }

    // Use full precision (up to 6 decimals supported by micro-RAIN)
    const roundedMax = Math.floor(maxAmount * 1000000) / 1000000;

    // Format with thousand separators
    const formatted = roundedMax.toLocaleString('en-US');

    console.log('Formatted MAX amount:', formatted);

    setAmount(formatted);
    setIsMaxActive(true); // Mark that MAX is active
  };

  // Format amount input with thousand separators
  const formatAmountInput = (value: string) => {
    // Remove all non-numeric characters except dots
    const cleanValue = value.replace(/[^\d.]/g, '');

    // Split into integer and decimal parts
    const parts = cleanValue.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Add thousand separators to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Reconstruct with decimal part (limit to 6 decimals)
    if (decimalPart !== undefined) {
      return formattedInteger + '.' + decimalPart.slice(0, 6);
    }
    return formattedInteger;
  };

  // Validate balance
  const validateBalance = (amountValue: string) => {
    setBalanceError("");

    if (!amountValue || amountValue === "") return;

    // Remove commas for calculation
    const cleanAmount = parseFloat(amountValue.replace(/,/g, ''));
    if (isNaN(cleanAmount)) return;

    // Get gas fee based on priority
    const selectedPriority = priorityOptions.find((p) => p.id === priority);
    const gasFee = parseFloat(selectedPriority?.fee || "0.001");
    const zkpFee = enableZKP ? 0.002 : 0;
    const totalCost = cleanAmount + gasFee + zkpFee;

    console.log('💰 Balance check:', {
      balance,
      balanceType: typeof balance,
      cleanAmount,
      totalCost,
      hasEnough: totalCost <= balance,
    });

    if (totalCost > balance) {
      const shortfall = totalCost - balance;
      setBalanceError(`Insufficient balance. You need ${shortfall.toFixed(6)} more RAIN (including ${(gasFee + zkpFee).toFixed(6)} RAIN gas fee)`);
    }
  };

  // Handle amount change with formatting
  const handleAmountChange = (value: string) => {
    const formatted = formatAmountInput(value);
    setAmount(formatted);
    setIsMaxActive(false); // User manually changed amount, disable MAX mode

    // Check for decimal input and warn user
    if (value.includes('.') || value.includes(',')) {
      setBalanceError("⚠️ RAIN supports whole numbers only. Decimals will be removed.");
    }

    validateBalance(formatted);
  };

  // Transaction form states
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [priority, setPriority] = useState("standard");
  const [vmType, setVmType] = useState<VMType>("evm");  // ⭐ NEW: VM selection
  const [enableZKP, setEnableZKP] = useState(false);
  const [privacyLevel, setPrivacyLevel] = useState("partial");
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);

  // Amount limit security
  const [showHighAmountDialog, setShowHighAmountDialog] = useState(false);
  const [highAmountPassword, setHighAmountPassword] = useState("");
  const [highAmountPasswordError, setHighAmountPasswordError] = useState("");

  // Address validation
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [addressExists, setAddressExists] = useState<boolean | null>(null);
  const [addressError, setAddressError] = useState<string>("");
  const [addressIsNew, setAddressIsNew] = useState(false); // Track if address is new/unused

  // Balance validation
  const [balanceError, setBalanceError] = useState<string>("");
  const [isMaxActive, setIsMaxActive] = useState(false); // Track if MAX was clicked

  // QR code visibility
  const [showQRCode, setShowQRCode] = useState(false);

  // Transaction history
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "confirmed" | "pending">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loadingTotalBalance, setLoadingTotalBalance] = useState(false);

  // WebSocket for real-time updates
  const { isConnected: wsConnected } = useWebSocket({
    address: address || undefined,
    onNewTransaction: (event) => {
      console.log('📩 New transaction received via WebSocket:', event);

      // ✅ FIX: Don't add transactions optimistically via WebSocket
      // This was causing "ghost transactions" that never existed in backend
      // Instead, reload transactions from API to get confirmed data

      // Only reload if this is OUR transaction (from/to our address)
      if (address && (
        event.transaction.from?.toLowerCase() === address.toLowerCase() ||
        event.transaction.to?.toLowerCase() === address.toLowerCase()
      )) {
        console.log('🔄 Reloading transactions from API (WebSocket notification)');
        loadTransactions();
      }

      // Reload balance after incoming transaction
      if (event.direction === 'incoming') {
        loadBalance();
      }
    },
    onBalanceUpdate: (event) => {
      console.log('💰 Balance updated via WebSocket:', event);
      // ✅ FIX: Backend sends balance in RAIN (not microRAIN), no conversion needed
      useWalletStore.getState().setBalance(event.new_balance);
    },
    onNewBlock: (event) => {
      console.log('🧱 New block via WebSocket:', event);
      // Reload transactions to update status from pending to confirmed
      if (address) {
        loadTransactions();
      }
    },
    onConnected: (event) => {
      console.log('🎉 WebSocket connected:', event.message);
    },
    autoReconnect: true,
    showNotifications: true,
  });

  // Request browser notification permission
  const { permission, requestPermission } = useNotificationPermission();

  // Helper functions for WebSocket callbacks
  const loadBalance = async () => {
    if (address) {
      await updateBalance();
    }
  };

  const loadTransactions = async () => {
    if (!address) return;

    try {
      const txData = await getTransactions(address);
      // getTransactions already returns a sorted array
      if (Array.isArray(txData)) {
        // ✅ FIX: Merge with existing transactions to prevent duplicates
        // When a block is mined, update pending transactions to confirmed
        setTransactions((prev) => {
          // Create a map of existing transactions by hash
          const txMap = new Map(prev.map(tx => [tx.hash, tx]));

          // Update/add transactions from API (these are confirmed)
          txData.forEach(tx => {
            txMap.set(tx.hash, tx);
          });

          // Convert back to array and sort by timestamp (newest first)
          return Array.from(txMap.values()).sort((a, b) =>
            (b.timestamp || 0) - (a.timestamp || 0)
          );
        });
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
    }
  };

  useEffect(() => {
    setIsHydrated(true);

    // Request notification permission on mount
    if (permission === 'default') {
      requestPermission();
    }
  }, []);

  // Check if mnemonic is missing after page refresh (security enhancement)
  // No re-authentication needed - wallet persists in localStorage

  // Start session monitoring
  useEffect(() => {
    sessionManager.startSessionMonitoring(() => {
      handleAutoLogout(router);
    });

    return () => {
      sessionManager.stopSessionMonitoring();
    };
  }, [router]);

  // Auto-update MAX amount when priority or ZKP changes (if MAX is active)
  useEffect(() => {
    if (isMaxActive) {
      handleMaxAmount();
    }
  }, [priority, enableZKP, isMaxActive]);

  useEffect(() => {
    if (isHydrated && (!isConnected || !address)) {
      router.push("/");
    } else if (isHydrated && isConnected && address) {
      updateBalance();
      fetchTransactions();
    }
  }, [isHydrated, isConnected, address, router, updateBalance]);

  // Calculate total balance across all accounts
  useEffect(() => {
    const fetchTotalBalance = async () => {
      if (!accounts || accounts.length === 0 || !isHydrated) {
        setTotalBalance(0);
        return;
      }

      setLoadingTotalBalance(true);
      try {
        const { getBalance } = await import('@/lib/rainum-api');

        const balancePromises = accounts.map(acc => getBalance(acc.address));
        const balances = await Promise.all(balancePromises);
        const total = balances.reduce((sum, bal) => sum + bal, 0);

        setTotalBalance(total);
      } catch (error) {
        console.error('Failed to fetch total balance:', error);
        setTotalBalance(0);
      } finally {
        setLoadingTotalBalance(false);
      }
    };

    fetchTotalBalance();
  }, [accounts, isHydrated]);

  // Load audit log when Settings tab is active
  useEffect(() => {
    if (activeTab === "Settings" && (settingsTab === "Activity" || settingsTab === "Security")) {
      const log = getRecentAuditLog(50);
      const stats = getAuditLogStats();
      setAuditLog(log);
      setAuditStats(stats);
    }
  }, [activeTab, settingsTab]);

  // Load wallet settings when Settings tab is active
  useEffect(() => {
    if (activeTab === "Settings") {
      const settings = getWalletSettings();
      setWalletSettings(settings);
    }
  }, [activeTab]);

  // Handle re-authentication after page refresh
  const handleReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    setReauthError("");

    if (!reauthPassword) {
      setReauthError("Password is required");
      return;
    }

    try {
      // Load and decrypt wallet from localStorage
      const { loadWallet } = await import('@/lib/auth-manager');
      const wallet = loadWallet(reauthPassword);

      if (!wallet) {
        setReauthError("Invalid password");
        return;
      }

      // Update wallet store with decrypted mnemonic
      const { connect } = useWalletStore.getState();
      connect(wallet.address, wallet.mnemonic);

      // Close modal and clear password
      setShowReauthModal(false);
      setReauthPassword("");
      setReauthError("");

      toast.success("Re-authenticated", "Wallet unlocked successfully");
    } catch (error: any) {
      console.error("Re-authentication failed:", error);
      setReauthError(error.message || "Failed to decrypt wallet");
    }
  };

  // Biometric authentication for sensitive operations
  const requestBiometricAuth = async (): Promise<boolean> => {
    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      toast.error("Biometric authentication not supported on this device");
      return false;
    }

    try {
      // Simple user verification prompt
      const result = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32), // Random challenge
          timeout: 60000,
          userVerification: "required",
          allowCredentials: []
        }
      } as any);

      if (result) {
        toast.success("Authenticated", "Biometric verification successful");
        return true;
      }
      return false;
    } catch (error: any) {
      // If biometric fails, fallback to password prompt
      if (error.name === "NotAllowedError") {
        toast.error("Authentication cancelled");
      } else {
        // Fallback: just show a confirmation dialog
        const confirmed = window.confirm("⚠️ SECURITY CHECK\n\nYou are about to view sensitive information.\n\nClick OK to continue.");
        if (confirmed) {
          toast.success("Confirmed", "Access granted");
          return true;
        }
      }
      return false;
    }
  };

  const fetchTransactions = async () => {
    if (!address) return;

    setLoadingTransactions(true);

    // Add minimum loading time to ensure loader is visible
    const startTime = Date.now();
    const minLoadingTime = 500; // 500ms minimum

    try {
      const txs = await getTransactions(address);
      console.log('📊 Fetched transactions for', address, ':', txs);
      console.log('📊 Transaction count:', Array.isArray(txs) ? txs.length : 'NOT AN ARRAY');

      // Calculate remaining time to show loader
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsed);

      // Wait for remaining time if needed
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

      // Handle different response formats
      if (Array.isArray(txs)) {
        // Already an array (from rainum-api.ts processing)
        console.log('✅ Setting transactions (array):', txs.length, 'items');

        // ✅ FIX: Merge with existing transactions to prevent duplicates
        // This ensures pending transactions update to confirmed instead of duplicating
        setTransactions((prev) => {
          // Create a map of existing transactions by hash
          const txMap = new Map(prev.map(tx => [tx.hash, tx]));

          // Update/add transactions from API (these are confirmed)
          txs.forEach(tx => {
            txMap.set(tx.hash, tx);
          });

          // Convert back to array and sort by timestamp (newest first)
          return Array.from(txMap.values()).sort((a, b) =>
            (b.timestamp || 0) - (a.timestamp || 0)
          );
        });
      } else {
        console.log("⚠️ API returned non-array, likely an error:", txs);
        setTransactions([]);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Get relative time (e.g., "2 mins ago")
  const getRelativeTime = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return {
          text: "Confirmed",
          className: "bg-green-100 text-green-700 border-green-200",
          icon: Check,
        };
      case "pending":
        return {
          text: "Pending",
          className: "bg-yellow-100 text-yellow-700 border-yellow-200",
          icon: RefreshCw,
        };
      default:
        return {
          text: "Unknown",
          className: "bg-gray-100 text-gray-700 border-gray-200",
          icon: AlertTriangle,
        };
    }
  };

  // Filter and sort transactions
  const getFilteredAndSortedTransactions = () => {
    let filtered = [...transactions];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.hash?.toLowerCase().includes(query) ||
          tx.from?.toLowerCase().includes(query) ||
          tx.to?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((tx) => tx.status === filterStatus);
    }

    // Sort transactions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.timestamp - a.timestamp;
        case "oldest":
          return a.timestamp - b.timestamp;
        case "amount":
          return b.amount - a.amount;
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Get paginated transactions
  const getPaginatedTransactions = () => {
    const filtered = getFilteredAndSortedTransactions();
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filtered.slice(startIndex, endIndex);
  };

  // Calculate total pages
  const getTotalPages = () => {
    const filtered = getFilteredAndSortedTransactions();
    return Math.ceil(filtered.length / ITEMS_PER_PAGE);
  };

  // Export transactions to CSV
  const exportToCSV = () => {
    const filtered = getFilteredAndSortedTransactions();

    if (filtered.length === 0) {
      toast.error("No transactions to export", "Apply filters to see transactions");
      return;
    }

    // CSV headers
    const headers = [
      "Date",
      "Hash",
      "From",
      "To",
      "Amount (RAIN)",
      "Status",
      "Gas Used",
      "Fee Paid (RAIN)",
      "Privacy Level"
    ];

    // CSV rows
    const rows = filtered.map((tx) => {
      const date = tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString() : "Pending";
      const amount = (tx.amount / 1000000).toFixed(6);
      const feePaid = tx.fee_paid ? (tx.fee_paid / 1000000).toFixed(6) : "0";

      return [
        date,
        tx.hash || "",
        tx.from || "",
        tx.to || "",
        amount,
        tx.status || "pending",
        tx.gas_used || "0",
        feePaid,
        tx.privacy_level || "none"
      ];
    });

    // Build CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `rainum-transactions-${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Export successful!", `Exported ${filtered.length} transactions to CSV`);
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Address copied!", "Wallet address copied to clipboard", 3000);
    }
  };

  const handleShowAccountBalances = async () => {
    setShowAccountBalances(true);

    // Fetch balances for all accounts
    const balances: { [address: string]: number } = {};
    const { getBalance } = await import('@/lib/rainum-api');

    for (const account of accounts) {
      try {
        const balanceInRain = await getBalance(account.address);
        balances[account.address] = balanceInRain;
      } catch (error) {
        console.error(`Failed to fetch balance for ${account.address}:`, error);
        balances[account.address] = 0;
      }
    }

    setAccountBalances(balances);
  };

  const handleDisconnect = async () => {
    const confirmed = await handleLogout(router);
    if (!confirmed) {
      setShowLogoutConfirm(true);
    }
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await handleLogout(router, true); // Skip confirmation
  };

  const handleRequestFaucet = async () => {
    if (!address) {
      toast.error("Error", "Wallet address not found");
      return;
    }

    toast.info("Requesting tokens...", "Requesting 10,000,000 RAIN from faucet");

    try {
      const result = await requestFromFaucet(address);

      if (result.success) {
        toast.success(
          "Faucet request successful!",
          `Received ${result.amount || 10000000} RAIN tokens`,
          5000
        );

        // Update balance after 1 second
        setTimeout(() => {
          updateBalance();
        }, 1000);
      } else {
        toast.error("Faucet request failed", result.message || "Unable to request tokens", 5000);
      }
    } catch (error: any) {
      toast.error("Faucet request failed", error.message || "Unable to request tokens. Please try again.", 5000);
    }
  };

  const handleDiscoverAccounts = async () => {
    if (!mnemonic) {
      toast.error("Error", "No mnemonic available. Please re-authenticate.");
      setShowReauthModal(true);
      return;
    }

    setIsDiscovering(true);
    toast.info("Scanning blockchain...", "Looking for all your accounts", 10000);

    try {
      await discoverAccounts();
      const { accounts } = useWalletStore.getState();
      toast.success(
        "Discovery complete!",
        `Found ${accounts.length} account${accounts.length === 1 ? '' : 's'} with activity`,
        5000
      );
    } catch (error: any) {
      console.error('Account discovery failed:', error);
      toast.error("Discovery failed", error.message || "Failed to scan blockchain for accounts", 5000);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSubmitTransaction = (e: React.FormEvent) => {
    e.preventDefault();

    // Check balance first
    const cleanAmount = parseFloat(amount.replace(/,/g, ''));
    const selectedPriority = priorityOptions.find((p) => p.id === priority);
    const gasFee = parseFloat(selectedPriority?.fee || "0.001");
    const zkpFee = enableZKP ? 0.002 : 0;
    const totalCost = cleanAmount + gasFee + zkpFee;

    console.log('Balance check:', {
      amount: cleanAmount,
      gasFee,
      zkpFee,
      totalCost,
      balance,
      hasEnough: totalCost <= balance
    });

    if (totalCost > balance) {
      toast.error("Insufficient Balance", `You need ${(totalCost - balance).toFixed(6)} more RAIN to cover transaction + gas fees`);
      return;
    }

    // Check amount thresholds for extra security (configurable)
    const limitSettings = getTransactionLimitSettings();

    if (limitSettings.enabled) {
      if (cleanAmount >= limitSettings.warningThreshold) {
        // High amount - just extra confirmation
        setShowHighAmountDialog(true);
        return;
      }
    }

    // Normal flow - open security dialog
    setShowSecurityDialog(true);
  };

  const handleSecurityConfirm = () => {
    setShowSecurityDialog(false);
    // Open summary dialog
    setShowSummaryDialog(true);
  };

  const handleHighAmountConfirm = () => {
    // Log high amount transaction attempt
    const cleanAmount = parseFloat(amount.replace(/,/g, ''));
    logAuditEvent(
      'high_amount_transaction',
      'security',
      `High amount transaction confirmed: ${cleanAmount} RAIN to ${recipient}`,
      {
        address,
        amount: cleanAmount,
        recipient,
      }
    );

    setShowHighAmountDialog(false);
    // Continue to normal security dialog
    setShowSecurityDialog(true);
  };

  const handleFinalSend = async () => {
    setShowSummaryDialog(false);

    if (!address) {
      toast.error("Error", "Wallet address not found");
      return;
    }

    if (!mnemonic) {
      toast.error("Error", "Wallet mnemonic not found. Please re-login to your wallet.");
      return;
    }

    // Show loading toast
    toast.info("Sending transaction...", "Please wait while we process your transaction");

    try {
      // Clean the amount (remove commas for API)
      const cleanAmount = amount.replace(/,/g, '');

      // Send actual transaction to blockchain API with signature
      const result = await sendTransaction(
        address,             // from
        recipient,           // to
        cleanAmount,         // amount (cleaned)
        priority,            // priority (low, standard, high)
        mnemonic,            // mnemonic for signing
        enableZKP,           // ZKP privacy flag
        privacyLevel,        // Privacy level (none, partial, standard, full)
        activeAccountIndex,  // HD wallet account index
        vmType               // VM type (evm or move)
      );

      if (result.success) {
        // Log successful transaction
        logAuditEvent(
          'transaction_sent',
          'transaction',
          `Sent ${cleanAmount} RAIN to ${recipient}`,
          {
            address,
            amount: parseFloat(cleanAmount),
            recipient,
            transactionHash: result.hash,
          }
        );

        // Show success toast
        toast.success(
          "Transaction sent successfully!",
          `${amount} RAIN sent to ${recipient.slice(0, 8)}...${recipient.slice(-6)} (Shard ${result.shard_id || 'N/A'})`,
          7000
        );

        // Reset form
        setRecipient("");
        setAmount("");
        setPriority("standard");
        setAddressExists(null);
        setAddressError("");
        setAddressIsNew(false);

        // Refresh balance and transactions after a short delay
        // (gives blockchain time to process)
        setTimeout(() => {
          updateBalance();
          fetchTransactions();
        }, 1000);
      } else {
        toast.error(
          "Transaction failed",
          result.message || "Unable to send transaction",
          7000
        );
      }
    } catch (error: any) {
      // Show error toast
      toast.error(
        "Transaction failed",
        error.message || "Unable to send transaction. Please try again.",
        7000
      );
    }
  };

  if (!isHydrated) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <RefreshCw size={48} className="text-[#0019ff] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="bg-white min-h-screen">
      {/* Security Dialog */}
      <Dialog open={showSecurityDialog} onClose={() => setShowSecurityDialog(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-900/80 transition-opacity" />
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="relative transform overflow-hidden rounded bg-white px-6 py-8 shadow-xl transition-all w-full max-w-md">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-100">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Confirm Transaction</h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                Please verify the recipient address before continuing. Transactions cannot be reversed.
              </p>

              <div className="bg-gray-50 rounded p-4 mb-6 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">Recipient</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-gray-900 break-all flex-1">{recipient}</p>
                    {addressExists === true && !addressIsNew && <Check className="w-4 h-4 text-green-600 flex-shrink-0" />}
                    {addressExists === true && addressIsNew && <Info className="w-4 h-4 text-cyan-600 flex-shrink-0" />}
                    {addressExists === false && <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                  </div>
                  {addressExists === true && !addressIsNew && (
                    <p className="text-xs text-green-600 mt-1 font-medium">✓ Verified address with activity</p>
                  )}
                  {addressExists === true && addressIsNew && (
                    <p className="text-xs text-cyan-600 mt-1 font-medium">ℹ️ New/unused address</p>
                  )}
                  {addressExists === false && (
                    <p className="text-xs text-red-600 mt-1 font-medium">⚠️ Invalid address</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Amount</p>
                    <p className="text-sm font-semibold text-gray-900">{amount} RAIN</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Network</p>
                    <p className="text-sm text-gray-900">Rainum</p>
                  </div>
                </div>
              </div>

              {addressExists === true && !addressIsNew ? (
                <div className="bg-green-50 border border-green-100 rounded p-3 mb-6">
                  <div className="flex gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-green-700">
                      Address verified with activity on Rainum network. Please confirm the transaction details.
                    </p>
                  </div>
                </div>
              ) : addressExists === true && addressIsNew ? (
                <div className="bg-cyan-50 border border-cyan-200 rounded p-3 mb-6">
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-cyan-700 font-semibold">
                      ℹ️ INFO: This address is new/unused but has valid EVM format. You can send to it safely. Transactions cannot be reversed, so please verify the address is correct.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-100 rounded p-3 mb-6">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-700">
                      Make sure the recipient address is correct. Transactions cannot be reversed.
                    </p>
                  </div>
                </div>
              )}

              {/* Tier Routing Information */}
              {(() => {
                // Calculate tier based on balance (same logic as backend)
                const currentBalance = parseFloat(balance) || 0;
                let tier = 1;
                let tierName = "Standard";
                let tierColor = "#cd7f32";
                let targetValidators = "all validators";
                let estimatedFinality = "<2s";

                if (currentBalance >= 100000) {
                  tier = 3;
                  tierName = "Enterprise";
                  tierColor = "#ffd700";
                  targetValidators = "Tier 3 validators only";
                  estimatedFinality = "<500ms";
                } else if (currentBalance >= 50000) {
                  tier = 2;
                  tierName = "Premium";
                  tierColor = "#c0c0c0";
                  targetValidators = "Tier 2 + Tier 3 validators";
                  estimatedFinality = "<800ms";
                }

                return (
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                        style={{ backgroundColor: tierColor, color: '#000' }}
                      >
                        T{tier}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="w-4 h-4 text-blue-600" />
                          <p className="text-sm font-bold text-gray-900">Transaction Tier: {tierName}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-700">
                            <span className="font-semibold">Routing:</span> {targetValidators}
                          </p>
                          <p className="text-xs text-gray-700">
                            <span className="font-semibold">Est. Finality:</span> {estimatedFinality}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Your tier is determined by your wallet balance. Higher tiers get priority routing and faster finality.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSecurityDialog(false)}
                  className="flex-1 px-4 py-3 rounded border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSecurityConfirm}
                  className="flex-1 px-4 py-3 rounded bg-[#0019ff] text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Re-authentication Modal (security: mnemonic not persisted) */}
      <Dialog open={showReauthModal} onClose={() => {}} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-900/90 transition-opacity" />
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="relative transform overflow-hidden rounded-xl bg-white px-8 py-8 shadow-2xl transition-all w-full max-w-md">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-blue-100">
                <Lock className="w-8 h-8 text-[#0019ff]" />
              </div>
              <h3 className="text-2xl font-bold text-center text-gray-900 mb-3">Re-authenticate Required</h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                For security, your wallet has been locked. Please enter your password to continue.
              </p>

              <form onSubmit={handleReauth} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={reauthPassword}
                      onChange={(e) => setReauthPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0019ff]/20 focus:border-[#0019ff] outline-none transition-all text-gray-900 bg-white"
                      autoFocus
                    />
                  </div>
                </div>

                {reauthError && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800 font-medium">{reauthError}</p>
                  </div>
                )}

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-900 leading-relaxed">
                    <strong className="font-semibold">Security Note:</strong> Your wallet's private keys are no longer stored in browser storage. You must re-authenticate after each page refresh for maximum security.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-4 bg-gradient-to-r from-[#0019ff] to-[#0028ff] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#0019ff]/30 transition-all"
                >
                  Unlock Wallet
                </button>
              </form>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={showSummaryDialog} onClose={() => setShowSummaryDialog(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-900/80 transition-opacity" />
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="relative transform overflow-hidden rounded bg-white px-6 py-8 shadow-xl transition-all w-full max-w-md">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-blue-100">
                <Check className="w-6 h-6 text-[#0019ff]" />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Transaction Summary</h3>
              <p className="text-sm text-gray-600 text-center mb-6">Review your transaction details before sending</p>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded p-4">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                    <span className="text-sm text-gray-600">From</span>
                    <span className="text-sm font-mono text-gray-900">{address?.slice(0, 8)}...{address?.slice(-6)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                    <span className="text-sm text-gray-600">To</span>
                    <span className="text-sm font-mono text-gray-900">{recipient.slice(0, 8)}...{recipient.slice(-6)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                    <span className="text-sm text-gray-600">Amount</span>
                    <span className="text-sm font-semibold text-gray-900">{amount} RAIN</span>
                  </div>
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                    <span className="text-sm text-gray-600">Priority</span>
                    <span className="text-sm font-semibold text-gray-900 capitalize">{priority}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Network Fee</span>
                    <span className="text-sm font-mono text-gray-900">
                      {priorityOptions.find((p) => p.id === priority)?.fee || "0.001"} RAIN
                    </span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-[#0019ff] rounded p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-gray-900">Total Cost</span>
                    <span className="text-lg font-bold text-[#0019ff]">
                      {(parseFloat(amount.replace(/,/g, '')) + parseFloat(priorityOptions.find((p) => p.id === priority)?.fee || "0.001")).toFixed(4)} RAIN
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSummaryDialog(false)}
                  className="flex-1 px-4 py-3 rounded border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleFinalSend}
                  className="flex-1 px-4 py-3 rounded bg-black text-white font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  <span>Send Now</span>
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* High Amount Confirmation Dialog (100K - 1M RAIN) */}
      <Dialog open={showHighAmountDialog} onClose={() => setShowHighAmountDialog(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-900/80 transition-opacity" />
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white px-6 py-8 shadow-xl transition-all w-full max-w-md">
              <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full bg-orange-100">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Large Transaction Amount</h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                You are about to send a large amount. Please confirm this is intentional.
              </p>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-xl p-5 mb-6">
                <div className="text-center">
                  <p className="text-xs text-orange-700 font-semibold mb-2 uppercase tracking-wide">Transaction Amount</p>
                  <p className="text-3xl font-bold text-orange-900 font-mono">
                    {amount} RAIN
                  </p>
                  <p className="text-sm text-orange-700 mt-3">
                    ≈ {parseFloat(amount.replace(/,/g, '')).toLocaleString('en-US')} RAIN
                  </p>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-900 mb-1">Security Notice</p>
                    <p className="text-xs text-orange-700">
                      This transaction exceeds 100,000 RAIN. Please verify the recipient address is correct. Transactions cannot be reversed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Recipient</span>
                  <span className="text-sm font-mono text-gray-900">{recipient.slice(0, 10)}...{recipient.slice(-8)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowHighAmountDialog(false)}
                  className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleHighAmountConfirm}
                  className="flex-1 px-4 py-3 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-colors"
                >
                  Confirm & Continue
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Mobile sidebar */}
      <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />

        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
          >
            <TransitionChild>
              <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                <button type="button" onClick={() => setSidebarOpen(false)} className="-m-2.5 p-2.5">
                  <span className="sr-only">Close sidebar</span>
                  <X aria-hidden="true" className="size-6 text-white" />
                </button>
              </div>
            </TransitionChild>

            <div className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-white/95 backdrop-blur-xl px-6 pb-4">
              <div className="flex h-16 shrink-0 items-center justify-between">
                <img src="/press-kit/logos/rainum-logo-blue.svg" alt="Rainum" className="h-6 w-auto" />

                {/* Network Selector Mobile */}
                <Menu as="div" className="relative">
                  <MenuButton className="flex items-center gap-2 px-3 py-1.5 bg-black hover:bg-gray-900 rounded transition-all">
                    <div className="w-1.5 h-1.5 bg-[#0019ff] animate-pulse"></div>
                    <span className="text-xs font-semibold text-white">Devnet</span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </MenuButton>

                  <MenuItems
                    transition
                    className="absolute right-0 z-10 mt-2 w-52 origin-top-right rounded bg-black py-1 shadow-xl transition data-closed:scale-95 data-closed:opacity-0"
                  >
                    <MenuItem>
                      <button className="flex items-center gap-2 px-4 py-2 text-sm w-full bg-gray-900 text-white font-semibold">
                        <div className="w-1.5 h-1.5 bg-[#0019ff]"></div>
                        <span>Devnet</span>
                        <Check className="w-4 h-4 ml-auto text-[#0019ff]" />
                      </button>
                    </MenuItem>
                    <MenuItem>
                      <button
                        disabled
                        className="flex items-center gap-2 px-4 py-2 text-sm w-full text-gray-500 cursor-not-allowed"
                      >
                        <div className="w-1.5 h-1.5 bg-gray-600"></div>
                        <span>Testnet</span>
                        <span className="ml-auto px-2 py-0.5 bg-[#0019ff] text-white text-[9px] font-bold rounded">
                          Q1 2026
                        </span>
                      </button>
                    </MenuItem>
                    <MenuItem>
                      <button
                        disabled
                        className="flex items-center gap-2 px-4 py-2 text-sm w-full text-gray-500 cursor-not-allowed"
                      >
                        <div className="w-1.5 h-1.5 bg-gray-600"></div>
                        <span>Mainnet</span>
                        <span className="ml-auto px-2 py-0.5 bg-[#0019ff] text-white text-[9px] font-bold rounded">
                          Q2 2026
                        </span>
                      </button>
                    </MenuItem>
                  </MenuItems>
                </Menu>
              </div>

              {/* Balance Card Mobile */}
              <div className="bg-gradient-to-br from-[#0019ff] via-blue-800 to-black rounded-[4px] p-6 text-white shadow-xl shadow-[#0019ff]/20">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs uppercase tracking-widest text-white/90 font-bold">Total Balance</p>
                  <Wallet className="w-5 h-5 text-white/70" />
                </div>
                <div className="mb-4">
                  {!isHydrated || (balance === 0 && loadingTransactions) ? (
                    <div className="space-y-3">
                      <div className="h-12 bg-white/20 rounded animate-pulse" style={{ width: '200px' }}></div>
                      <div className="h-4 bg-white/10 rounded animate-pulse" style={{ width: '150px' }}></div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        {accounts.length > 1 ? (
                          <button
                            onClick={handleShowAccountBalances}
                            className="flex items-baseline gap-2 flex-wrap hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <span className={`font-bold text-white ${
                              balance.toLocaleString('en-US').length > 15 ? 'text-lg' :
                              balance.toLocaleString('en-US').length > 10 ? 'text-xl' :
                              'text-2xl'
                            }`} style={{ fontFamily: 'SF Mono, Monaco, monospace', wordBreak: 'keep-all', whiteSpace: 'nowrap' }}>
                              {balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-sm font-semibold text-white/80">RAIN</span>
                          </button>
                        ) : (
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className={`font-bold text-white ${
                              balance.toLocaleString('en-US').length > 15 ? 'text-lg' :
                              balance.toLocaleString('en-US').length > 10 ? 'text-xl' :
                              'text-2xl'
                            }`} style={{ fontFamily: 'SF Mono, Monaco, monospace', wordBreak: 'keep-all', whiteSpace: 'nowrap' }}>
                              {balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-sm font-semibold text-white/80">RAIN</span>
                          </div>
                        )}
                        {accounts.length > 1 && (
                          <button
                            onClick={handleShowAccountBalances}
                            className="text-[10px] text-white/50 hover:text-white/70 font-mono leading-tight transition-colors cursor-pointer text-left"
                          >
                            {loadingTotalBalance ? 'Calculating...' :
                              `Total: ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RAIN`
                            }
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs bg-white/10 backdrop-blur-sm rounded px-3 py-2 hover:bg-white/20 transition-colors">
                  {!isHydrated || !address ? (
                    <div className="h-4 bg-white/20 rounded animate-pulse flex-1"></div>
                  ) : (
                    <>
                      <span className="truncate max-w-[180px] font-mono">{address}</span>
                      <button onClick={handleCopyAddress} className="hover:scale-110 transition-transform ml-auto">
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={handleRequestFaucet}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded px-3 py-2 text-xs font-semibold transition-all hover:scale-[1.02]"
                >
                  <Droplet size={14} />
                  Request Test Tokens
                </button>
              </div>

              <nav className="relative flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {navigationItems.map((item) => (
                        <li key={item.name}>
                          <button
                            onClick={() => handleTabChange(item.name)}
                            className={classNames(
                              activeTab === item.name
                                ? "bg-black text-white"
                                : "text-gray-700 hover:bg-gray-100 hover:text-black",
                              "group flex gap-x-3 rounded-[4px] p-3 text-sm font-semibold w-full transition-colors"
                            )}
                          >
                            <item.icon
                              aria-hidden="true"
                              className={classNames(
                                activeTab === item.name ? "text-white" : "text-gray-400 group-hover:text-black",
                                "size-5 shrink-0"
                              )}
                            />
                            {item.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                  <li className="mt-auto space-y-2 pt-4 border-t border-gray-200">
                    {/* Account Switcher Mobile */}
                    {accounts.length > 0 && (
                      <Menu as="div" className="relative -mx-2 mb-2">
                        <MenuButton className="w-full flex items-center justify-between gap-3 p-3 bg-white rounded-[4px] border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <img
                              src={address ? blockies(address) : ""}
                              alt={getActiveAccount()?.name || 'Account'}
                              className="w-8 h-8 rounded-full flex-shrink-0"
                            />
                            <div className="text-left overflow-hidden">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {getActiveAccount()?.name || 'Account'}
                              </p>
                              <p className="text-xs text-gray-500 truncate font-mono">
                                {address?.slice(0, 6)}...{address?.slice(-4)}
                              </p>
                            </div>
                          </div>
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </MenuButton>

                        <MenuItems className="absolute left-0 right-0 bottom-full mb-2 z-10 origin-bottom rounded-[4px] bg-white shadow-lg ring-1 ring-black/5 focus:outline-none max-h-80 overflow-auto">
                          <div className="py-1">
                            {accounts.map((account) => (
                              <MenuItem key={account.index}>
                                <div className={classNames(
                                  account.index === activeAccountIndex
                                    ? 'bg-gray-50 text-gray-900'
                                    : 'text-gray-700',
                                  'group flex items-center gap-3 px-4 py-3 text-sm w-full hover:bg-gray-50 transition-colors'
                                )}>
                                  <button
                                    onClick={() => switchAccount(account.index)}
                                    className="flex items-center gap-3 flex-1 min-w-0"
                                  >
                                    <img
                                      src={blockies(account.address)}
                                      alt={account.name}
                                      className="w-8 h-8 rounded-full flex-shrink-0"
                                    />
                                    <div className="text-left overflow-hidden">
                                      <p className="font-medium truncate">{account.name}</p>
                                      <p className="text-xs text-gray-500 truncate font-mono">
                                        {account.address.slice(0, 6)}...{account.address.slice(-4)}
                                      </p>
                                    </div>
                                  </button>
                                  <div className="flex items-center gap-1">
                                    {account.index === activeAccountIndex && (
                                      <Check className="w-4 h-4 text-[#0019ff]" />
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRenameAccountIndex(account.index);
                                        setNewAccountName(account.name);
                                        setShowRenameAccount(true);
                                      }}
                                      className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                                      title="Rename account"
                                    >
                                      <Edit className="w-3.5 h-3.5 text-gray-600" />
                                    </button>
                                  </div>
                                </div>
                              </MenuItem>
                            ))}
                            <div className="border-t border-gray-100 my-1"></div>
                            <MenuItem>
                              <button
                                onClick={() => createAccount()}
                                className="group flex items-center gap-3 px-4 py-3 text-sm w-full hover:bg-gray-50 transition-colors text-[#0019ff] font-medium"
                              >
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                  <span className="text-xl">+</span>
                                </div>
                                <span>Create New Account</span>
                              </button>
                            </MenuItem>
                          </div>
                        </MenuItems>
                      </Menu>
                    )}

                    <a
                      href="#"
                      className="group -mx-2 flex gap-x-3 rounded-[4px] p-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-black transition-all duration-200 hover:shadow-sm"
                    >
                      <Settings
                        aria-hidden="true"
                        className="size-5 shrink-0 text-gray-400 group-hover:text-black group-hover:rotate-90 transition-all duration-300"
                      />
                      Settings
                    </a>
                    <button
                      onClick={handleDisconnect}
                      className="group -mx-2 flex gap-x-3 rounded-[4px] p-3 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 w-full transition-all duration-200 border border-transparent hover:border-red-200"
                    >
                      <LogOut aria-hidden="true" className="size-5 shrink-0 text-gray-400 group-hover:text-red-600 group-hover:-translate-x-1 transition-all duration-200" />
                      Disconnect
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Transaction Detail Dialog */}
      <Dialog open={showTransactionDetail} onClose={() => setShowTransactionDetail(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-900/80 transition-opacity" />
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="relative transform overflow-hidden rounded bg-white px-6 py-8 shadow-xl transition-all w-full max-w-lg">
              {selectedTransaction && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">Transaction Details</h3>
                    <button
                      onClick={() => setShowTransactionDetail(false)}
                      className="p-2 rounded hover:bg-gray-100 transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Transaction Type Badge */}
                  <div className="mb-6 flex items-center gap-3 flex-wrap">
                    {selectedTransaction.from?.toLowerCase() === address?.toLowerCase() ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
                        <ArrowRightLeft className="w-4 h-4 text-red-600 rotate-90" />
                        <span className="text-sm font-semibold text-red-700">Sent</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
                        <ArrowRightLeft className="w-4 h-4 text-green-600 -rotate-90" />
                        <span className="text-sm font-semibold text-green-700">Received</span>
                      </div>
                    )}
                    {selectedTransaction.status && (() => {
                      const statusBadge = getStatusBadge(selectedTransaction.status);
                      const Icon = statusBadge.icon;
                      return (
                        <div className={classNames(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border",
                          statusBadge.className
                        )}>
                          <Icon className={classNames(
                            "w-4 h-4",
                            selectedTransaction.status === "pending" ? "animate-spin" : ""
                          )} />
                          <span className="text-sm font-semibold">{statusBadge.text}</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Amount */}
                  <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-lg p-6 mb-6">
                    <p className="text-sm text-gray-600 mb-2">Amount</p>
                    <p className={classNames(
                      "text-4xl font-bold",
                      selectedTransaction.zkp_enabled ? "text-purple-600" : (selectedTransaction.from?.toLowerCase() === address?.toLowerCase() ? "text-red-600" : "text-green-600")
                    )}>
                      {selectedTransaction.from?.toLowerCase() === address?.toLowerCase() ? "-" : "+"} {formatTransactionAmount(selectedTransaction)}
                    </p>
                    {getPrivacyBadge(selectedTransaction) && (
                      <div className="mt-3">
                        <span className={classNames(
                          "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-semibold",
                          getPrivacyBadge(selectedTransaction)!.className
                        )}>
                          🔒 {getPrivacyBadge(selectedTransaction)!.text}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Transaction Info */}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 font-semibold mb-1">From</p>
                        <p className="text-sm font-mono text-gray-900 break-all">{selectedTransaction.from}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedTransaction.from);
                          toast.success("Copied!", "Address copied to clipboard", 2000);
                        }}
                        className="p-1.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
                      >
                        <Copy className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 font-semibold mb-1">To</p>
                        <p className="text-sm font-mono text-gray-900 break-all">{selectedTransaction.to}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedTransaction.to);
                          toast.success("Copied!", "Address copied to clipboard", 2000);
                        }}
                        className="p-1.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
                      >
                        <Copy className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    {selectedTransaction.hash && (
                      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <Hash className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Transaction Hash</p>
                          <p className="text-sm font-mono text-gray-900 break-all">{selectedTransaction.hash}</p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedTransaction.hash);
                            toast.success("Copied!", "Hash copied to clipboard", 2000);
                          }}
                          className="p-1.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
                        >
                          <Copy className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    )}

                    {selectedTransaction.timestamp && (
                      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Timestamp</p>
                          <p className="text-sm text-gray-900">
                            {new Date(selectedTransaction.timestamp * 1000).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedTransaction.nonce !== undefined && (
                      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <Hash className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Nonce</p>
                          <p className="text-sm text-gray-900">{selectedTransaction.nonce}</p>
                        </div>
                      </div>
                    )}

                    {selectedTransaction.block_id !== undefined && selectedTransaction.block_id !== null && (
                      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <Hash className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-blue-700 font-semibold mb-1">Block Number</p>
                          <p className="text-sm font-mono text-blue-900 font-semibold">#{selectedTransaction.block_id}</p>
                        </div>
                      </div>
                    )}

                    {selectedTransaction.block_hash && (
                      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <Hash className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Block Hash</p>
                          <p className="text-sm font-mono text-gray-900 break-all">{selectedTransaction.block_hash}</p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedTransaction.block_hash);
                            toast.success("Copied!", "Block hash copied to clipboard", 2000);
                          }}
                          className="p-1.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
                        >
                          <Copy className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Gas & Fee Info */}
                  {(selectedTransaction.gas_used !== undefined || selectedTransaction.fee_paid !== undefined) && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Gas & Fees
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {selectedTransaction.gas_price !== undefined && (
                          <div>
                            <p className="text-blue-700 font-medium mb-0.5">Gas Price</p>
                            <p className="text-blue-900 font-semibold">{selectedTransaction.gas_price} RAIN</p>
                          </div>
                        )}
                        {selectedTransaction.gas_limit !== undefined && (
                          <div>
                            <p className="text-blue-700 font-medium mb-0.5">Gas Limit</p>
                            <p className="text-blue-900 font-semibold">{selectedTransaction.gas_limit}</p>
                          </div>
                        )}
                        {selectedTransaction.gas_used !== undefined && (
                          <div>
                            <p className="text-blue-700 font-medium mb-0.5">Gas Used</p>
                            <p className="text-blue-900 font-semibold">{selectedTransaction.gas_used}</p>
                          </div>
                        )}
                        {selectedTransaction.fee_paid !== undefined && (
                          <div>
                            <p className="text-blue-700 font-medium mb-0.5">Total Fee</p>
                            <p className="text-blue-900 font-semibold">{selectedTransaction.fee_paid} RAIN</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Balance Changes */}
                  {(selectedTransaction.balance_before_from !== undefined || selectedTransaction.balance_before_to !== undefined) && (() => {
                    const isSender = selectedTransaction.from?.toLowerCase() === address?.toLowerCase();
                    const isReceiver = selectedTransaction.to?.toLowerCase() === address?.toLowerCase();
                    const privacyLevel = selectedTransaction.privacy_level || 'none';

                    // Determine what balance info to show based on privacy level
                    const showSenderBalance = privacyLevel === 'none' || privacyLevel === 'partial' || isSender;
                    const showRecipientBalance = privacyLevel === 'none' || privacyLevel === 'partial' || isReceiver;

                    return (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Balance Changes</h4>
                        <div className="space-y-3 text-xs">
                          {selectedTransaction.balance_before_from !== undefined && showSenderBalance && (
                            <div>
                              <p className="text-gray-600 font-medium mb-1">Sender Balance</p>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-900 font-mono">{selectedTransaction.balance_before_from}</span>
                                <ArrowRightLeft className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-900 font-mono font-semibold">{selectedTransaction.balance_after_from}</span>
                                <span className="text-red-600 font-semibold">
                                  (-{selectedTransaction.balance_before_from - selectedTransaction.balance_after_from})
                                </span>
                              </div>
                            </div>
                          )}
                          {selectedTransaction.balance_before_from !== undefined && !showSenderBalance && (
                            <div>
                              <p className="text-gray-600 font-medium mb-1">Sender Balance</p>
                              <div className="flex items-center gap-2">
                                <span className="text-purple-600 font-semibold">🔒 [ENCRYPTED]</span>
                              </div>
                            </div>
                          )}
                          {selectedTransaction.balance_before_to !== undefined && showRecipientBalance && (
                            <div>
                              <p className="text-gray-600 font-medium mb-1">Recipient Balance</p>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-900 font-mono">{selectedTransaction.balance_before_to}</span>
                                <ArrowRightLeft className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-900 font-mono font-semibold">{selectedTransaction.balance_after_to}</span>
                                <span className="text-green-600 font-semibold">
                                  (+{selectedTransaction.balance_after_to - selectedTransaction.balance_before_to})
                                </span>
                              </div>
                            </div>
                          )}
                          {selectedTransaction.balance_before_to !== undefined && !showRecipientBalance && (
                            <div>
                              <p className="text-gray-600 font-medium mb-1">Recipient Balance</p>
                              <div className="flex items-center gap-2">
                                <span className="text-purple-600 font-semibold">🔒 [ENCRYPTED]</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Transaction Type & Privacy */}
                  {(selectedTransaction.tx_type || selectedTransaction.zkp_enabled || selectedTransaction.shard_id !== undefined) && (
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Transaction Type & Privacy
                      </h4>
                      <div className="space-y-2 text-xs">
                        {selectedTransaction.tx_type && (
                          <div className="flex items-center justify-between">
                            <span className="text-purple-700 font-medium">Type</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-900 font-semibold rounded">
                              {selectedTransaction.tx_type}
                            </span>
                          </div>
                        )}
                        {selectedTransaction.zkp_enabled !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-purple-700 font-medium">ZKP Privacy</span>
                            <span className={`px-2 py-1 font-semibold rounded ${selectedTransaction.zkp_enabled ? 'bg-green-100 text-green-900' : 'bg-gray-100 text-gray-600'}`}>
                              {selectedTransaction.zkp_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        )}
                        {selectedTransaction.privacy_level && (
                          <div className="flex items-center justify-between">
                            <span className="text-purple-700 font-medium">Privacy Level</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-900 font-semibold rounded uppercase">
                              {selectedTransaction.privacy_level}
                            </span>
                          </div>
                        )}
                        {selectedTransaction.amount_commitment && (
                          <div className="flex flex-col gap-1">
                            <span className="text-purple-700 font-medium">Amount Commitment</span>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-purple-100 text-purple-900 font-mono text-[10px] rounded flex-1 truncate">
                                {formatCommitment(selectedTransaction.amount_commitment)}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedTransaction.amount_commitment || '');
                                  toast.success("Copied!", "Commitment copied to clipboard", 2000);
                                }}
                                className="p-1 rounded hover:bg-purple-200 transition-colors flex-shrink-0"
                              >
                                <Copy className="w-3 h-3 text-purple-700" />
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedTransaction.nullifier && (
                          <div className="flex flex-col gap-1">
                            <span className="text-purple-700 font-medium">Nullifier</span>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-purple-100 text-purple-900 font-mono text-[10px] rounded flex-1 truncate">
                                {formatCommitment(selectedTransaction.nullifier)}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedTransaction.nullifier || '');
                                  toast.success("Copied!", "Nullifier copied to clipboard", 2000);
                                }}
                                className="p-1 rounded hover:bg-purple-200 transition-colors flex-shrink-0"
                              >
                                <Copy className="w-3 h-3 text-purple-700" />
                              </button>
                            </div>
                          </div>
                        )}
                        {hasZKPProof(selectedTransaction) && (
                          <div className="flex items-center justify-between">
                            <span className="text-purple-700 font-medium">ZKP Proof</span>
                            <span className="px-2 py-1 bg-green-100 text-green-900 font-semibold rounded flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Verified
                            </span>
                          </div>
                        )}
                        {selectedTransaction.shard_id !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-purple-700 font-medium">Shard ID</span>
                            <span className="text-purple-900 font-semibold font-mono">#{selectedTransaction.shard_id}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Advanced Fees (if available) */}
                  {(selectedTransaction.base_fee !== undefined || selectedTransaction.priority_fee !== undefined || selectedTransaction.tier !== undefined) && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Advanced Fee Structure
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {selectedTransaction.base_fee !== undefined && (
                          <div>
                            <p className="text-amber-700 font-medium mb-0.5">Base Fee</p>
                            <p className="text-amber-900 font-semibold">{selectedTransaction.base_fee} RAIN</p>
                          </div>
                        )}
                        {selectedTransaction.priority_fee !== undefined && (
                          <div>
                            <p className="text-amber-700 font-medium mb-0.5">Priority Fee</p>
                            <p className="text-amber-900 font-semibold">{selectedTransaction.priority_fee} RAIN</p>
                          </div>
                        )}
                        {selectedTransaction.storage_fee !== undefined && (
                          <div>
                            <p className="text-amber-700 font-medium mb-0.5">Storage Fee</p>
                            <p className="text-amber-900 font-semibold">{selectedTransaction.storage_fee} RAIN</p>
                          </div>
                        )}
                        {selectedTransaction.tier !== undefined && (
                          <div>
                            <p className="text-amber-700 font-medium mb-0.5">Validator Tier</p>
                            <p className="text-amber-900 font-semibold">
                              Tier {selectedTransaction.tier}
                              {selectedTransaction.tier === 1 && ' (Standard)'}
                              {selectedTransaction.tier === 2 && ' (Premium)'}
                              {selectedTransaction.tier === 3 && ' (Enterprise)'}
                            </p>
                          </div>
                        )}
                        {selectedTransaction.tier_multiplier !== undefined && (
                          <div>
                            <p className="text-amber-700 font-medium mb-0.5">Fee Discount</p>
                            <p className="text-amber-900 font-semibold">{((1 - selectedTransaction.tier_multiplier) * 100).toFixed(0)}%</p>
                          </div>
                        )}
                        {selectedTransaction.total_fee !== undefined && (
                          <div className="col-span-2 pt-2 border-t border-amber-200">
                            <p className="text-amber-700 font-medium mb-0.5">Total Fee (with discount)</p>
                            <p className="text-amber-900 font-bold">{selectedTransaction.total_fee} RAIN</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Raw Transaction Data */}
                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        Raw Transaction Data
                      </h4>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(selectedTransaction, null, 2));
                          toast.success("Copied!", "Raw transaction data copied to clipboard", 2000);
                        }}
                        className="p-1.5 rounded hover:bg-gray-700 transition-colors"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <pre className="text-xs text-gray-300 font-mono overflow-x-auto bg-gray-800 rounded p-3 max-h-64 overflow-y-auto">
{JSON.stringify(selectedTransaction, null, 2)}
                    </pre>
                  </div>

                  {/* View in Explorer Button */}
                  {selectedTransaction.hash && (
                    <a
                      href={`http://localhost:3001/tx/${selectedTransaction.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded bg-[#0019ff] text-white font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <span>View in Explorer</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </>
              )}
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white/95 backdrop-blur-xl px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center justify-between">
            <img src="/press-kit/logos/rainum-logo-blue.svg" alt="Rainum" className="h-7 w-auto" />

            {/* Network Selector Desktop */}
            <Menu as="div" className="relative">
              <MenuButton className="flex items-center gap-2 px-3 py-1.5 bg-black hover:bg-gray-900 rounded transition-all">
                <div className="w-1.5 h-1.5 bg-[#0019ff] animate-pulse"></div>
                <span className="text-xs font-semibold text-white">Devnet</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </MenuButton>

              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-52 origin-top-right rounded bg-black py-1 shadow-xl transition data-closed:scale-95 data-closed:opacity-0"
              >
                <MenuItem>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm w-full bg-gray-900 text-white font-semibold">
                    <div className="w-1.5 h-1.5 bg-[#0019ff]"></div>
                    <span>Devnet</span>
                    <Check className="w-4 h-4 ml-auto text-[#0019ff]" />
                  </button>
                </MenuItem>
                <MenuItem>
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 text-sm w-full text-gray-500 cursor-not-allowed"
                  >
                    <div className="w-1.5 h-1.5 bg-gray-600"></div>
                    <span>Testnet</span>
                    <span className="ml-auto px-2 py-0.5 bg-[#0019ff] text-white text-[9px] font-bold rounded">
                      Q1 2026
                    </span>
                  </button>
                </MenuItem>
                <MenuItem>
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 text-sm w-full text-gray-500 cursor-not-allowed"
                  >
                    <div className="w-1.5 h-1.5 bg-gray-600"></div>
                    <span>Mainnet</span>
                    <span className="ml-auto px-2 py-0.5 bg-[#0019ff] text-white text-[9px] font-bold rounded">
                      Q2 2026
                    </span>
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>

          {/* Balance Card Desktop */}
          <div className="bg-gradient-to-br from-[#0019ff] via-blue-800 to-black rounded-[4px] p-6 text-white shadow-xl shadow-[#0019ff]/20 hover:shadow-[#0019ff]/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-widest text-white/90 font-bold">Total Balance</p>
              <Wallet className="w-5 h-5 text-white/70" />
            </div>
            <div className="mb-4">
              {!isHydrated || (balance === 0 && loadingTransactions) ? (
                <div className="space-y-3">
                  <div className="h-14 bg-white/20 rounded animate-pulse" style={{ width: '240px' }}></div>
                  <div className="h-4 bg-white/10 rounded animate-pulse" style={{ width: '180px' }}></div>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    {accounts.length > 1 ? (
                      <button
                        onClick={handleShowAccountBalances}
                        className="flex items-baseline gap-2 flex-wrap hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <span className={`font-bold text-white ${
                          balance.toLocaleString('en-US').length > 15 ? 'text-lg' :
                          balance.toLocaleString('en-US').length > 10 ? 'text-xl' :
                          'text-2xl'
                        }`} style={{ fontFamily: 'SF Mono, Monaco, monospace', wordBreak: 'keep-all', whiteSpace: 'nowrap' }}>
                          {balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-sm font-semibold text-white/80">RAIN</span>
                      </button>
                    ) : (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`font-bold text-white ${
                          balance.toLocaleString('en-US').length > 15 ? 'text-lg' :
                          balance.toLocaleString('en-US').length > 10 ? 'text-xl' :
                          'text-2xl'
                        }`} style={{ fontFamily: 'SF Mono, Monaco, monospace', wordBreak: 'keep-all', whiteSpace: 'nowrap' }}>
                          {balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-sm font-semibold text-white/80">RAIN</span>
                      </div>
                    )}
                    {accounts.length > 1 && (
                      <button
                        onClick={handleShowAccountBalances}
                        className="text-[10px] text-white/50 hover:text-white/70 font-mono leading-tight transition-colors cursor-pointer text-left"
                      >
                        {loadingTotalBalance ? 'Calculating...' :
                          `Total: ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RAIN`
                        }
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs bg-white/10 backdrop-blur-sm rounded px-3 py-2 hover:bg-white/20 transition-colors">
              {!isHydrated || !address ? (
                <div className="h-4 bg-white/20 rounded animate-pulse flex-1"></div>
              ) : (
                <>
                  <span className="truncate max-w-[180px] font-mono">{address}</span>
                  <button onClick={handleCopyAddress} className="hover:scale-110 transition-transform ml-auto">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </>
              )}
            </div>
            <button
              onClick={handleRequestFaucet}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded px-3 py-2 text-xs font-semibold transition-all hover:scale-[1.02]"
            >
              <Droplet size={14} />
              Request Test Tokens
            </button>
          </div>

          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigationItems.map((item) => (
                    <li key={item.name}>
                      <button
                        onClick={() => handleTabChange(item.name)}
                        className={classNames(
                          activeTab === item.name
                            ? "bg-black text-white"
                            : "text-gray-700 hover:bg-gray-100 hover:text-black",
                          "group flex gap-x-3 rounded-[4px] p-3 text-sm font-semibold w-full transition-colors"
                        )}
                      >
                        <item.icon
                          aria-hidden="true"
                          className={classNames(
                            activeTab === item.name ? "text-white" : "text-gray-400 group-hover:text-black",
                            "size-5 shrink-0"
                          )}
                        />
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto space-y-2 pt-4 border-t border-gray-200">
                <a
                  href="#"
                  className="group -mx-2 flex gap-x-3 rounded p-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-black transition-all duration-200 hover:shadow-sm"
                >
                  <Settings
                    aria-hidden="true"
                    className="size-5 shrink-0 text-gray-400 group-hover:text-black group-hover:rotate-90 transition-all duration-300"
                  />
                  Settings
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/95 backdrop-blur-xl px-4 shadow-md sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 lg:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <MenuIcon aria-hidden="true" className="size-6" />
          </button>

          {/* Separator */}
          <div aria-hidden="true" className="h-6 w-px bg-gray-200 lg:hidden" />

          <div className="flex flex-1 items-center justify-end gap-x-4 lg:gap-x-6">
            {/* Quick Actions & Profile */}
            <div className="flex items-center gap-3">
              {/* Download Extension Button */}
              <a
                href="https://chrome.google.com/webstore"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border-2 border-[#0019ff] text-[#0019ff] font-bold text-xs transition-all group"
                style={{ borderRadius: '4px' }}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                <span>Get Wallet in Browser</span>
                <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
              </a>

              {/* Separator */}
              <div aria-hidden="true" className="hidden lg:block h-6 w-px bg-gray-200" />

              {/* Network & Connection Status */}
              <Menu as="div" className="relative hidden lg:block">
                <MenuButton className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors" style={{ borderRadius: '4px' }}>
                  <div className={`w-2 h-2 rounded-full ${networkStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs font-semibold text-gray-700">{currentNetwork.name}</span>
                  <span className="text-xs text-gray-500">#{blockHeight.toLocaleString()}</span>
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                </MenuButton>
                <MenuItems className="absolute left-0 z-50 mt-2 w-48 origin-top-left bg-white shadow-lg ring-1 ring-black/5 focus:outline-none" style={{ borderRadius: '4px' }}>
                  <div className="py-1">
                    <MenuItem>
                      {({ active }) => (
                        <button
                          onClick={() => switchNetwork(NETWORKS.DEVNET)}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } ${
                            currentNetwork.id === 'devnet' ? 'bg-blue-50 font-semibold' : ''
                          } group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-900`}
                        >
                          <div className={`w-2 h-2 rounded-full ${currentNetwork.id === 'devnet' ? 'bg-blue-600' : 'bg-gray-300'}`} />
                          Devnet
                        </button>
                      )}
                    </MenuItem>
                    <MenuItem disabled>
                      {({ active }) => (
                        <button
                          disabled
                          className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                        >
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                          Testnet
                          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 bg-gray-200 text-gray-500 rounded" style={{ borderRadius: '4px' }}>Q1 2026</span>
                        </button>
                      )}
                    </MenuItem>
                    <MenuItem disabled>
                      {({ active }) => (
                        <button
                          disabled
                          className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                        >
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                          Mainnet
                          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 bg-gray-200 text-gray-500 rounded" style={{ borderRadius: '4px' }}>Q3 2026</span>
                        </button>
                      )}
                    </MenuItem>
                  </div>
                </MenuItems>
              </Menu>

              {/* RAIN Price Ticker */}
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200" style={{ borderRadius: '4px' }}>
                <span className="text-xs font-bold text-gray-900">RAIN</span>
                <span className="text-xs font-semibold text-gray-700">${rainPrice.toFixed(2)}</span>
                <span className={`text-xs font-semibold ${priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(1)}%
                </span>
              </div>

              {/* Gas Price Indicator */}
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200" style={{ borderRadius: '4px' }}>
                <span className="text-xs">⛽</span>
                <span className={`text-xs font-semibold ${
                  gasPrice < 2 ? 'text-green-600' :
                  gasPrice < 4 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {gasPrice.toFixed(1)} RAIN
                </span>
              </div>

              {/* Portfolio Stats */}
              {balance > 0 && (
                <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200" style={{ borderRadius: '4px' }}>
                  <span className="text-xs text-gray-600">Portfolio:</span>
                  <span className="text-xs font-bold text-gray-900">${portfolioValue.toFixed(2)}</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-gray-600">24h:</span>
                  <span className={`text-xs font-semibold ${portfolioChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {portfolioChange24h >= 0 ? '+' : ''}${Math.abs(portfolioChange24h).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Separator */}
              <div aria-hidden="true" className="hidden lg:block h-6 w-px bg-gray-200" />

              {/* Account Switcher Dropdown */}
              {accounts.length > 0 && (
                <Menu as="div" className="relative">
                  <MenuButton className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <img
                      src={address ? blockies(address) : ""}
                      alt="Profile"
                      className="w-10 h-10 rounded-full ring-2 ring-gray-200"
                    />
                    <div className="hidden lg:block text-left">
                      <p className="text-xs text-gray-500">Connected</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {getActiveAccount()?.name || 'Account'}
                      </p>
                    </div>
                    <ChevronDown className="hidden lg:block w-4 h-4 text-gray-400" />
                  </MenuButton>

                  <MenuItems
                    transition
                    className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-lg bg-white py-2 shadow-xl ring-1 ring-gray-900/5 transition data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in max-h-96 overflow-auto"
                  >
                    {/* Account List */}
                    <div className="px-2 py-1">
                      <p className="text-xs font-semibold text-gray-500 px-3 py-2">Your Accounts</p>
                      {accounts.map((account) => (
                        <MenuItem key={account.index}>
                          <div className={classNames(
                            account.index === activeAccountIndex
                              ? 'bg-blue-50'
                              : 'hover:bg-gray-50',
                            'group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors'
                          )}>
                            <button
                              onClick={() => switchAccount(account.index)}
                              className="flex items-center gap-3 flex-1 min-w-0"
                            >
                              <img
                                src={blockies(account.address)}
                                alt={account.name}
                                className="w-10 h-10 rounded-full flex-shrink-0"
                              />
                              <div className="text-left overflow-hidden">
                                <p className="font-semibold text-gray-900 truncate">{account.name}</p>
                                <p className="text-xs text-gray-500 truncate font-mono">
                                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                                </p>
                              </div>
                            </button>
                            <div className="flex items-center gap-1">
                              {account.index === activeAccountIndex && (
                                <Check className="w-5 h-5 text-[#0019ff]" />
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenameAccountIndex(account.index);
                                  setNewAccountName(account.name);
                                  setShowRenameAccount(true);
                                }}
                                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                title="Rename account"
                              >
                                <Edit className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                          </div>
                        </MenuItem>
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 my-2"></div>

                    {/* Create New Account */}
                    <MenuItem>
                      <button
                        onClick={() => createAccount()}
                        className="flex items-center gap-3 px-5 py-3 text-sm w-full hover:bg-gray-50 transition-colors text-[#0019ff] font-semibold"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                          <Plus className="w-5 h-5 text-[#0019ff]" />
                        </div>
                        <span>Create New Account</span>
                      </button>
                    </MenuItem>
                  </MenuItems>
                </Menu>
              )}

              {/* Separator */}
              <div aria-hidden="true" className="hidden lg:block h-6 w-px bg-gray-200" />

              {/* Disconnect Button */}
              <button
                onClick={handleDisconnect}
                className="hidden lg:flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg font-semibold text-sm transition-all border border-transparent hover:border-red-200"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>

              {/* Mobile Menu Button */}
              <Menu as="div" className="relative lg:hidden">
                <MenuButton className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </MenuButton>
                <MenuItems
                  transition
                  className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg bg-white py-2 shadow-xl ring-1 ring-gray-900/5 transition data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                >
                  <MenuItem>
                    <button
                      onClick={() => setActiveTab("Transactions")}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-900 hover:bg-gray-50"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      Send
                    </button>
                  </MenuItem>
                  <MenuItem>
                    <button
                      onClick={handleDisconnect}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Disconnect
                    </button>
                  </MenuItem>
                </MenuItems>
              </Menu>
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <AnimatePresence mode="wait">
              {/* Wallet View */}
              {activeTab === "Wallet" && (
                <motion.div
                  key="wallet"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                {/* Main Balance Card */}
                <div className="bg-white border border-gray-200 rounded p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold text-black tracking-tight">Your Wallet</h2>
                      <p className="text-gray-500 text-sm mt-1">Manage your RAIN tokens</p>
                    </div>
                    <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-semibold text-green-700">Active</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Balance Card */}
                    <div className="group relative bg-gradient-to-br from-[#0019ff] via-blue-800 to-black border border-blue-400/30 rounded p-6 shadow-xl shadow-[#0019ff]/20 hover:shadow-[#0019ff]/30 transition-all duration-300">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <button
                          onClick={async () => {
                            setIsRefreshingBalance(true);
                            await updateBalance();
                            setTimeout(() => setIsRefreshingBalance(false), 500);
                          }}
                          disabled={isRefreshingBalance}
                          className="relative w-8 h-8 flex items-center justify-center"
                        >
                          {isRefreshingBalance ? (
                            <div className="relative w-4 h-4">
                              <div className="absolute inset-0 border-2 border-white/20 rounded-full"></div>
                              <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : (
                            <RefreshCw className="w-4 h-4 text-white/60 cursor-pointer hover:text-white transition-colors" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs uppercase tracking-wider font-semibold text-white/90 mb-2">Total Balance</p>
                      <div className="space-y-1">
                        {accounts.length > 1 ? (
                          <button
                            onClick={handleShowAccountBalances}
                            className="flex items-baseline gap-2 flex-wrap hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <p className={`font-bold text-white ${
                              balance.toLocaleString('en-US').length > 15 ? 'text-lg' :
                              balance.toLocaleString('en-US').length > 10 ? 'text-xl' :
                              'text-2xl'
                            }`} style={{ fontFamily: 'SF Mono, Monaco, monospace', wordBreak: 'keep-all', whiteSpace: 'nowrap' }}>
                              {balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-sm font-semibold text-white/80">RAIN</p>
                          </button>
                        ) : (
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <p className={`font-bold text-white ${
                              balance.toLocaleString('en-US').length > 15 ? 'text-lg' :
                              balance.toLocaleString('en-US').length > 10 ? 'text-xl' :
                              'text-2xl'
                            }`} style={{ fontFamily: 'SF Mono, Monaco, monospace', wordBreak: 'keep-all', whiteSpace: 'nowrap' }}>
                              {balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-sm font-semibold text-white/80">RAIN</p>
                          </div>
                        )}
                        {accounts.length > 1 && (
                          <button
                            onClick={handleShowAccountBalances}
                            className="text-[10px] text-white/50 hover:text-white/70 font-mono leading-tight transition-colors cursor-pointer text-left"
                          >
                            {loadingTotalBalance ? 'Calculating...' :
                              `Total: ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RAIN`
                            }
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Address Card */}
                    <div className="group relative bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded p-6 hover:shadow-md transition-all duration-300 hover:border-gray-300">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                          <Copy className="w-5 h-5 text-gray-600" />
                        </div>
                        {copied && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                            Copied!
                          </span>
                        )}
                      </div>
                      <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">Wallet Address</p>
                      <p className="text-sm font-mono text-black truncate mb-3 bg-gray-50 px-3 py-2 rounded border border-gray-200">{address}</p>
                      <button
                        onClick={handleCopyAddress}
                        className="text-xs text-[#0019ff] hover:text-blue-700 font-semibold flex items-center gap-1 transition-colors group-hover:gap-2 duration-300"
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? "Copied" : "Copy Address"}
                      </button>
                    </div>

                    {/* Network Card */}
                    <div className="group relative bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded p-6 hover:shadow-md transition-all duration-300 hover:border-gray-300">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded bg-green-50 flex items-center justify-center">
                          <GitBranch className="w-5 h-5 text-green-600" />
                        </div>
                      </div>
                      <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">Network Status</p>
                      <p className="text-lg font-bold text-black mb-2">Rainum Mainnet</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-semibold text-green-700">Connected</span>
                        </div>
                        <div className="text-xs text-gray-400">• Block #1,234,567</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white border border-gray-200 rounded p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-black mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      onClick={() => handleTabChange("Transactions")}
                      className="flex flex-col items-center gap-2 p-4 rounded border border-gray-200 hover:border-[#0019ff] hover:bg-blue-50/50 transition-all duration-200 group"
                    >
                      <ArrowRightLeft className="w-5 h-5 text-gray-600 group-hover:text-[#0019ff] transition-colors" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-[#0019ff] transition-colors">Send</span>
                    </button>
                    <button
                      onClick={() => handleTabChange("Transactions")}
                      className="flex flex-col items-center gap-2 p-4 rounded border border-gray-200 hover:border-[#0019ff] hover:bg-blue-50/50 transition-all duration-200 group"
                    >
                      <Copy className="w-5 h-5 text-gray-600 group-hover:text-[#0019ff] transition-colors" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-[#0019ff] transition-colors">Receive</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-4 rounded border border-gray-200 hover:border-[#0019ff] hover:bg-blue-50/50 transition-all duration-200 group">
                      <RefreshCw className="w-5 h-5 text-gray-600 group-hover:text-[#0019ff] transition-colors" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-[#0019ff] transition-colors">Swap</span>
                    </button>
                    <button
                      onClick={() => handleTabChange("Bridge")}
                      className="flex flex-col items-center gap-2 p-4 rounded border border-gray-200 hover:border-[#0019ff] hover:bg-blue-50/50 transition-all duration-200 group"
                    >
                      <GitBranch className="w-5 h-5 text-gray-600 group-hover:text-[#0019ff] transition-colors" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-[#0019ff] transition-colors">Bridge</span>
                    </button>
                  </div>
                </div>

                {/* Transaction History */}
                <div className="bg-white border border-gray-200 rounded p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-black tracking-tight">Transaction History</h2>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={exportToCSV}
                        disabled={transactions.length === 0}
                        className="text-sm text-green-600 hover:text-green-700 font-semibold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </button>
                      <button
                        onClick={fetchTransactions}
                        disabled={loadingTransactions}
                        className="text-sm text-[#0019ff] hover:text-blue-700 font-semibold flex items-center gap-1 disabled:opacity-50"
                      >
                        <RefreshCw className={classNames("w-4 h-4", loadingTransactions ? "animate-spin" : "")} />
                        Refresh
                      </button>
                    </div>
                  </div>

                  {/* Search and Filter Controls */}
                  {transactions.length > 0 && (
                    <div className="mb-6 space-y-4">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by hash or address..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#0019ff] focus:border-[#0019ff] outline-none transition-all text-sm text-gray-900"
                        />
                      </div>

                      {/* Filter and Sort */}
                      <div className="flex flex-wrap gap-3">
                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-600">Status:</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setFilterStatus("all")}
                              className={classNames(
                                "px-3 py-1.5 text-xs font-semibold rounded transition-all",
                                filterStatus === "all"
                                  ? "bg-[#0019ff] text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              )}
                            >
                              All
                            </button>
                            <button
                              onClick={() => setFilterStatus("confirmed")}
                              className={classNames(
                                "px-3 py-1.5 text-xs font-semibold rounded transition-all",
                                filterStatus === "confirmed"
                                  ? "bg-green-600 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              )}
                            >
                              Confirmed
                            </button>
                            <button
                              onClick={() => setFilterStatus("pending")}
                              className={classNames(
                                "px-3 py-1.5 text-xs font-semibold rounded transition-all",
                                filterStatus === "pending"
                                  ? "bg-yellow-600 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              )}
                            >
                              Pending
                            </button>
                          </div>
                        </div>

                        {/* Sort By */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-600">Sort:</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSortBy("newest")}
                              className={classNames(
                                "px-3 py-1.5 text-xs font-semibold rounded transition-all",
                                sortBy === "newest"
                                  ? "bg-[#0019ff] text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              )}
                            >
                              Newest
                            </button>
                            <button
                              onClick={() => setSortBy("oldest")}
                              className={classNames(
                                "px-3 py-1.5 text-xs font-semibold rounded transition-all",
                                sortBy === "oldest"
                                  ? "bg-[#0019ff] text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              )}
                            >
                              Oldest
                            </button>
                            <button
                              onClick={() => setSortBy("amount")}
                              className={classNames(
                                "px-3 py-1.5 text-xs font-semibold rounded transition-all",
                                sortBy === "amount"
                                  ? "bg-[#0019ff] text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              )}
                            >
                              Amount
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {transactions.length === 0 && loadingTransactions ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <TransactionCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ArrowRightLeft className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-900 font-semibold mb-1">No transactions yet</p>
                      <p className="text-sm text-gray-500">Your transaction history will appear here</p>
                    </div>
                  ) : getFilteredAndSortedTransactions().length === 0 && !loadingTransactions ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-900 font-semibold mb-1">No transactions found</p>
                      <p className="text-sm text-gray-500">Try adjusting your search or filter</p>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        {/* Loading Overlay */}
                        {loadingTransactions && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded">
                            <div className="bg-white px-6 py-4 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
                              <RefreshCw className="w-5 h-5 text-[#0019ff] animate-spin" />
                              <p className="text-sm font-semibold text-gray-700">Refreshing...</p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          {getPaginatedTransactions().map((tx, index) => {
                        const isOutgoing = tx.from?.toLowerCase() === address?.toLowerCase();
                        return (
                          <button
                            key={index}
                            onClick={() => {
                              setSelectedTransaction(tx);
                              setShowTransactionDetail(true);
                            }}
                            className="w-full flex items-center justify-between p-4 rounded border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={classNames(
                                  "w-10 h-10 rounded-full flex items-center justify-center relative",
                                  tx.zkp_enabled ? "bg-purple-50" : (isOutgoing ? "bg-red-50" : "bg-green-50")
                                )}
                              >
                                {tx.zkp_enabled ? (
                                  <Shield className="w-5 h-5 text-purple-600" />
                                ) : (
                                  <ArrowRightLeft
                                    className={classNames(
                                      "w-5 h-5",
                                      isOutgoing ? "text-red-600 rotate-90" : "text-green-600 -rotate-90"
                                    )}
                                  />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                                  {isOutgoing ? "Sent" : "Received"}
                                  {/* ⭐ NEW: VM Type Badge */}
                                  <VMTypeBadge type={(tx as any).vm_type || 'evm'} />
                                  <CrossVMIndicator isCrossVM={!!(tx as any).cross_vm_call} />
                                  {tx.zkp_enabled && (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-bold">
                                      PRIVATE
                                    </span>
                                  )}
                                  {tx.status && (() => {
                                    const statusBadge = getStatusBadge(tx.status);
                                    const Icon = statusBadge.icon;
                                    return (
                                      <span className={classNames(
                                        "inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-bold border",
                                        statusBadge.className
                                      )}>
                                        <Icon className="w-2.5 h-2.5" />
                                        {statusBadge.text}
                                      </span>
                                    );
                                  })()}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(() => {
                                    const isEncrypted = (addr: string) => addr === '0x0000000000000000000000000000000000000000' || addr?.startsWith('0x00000000');
                                    const targetAddr = isOutgoing ? tx.to : tx.from;
                                    const savedContact = targetAddr ? savedAddresses.find(a => a.address.toLowerCase() === targetAddr.toLowerCase()) : null;

                                    if (isOutgoing) {
                                      if (isEncrypted(tx.to)) return <span className="font-mono">To: 🔒 [ENCRYPTED]</span>;
                                      if (savedContact) {
                                        return (
                                          <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            <span className="font-semibold">{savedContact.name}</span>
                                            <span className="text-gray-400 font-mono text-[10px]">({tx.to?.slice(0, 6)}...)</span>
                                          </span>
                                        );
                                      }
                                      return <span className="font-mono">To: {tx.to?.slice(0, 8)}...{tx.to?.slice(-6)}</span>;
                                    } else {
                                      if (isEncrypted(tx.from)) return <span className="font-mono">From: 🔒 [ENCRYPTED]</span>;
                                      if (savedContact) {
                                        return (
                                          <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            <span className="font-semibold">{savedContact.name}</span>
                                            <span className="text-gray-400 font-mono text-[10px]">({tx.from?.slice(0, 6)}...)</span>
                                          </span>
                                        );
                                      }
                                      return <span className="font-mono">From: {tx.from?.slice(0, 8)}...{tx.from?.slice(-6)}</span>;
                                    }
                                  })()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <p
                                className={classNames(
                                  "text-sm font-bold",
                                  tx.zkp_enabled ? "text-purple-600" : (isOutgoing ? "text-red-600" : "text-green-600")
                                )}
                              >
                                {isOutgoing ? "-" : "+"} {formatTransactionAmount(tx)}
                              </p>
                              {getPrivacyBadge(tx) && (
                                <span className={classNames(
                                  "text-[10px] px-2 py-0.5 rounded-full border font-semibold",
                                  getPrivacyBadge(tx)!.className
                                )}>
                                  🔒 {getPrivacyBadge(tx)!.text}
                                </span>
                              )}
                              <p className="text-xs text-gray-500">
                                {tx.timestamp ? getRelativeTime(tx.timestamp) : "Pending"}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {/* Pagination Controls */}
                    {getTotalPages() > 1 && (
                      <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                        <div className="text-sm text-gray-600">
                          Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, getFilteredAndSortedTransactions().length)} of {getFilteredAndSortedTransactions().length} transactions
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={classNames(
                              "px-3 py-2 rounded border transition-all flex items-center gap-1",
                              currentPage === 1
                                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                                : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                            )}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                          </button>

                          <div className="flex items-center gap-1">
                            {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => {
                              // Show first page, last page, current page, and pages around current
                              const showPage = page === 1 ||
                                             page === getTotalPages() ||
                                             Math.abs(page - currentPage) <= 1;

                              if (!showPage) {
                                // Show ellipsis
                                if (page === 2 && currentPage > 3) return <span key={page} className="px-2 text-gray-400">...</span>;
                                if (page === getTotalPages() - 1 && currentPage < getTotalPages() - 2) return <span key={page} className="px-2 text-gray-400">...</span>;
                                return null;
                              }

                              return (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={classNames(
                                    "px-3 py-2 rounded border transition-all min-w-[40px]",
                                    currentPage === page
                                      ? "bg-[#0019ff] text-white border-[#0019ff]"
                                      : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                                  )}
                                >
                                  {page}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === getTotalPages()}
                            className={classNames(
                              "px-3 py-2 rounded border transition-all flex items-center gap-1",
                              currentPage === getTotalPages()
                                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                                : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                            )}
                          >
                            Next
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* Transactions View */}
            {activeTab === "Transactions" && (
              <motion.div
                key="transactions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="bg-white border border-gray-200 rounded p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-3xl font-bold text-black tracking-tight">Transactions</h2>
                      <p className="text-gray-500 text-sm mt-1">Send and receive RAIN tokens</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-400">Network Fee: 0.001 RAIN</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Send Form */}
                    <div className="border border-gray-200 rounded p-6 hover:shadow-md transition-shadow duration-300">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded bg-[#0019ff]/10 flex items-center justify-center">
                          <ArrowRightLeft className="w-5 h-5 text-[#0019ff]" />
                        </div>
                        <h3 className="text-xl font-bold text-black">Send RAIN</h3>
                      </div>
                      <form onSubmit={handleSubmitTransaction} className="space-y-5">
                        {/* ⭐ NEW: VM Selector */}
                        <VMSelector value={vmType} onChange={setVmType} />

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Recipient Address</label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                placeholder="0x..."
                                value={recipient}
                                onChange={(e) => {
                                  const addr = e.target.value;
                                  setRecipient(addr);
                                  console.log(`Input changed: "${addr}" (length: ${addr.length})`);

                                  // Reset states if empty
                                  if (addr.length === 0) {
                                    setAddressError("");
                                    setAddressExists(null);
                                    return;
                                  }

                                  // Validate if address looks complete (42 characters)
                                  if (addr.length === 42) {
                                    console.log('Address is 42 chars, calling validateRecipientAddress');
                                    validateRecipientAddress(addr);
                                  } else if (addr.length > 2) {
                                    // Show format error if user is typing but not 42 chars yet
                                    setAddressError("Address must be exactly 42 characters (0x + 40 hex digits)");
                                    setAddressExists(false);
                                  } else {
                                    setAddressError("");
                                    setAddressExists(null);
                                  }
                                }}
                                required
                                className={classNames(
                                  "w-full px-4 py-3 border rounded focus:ring-2 focus:ring-[#0019ff] outline-none transition-all font-mono text-sm text-gray-900 pr-10",
                                  addressExists === true && !addressIsNew
                                    ? "border-green-500 focus:border-green-500"
                                    : addressExists === true && addressIsNew
                                    ? "border-cyan-500 focus:border-cyan-500"
                                    : addressExists === false
                                    ? "border-red-500 focus:border-red-500"
                                    : "border-gray-300 focus:border-[#0019ff] hover:border-gray-400"
                                )}
                              />
                              {/* Validation indicator */}
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {isValidatingAddress && (
                                  <div className="w-4 h-4 border-2 border-[#0019ff] border-t-transparent rounded-full animate-spin"></div>
                                )}
                                {!isValidatingAddress && addressExists === true && !addressIsNew && (
                                  <Check className="w-5 h-5 text-green-600" />
                                )}
                                {!isValidatingAddress && addressExists === true && addressIsNew && (
                                  <Info className="w-5 h-5 text-cyan-600" />
                                )}
                                {!isValidatingAddress && addressExists === false && (
                                  <AlertTriangle className="w-5 h-5 text-red-600" />
                                )}
                              </div>
                            </div>
                            {/* QR Scanner Button */}
                            <button
                              type="button"
                              onClick={() => setShowQRScanner(true)}
                              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors flex items-center gap-2"
                              title="Scan QR Code"
                            >
                              <QrCode className="w-5 h-5 text-gray-700" />
                            </button>
                            {/* Address Book Button */}
                            <button
                              type="button"
                              onClick={() => setShowAddressBook(true)}
                              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors flex items-center gap-2"
                              title="Address Book"
                            >
                              <Book className="w-5 h-5 text-gray-700" />
                            </button>
                          </div>

                          {/* Recent Recipients */}
                          {(() => {
                            const recentRecipients = transactions
                              .filter(tx => tx.from?.toLowerCase() === address?.toLowerCase() && tx.to)
                              .map(tx => tx.to!)
                              .filter((addr, index, self) => self.indexOf(addr) === index)
                              .slice(0, 5);

                            if (recentRecipients.length > 0 && !recipient) {
                              return (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-600 mb-1.5 font-semibold">Recent recipients:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {recentRecipients.map((addr) => {
                                      const savedAddress = savedAddresses.find(a => a.address.toLowerCase() === addr.toLowerCase());
                                      return (
                                        <button
                                          key={addr}
                                          type="button"
                                          onClick={() => {
                                            setRecipient(addr);
                                            validateRecipientAddress(addr);
                                          }}
                                          className="px-2 py-1 bg-gray-100 hover:bg-[#0019ff] hover:text-white border border-gray-200 hover:border-[#0019ff] rounded text-xs font-mono transition-all flex items-center gap-1.5"
                                          title={addr}
                                        >
                                          <User className="w-3 h-3 flex-shrink-0" />
                                          <span className="font-semibold text-[11px]">
                                            {savedAddress ? savedAddress.name : `${addr.slice(0, 6)}...${addr.slice(-4)}`}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Save Address Button */}
                          {recipient && recipient.length === 42 && addressExists === true && (
                            <button
                              type="button"
                              onClick={() => {
                                setAddressToSave(recipient);
                                setSaveAddressName("");
                                setShowSaveAddress(true);
                              }}
                              className="mt-2 text-xs text-[#0019ff] hover:text-blue-700 font-semibold flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              Save to Address Book
                            </button>
                          )}
                          {addressError ? (
                            <p className="text-xs text-red-600 mt-1.5 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {addressError}
                            </p>
                          ) : addressExists === true && !addressIsNew ? (
                            <p className="text-xs text-green-600 mt-1.5 font-medium">✓ Verified Rainum address with activity</p>
                          ) : addressExists === true && addressIsNew ? (
                            <p className="text-xs text-cyan-600 mt-1.5 font-medium flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              New/unused address - valid EVM format
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500 mt-1.5">Enter the recipient's wallet address</p>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-semibold text-gray-700">Amount (RAIN)</label>
                            <button
                              type="button"
                              onClick={handleMaxAmount}
                              className="text-xs text-[#0019ff] hover:text-blue-700 hover:underline font-semibold transition-all cursor-pointer"
                            >
                              MAX: {balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Enter amount (whole numbers only)"
                              value={amount}
                              onChange={(e) => handleAmountChange(e.target.value)}
                              required
                              className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#0019ff] focus:border-[#0019ff] outline-none transition-all hover:border-gray-400 pr-16 text-gray-900 font-mono"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                              RAIN
                            </div>
                          </div>
                          {balanceError ? (
                            <p className="text-xs text-red-600 mt-1.5 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {balanceError}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500 mt-1.5">Available: {balance.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})} RAIN</p>
                          )}
                        </div>

                        {/* Gas Estimator - Always visible */}
                        <GasEstimator
                          from={address || "0x0000000000000000000000000000000000000000"}
                          to={recipient || "0x0000000000000000000000000000000000000000"}
                          amount={amount || "0"}
                          onPriorityChange={(newPriority) => setPriority(newPriority)}
                          onGasEstimate={(estimate) => {
                            // Update balance validation with gas estimate
                            if (estimate && estimate.success) {
                              const selectedPriority = estimate.estimate.priority_options[priority as keyof typeof estimate.estimate.priority_options];
                              if (selectedPriority && !estimate.estimate.sufficient_balance) {
                                setBalanceError(`Insufficient balance including gas fees`);
                              } else {
                                setBalanceError("");
                              }
                            }
                          }}
                        />

                        {/* ZKP Privacy Toggle */}
                        <div className="border-2 border-purple-200 rounded-lg p-4 bg-gradient-to-br from-purple-50 to-white">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Shield className="w-5 h-5 text-purple-600" />
                              <div>
                                <h4 className="text-sm font-bold text-purple-900">Zero-Knowledge Privacy</h4>
                                <p className="text-xs text-purple-700 mt-0.5">Hide transaction details from public view</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEnableZKP(!enableZKP)}
                              className={classNames(
                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                enableZKP ? "bg-purple-600" : "bg-gray-300"
                              )}
                            >
                              <span
                                className={classNames(
                                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                  enableZKP ? "translate-x-6" : "translate-x-1"
                                )}
                              />
                            </button>
                          </div>

                          {/* Privacy Level Selector */}
                          {enableZKP && (
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-3">
                                Privacy Level
                              </label>

                              <div className="grid grid-cols-3 gap-3">
                                {/* Level 1: Partial */}
                                <button
                                  type="button"
                                  onClick={() => setPrivacyLevel("partial")}
                                  className={classNames(
                                    "relative border-2 rounded-lg p-3 text-left transition-all duration-200 hover:shadow-sm",
                                    privacyLevel === "partial"
                                      ? "border-purple-500 bg-purple-50 shadow-md"
                                      : "border-gray-200 bg-white hover:border-purple-300"
                                  )}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="w-8 h-8 rounded bg-orange-100 flex items-center justify-center">
                                      <DollarSign className="w-4 h-4 text-orange-600" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-bold text-gray-900">Level 1</p>
                                      <p className="text-xs text-gray-600 mt-0.5">Amount Hidden</p>
                                    </div>
                                  </div>
                                  {privacyLevel === "partial" && (
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-500 mt-2">Addresses visible</p>
                                </button>

                                {/* Level 2: Standard */}
                                <button
                                  type="button"
                                  onClick={() => setPrivacyLevel("standard")}
                                  className={classNames(
                                    "relative border-2 rounded-lg p-3 text-left transition-all duration-200 hover:shadow-sm",
                                    privacyLevel === "standard"
                                      ? "border-purple-500 bg-purple-50 shadow-md"
                                      : "border-gray-200 bg-white hover:border-purple-300"
                                  )}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                                      <UserX className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-bold text-gray-900">Level 2</p>
                                      <p className="text-xs text-gray-600 mt-0.5">Sender Anonymous</p>
                                    </div>
                                  </div>
                                  {privacyLevel === "standard" && (
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-500 mt-2">Receiver unknown</p>
                                </button>

                                {/* Level 3: Full */}
                                <button
                                  type="button"
                                  onClick={() => setPrivacyLevel("full")}
                                  className={classNames(
                                    "relative border-2 rounded-lg p-3 text-left transition-all duration-200 hover:shadow-sm",
                                    privacyLevel === "full"
                                      ? "border-purple-500 bg-purple-50 shadow-md"
                                      : "border-gray-200 bg-white hover:border-purple-300"
                                  )}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center">
                                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-bold text-gray-900">Level 3</p>
                                      <p className="text-xs text-gray-600 mt-0.5">Full Privacy</p>
                                    </div>
                                  </div>
                                  {privacyLevel === "full" && (
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-500 mt-2">Complete anonymity</p>
                                </button>
                              </div>

                              {/* Privacy Level Explanation */}
                              <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
                                {privacyLevel === "partial" && (
                                  <p><strong>Amount Hidden:</strong> Addresses visible, amount encrypted with ZKP</p>
                                )}
                                {privacyLevel === "standard" && (
                                  <p><strong>Sender Anonymous:</strong> Receiver doesn't know who sent funds</p>
                                )}
                                {privacyLevel === "full" && (
                                  <p><strong>Full Privacy:</strong> Complete anonymity - parties see amounts only</p>
                                )}
                              </div>
                            </div>
                          )}

                          {enableZKP && (
                            <div className="mt-3 bg-purple-100 border border-purple-200 rounded p-3 text-xs text-purple-800">
                              <p className="font-semibold mb-1">🔒 Privacy Features Enabled:</p>
                              <ul className="space-y-0.5 ml-4 list-disc">
                                <li>Amount will be hidden from blockchain explorers</li>
                                <li>Sender & recipient addresses are shielded</li>
                                <li>Transaction validity is cryptographically proven</li>
                                <li>Slightly higher gas fee for ZKP computation</li>
                              </ul>
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-black text-white font-semibold py-3.5 px-6 rounded hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2 group"
                        >
                          <span>Send Transaction{enableZKP && " (Private)"}</span>
                          {enableZKP ? <Shield className="w-4 h-4 group-hover:scale-110 transition-transform" /> : <ArrowRightLeft className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                        </button>
                      </form>
                    </div>

                    {/* Receive */}
                    <div className="border border-gray-200 rounded p-6 hover:shadow-md transition-shadow duration-300">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded bg-green-50 flex items-center justify-center">
                          <Copy className="w-5 h-5 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-black">Receive RAIN</h3>
                      </div>

                      {/* QR Code */}
                      <div className="flex justify-center mb-6">
                        <div className="relative">
                          <div className="bg-white p-4 rounded border-2 border-gray-200 shadow-sm relative">
                            {address && <QRCode value={address} size={180} />}
                            {/* Blur overlay */}
                            {!showQRCode && (
                              <div className="absolute inset-0 backdrop-blur-md bg-white/30 rounded flex items-center justify-center">
                                <div className="text-center">
                                  <Eye className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                  <p className="text-xs text-gray-600 font-medium">Click to reveal</p>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="absolute -top-2 -right-2 bg-green-500 w-6 h-6 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                          {/* Toggle button */}
                          <button
                            type="button"
                            onClick={() => setShowQRCode(!showQRCode)}
                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#0019ff] text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                          >
                            {showQRCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">Your Wallet Address</p>
                          <div className="bg-gray-50 border border-gray-200 rounded p-3">
                            <p className="text-sm font-mono text-black break-all">{address}</p>
                          </div>
                        </div>

                        <button
                          onClick={handleCopyAddress}
                          className="w-full bg-[#0019ff] text-white font-semibold py-3.5 px-6 rounded hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2 group"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          <span>{copied ? "Address Copied!" : "Copy Address"}</span>
                        </button>

                        <div className="bg-yellow-50 border border-yellow-100 rounded p-4">
                          <div className="flex items-start gap-2">
                            <Bell className="w-4 h-4 text-yellow-600 mt-0.5" />
                            <div className="text-xs text-yellow-700">
                              <p className="font-semibold mb-1">Security Notice</p>
                              <p>Only share this address to receive RAIN tokens on Rainum network</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Staking View */}
            {activeTab === "Staking" && (
              <motion.div
                key="staking"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <StakingDashboard />
              </motion.div>
            )}

            {/* Bridge View */}
            {activeTab === "Bridge" && (
              <motion.div
                key="bridge"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CrossChainSwap walletAddress={address || ''} />
              </motion.div>
            )}

            {/* Settings View */}
            {activeTab === "Settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Settings Header & Tabs */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-[#0019ff] to-[#0028ff] px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-white/20 rounded-2xl blur"></div>
                        <div className="relative w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                          <Settings className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Settings</h2>
                        <p className="text-white/70 text-sm mt-1">Manage your wallet security and preferences</p>
                      </div>
                    </div>
                  </div>

                  {/* Tabs Navigation */}
                  <div className="border-b border-gray-200 bg-gray-50">
                    <nav className="flex gap-2 px-6">
                      {[
                        { name: "Security", icon: ShieldCheck },
                        { name: "Activity", icon: Activity },
                        { name: "Privacy", icon: Eye },
                        { name: "Backup", icon: Download },
                        { name: "Advanced", icon: Code },
                      ].map((tab) => (
                        <button
                          key={tab.name}
                          onClick={() => setSettingsTab(tab.name as any)}
                          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold text-sm transition-all ${
                            settingsTab === tab.name
                              ? "border-[#0019ff] text-[#0019ff]"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          <tab.icon className="w-4 h-4" />
                          {tab.name}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="p-8">
                    <AnimatePresence mode="wait">
                      {/* Security Tab */}
                      {settingsTab === "Security" && (
                        <motion.div
                          key="security"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                        >
                          <SecuritySettings />
                        </motion.div>
                      )}

                      {/* Activity Tab */}
                      {settingsTab === "Activity" && (
                        <motion.div
                          key="activity"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-6"
                        >
                          {/* Stats Cards */}
                          {auditStats && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                  <Activity className="w-5 h-5 text-[#0019ff]" />
                                  <p className="text-sm font-semibold text-blue-900">Total Events</p>
                                </div>
                                <p className="text-3xl font-bold text-[#0019ff]">{auditStats.total}</p>
                                <p className="text-xs text-blue-700 mt-1">{auditStats.last24Hours} in last 24h</p>
                              </div>

                              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                  <Check className="w-5 h-5 text-green-600" />
                                  <p className="text-sm font-semibold text-green-900">Successful Logins</p>
                                </div>
                                <p className="text-3xl font-bold text-green-600">{auditStats.byType.login_success || 0}</p>
                                <p className="text-xs text-green-700 mt-1">All time</p>
                              </div>

                              <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                  <AlertTriangle className="w-5 h-5 text-red-600" />
                                  <p className="text-sm font-semibold text-red-900">Failed Attempts</p>
                                </div>
                                <p className="text-3xl font-bold text-red-600">{auditStats.failedLogins || 0}</p>
                                <p className="text-xs text-red-700 mt-1">{auditStats.blockedAttempts} blocked</p>
                              </div>

                              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                  <ArrowRightLeft className="w-5 h-5 text-purple-600" />
                                  <p className="text-sm font-semibold text-purple-900">Transactions</p>
                                </div>
                                <p className="text-3xl font-bold text-purple-600">{auditStats.byType.transaction_sent || 0}</p>
                                <p className="text-xs text-purple-700 mt-1">Sent</p>
                              </div>
                            </div>
                          )}

                          {/* Activity Log */}
                          <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[#0019ff]" />
                                Activity Log
                              </h3>
                              <p className="text-sm text-gray-500">Last 50 events</p>
                            </div>

                            {auditLog.length === 0 ? (
                              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-gray-600">No activity logged yet</p>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {auditLog.map((entry) => (
                                  <div
                                    key={entry.id}
                                    className={`p-4 rounded-lg border-2 ${
                                      entry.category === 'security'
                                        ? entry.type.includes('failed') || entry.type.includes('blocked')
                                          ? 'bg-red-50 border-red-200'
                                          : 'bg-green-50 border-green-200'
                                        : entry.category === 'transaction'
                                        ? 'bg-purple-50 border-purple-200'
                                        : 'bg-blue-50 border-blue-200'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span
                                            className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                                              entry.category === 'security'
                                                ? entry.type.includes('failed') || entry.type.includes('blocked')
                                                  ? 'bg-red-200 text-red-900'
                                                  : 'bg-green-200 text-green-900'
                                                : entry.category === 'transaction'
                                                ? 'bg-purple-200 text-purple-900'
                                                : 'bg-blue-200 text-blue-900'
                                            }`}
                                          >
                                            {entry.category}
                                          </span>
                                          <span className="text-xs text-gray-500 font-mono">
                                            {entry.type.replace(/_/g, ' ')}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-900 font-medium mb-1">
                                          {entry.description}
                                        </p>
                                        {entry.metadata && (
                                          <div className="flex flex-wrap gap-2 mt-2">
                                            {entry.metadata.address && (
                                              <span className="text-xs bg-white px-2 py-1 rounded border border-gray-200 font-mono">
                                                {entry.metadata.address.slice(0, 10)}...{entry.metadata.address.slice(-8)}
                                              </span>
                                            )}
                                            {entry.metadata.amount && (
                                              <span className="text-xs bg-white px-2 py-1 rounded border border-gray-200 font-semibold">
                                                {entry.metadata.amount.toLocaleString()} RAIN
                                              </span>
                                            )}
                                            {entry.metadata.recipient && (
                                              <span className="text-xs bg-white px-2 py-1 rounded border border-gray-200 font-mono">
                                                → {entry.metadata.recipient.slice(0, 8)}...
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <p className="text-xs text-gray-500 whitespace-nowrap">
                                          {getRelativeTime(entry.timestamp)}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">
                                          {formatAuditTimestamp(entry.timestamp)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* Privacy Tab */}
                      {settingsTab === "Privacy" && (
                        <motion.div
                          key="privacy"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-6"
                        >
                          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 text-center">
                            <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Privacy Settings</h3>
                            <p className="text-sm text-gray-600">
                              Privacy features like trusted addresses and contact management coming soon.
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* Advanced Tab */}
                      {settingsTab === "Advanced" && (
                        <motion.div
                          key="advanced"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-6"
                        >
                          {/* Account Discovery */}
                          <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <Search className="w-6 h-6 text-[#0019ff]" />
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">Account Discovery</h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Scan blockchain for all accounts from your recovery phrase
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                              <p className="text-sm text-blue-900 leading-relaxed">
                                <strong className="font-semibold">Auto-Discovery:</strong> Your wallet automatically scans for accounts when you log in.
                                Use this button to manually rescan if you created accounts elsewhere.
                              </p>
                            </div>

                            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">Current accounts</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {accounts.length} account{accounts.length === 1 ? '' : 's'} found
                                </p>
                              </div>
                              <button
                                onClick={handleDiscoverAccounts}
                                disabled={isDiscovering}
                                className="flex items-center gap-2 px-4 py-2 bg-[#0019ff] text-white rounded-lg hover:bg-[#0019ff]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                              >
                                {isDiscovering ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Scanning...
                                  </>
                                ) : (
                                  <>
                                    <Search className="w-4 h-4" />
                                    Rescan Blockchain
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                        </motion.div>
                      )}

                      {/* Backup Tab */}
                      {settingsTab === "Backup" && (
                        <motion.div
                          key="backup"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                        >
                          {/* Backup & Export */}
                          <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <Download className="w-6 h-6 text-[#0019ff]" />
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">Backup & Export</h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Export your recovery phrase and private keys
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-6">
                              <div className="flex gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm text-amber-900 font-semibold">Security Warning</p>
                                  <p className="text-xs text-amber-800 mt-1">
                                    Never share your recovery phrase or private keys with anyone.
                                    Anyone with access to these can steal all your funds.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <Link
                                href="/backup-export"
                                className="w-full flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 rounded-lg p-4 transition-all border-2 border-red-200 hover:border-red-400 group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                                    <Key className="w-5 h-5 text-red-600" />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-sm font-bold text-gray-900">Backup & Export</p>
                                    <p className="text-xs text-gray-600">Secure export with password verification</p>
                                  </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-600" />
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>

    {/* QR Scanner Modal */}
    <QRScanner
      isOpen={showQRScanner}
      onClose={() => setShowQRScanner(false)}
      onScan={(scannedAddress) => {
        setRecipient(scannedAddress);
        if (scannedAddress.length === 42) {
          validateRecipientAddress(scannedAddress);
        }
        toast.success("QR Code scanned!", `Address: ${scannedAddress.slice(0, 8)}...${scannedAddress.slice(-6)}`);
      }}
    />

    {/* Account Balances Modal */}
    {showAccountBalances && (
      <Dialog open={showAccountBalances} onClose={() => setShowAccountBalances(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-900/80 transition-opacity" />
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white px-6 py-8 shadow-xl transition-all w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">All Accounts</h3>
                  <p className="text-sm text-gray-600 mt-1">View and switch between your accounts</p>
                </div>
                <button
                  onClick={() => setShowAccountBalances(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3">
                {accounts.map((account) => {
                  const isActive = account.index === accounts.find(a => a.address === address)?.index;
                  const accountBalance = accountBalances[account.address] || 0;

                  return (
                    <button
                      key={account.index}
                      onClick={() => {
                        switchAccount(account.index);
                        setShowAccountBalances(false);
                        toast.success("Account switched!", `Switched to ${account.name}`);
                      }}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        isActive
                          ? 'border-[#0019ff] bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={blockies(account.address)}
                          className={`w-10 h-10 rounded-full ${
                            isActive ? 'ring-2 ring-[#0019ff]' : 'ring-2 ring-gray-200'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-bold text-sm truncate ${
                              isActive ? 'text-[#0019ff]' : 'text-gray-900'
                            }`}>
                              {account.name}
                            </p>
                            {isActive && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#0019ff] text-white">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-mono truncate mt-0.5">
                            {account.address.slice(0, 10)}...{account.address.slice(-8)}
                          </p>
                        </div>
                      </div>
                      <div className={`px-3 py-2 rounded-lg ${
                        isActive ? 'bg-white border border-blue-200' : 'bg-gray-100'
                      }`}>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Balance</p>
                        <p className={`font-bold font-mono ${
                          isActive ? 'text-[#0019ff]' : 'text-gray-900'
                        }`}>
                          {accountBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RAIN
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Total Balance</p>
                  <p className="text-lg font-bold text-[#0019ff] font-mono">
                    {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RAIN
                  </p>
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    )}

    {/* Address Book Modal */}
    {showAddressBook && (
      <Dialog open={showAddressBook} onClose={() => setShowAddressBook(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-900/80 transition-opacity" />
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="relative transform overflow-hidden rounded bg-white px-6 py-8 shadow-xl transition-all w-full max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Book className="w-6 h-6 text-[#0019ff]" />
                  <h3 className="text-2xl font-bold text-gray-900">Address Book</h3>
                </div>
                <button
                  onClick={() => setShowAddressBook(false)}
                  className="p-2 rounded hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search addresses..."
                  value={addressBookSearch}
                  onChange={(e) => setAddressBookSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#0019ff] outline-none text-gray-900"
                />
              </div>

              {/* Address List */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {address && searchAddresses(addressBookSearch, address).length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No saved addresses yet</p>
                ) : (
                  address && searchAddresses(addressBookSearch, address).map((addr) => (
                    <div
                      key={addr.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      {editingAddress === addr.id ? (
                        // Edit mode
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
                            placeholder="Name"
                          />
                          <input
                            type="text"
                            value={editAddr}
                            onChange={(e) => setEditAddr(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm font-mono text-gray-900"
                            placeholder="Address"
                          />
                          <button
                            onClick={() => {
                              updateAddress(addr.id, editName, editAddr);
                              setEditingAddress(null);
                              toast.success("Address updated!", "");
                            }}
                            className="px-3 py-2 bg-[#0019ff] text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingAddress(null)}
                            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="flex-1 cursor-pointer" onClick={() => {
                            setRecipient(addr.address);
                            validateRecipientAddress(addr.address);
                            setShowAddressBook(false);
                            toast.success("Address selected!", addr.name);
                          }}>
                            <p className="font-semibold text-gray-900">{addr.name}</p>
                            <p className="text-sm text-gray-500 font-mono">{addr.address}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingAddress(addr.id);
                                setEditName(addr.name);
                                setEditAddr(addr.address);
                              }}
                              className="p-2 hover:bg-gray-200 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete ${addr.name}?`)) {
                                  deleteAddress(addr.id);
                                  toast.success("Address deleted!", "");
                                }
                              }}
                              className="p-2 hover:bg-red-100 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setShowAddressBook(false)}
                className="mt-6 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700 transition-colors"
              >
                Close
              </button>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    )}

    {/* Rename Account Modal */}
    {showRenameAccount && renameAccountIndex !== null && (
      <Dialog open={showRenameAccount} onClose={() => setShowRenameAccount(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-900/80 transition-opacity" />
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="relative transform overflow-hidden rounded bg-white px-6 py-8 shadow-xl transition-all w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Edit className="w-6 h-6 text-[#0019ff]" />
                  <h3 className="text-xl font-bold text-gray-900">Rename Account</h3>
                </div>
                <button
                  onClick={() => setShowRenameAccount(false)}
                  className="p-2 rounded hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Account Name</label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#0019ff] outline-none text-gray-900"
                  placeholder="e.g. Trading Account"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (newAccountName.trim()) {
                      renameAccount(renameAccountIndex, newAccountName.trim());
                      toast.success("Account renamed!", newAccountName);
                      setShowRenameAccount(false);
                      setNewAccountName("");
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-[#0019ff] text-white rounded hover:bg-blue-700 font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowRenameAccount(false);
                    setNewAccountName("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    )}

    {/* Save Address Modal */}
    {showSaveAddress && (
      <Dialog open={showSaveAddress} onClose={() => setShowSaveAddress(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-900/80 transition-opacity" />
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="relative transform overflow-hidden rounded bg-white px-6 py-8 shadow-xl transition-all w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Save className="w-6 h-6 text-[#0019ff]" />
                  <h3 className="text-xl font-bold text-gray-900">Save Address</h3>
                </div>
                <button
                  onClick={() => setShowSaveAddress(false)}
                  className="p-2 rounded hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <p className="px-4 py-3 border border-gray-200 rounded bg-gray-50 font-mono text-sm text-gray-900 break-all">
                  {addressToSave}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={saveAddressName}
                  onChange={(e) => setSaveAddressName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#0019ff] outline-none text-gray-900"
                  placeholder="e.g. Alice's Wallet"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (saveAddressName.trim() && address) {
                      addAddress(saveAddressName.trim(), addressToSave, address);
                      toast.success("Address saved!", `${saveAddressName} added to address book`);
                      setShowSaveAddress(false);
                      setSaveAddressName("");
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-[#0019ff] text-white rounded hover:bg-blue-700 font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSaveAddress(false);
                    setSaveAddressName("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    )}

    {/* Logout Confirmation Modal */}
    {showLogoutConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-100">
            <LogOut className="w-8 h-8 text-yellow-600" />
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-900 mb-3">
            Confirm Logout
          </h2>

          <p className="text-center text-gray-600 mb-8">
            Are you sure you want to logout? Make sure you have saved your seed phrase.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmLogout}
              className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    )}

    {/* AI Chat Widget */}
    <AIChatWidget
      onNavigate={(tab) => setActiveTab(tab)}
      onSendTransaction={(to, amount) => {
        setRecipient(to);
        setAmount(amount);
        setActiveTab("Wallet");
      }}
      currentBalance={balance}
      currentAddress={address}
      recentTransactions={transactions}
      stakingInfo={{
        totalDelegated: 0, // Will be calculated from delegations if available
        totalRewards: 0,   // Will be calculated from delegations if available
      }}
    />

    </ProtectedRoute>
  );
}
