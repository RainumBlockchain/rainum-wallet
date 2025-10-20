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
      content: "👋 Hi there! I'm your Rainum assistant.\n\nI'm here to help you navigate your wallet, understand blockchain concepts, and make transactions easier.\n\nWhat would you like to do today?",
      timestamp: new Date(),
      suggestions: [
        "Check my balance",
        "Show my transactions",
        "How do I stake RAIN?",
        "What's my address?",
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
      icon: <Wallet size={20} />,
      label: "Check Balance",
      description: "View your current RAIN balance",
      action: () => handleQuickAction("What's my balance?"),
    },
    {
      icon: <ArrowRightLeft size={20} />,
      label: "Recent Activity",
      description: "See your latest transactions",
      action: () => handleQuickAction("Show my last 5 transactions"),
    },
    {
      icon: <TrendingUp size={20} />,
      label: "Staking Info",
      description: "Check your staking rewards",
      action: () => handleQuickAction("How much have I earned from staking?"),
    },
    {
      icon: <Settings size={20} />,
      label: "Settings",
      description: "Open wallet settings",
      action: () => {
        onNavigate?.("Settings");
        addMessage("assistant", "✅ Opening Settings...");
      },
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

    if (lower.includes("balance")) {
      return ["Send RAIN", "Stake RAIN", "Show transactions"];
    }

    if (lower.includes("transaction")) {
      return ["Check balance", "Send RAIN", "What are gas fees?"];
    }

    if (lower.includes("staking") || lower.includes("stake")) {
      return ["Start staking", "Show my balance", "Which validators?"];
    }

    if (lower.includes("send")) {
      return ["Check balance first", "What are gas fees?", "Show recent transactions"];
    }

    return ["Check balance", "Show transactions", "Help"];
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
      return "💡 I can help you with:\n\n💰 Wallet Operations\n• Check your balance\n• View your address\n• See transaction history\n\n💸 Transactions\n• Send RAIN to others\n• Explain gas fees\n• Track transaction status\n\n🎯 Staking\n• Start staking\n• Check rewards\n• Manage delegations\n\n🔐 Security\n• Understand seed phrases\n• Biometric authentication\n• Privacy features\n\nJust ask me anything or click the buttons below!";
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

    return "I'm here to help! Try asking:\n• \"Check my balance\"\n• \"How does staking work?\"\n• \"What are gas fees?\"\n• \"Show my transactions\"\n\nOr click one of the suggestions below!";
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
