"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, Wallet, ArrowRightLeft, TrendingUp, Settings, ExternalLink, Minimize2, HelpCircle, Zap, Shield, BookOpen, Home } from "lucide-react";
import { useWalletStore } from "@/lib/wallet-store";
import { formatBalance } from "@/lib/format-balance";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: ActionButton[];
  suggestions?: string[];
}

interface ActionButton {
  label: string;
  action: () => void;
  variant?: "primary" | "secondary";
  icon?: React.ReactNode;
}

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  description: string;
  action: () => void;
}

interface AIChatWidgetProps {
  onNavigate?: (tab: string) => void;
  onSendTransaction?: (to: string, amount: string) => void;
  currentBalance?: number;
  currentAddress?: string;
  recentTransactions?: any[];
  stakingInfo?: {
    totalDelegated?: number;
    totalRewards?: number;
  };
}

export default function AIChatWidget({
  onNavigate,
  onSendTransaction,
  currentBalance,
  currentAddress,
  recentTransactions = [],
  stakingInfo,
}: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Hi there! I'm your Rainum assistant.\n\nI can help you with everything in your wallet - from basic operations to advanced features like smart contracts and staking.\n\n💡 Try asking:\n• \"What can you do?\" - See all features\n• \"Discover features\" - Find new capabilities\n• \"How to send RAIN?\" - Step-by-step guides\n• \"Explain staking\" - Learn about rewards\n\nWhat would you like to explore?",
      timestamp: new Date(),
      suggestions: [
        "What can you do?",
        "Discover features",
        "Check my balance",
        "How to send RAIN?",
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wallet = useWalletStore((state) => state.wallet);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions: QuickAction[] = [
    {
      icon: <Sparkles size={20} />,
      label: "Discover Features",
      description: "See what's new and available",
      action: () => handleQuickAction("Discover features"),
    },
    {
      icon: <BookOpen size={20} />,
      label: "Complete Guide",
      description: "View all capabilities",
      action: () => handleQuickAction("What can you do?"),
    },
    {
      icon: <Wallet size={20} />,
      label: "Check Balance",
      description: "View your RAIN & USD value",
      action: () => handleQuickAction("What's my balance?"),
    },
    {
      icon: <TrendingUp size={20} />,
      label: "Staking Guide",
      description: "Learn how to earn rewards",
      action: () => handleQuickAction("How does staking work?"),
    },
  ];

  const handleQuickAction = (question: string) => {
    // Send message directly without showing in input
    const userMessage: Message = {
      role: "user",
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setShowQuickActions(false);
    setIsLoading(true);

    setTimeout(() => {
      const command = parseCommand(question);
      let response: Message;

      if (command) {
        response = executeCommand(command, question);
      } else {
        response = {
          role: "assistant",
          content: getAIResponse(question),
          timestamp: new Date(),
          suggestions: getSuggestions(question),
        };
      }

      setMessages((prev) => [...prev, response]);
      setIsLoading(false);
    }, 600);
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Send message directly without showing in input
    const userMessage: Message = {
      role: "user",
      content: suggestion,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    setTimeout(() => {
      const command = parseCommand(suggestion);
      let response: Message;

      if (command) {
        response = executeCommand(command, suggestion);
      } else {
        response = {
          role: "assistant",
          content: getAIResponse(suggestion),
          timestamp: new Date(),
          suggestions: getSuggestions(suggestion),
        };
      }

      setMessages((prev) => [...prev, response]);
      setIsLoading(false);
    }, 600);
  };

  const addMessage = (role: "user" | "assistant", content: string, actions?: ActionButton[], suggestions?: string[]) => {
    setMessages((prev) => [
      ...prev,
      {
        role,
        content,
        timestamp: new Date(),
        actions,
        suggestions,
      },
    ]);
  };

  const parseCommand = (input: string): { type: string; params: any } | null => {
    const lower = input.toLowerCase().trim();

    // Send transaction: "send 10 rain to 0xABC..."
    const sendMatch = lower.match(/send\s+(\d+\.?\d*)\s+(?:rain\s+)?to\s+(0x[a-f0-9]{40})/i);
    if (sendMatch) {
      return { type: "send", params: { amount: sendMatch[1], to: sendMatch[2] } };
    }

    // Show balance
    if (lower.includes("balance") || lower.includes("how much do i have")) {
      return { type: "balance", params: {} };
    }

    // Show address
    if (lower.includes("my address") || lower.includes("what's my address")) {
      return { type: "address", params: {} };
    }

    // Show transactions
    if (lower.includes("transaction") && (lower.includes("recent") || lower.includes("last") || lower.includes("history") || lower.includes("activity"))) {
      const countMatch = lower.match(/last\s+(\d+)/);
      return { type: "transactions", params: { count: countMatch ? parseInt(countMatch[1]) : 5 } };
    }

    // Staking info
    if (lower.includes("staking") || lower.includes("delegation") || lower.includes("earned") || lower.includes("stake")) {
      return { type: "staking", params: {} };
    }

    // Navigate commands
    if (lower.includes("open") || lower.includes("go to") || lower.includes("show me")) {
      if (lower.includes("setting")) return { type: "navigate", params: { tab: "Settings" } };
      if (lower.includes("staking") || lower.includes("stake")) return { type: "navigate", params: { tab: "Staking" } };
      if (lower.includes("transaction")) return { type: "navigate", params: { tab: "Transactions" } };
      if (lower.includes("wallet")) return { type: "navigate", params: { tab: "Wallet" } };
    }

    return null;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setIsLoading(true);
    setShowQuickActions(false);

    setTimeout(() => {
      const command = parseCommand(userInput);
      let response: Message;

      if (command) {
        response = executeCommand(command, userInput);
      } else {
        response = {
          role: "assistant",
          content: getAIResponse(userInput),
          timestamp: new Date(),
          suggestions: getSuggestions(userInput),
        };
      }

      setMessages((prev) => [...prev, response]);
      setIsLoading(false);
    }, 600);
  };

  const getSuggestions = (input: string): string[] => {
    const lower = input.toLowerCase();
    const balance = currentBalance ?? wallet?.balance ?? 0;
    const hasTransactions = recentTransactions && recentTransactions.length > 0;

    // Context-aware suggestions based on user's question
    if (lower.includes("help") || lower.includes("what can you do")) {
      return ["Discover features", "Wallet features", "How to send RAIN?", "Explain smart contracts"];
    }

    if (lower.includes("feature") || lower.includes("discover")) {
      return ["Wallet features", "Smart contracts", "Network switching", "Multi-account"];
    }

    if (lower.includes("balance")) {
      if (balance > 0) {
        return ["Send RAIN", "Stake RAIN", "Show transactions", "Create new account"];
      } else {
        return ["Request test tokens", "How to get RAIN?", "What is faucet?"];
      }
    }

    if (lower.includes("transaction")) {
      return ["How to send RAIN?", "What are gas fees?", "Privacy levels", "Check balance"];
    }

    if (lower.includes("staking") || lower.includes("stake")) {
      return ["Explain validators", "Start staking", "Show my balance", "APY calculation"];
    }

    if (lower.includes("send")) {
      return ["Transaction guide", "What are gas fees?", "Privacy levels", "Save addresses"];
    }

    if (lower.includes("smart contract") || lower.includes("evm") || lower.includes("move")) {
      return ["Deploy contract", "Contract library", "EVM vs Move", "What is Solidity?"];
    }

    if (lower.includes("network") || lower.includes("mainnet") || lower.includes("testnet")) {
      return ["Switch networks", "What is devnet?", "Chain IDs", "Default network"];
    }

    if (lower.includes("account") || lower.includes("multi")) {
      return ["Create account", "Switch account", "Rename account", "HD wallet"];
    }

    if (lower.includes("address book") || lower.includes("save address")) {
      return ["How to save addresses?", "View saved addresses", "Transaction guide"];
    }

    // Default contextual suggestions based on user state
    if (balance === 0) {
      return ["Request test tokens", "How to get RAIN?", "Discover features"];
    } else if (!hasTransactions) {
      return ["How to send RAIN?", "Transaction guide", "Staking guide"];
    } else {
      return ["Discover features", "Smart contracts", "Multi-account", "Network switching"];
    }
  };

  const executeCommand = (command: { type: string; params: any }, originalInput: string): Message => {
    switch (command.type) {
      case "balance":
        const balance = currentBalance ?? wallet?.balance ?? 0;
        const formattedBalance = formatBalance(balance);
        const displayBalance = formattedBalance.full;
        return {
          role: "assistant",
          content: `💰 Your Balance\n\n${displayBalance} RAIN\n\n${balance > 0 ? "You have funds available to send or stake!" : "Your wallet is empty. Request test tokens from the faucet to get started."}`,
          timestamp: new Date(),
          actions: balance > 0 ? [
            {
              label: "Send RAIN",
              action: () => onNavigate?.("Wallet"),
              variant: "primary",
              icon: <Send size={14} />,
            },
            {
              label: "Stake RAIN",
              action: () => onNavigate?.("Staking"),
              variant: "secondary",
              icon: <TrendingUp size={14} />,
            },
          ] : [],
          suggestions: balance > 0 ? ["Send RAIN", "Stake RAIN", "Show transactions"] : ["Request from faucet", "How to get RAIN?"],
        };

      case "address":
        const addr = currentAddress ?? wallet?.address ?? "Not available";
        return {
          role: "assistant",
          content: `📋 Your Wallet Address\n\n\`${addr}\`\n\nShare this address to receive RAIN from others.`,
          timestamp: new Date(),
          actions: [
            {
              label: "Copy Address",
              action: () => {
                navigator.clipboard.writeText(addr);
              },
              variant: "primary",
            },
          ],
          suggestions: ["Check balance", "Show QR code", "Recent transactions"],
        };

      case "transactions":
        const count = command.params.count || 5;
        const txs = recentTransactions.slice(0, count);

        if (txs.length === 0) {
          return {
            role: "assistant",
            content: "📭 No Transactions Yet\n\nYou haven't made any transactions. Your transaction history will appear here once you start sending or receiving RAIN.",
            timestamp: new Date(),
            actions: [
              {
                label: "Request Test Tokens",
                action: () => onNavigate?.("Wallet"),
                variant: "primary",
                icon: <Zap size={14} />,
              },
            ],
            suggestions: ["How to send RAIN?", "Check balance", "What is a transaction?"],
          };
        }

        const txList = txs.map((tx, i) => {
          const isOutgoing = tx.from?.toLowerCase() === currentAddress?.toLowerCase();
          const formattedAmt = formatBalance(tx.amount || 0);
          const amt = formattedAmt.full;
          const type = isOutgoing ? "📤 Sent" : "📥 Received";
          const addr = isOutgoing ? tx.to : tx.from;
          return `${type} ${amt} RAIN\n${isOutgoing ? 'to' : 'from'} \`${addr?.slice(0, 10)}...${addr?.slice(-8)}\``;
        }).join('\n\n');

        return {
          role: "assistant",
          content: `📜 Recent Activity\n\n${txList}`,
          timestamp: new Date(),
          actions: [
            {
              label: "View All Transactions",
              action: () => onNavigate?.("Transactions"),
              variant: "primary",
              icon: <ArrowRightLeft size={14} />,
            },
          ],
          suggestions: ["Check balance", "Send RAIN", "Transaction details"],
        };

      case "staking":
        const delegated = stakingInfo?.totalDelegated ?? 0;
        const rewards = stakingInfo?.totalRewards ?? 0;

        if (delegated === 0) {
          return {
            role: "assistant",
            content: "🎯 Start Earning with Staking\n\nYou haven't staked any RAIN yet. Staking allows you to:\n\n• Earn passive rewards\n• Support network validators\n• Get higher returns with tier validators",
            timestamp: new Date(),
            actions: [
              {
                label: "Start Staking",
                action: () => onNavigate?.("Staking"),
                variant: "primary",
                icon: <TrendingUp size={14} />,
              },
              {
                label: "Learn More",
                action: () => handleQuickAction("How does staking work?"),
                variant: "secondary",
                icon: <BookOpen size={14} />,
              },
            ],
            suggestions: ["How does staking work?", "Which validator?", "Check balance"],
          };
        }

        const formattedDelegated = formatBalance(delegated);
        const displayDelegated = formattedDelegated.full;

        const formattedRewards = formatBalance(rewards);
        const displayRewards = formattedRewards.full;

        return {
          role: "assistant",
          content: `💎 Your Staking Overview\n\nDelegated: ${displayDelegated} RAIN\nRewards Earned: ${displayRewards} RAIN\n\n${rewards > 0 ? "🎉 Great! You're earning rewards!" : "Keep staking to start earning rewards."}`,
          timestamp: new Date(),
          actions: [
            {
              label: "Manage Staking",
              action: () => onNavigate?.("Staking"),
              variant: "primary",
              icon: <TrendingUp size={14} />,
            },
            {
              label: "Withdraw Rewards",
              action: () => onNavigate?.("Staking"),
              variant: "secondary",
            },
          ],
          suggestions: ["Add more stake", "Change validator", "Check balance"],
        };

      case "send":
        const { amount, to } = command.params;
        return {
          role: "assistant",
          content: `💸 Ready to Send\n\nAmount: ${amount} RAIN\nTo: \`${to.slice(0, 12)}...${to.slice(-10)}\`\n\nClick below to review and confirm the transaction.`,
          timestamp: new Date(),
          actions: [
            {
              label: `Send ${amount} RAIN`,
              action: () => {
                onNavigate?.("Wallet");
                setTimeout(() => {
                  onSendTransaction?.(to, amount);
                }, 500);
              },
              variant: "primary",
              icon: <Send size={14} />,
            },
            {
              label: "Cancel",
              action: () => addMessage("assistant", "Transaction cancelled. Let me know if you need anything else!"),
              variant: "secondary",
            },
          ],
          suggestions: ["Check balance", "Gas fees?", "View transactions"],
        };

      case "navigate":
        const tab = command.params.tab;
        onNavigate?.(tab);
        return {
          role: "assistant",
          content: `✅ Opening ${tab}...`,
          timestamp: new Date(),
          suggestions: ["Go back", "Check balance", "Help"],
        };

      default:
        return {
          role: "assistant",
          content: "🤔 I didn't quite understand that. Try one of the suggestions below or ask me something else!",
          timestamp: new Date(),
          suggestions: ["Check balance", "Show transactions", "Help"],
        };
    }
  };

  const getAIResponse = (question: string): string => {
    const q = question.toLowerCase();

    if (q.includes("help") || q.includes("what can you do")) {
      return "💡 Complete Rainum Wallet Guide\n\n💰 WALLET OPERATIONS\n• Check balance & USD value\n• View wallet address & QR code\n• Copy address to clipboard\n• Multi-account management\n• Create/rename accounts\n• Switch between accounts\n\n💸 TRANSACTIONS\n• Send RAIN tokens\n• Request test tokens (faucet)\n• Transaction history\n• Filter by type (sent/received)\n• Gas fee estimation\n• Privacy levels (0-2 ZKP)\n\n🎯 STAKING & REWARDS\n• Delegate to validators\n• View staking rewards\n• Withdraw rewards\n• Validator tiers (Bronze→Platinum)\n• Unstake tokens\n• Track APY/returns\n\n🏛️ SMART CONTRACTS\n• EVM contracts (Solidity)\n• Move VM contracts\n• Deploy contracts\n• Interact with contracts\n• Contract library\n\n⚙️ SETTINGS & SECURITY\n• Network switching (Local/Devnet/Testnet/Mainnet)\n• Set default network\n• Biometric authentication\n• Export/backup wallet\n• Seed phrase security\n• Address book\n\n📊 PORTFOLIO & ANALYTICS\n• Real-time balance tracking\n• Transaction statistics\n• Staking performance\n• Block explorer integration\n\nTry: \"Show me wallet features\", \"Explain staking\", \"How to send RAIN?\"";
    }

    if (q.includes("feature") || q.includes("discover") || q.includes("what's new")) {
      return "🎯 Feature Discovery\n\nLet me show you what's available:\n\n🔥 CORE FEATURES\n• Multi-Account HD Wallet\n• Send/Receive RAIN\n• Staking & Rewards\n• Transaction History\n\n✨ ADVANCED FEATURES\n• Privacy Transactions (ZKP)\n• Smart Contract Deployment\n• EVM & Move VM Support\n• Network Switching\n• Address Book\n\n🆕 LATEST ADDITIONS\n• USD Balance Display ($0.10/RAIN)\n• Network Settings Modal\n• Dynamic Account Types\n• Real-time Block Data\n• Extension Detection\n\n💎 COMING SOON\n• NFT Support\n• Token Swaps\n• DApp Browser\n• Hardware Wallet Support\n\nWhat would you like to learn more about?";
    }

    if (q.includes("wallet features") || q.includes("wallet capabilities")) {
      return "🔐 Wallet Features Deep Dive\n\n📍 MULTI-ACCOUNT SYSTEM\n• HD Wallet (BIP39/BIP44)\n• Unlimited accounts from one seed\n• Import external accounts\n• Account nicknames\n\n💰 BALANCE MANAGEMENT\n• Real-time balance updates\n• USD conversion ($0.10/RAIN)\n• Multi-account total\n• Transaction history per account\n\n🔒 SECURITY\n• AES-256 encryption\n• Biometric authentication\n• Non-custodial (you own keys)\n• Secure seed phrase backup\n\n📱 USER EXPERIENCE\n• Clean, modern interface\n• Quick copy address\n• QR code generation\n• Transaction notifications\n\nNeed help with any specific feature?";
    }

    if (q.includes("transaction") && (q.includes("how") || q.includes("guide") || q.includes("tutorial"))) {
      return "📤 How to Send Transactions\n\n1️⃣ PREPARE\n• Check your balance\n• Copy recipient address\n• Decide amount to send\n\n2️⃣ CREATE TRANSACTION\n• Go to Wallet tab\n• Enter recipient address\n• Enter amount in RAIN\n• Choose privacy level:\n  - Level 0: Public (cheapest)\n  - Level 1: Partial privacy\n  - Level 2: Full privacy (ZK-SNARKs)\n\n3️⃣ REVIEW\n• Check recipient address\n• Verify amount\n• Review gas fees\n• Total cost = Amount + Gas + ZKP fee\n\n4️⃣ CONFIRM\n• Click 'Send Transaction'\n• Confirm in popup\n• Wait for confirmation\n• View in transaction history\n\n💡 TIP: Large transactions (>1000 RAIN) require extra confirmation!\n\nReady to send?";
    }

    if (q.includes("smart contract") || q.includes("evm") || q.includes("move vm")) {
      return "🏛️ Smart Contracts on Rainum\n\n🔷 EVM CONTRACTS (Ethereum Compatible)\n• Write in Solidity\n• Deploy EVM bytecode\n• Interact with Ethereum tools\n• Metamask compatible\n\n🟣 MOVE VM CONTRACTS (Aptos/Sui Style)\n• Write in Move language\n• Resource-oriented programming\n• Enhanced security model\n• Better composability\n\n⚡ DEPLOYMENT PROCESS\n1. Write your contract code\n2. Compile to bytecode\n3. Go to Smart Contracts tab\n4. Choose EVM or Move\n5. Deploy with gas fee\n\n📚 CONTRACT LIBRARY\n• Pre-built templates\n• Token standards\n• DeFi primitives\n• DAO governance\n\nNeed help deploying?";
    }

    if (q.includes("network") || q.includes("mainnet") || q.includes("testnet") || q.includes("devnet")) {
      return "🌐 Network Management\n\n📡 AVAILABLE NETWORKS\n\n🟢 Local (Chain ID: 999999)\n• Development testing\n• http://localhost:8080\n• Free unlimited tokens\n\n🔵 Devnet (Chain ID: 99999)\n• Public test network\n• https://api.rainum.com\n• Current default network\n\n🟡 Testnet (Chain ID: 9999)\n• Pre-production testing\n• Coming Q1 2026\n\n🔴 Mainnet (Chain ID: 999)\n• Real value transactions\n• Coming Q3 2026\n\n⚙️ HOW TO SWITCH\n• Click network button (top sidebar)\n• Select desired network\n• Optionally set as default\n• Wallet reconnects automatically\n\n💡 Your transactions are network-specific!\n\nWant to switch networks?";
    }

    if (q.includes("address book") || q.includes("saved address") || q.includes("contact")) {
      return "📇 Address Book Feature\n\n💾 SAVE ADDRESSES\n• Save frequently-used addresses\n• Add nicknames/labels\n• Organize by category\n• Quick access when sending\n\n✏️ HOW TO USE\n1. Send a transaction\n2. Click 'Save address' checkbox\n3. Add a nickname\n4. Address saved for future use\n\n🔍 BENEFITS\n• No more copy-paste errors\n• Faster transactions\n• Better organization\n• Address validation\n\n📱 AUTO-COMPLETE\nWhen sending, start typing a nickname and saved addresses appear!\n\nWant to see your saved addresses?";
    }

    if (q.includes("multi-account") || q.includes("create account") || q.includes("switch account")) {
      return "👥 Multi-Account Management\n\n🎯 WHY MULTIPLE ACCOUNTS?\n• Separate personal/business funds\n• Privacy & organization\n• Different purposes\n• All from ONE seed phrase\n\n➕ CREATE NEW ACCOUNT\n1. Click account dropdown (sidebar)\n2. Click 'Create New Account'\n3. Account instantly generated\n4. Rename if desired\n\n🔄 SWITCH ACCOUNTS\n• Click account dropdown\n• Select desired account\n• Balance/transactions update\n• Each account has unique address\n\n✏️ RENAME ACCOUNTS\n• Click edit icon next to account\n• Enter new name\n• Better organization\n\n💰 TOTAL BALANCE\nSee combined balance across ALL accounts in sidebar!\n\nWant to create a new account?";
    }

    if (q.includes("how") && q.includes("stake")) {
      return "🎯 How Staking Works\n\n1. Choose a Validator\nPick from active validators. Higher tiers offer better rewards.\n\n2. Delegate RAIN\nStake any amount of RAIN to support the validator.\n\n3. Earn Rewards\nGet passive income as the validator produces blocks.\n\n4. Withdraw Anytime\nYour rewards are yours to claim whenever you want.\n\nReady to start?";
    }

    if (q.includes("gas") || q.includes("fee")) {
      return "⛽ Understanding Gas Fees\n\nGas fees are small amounts paid to process transactions on the blockchain.\n\nHow it works:\n• 1 RAIN = 1,000,000 micro-RAIN\n• Fees depend on transaction complexity\n• You'll see the exact cost before sending\n\nWhy fees?\nThey prevent spam and compensate validators for processing your transaction.";
    }

    if (q.includes("seed") || q.includes("phrase") || q.includes("recover")) {
      return "🔑 Your Recovery Phrase\n\nYour 24-word seed phrase is the master key to your wallet.\n\n⚠️ Critical Rules:\n• Never share it with anyone\n• Store it offline and secure\n• No password reset - lose it, lose everything\n• Rainum will never ask for it\n\nWhat it does:\nRestores your entire wallet and all accounts if you lose access.";
    }

    if (q.includes("privacy") || q.includes("zkp")) {
      return "🔒 Privacy with Zero-Knowledge Proofs\n\nRainum offers built-in transaction privacy:\n\nLevel 0: Fully public (like Bitcoin)\nLevel 1: Partial privacy (some details hidden)\nLevel 2: Full privacy (ZK-SNARKs)\n\nChoose your level for each transaction. Higher privacy = slightly higher fees.";
    }

    if (q.includes("wallet")) {
      return "🔐 About Your Wallet\n\nYour Rainum wallet is:\n• Non-custodial - You own your keys\n• HD wallet - Multiple accounts from one seed\n• Encrypted - AES-256 encryption\n• Biometric - Touch ID/Face ID support\n\nAll funds are controlled by you, not Rainum.";
    }

    if (q.includes("validator")) {
      return "🏆 About Validators\n\nValidators secure the network and produce blocks.\n\nTiers:\n• Bronze - Base rewards\n• Silver - 1.5x rewards\n• Gold - 2x rewards\n• Platinum - 3x rewards\n\nHigher tier = more stake required = better rewards.";
    }

    if (q.includes("privacy level") || q.includes("level 0") || q.includes("level 1") || q.includes("level 2")) {
      return "🔐 Privacy Levels Explained\n\nWhen sending RAIN, choose your privacy:\n\n📖 LEVEL 0 - Public\n• Fully transparent (like Bitcoin)\n• Lowest gas fees\n• All details visible on-chain\n• Best for: Regular transfers\n\n🔒 LEVEL 1 - Partial Privacy\n• Some details hidden\n• Medium gas fees\n• Amount/timing obscured\n• Best for: Business transactions\n\n🔐 LEVEL 2 - Full Privacy\n• Complete anonymity\n• Highest gas fees (ZK-SNARKs)\n• Zero-knowledge proofs\n• Best for: Maximum privacy\n\n💡 Choose based on your needs vs cost!";
    }

    if (q.includes("apy") || q.includes("calculate") || q.includes("return") || q.includes("profit")) {
      return "📊 Staking Returns (APY)\n\n💰 HOW IT'S CALCULATED\nAPY depends on:\n• Validator tier (Bronze→Platinum)\n• Total network stake\n• Block production rate\n• Your delegation amount\n\n🎯 EXAMPLE RETURNS\nIf you stake 1,000 RAIN:\n• Bronze Validator: ~5% APY\n• Silver Validator: ~7.5% APY\n• Gold Validator: ~10% APY\n• Platinum Validator: ~15% APY\n\n⏰ REWARD FREQUENCY\n• Rewards earned per block\n• Claim anytime (no lock period)\n• Compound for better returns\n\n💡 TIP: Higher tier = more rewards but validator may be full!\n\nReady to start earning?";
    }

    if (q.includes("evm vs move") || q.includes("difference between") || q.includes("which vm")) {
      return "🔷 EVM vs 🟣 Move VM\n\n🔷 ETHEREUM VIRTUAL MACHINE (EVM)\n✅ Pros:\n• Industry standard (Solidity)\n• Huge ecosystem & tools\n• Familiar to most developers\n• Metamask compatible\n\n⚠️ Cons:\n• Reentrancy vulnerabilities\n• No resource safety\n• Integer overflow risks\n\n🟣 MOVE VIRTUAL MACHINE\n✅ Pros:\n• Resource-oriented programming\n• Built-in safety features\n• No reentrancy attacks\n• Better formal verification\n• Linear types system\n\n⚠️ Cons:\n• Newer, smaller ecosystem\n• Steeper learning curve\n\n🎯 CHOOSE BASED ON:\n• EVM: Ethereum compatibility needed\n• Move: Maximum security required\n\nBoth are fully supported on Rainum!";
    }

    if (q.includes("faucet") || q.includes("test token") || q.includes("get rain")) {
      return "💧 Testnet Faucet\n\n🎁 FREE TEST TOKENS\nGet RAIN tokens to try the network!\n\n📍 HOW TO USE\n1. Make sure you're on Local/Devnet\n2. Go to Wallet tab\n3. Click 'Request Test Tokens'\n4. Tokens arrive in seconds!\n\n⚡ LIMITS\n• Request every 24 hours\n• Max 1000 RAIN per request\n• Only on test networks\n\n💡 WHAT TO DO WITH THEM\n• Practice sending transactions\n• Try staking\n• Deploy smart contracts\n• Test privacy features\n\n⚠️ TEST TOKENS HAVE NO REAL VALUE\nThey're for learning and testing only!\n\nReady to request tokens?";
    }

    if (q.includes("solidity") || q.includes("deploy contract") || q.includes("contract library")) {
      return "🏗️ Smart Contract Development\n\n📝 SUPPORTED LANGUAGES\n• Solidity (EVM contracts)\n• Move (Move VM contracts)\n• Soon: Rust, Vyper\n\n🔧 DEPLOYMENT STEPS\n1. Write your contract code\n2. Compile to bytecode\n3. Test on Local network first\n4. Deploy to Devnet/Mainnet\n5. Verify contract (optional)\n\n📚 CONTRACT LIBRARY\nPre-built templates:\n• ERC-20 Token Standard\n• ERC-721 NFT Standard\n• Multi-sig Wallet\n• DAO Governance\n• Staking Pool\n• DEX (Swap contracts)\n\n💡 TIPS\n• Always test on Local first\n• Audit important contracts\n• Set gas limits carefully\n• Keep private keys secure\n\nNeed help getting started?";
    }

    if (q.includes("hd wallet") || q.includes("bip39") || q.includes("bip44") || q.includes("derive")) {
      return "🔑 HD Wallet (Hierarchical Deterministic)\n\n🌳 HOW IT WORKS\nOne seed phrase → Unlimited accounts!\n\n📐 DERIVATION PATH\nBIP44 standard:\nm/44'/60'/0'/0/N\n• m: Master key\n• 44': BIP44 standard\n• 60': Ethereum coin type\n• 0': Account (hardened)\n• 0: External chain\n• N: Address index\n\n✨ BENEFITS\n• One backup for all accounts\n• Deterministic (same seed = same accounts)\n• Privacy through multiple addresses\n• Easy account management\n\n🔐 SECURITY\nYour 24-word seed phrase:\n• Generates ALL account keys\n• Never stored on server\n• Encrypted locally (AES-256)\n• Never share with anyone!\n\n💡 Each account has its own:\n• Unique address\n• Separate balance\n• Independent transaction history\n\nAll from ONE seed phrase!";
    }

    if (q.includes("chain id") || q.includes("999") || q.includes("9999")) {
      return "🔗 Chain IDs Explained\n\n📡 RAINUM CHAIN ID STRUCTURE\n\n🟢 Local: 999999 (6 nines)\n• Development environment\n• Localhost testing\n• Reset anytime\n\n🔵 Devnet: 99999 (5 nines)\n• Public test network\n• Stable test environment\n• Free test tokens\n\n🟡 Testnet: 9999 (4 nines)\n• Pre-production testing\n• Coming Q1 2026\n• Matches mainnet features\n\n🔴 Mainnet: 999 (3 nines)\n• Production network\n• Real value\n• Coming Q3 2026\n\n❓ WHY CHAIN IDs?\n• Prevent replay attacks\n• Network identification\n• Wallet compatibility\n• Transaction signing\n\n💡 Always verify you're on the correct network before sending!\n\nCurrent network shown in top sidebar.";
    }

    if (q.includes("default network") || q.includes("set network") || q.includes("persist network")) {
      return "⚙️ Default Network Setting\n\n🎯 WHAT IT DOES\nSet which network opens automatically when you launch the wallet.\n\n📍 HOW TO SET\n1. Click network button (top sidebar)\n2. Select desired network\n3. Check 'Set as default'\n4. Click Save\n\n✅ BENEFITS\n• No need to switch every time\n• Faster workflow\n• Prevent wrong-network mistakes\n\n💡 RECOMMENDATIONS\n• Developers: Set Local as default\n• Testers: Set Devnet as default\n• Future: Set Mainnet as default\n\n🔄 CHANGE ANYTIME\nYou can still manually switch networks - the default only affects startup!\n\nWant to set your default now?";
    }

    return "I'm here to help! Try asking:\n• \"What can you do?\" - See all features\n• \"Discover features\" - Find new capabilities\n• \"How to send RAIN?\" - Transaction guide\n• \"Explain staking\" - Earn rewards\n• \"Smart contracts\" - Deploy code\n• \"Multi-account\" - Multiple wallets\n\nOr click one of the suggestions below!";
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 group"
          aria-label="Open AI Assistant"
        >
          <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-[#0019ff] rounded-full shadow-xl transition-all duration-300 group-hover:scale-110">
            <MessageCircle size={24} className="text-white" strokeWidth={2.5} />
            <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-[#10b981] rounded-full border-2 border-white">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50
          w-[calc(100vw-2rem)] sm:w-[400px] lg:w-[440px]
          ${isMinimized ? 'h-[56px]' : 'h-[90vh] sm:h-[640px] max-h-[720px]'}
          bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden
          transition-all duration-300 ease-in-out border border-gray-200`}
        >
          {/* Header */}
          <div className="relative bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-[#0019ff] rounded-full">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-gray-900 font-semibold text-sm">Rainum Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full" />
                  <span className="text-gray-500 text-xs">Online now</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                aria-label={isMinimized ? "Expand" : "Minimize"}
              >
                <Minimize2 size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Quick Actions - Only show at start */}
              {showQuickActions && messages.length === 1 && (
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={action.action}
                        className="flex flex-col items-start gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-[#0019ff] hover:bg-blue-50 transition-all duration-200 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#0019ff] group-hover:bg-[#0019ff] group-hover:text-white transition-colors">
                          {action.icon}
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-semibold text-gray-900">{action.label}</div>
                          <div className="text-[10px] text-gray-500">{action.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-[#0019ff] text-white"
                          : "bg-white border border-gray-200 text-gray-800 shadow-sm"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>

                      {/* Action Buttons */}
                      {message.actions && message.actions.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2">
                          {message.actions.map((action, i) => (
                            <button
                              key={i}
                              onClick={action.action}
                              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                                action.variant === "primary"
                                  ? "bg-[#0019ff] text-white hover:bg-[#0028ff]"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              {action.icon}
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Suggestion Pills */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.suggestions.map((suggestion, i) => (
                            <button
                              key={i}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-xs font-medium text-gray-700 transition-all duration-200 hover:border-[#0019ff] hover:text-[#0019ff]"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}

                      <span className="text-[10px] opacity-60 mt-2 block">
                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-[#0019ff] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 bg-[#0019ff] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 bg-[#0019ff] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Send a message..."
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0019ff] focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400 transition-all"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="px-4 py-2.5 bg-[#0019ff] text-white rounded-full hover:bg-[#0028ff] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    aria-label="Send message"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
