'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, Copy, Check, AlertTriangle, Clock, Loader2, Shield, Zap, Info, ArrowRight, RefreshCw, ChevronRight, Sparkles, Lock, CheckCircle2 } from 'lucide-react';

interface HTLC {
  contract_id: string;
  sender: string;
  receiver: string;
  amount: number;
  hash_lock: string;
  timeout: number;
  state: 'Locked' | 'Claimed' | 'Refunded';
  created_at: number;
  target_chain: string;
}

interface CrossChainSwapProps {
  walletAddress: string;
}

const CHAIN_INFO = {
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    gradient: 'from-[#627EEA] via-[#8A9FF5] to-[#627EEA]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
    available: true,
    badge: 'Live on Sepolia',
  },
  bitcoin: {
    name: 'Bitcoin',
    symbol: 'BTC',
    gradient: 'from-[#F7931A] via-[#F9A847] to-[#F7931A]',
    shimmer: 'from-orange-400/20 via-orange-500/30 to-orange-600/20',
    glow: 'shadow-orange-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
    available: false,
    badge: 'Coming Soon',
  },
  bsc: {
    name: 'BNB Chain',
    symbol: 'BNB',
    gradient: 'from-[#F3BA2F] via-[#F5C94D] to-[#F3BA2F]',
    shimmer: 'from-yellow-400/20 via-yellow-500/30 to-yellow-600/20',
    glow: 'shadow-yellow-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png',
    available: false,
    badge: 'Coming Soon',
  },
  polygon: {
    name: 'Polygon',
    symbol: 'MATIC',
    gradient: 'from-[#8247E5] via-[#9D6BF5] to-[#8247E5]',
    shimmer: 'from-purple-400/20 via-purple-500/30 to-purple-600/20',
    glow: 'shadow-purple-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png',
    available: false,
    badge: 'Coming Soon',
  },
  arbitrum: {
    name: 'Arbitrum',
    symbol: 'ARB',
    gradient: 'from-[#28A0F0] via-[#4FB8F7] to-[#28A0F0]',
    shimmer: 'from-cyan-400/20 via-cyan-500/30 to-cyan-600/20',
    glow: 'shadow-cyan-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/11841.png',
    available: false,
    badge: 'Coming Soon',
  },
  optimism: {
    name: 'Optimism',
    symbol: 'OP',
    gradient: 'from-[#FF0420] via-[#FF3347] to-[#FF0420]',
    shimmer: 'from-red-400/20 via-red-500/30 to-red-600/20',
    glow: 'shadow-red-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/11840.png',
    available: false,
    badge: 'Coming Soon',
  },
  avalanche: {
    name: 'Avalanche',
    symbol: 'AVAX',
    gradient: 'from-[#E84142] via-[#F55C5D] to-[#E84142]',
    shimmer: 'from-red-400/20 via-red-500/30 to-red-600/20',
    glow: 'shadow-red-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5805.png',
    available: false,
    badge: 'Coming Soon',
  },
  fantom: {
    name: 'Fantom',
    symbol: 'FTM',
    gradient: 'from-[#1969FF] via-[#4D8FFF] to-[#1969FF]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3513.png',
    available: false,
    badge: 'Coming Soon',
  },
  base: {
    name: 'Base',
    symbol: 'BASE',
    gradient: 'from-[#0052FF] via-[#3374FF] to-[#0052FF]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
    available: false,
    badge: 'Coming Soon',
  },
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    gradient: 'from-[#14F195] via-[#41F5B0] to-[#14F195]',
    shimmer: 'from-green-400/20 via-green-500/30 to-green-600/20',
    glow: 'shadow-green-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',
    available: false,
    badge: 'Coming Soon',
  },
  cosmos: {
    name: 'Cosmos',
    symbol: 'ATOM',
    gradient: 'from-[#2E3148] via-[#4E5373] to-[#2E3148]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3794.png',
    available: false,
    badge: 'Coming Soon',
  },
  polkadot: {
    name: 'Polkadot',
    symbol: 'DOT',
    gradient: 'from-[#E6007A] via-[#F03397] to-[#E6007A]',
    shimmer: 'from-pink-400/20 via-pink-500/30 to-pink-600/20',
    glow: 'shadow-pink-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/6636.png',
    available: false,
    badge: 'Coming Soon',
  },
  // Additional networks (shown when expanded)
  ripple: {
    name: 'XRP',
    symbol: 'XRP',
    gradient: 'from-[#23292F] via-[#3E4650] to-[#23292F]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/52.png',
    available: false,
    badge: 'Coming Soon',
  },
  near: {
    name: 'NEAR Protocol',
    symbol: 'NEAR',
    gradient: 'from-[#00C08B] via-[#33D5A8] to-[#00C08B]',
    shimmer: 'from-teal-400/20 via-teal-500/30 to-teal-600/20',
    glow: 'shadow-teal-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/6535.png',
    available: false,
    badge: 'Coming Soon',
  },
  cardano: {
    name: 'Cardano',
    symbol: 'ADA',
    gradient: 'from-[#0033AD] via-[#3355C4] to-[#0033AD]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2010.png',
    available: false,
    badge: 'Coming Soon',
  },
  tron: {
    name: 'Tron',
    symbol: 'TRX',
    gradient: 'from-[#FF060A] via-[#FF3337] to-[#FF060A]',
    shimmer: 'from-red-400/20 via-red-500/30 to-red-600/20',
    glow: 'shadow-red-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1958.png',
    available: false,
    badge: 'Coming Soon',
  },
  stellar: {
    name: 'Stellar',
    symbol: 'XLM',
    gradient: 'from-[#000000] via-[#333333] to-[#000000]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/512.png',
    available: false,
    badge: 'Coming Soon',
  },
  algorand: {
    name: 'Algorand',
    symbol: 'ALGO',
    gradient: 'from-[#000000] via-[#333333] to-[#000000]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4030.png',
    available: false,
    badge: 'Coming Soon',
  },
  hedera: {
    name: 'Hedera',
    symbol: 'HBAR',
    gradient: 'from-[#000000] via-[#333333] to-[#000000]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4642.png',
    available: false,
    badge: 'Coming Soon',
  },
  sui: {
    name: 'Sui',
    symbol: 'SUI',
    gradient: 'from-[#6FBCF0] via-[#8FCDF5] to-[#6FBCF0]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/20947.png',
    available: false,
    badge: 'Coming Soon',
  },
  aptos: {
    name: 'Aptos',
    symbol: 'APT',
    gradient: 'from-[#00D4AA] via-[#33E0C1] to-[#00D4AA]',
    shimmer: 'from-teal-400/20 via-teal-500/30 to-teal-600/20',
    glow: 'shadow-teal-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/21794.png',
    available: false,
    badge: 'Coming Soon',
  },
  cronos: {
    name: 'Cronos',
    symbol: 'CRO',
    gradient: 'from-[#002D74] via-[#004BA8] to-[#002D74]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3635.png',
    available: false,
    badge: 'Coming Soon',
  },
  zkSync: {
    name: 'zkSync Era',
    symbol: 'zkSync',
    gradient: 'from-[#8C8DFC] via-[#A5A6FD] to-[#8C8DFC]',
    shimmer: 'from-purple-400/20 via-purple-500/30 to-purple-600/20',
    glow: 'shadow-purple-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
    available: false,
    badge: 'Coming Soon',
  },
  linea: {
    name: 'Linea',
    symbol: 'LINEA',
    gradient: 'from-[#121212] via-[#333333] to-[#121212]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
    available: false,
    badge: 'Coming Soon',
  },
  // More networks
  litecoin: {
    name: 'Litecoin',
    symbol: 'LTC',
    gradient: 'from-[#345D9D] via-[#5680C1] to-[#345D9D]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2.png',
    available: false,
    badge: 'Coming Soon',
  },
  chainlink: {
    name: 'Chainlink',
    symbol: 'LINK',
    gradient: 'from-[#2A5ADA] via-[#5480E5] to-[#2A5ADA]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1975.png',
    available: false,
    badge: 'Coming Soon',
  },
  monero: {
    name: 'Monero',
    symbol: 'XMR',
    gradient: 'from-[#FF6600] via-[#FF8533] to-[#FF6600]',
    shimmer: 'from-orange-400/20 via-orange-500/30 to-orange-600/20',
    glow: 'shadow-orange-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/328.png',
    available: false,
    badge: 'Coming Soon',
  },
  eos: {
    name: 'EOS',
    symbol: 'EOS',
    gradient: 'from-[#000000] via-[#333333] to-[#000000]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1765.png',
    available: false,
    badge: 'Coming Soon',
  },
  iota: {
    name: 'IOTA',
    symbol: 'MIOTA',
    gradient: 'from-[#131F37] via-[#2A3F5F] to-[#131F37]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1720.png',
    available: false,
    badge: 'Coming Soon',
  },
  neo: {
    name: 'NEO',
    symbol: 'NEO',
    gradient: 'from-[#58BF00] via-[#7DD633] to-[#58BF00]',
    shimmer: 'from-green-400/20 via-green-500/30 to-green-600/20',
    glow: 'shadow-green-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1376.png',
    available: false,
    badge: 'Coming Soon',
  },
  dash: {
    name: 'Dash',
    symbol: 'DASH',
    gradient: 'from-[#008CE7] via-[#33A9F2] to-[#008CE7]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/131.png',
    available: false,
    badge: 'Coming Soon',
  },
  zcash: {
    name: 'Zcash',
    symbol: 'ZEC',
    gradient: 'from-[#ECB244] via-[#F2C86D] to-[#ECB244]',
    shimmer: 'from-yellow-400/20 via-yellow-500/30 to-yellow-600/20',
    glow: 'shadow-yellow-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1437.png',
    available: false,
    badge: 'Coming Soon',
  },
  filecoin: {
    name: 'Filecoin',
    symbol: 'FIL',
    gradient: 'from-[#0090FF] via-[#33ACFF] to-[#0090FF]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2280.png',
    available: false,
    badge: 'Coming Soon',
  },
  vechain: {
    name: 'VeChain',
    symbol: 'VET',
    gradient: 'from-[#15BDFF] via-[#48D0FF] to-[#15BDFF]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3077.png',
    available: false,
    badge: 'Coming Soon',
  },
  theta: {
    name: 'Theta Network',
    symbol: 'THETA',
    gradient: 'from-[#2AB8E6] via-[#54CCEF] to-[#2AB8E6]',
    shimmer: 'from-cyan-400/20 via-cyan-500/30 to-cyan-600/20',
    glow: 'shadow-cyan-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2416.png',
    available: false,
    badge: 'Coming Soon',
  },
  elrond: {
    name: 'MultiversX',
    symbol: 'EGLD',
    gradient: 'from-[#000000] via-[#333333] to-[#000000]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/6892.png',
    available: false,
    badge: 'Coming Soon',
  },
  flow: {
    name: 'Flow',
    symbol: 'FLOW',
    gradient: 'from-[#00EF8B] via-[#33F4A8] to-[#00EF8B]',
    shimmer: 'from-green-400/20 via-green-500/30 to-green-600/20',
    glow: 'shadow-green-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4558.png',
    available: false,
    badge: 'Coming Soon',
  },
  mina: {
    name: 'Mina Protocol',
    symbol: 'MINA',
    gradient: 'from-[#FF603B] via-[#FF8766] to-[#FF603B]',
    shimmer: 'from-orange-400/20 via-orange-500/30 to-orange-600/20',
    glow: 'shadow-orange-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/8646.png',
    available: false,
    badge: 'Coming Soon',
  },
  celo: {
    name: 'Celo',
    symbol: 'CELO',
    gradient: 'from-[#FBCC5C] via-[#FDD97D] to-[#FBCC5C]',
    shimmer: 'from-yellow-400/20 via-yellow-500/30 to-yellow-600/20',
    glow: 'shadow-yellow-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5567.png',
    available: false,
    badge: 'Coming Soon',
  },
  kava: {
    name: 'Kava',
    symbol: 'KAVA',
    gradient: 'from-[#FF564F] via-[#FF7F76] to-[#FF564F]',
    shimmer: 'from-red-400/20 via-red-500/30 to-red-600/20',
    glow: 'shadow-red-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4846.png',
    available: false,
    badge: 'Coming Soon',
  },
  osmosis: {
    name: 'Osmosis',
    symbol: 'OSMO',
    gradient: 'from-[#5E12A0] via-[#7F3BB5] to-[#5E12A0]',
    shimmer: 'from-purple-400/20 via-purple-500/30 to-purple-600/20',
    glow: 'shadow-purple-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/12220.png',
    available: false,
    badge: 'Coming Soon',
  },
  injective: {
    name: 'Injective',
    symbol: 'INJ',
    gradient: 'from-[#00D2FF] via-[#33DDFF] to-[#00D2FF]',
    shimmer: 'from-cyan-400/20 via-cyan-500/30 to-cyan-600/20',
    glow: 'shadow-cyan-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7226.png',
    available: false,
    badge: 'Coming Soon',
  },
  sei: {
    name: 'Sei',
    symbol: 'SEI',
    gradient: 'from-[#8B0000] via-[#B33333] to-[#8B0000]',
    shimmer: 'from-red-400/20 via-red-500/30 to-red-600/20',
    glow: 'shadow-red-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/23149.png',
    available: false,
    badge: 'Coming Soon',
  },
  celestia: {
    name: 'Celestia',
    symbol: 'TIA',
    gradient: 'from-[#7B2BF9] via-[#9B5DFF] to-[#7B2BF9]',
    shimmer: 'from-purple-400/20 via-purple-500/30 to-purple-600/20',
    glow: 'shadow-purple-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/22861.png',
    available: false,
    badge: 'Coming Soon',
  },
  starknet: {
    name: 'Starknet',
    symbol: 'STRK',
    gradient: 'from-[#EC796B] via-[#F09B8F] to-[#EC796B]',
    shimmer: 'from-orange-400/20 via-orange-500/30 to-orange-600/20',
    glow: 'shadow-orange-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/22691.png',
    available: false,
    badge: 'Coming Soon',
  },
  immutablex: {
    name: 'Immutable X',
    symbol: 'IMX',
    gradient: 'from-[#0B0E11] via-[#2A2F35] to-[#0B0E11]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/10603.png',
    available: false,
    badge: 'Coming Soon',
  },
  mantle: {
    name: 'Mantle',
    symbol: 'MNT',
    gradient: 'from-[#000000] via-[#333333] to-[#000000]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/27075.png',
    available: false,
    badge: 'Coming Soon',
  },
  scroll: {
    name: 'Scroll',
    symbol: 'SCR',
    gradient: 'from-[#FFEEDA] via-[#FFF5E8] to-[#FFEEDA]',
    shimmer: 'from-yellow-400/20 via-yellow-500/30 to-yellow-600/20',
    glow: 'shadow-yellow-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/26998.png',
    available: false,
    badge: 'Coming Soon',
  },
  blast: {
    name: 'Blast',
    symbol: 'BLAST',
    gradient: 'from-[#FCFC03] via-[#FDFD66] to-[#FCFC03]',
    shimmer: 'from-yellow-400/20 via-yellow-500/30 to-yellow-600/20',
    glow: 'shadow-yellow-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28480.png',
    available: false,
    badge: 'Coming Soon',
  },
  ronin: {
    name: 'Ronin',
    symbol: 'RON',
    gradient: 'from-[#1273EA] via-[#4296F5] to-[#1273EA]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/14101.png',
    available: false,
    badge: 'Coming Soon',
  },
  kujira: {
    name: 'Kujira',
    symbol: 'KUJI',
    gradient: 'from-[#E74C3C] via-[#F07366] to-[#E74C3C]',
    shimmer: 'from-red-400/20 via-red-500/30 to-red-600/20',
    glow: 'shadow-red-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/15185.png',
    available: false,
    badge: 'Coming Soon',
  },
  archway: {
    name: 'Archway',
    symbol: 'ARCH',
    gradient: 'from-[#FF4D00] via-[#FF7333] to-[#FF4D00]',
    shimmer: 'from-orange-400/20 via-orange-500/30 to-orange-600/20',
    glow: 'shadow-orange-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/23215.png',
    available: false,
    badge: 'Coming Soon',
  },
  axelar: {
    name: 'Axelar',
    symbol: 'AXL',
    gradient: 'from-[#000000] via-[#333333] to-[#000000]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/17799.png',
    available: false,
    badge: 'Coming Soon',
  },
  astar: {
    name: 'Astar',
    symbol: 'ASTR',
    gradient: 'from-[#0AE2FF] via-[#3EF0FF] to-[#0AE2FF]',
    shimmer: 'from-cyan-400/20 via-cyan-500/30 to-cyan-600/20',
    glow: 'shadow-cyan-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/12885.png',
    available: false,
    badge: 'Coming Soon',
  },
  moonbeam: {
    name: 'Moonbeam',
    symbol: 'GLMR',
    gradient: 'from-[#53CBC9] via-[#7FE0DE] to-[#53CBC9]',
    shimmer: 'from-teal-400/20 via-teal-500/30 to-teal-600/20',
    glow: 'shadow-teal-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/6836.png',
    available: false,
    badge: 'Coming Soon',
  },
  moonriver: {
    name: 'Moonriver',
    symbol: 'MOVR',
    gradient: 'from-[#F2B705] via-[#F5CB4D] to-[#F2B705]',
    shimmer: 'from-yellow-400/20 via-yellow-500/30 to-yellow-600/20',
    glow: 'shadow-yellow-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/9285.png',
    available: false,
    badge: 'Coming Soon',
  },
  acala: {
    name: 'Acala',
    symbol: 'ACA',
    gradient: 'from-[#E40C5B] via-[#EF3F7C] to-[#E40C5B]',
    shimmer: 'from-pink-400/20 via-pink-500/30 to-pink-600/20',
    glow: 'shadow-pink-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/6756.png',
    available: false,
    badge: 'Coming Soon',
  },
  kusama: {
    name: 'Kusama',
    symbol: 'KSM',
    gradient: 'from-[#000000] via-[#333333] to-[#000000]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5034.png',
    available: false,
    badge: 'Coming Soon',
  },
  edgeware: {
    name: 'Edgeware',
    symbol: 'EDG',
    gradient: 'from-[#0A95FF] via-[#3DB3FF] to-[#0A95FF]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3855.png',
    available: false,
    badge: 'Coming Soon',
  },
  bifrost: {
    name: 'Bifrost',
    symbol: 'BNC',
    gradient: 'from-[#5A25F0] via-[#7D51F5] to-[#5A25F0]',
    shimmer: 'from-purple-400/20 via-purple-500/30 to-purple-600/20',
    glow: 'shadow-purple-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/8705.png',
    available: false,
    badge: 'Coming Soon',
  },
  kadena: {
    name: 'Kadena',
    symbol: 'KDA',
    gradient: 'from-[#ED098F] via-[#F43BA8] to-[#ED098F]',
    shimmer: 'from-pink-400/20 via-pink-500/30 to-pink-600/20',
    glow: 'shadow-pink-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5647.png',
    available: false,
    badge: 'Coming Soon',
  },
  conflux: {
    name: 'Conflux',
    symbol: 'CFX',
    gradient: 'from-[#4A5FE6] via-[#6F85F2] to-[#4A5FE6]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7334.png',
    available: false,
    badge: 'Coming Soon',
  },
  oasis: {
    name: 'Oasis Network',
    symbol: 'ROSE',
    gradient: 'from-[#0092F6] via-[#33AEFF] to-[#0092F6]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7653.png',
    available: false,
    badge: 'Coming Soon',
  },
  harmony: {
    name: 'Harmony',
    symbol: 'ONE',
    gradient: 'from-[#00ADE8] via-[#33C3F0] to-[#00ADE8]',
    shimmer: 'from-cyan-400/20 via-cyan-500/30 to-cyan-600/20',
    glow: 'shadow-cyan-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3945.png',
    available: false,
    badge: 'Coming Soon',
  },
  zilliqa: {
    name: 'Zilliqa',
    symbol: 'ZIL',
    gradient: 'from-[#49C1BF] via-[#6FD6D4] to-[#49C1BF]',
    shimmer: 'from-teal-400/20 via-teal-500/30 to-teal-600/20',
    glow: 'shadow-teal-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2469.png',
    available: false,
    badge: 'Coming Soon',
  },
  icon: {
    name: 'ICON',
    symbol: 'ICX',
    gradient: 'from-[#1FC5C9] via-[#52D9DD] to-[#1FC5C9]',
    shimmer: 'from-cyan-400/20 via-cyan-500/30 to-cyan-600/20',
    glow: 'shadow-cyan-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2099.png',
    available: false,
    badge: 'Coming Soon',
  },
  wax: {
    name: 'WAX',
    symbol: 'WAXP',
    gradient: 'from-[#F89022] via-[#FFAE5C] to-[#F89022]',
    shimmer: 'from-orange-400/20 via-orange-500/30 to-orange-600/20',
    glow: 'shadow-orange-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2300.png',
    available: false,
    badge: 'Coming Soon',
  },
  ethereumClassic: {
    name: 'Ethereum Classic',
    symbol: 'ETC',
    gradient: 'from-[#328332] via-[#5AA85A] to-[#328332]',
    shimmer: 'from-green-400/20 via-green-500/30 to-green-600/20',
    glow: 'shadow-green-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1321.png',
    available: false,
    badge: 'Coming Soon',
  },
  bitcoinCash: {
    name: 'Bitcoin Cash',
    symbol: 'BCH',
    gradient: 'from-[#8DC351] via-[#A8D97A] to-[#8DC351]',
    shimmer: 'from-green-400/20 via-green-500/30 to-green-600/20',
    glow: 'shadow-green-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1831.png',
    available: false,
    badge: 'Coming Soon',
  },
  bitcoinSV: {
    name: 'Bitcoin SV',
    symbol: 'BSV',
    gradient: 'from-[#EAB300] via-[#F2C933] to-[#EAB300]',
    shimmer: 'from-yellow-400/20 via-yellow-500/30 to-yellow-600/20',
    glow: 'shadow-yellow-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3602.png',
    available: false,
    badge: 'Coming Soon',
  },
  dogecoin: {
    name: 'Dogecoin',
    symbol: 'DOGE',
    gradient: 'from-[#C3A634] via-[#D9C15C] to-[#C3A634]',
    shimmer: 'from-yellow-400/20 via-yellow-500/30 to-yellow-600/20',
    glow: 'shadow-yellow-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/74.png',
    available: false,
    badge: 'Coming Soon',
  },
  shiba: {
    name: 'Shiba Inu',
    symbol: 'SHIB',
    gradient: 'from-[#FFA409] via-[#FFB837] to-[#FFA409]',
    shimmer: 'from-orange-400/20 via-orange-500/30 to-orange-600/20',
    glow: 'shadow-orange-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5994.png',
    available: false,
    badge: 'Coming Soon',
  },
  terra: {
    name: 'Terra Classic',
    symbol: 'LUNC',
    gradient: 'from-[#0E3CA5] via-[#3F67C6] to-[#0E3CA5]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4172.png',
    available: false,
    badge: 'Coming Soon',
  },
  terra2: {
    name: 'Terra',
    symbol: 'LUNA',
    gradient: 'from-[#FFD83D] via-[#FFE366] to-[#FFD83D]',
    shimmer: 'from-yellow-400/20 via-yellow-500/30 to-yellow-600/20',
    glow: 'shadow-yellow-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/20314.png',
    available: false,
    badge: 'Coming Soon',
  },
  quant: {
    name: 'Quant',
    symbol: 'QNT',
    gradient: 'from-[#4A4A4A] via-[#707070] to-[#4A4A4A]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3155.png',
    available: false,
    badge: 'Coming Soon',
  },
  waves: {
    name: 'Waves',
    symbol: 'WAVES',
    gradient: 'from-[#0155FF] via-[#3480FF] to-[#0155FF]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1274.png',
    available: false,
    badge: 'Coming Soon',
  },
  iotex: {
    name: 'IoTeX',
    symbol: 'IOTX',
    gradient: 'from-[#00D4AA] via-[#33E0C1] to-[#00D4AA]',
    shimmer: 'from-teal-400/20 via-teal-500/30 to-teal-600/20',
    glow: 'shadow-teal-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2777.png',
    available: false,
    badge: 'Coming Soon',
  },
  nervos: {
    name: 'Nervos Network',
    symbol: 'CKB',
    gradient: 'from-[#3CC68A] via-[#66DB9F] to-[#3CC68A]',
    shimmer: 'from-green-400/20 via-green-500/30 to-green-600/20',
    glow: 'shadow-green-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4948.png',
    available: false,
    badge: 'Coming Soon',
  },
  fetch: {
    name: 'Fetch.ai',
    symbol: 'FET',
    gradient: 'from-[#0A1F44] via-[#1E3D6F] to-[#0A1F44]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3773.png',
    available: false,
    badge: 'Coming Soon',
  },
  ocean: {
    name: 'Ocean Protocol',
    symbol: 'OCEAN',
    gradient: 'from-[#E000CF] via-[#F033E0] to-[#E000CF]',
    shimmer: 'from-pink-400/20 via-pink-500/30 to-pink-600/20',
    glow: 'shadow-pink-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3911.png',
    available: false,
    badge: 'Coming Soon',
  },
  render: {
    name: 'Render Token',
    symbol: 'RNDR',
    gradient: 'from-[#000000] via-[#333333] to-[#000000]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5690.png',
    available: false,
    badge: 'Coming Soon',
  },
  singularitynet: {
    name: 'SingularityNET',
    symbol: 'AGIX',
    gradient: 'from-[#8549EA] via-[#A375F5] to-[#8549EA]',
    shimmer: 'from-purple-400/20 via-purple-500/30 to-purple-600/20',
    glow: 'shadow-purple-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2424.png',
    available: false,
    badge: 'Coming Soon',
  },
  tezos: {
    name: 'Tezos',
    symbol: 'XTZ',
    gradient: 'from-[#2C7DF7] via-[#5DA0FF] to-[#2C7DF7]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2011.png',
    available: false,
    badge: 'Coming Soon',
  },
  casper: {
    name: 'Casper Network',
    symbol: 'CSPR',
    gradient: 'from-[#FF0012] via-[#FF3345] to-[#FF0012]',
    shimmer: 'from-red-400/20 via-red-500/30 to-red-600/20',
    glow: 'shadow-red-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5899.png',
    available: false,
    badge: 'Coming Soon',
  },
  secret: {
    name: 'Secret',
    symbol: 'SCRT',
    gradient: 'from-[#000000] via-[#333333] to-[#000000]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5604.png',
    available: false,
    badge: 'Coming Soon',
  },
  band: {
    name: 'Band Protocol',
    symbol: 'BAND',
    gradient: 'from-[#516BEB] via-[#7A8FF5] to-[#516BEB]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4679.png',
    available: false,
    badge: 'Coming Soon',
  },
  ankr: {
    name: 'Ankr',
    symbol: 'ANKR',
    gradient: 'from-[#2E6AF5] via-[#5988FF] to-[#2E6AF5]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3783.png',
    available: false,
    badge: 'Coming Soon',
  },
  coti: {
    name: 'COTI',
    symbol: 'COTI',
    gradient: 'from-[#1B4B8C] via-[#4571A8] to-[#1B4B8C]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3992.png',
    available: false,
    badge: 'Coming Soon',
  },
  orbs: {
    name: 'Orbs',
    symbol: 'ORBS',
    gradient: 'from-[#1C63FE] via-[#4F87FF] to-[#1C63FE]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3835.png',
    available: false,
    badge: 'Coming Soon',
  },
  skale: {
    name: 'SKALE',
    symbol: 'SKL',
    gradient: 'from-[#000000] via-[#333333] to-[#000000]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5691.png',
    available: false,
    badge: 'Coming Soon',
  },
  lisk: {
    name: 'Lisk',
    symbol: 'LSK',
    gradient: 'from-[#0D47A1] via-[#3671C6] to-[#0D47A1]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1214.png',
    available: false,
    badge: 'Coming Soon',
  },
  nem: {
    name: 'NEM',
    symbol: 'XEM',
    gradient: 'from-[#67B2E8] via-[#8BC9F5] to-[#67B2E8]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/873.png',
    available: false,
    badge: 'Coming Soon',
  },
  symbol: {
    name: 'Symbol',
    symbol: 'XYM',
    gradient: 'from-[#45B89C] via-[#6ACEB7] to-[#45B89C]',
    shimmer: 'from-teal-400/20 via-teal-500/30 to-teal-600/20',
    glow: 'shadow-teal-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/8677.png',
    available: false,
    badge: 'Coming Soon',
  },
  qtum: {
    name: 'Qtum',
    symbol: 'QTUM',
    gradient: 'from-[#2E9AD0] via-[#5AB6E5] to-[#2E9AD0]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1684.png',
    available: false,
    badge: 'Coming Soon',
  },
  ontology: {
    name: 'Ontology',
    symbol: 'ONT',
    gradient: 'from-[#00A6C2] via-[#33C2DB] to-[#00A6C2]',
    shimmer: 'from-cyan-400/20 via-cyan-500/30 to-cyan-600/20',
    glow: 'shadow-cyan-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2566.png',
    available: false,
    badge: 'Coming Soon',
  },
  decred: {
    name: 'Decred',
    symbol: 'DCR',
    gradient: 'from-[#2ED6A1] via-[#5BE6B7] to-[#2ED6A1]',
    shimmer: 'from-green-400/20 via-green-500/30 to-green-600/20',
    glow: 'shadow-green-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1168.png',
    available: false,
    badge: 'Coming Soon',
  },
  ravencoin: {
    name: 'Ravencoin',
    symbol: 'RVN',
    gradient: 'from-[#384182] via-[#5C68A8] to-[#384182]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2577.png',
    available: false,
    badge: 'Coming Soon',
  },
  horizen: {
    name: 'Horizen',
    symbol: 'ZEN',
    gradient: 'from-[#041742] via-[#1E3D6F] to-[#041742]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1698.png',
    available: false,
    badge: 'Coming Soon',
  },
  digibyte: {
    name: 'DigiByte',
    symbol: 'DGB',
    gradient: 'from-[#006AD2] via-[#3388E5] to-[#006AD2]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/109.png',
    available: false,
    badge: 'Coming Soon',
  },
  siacoin: {
    name: 'Siacoin',
    symbol: 'SC',
    gradient: 'from-[#00CBA0] via-[#33DCBA] to-[#00CBA0]',
    shimmer: 'from-teal-400/20 via-teal-500/30 to-teal-600/20',
    glow: 'shadow-teal-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1042.png',
    available: false,
    badge: 'Coming Soon',
  },
  storj: {
    name: 'Storj',
    symbol: 'STORJ',
    gradient: 'from-[#2683FF] via-[#52A1FF] to-[#2683FF]',
    shimmer: 'from-blue-400/20 via-blue-500/30 to-blue-600/20',
    glow: 'shadow-blue-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1772.png',
    available: false,
    badge: 'Coming Soon',
  },
  arweave: {
    name: 'Arweave',
    symbol: 'AR',
    gradient: 'from-[#222326] via-[#4A4B4E] to-[#222326]',
    shimmer: 'from-gray-400/20 via-gray-500/30 to-gray-600/20',
    glow: 'shadow-gray-500/50',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5632.png',
    available: false,
    badge: 'Coming Soon',
  },
};

// Top 12 networks shown by default
const DEFAULT_CHAINS = ['bitcoin', 'ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'fantom', 'base', 'solana', 'cosmos', 'polkadot'];

export default function CrossChainSwap({ walletAddress }: CrossChainSwapProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'track'>('create');
  const [targetChain, setTargetChain] = useState<keyof typeof CHAIN_INFO>('ethereum');
  const [showAllNetworks, setShowAllNetworks] = useState(false);
  const [amount, setAmount] = useState('');
  const [receiver, setReceiver] = useState('');
  const [timeoutHours, setTimeoutHours] = useState('12');
  const [generatedSecret, setGeneratedSecret] = useState('');
  const [hashLock, setHashLock] = useState('');
  const [secretCopied, setSecretCopied] = useState(false);
  const [mySwaps, setMySwaps] = useState<HTLC[]>([]);
  const [claimSecret, setClaimSecret] = useState('');
  const [selectedSwapId, setSelectedSwapId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const generateSecret = async () => {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const secret = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    setGeneratedSecret(secret);

    const encoder = new TextEncoder();
    const data = encoder.encode(secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    setHashLock(hash);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
    showMessage('info', 'Copied to clipboard');
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateSwap = async () => {
    if (!amount || !receiver || !generatedSecret) {
      showMessage('error', 'Please complete all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://api.rainum.com/htlc/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: walletAddress,
          receiver,
          amount: amount.toString(),
          secret: generatedSecret,
          timeout_hours: parseInt(timeoutHours),
          target_chain: targetChain,
        }),
      });

      if (!response.ok) throw new Error('Failed');

      const data = await response.json();
      showMessage('success', 'Swap created successfully');
      setAmount('');
      setReceiver('');
      setTimeout(() => {
        setActiveTab('track');
        fetchMySwaps();
      }, 1500);
    } catch (error) {
      showMessage('error', 'Failed to create swap');
    } finally {
      setLoading(false);
    }
  };

  const fetchMySwaps = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`https://api.rainum.com/htlc/address/${walletAddress}`);
      if (response.ok) {
        const data = await response.json();
        setMySwaps(data.htlcs || []);
      }
    } catch (error) {
      console.error('Failed to fetch swaps:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleClaimSwap = async (contractId: string) => {
    if (!claimSecret) {
      showMessage('error', 'Please enter the secret');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://api.rainum.com/htlc/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: contractId,
          secret: claimSecret,
          claimer: walletAddress,
        }),
      });

      if (!response.ok) throw new Error('Failed');

      showMessage('success', 'Swap claimed successfully');
      setClaimSecret('');
      setSelectedSwapId('');
      fetchMySwaps();
    } catch (error) {
      showMessage('error', 'Invalid secret or claim failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRefundSwap = async (contractId: string) => {
    setLoading(true);
    try {
      const response = await fetch('https://api.rainum.com/htlc/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: contractId,
          refunder: walletAddress,
        }),
      });

      if (!response.ok) throw new Error('Failed');

      showMessage('success', 'Swap refunded successfully');
      fetchMySwaps();
    } catch (error) {
      showMessage('error', 'Refund failed - may not be expired');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'track') {
      fetchMySwaps();
      const interval = setInterval(fetchMySwaps, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab, walletAddress]);

  const formatTimeRemaining = (timeout: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = timeout - now;
    if (remaining <= 0) return 'Expired';
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[4px] border-2 border-gray-300"
      >
        <div className="px-8 py-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-[4px] bg-[#0019ff] flex items-center justify-center">
                  <ArrowRightLeft className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-black tracking-tight">Cross-Chain Bridge</h1>
                  <p className="text-sm text-gray-600 mt-0.5">Trustless atomic swaps powered by HTLC</p>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-medium text-gray-600">Network Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">Enterprise Grade Security</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-3">
              <div className="px-5 py-3 rounded-[4px] bg-white border-2 border-gray-300">
                <p className="text-xs text-gray-500 mb-0.5">Total Swaps</p>
                <p className="text-xl font-bold text-black">{mySwaps.length}</p>
              </div>
              <div className="px-5 py-3 rounded-[4px] bg-white border-2 border-gray-300">
                <p className="text-xs text-gray-500 mb-0.5">Active</p>
                <p className="text-xl font-bold text-black">{mySwaps.filter(s => s.state === 'Locked').length}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-8 p-1 bg-gray-100 rounded-[4px] w-fit">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-2.5 rounded-[4px] text-sm font-semibold transition-all ${
                activeTab === 'create'
                  ? 'bg-white text-black border-2 border-[#0019ff]'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Create Swap
            </button>
            <button
              onClick={() => setActiveTab('track')}
              className={`px-6 py-2.5 rounded-[4px] text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'track'
                  ? 'bg-white text-black border-2 border-[#0019ff]'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              My Swaps
              {mySwaps.length > 0 && (
                <span className="px-2 py-0.5 bg-[#0019ff] text-white text-xs rounded-[4px]">
                  {mySwaps.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Toast Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-6 right-6 z-50"
          >
            <div className={`px-6 py-4 rounded-[4px] border-2 flex items-center gap-3 min-w-[320px] bg-white ${
              message.type === 'success'
                ? 'border-green-600'
                : message.type === 'error'
                ? 'border-red-600'
                : 'border-[#0019ff]'
            }`}>
              {message.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
              {message.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600" />}
              {message.type === 'info' && <Info className="w-5 h-5 text-[#0019ff]" />}
              <p className="font-medium text-sm text-black">{message.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Swap Tab */}
      {activeTab === 'create' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Chain Selection */}
          <div className="bg-white rounded-[4px] border-2 border-gray-300 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-black">Select Target Chain</h3>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0019ff] rounded-[4px]">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-semibold text-white">
                  {Object.keys(CHAIN_INFO).length} Networks
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {(Object.keys(CHAIN_INFO) as Array<keyof typeof CHAIN_INFO>)
                .filter(chain => showAllNetworks || DEFAULT_CHAINS.includes(chain))
                .map((chain) => {
                  const info = CHAIN_INFO[chain];
                  const isSelected = targetChain === chain;
                  return (
                    <motion.button
                      key={chain}
                      onClick={info.available ? () => setTargetChain(chain) : undefined}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={showAllNetworks && !DEFAULT_CHAINS.includes(chain) ? { opacity: 0, scale: 0.8 } : {}}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className={`relative group p-6 rounded-[4px] transition-all border-2 ${
                        isSelected
                          ? 'bg-white border-[#0019ff]'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      } ${!info.available ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <div className="relative">
                        <div className="relative w-14 h-14 rounded-[4px] mb-3 flex items-center justify-center mx-auto bg-gray-50 border border-gray-200">
                          <img
                            src={info.logo}
                            alt={info.name}
                            className="w-9 h-9 object-contain"
                            crossOrigin="anonymous"
                          />

                          {/* Badge overlay on logo */}
                          {info.badge && (
                            <div className="absolute inset-0 rounded-[4px] flex items-center justify-center">
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-[4px] ${
                                info.available
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-600 text-white'
                              }`}>
                                {info.available ? 'LIVE' : 'SOON'}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-bold text-black">
                          {info.name}
                        </p>
                        <p className="text-xs mt-1 text-gray-500">
                          {info.symbol}
                        </p>

                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-[#0019ff] rounded-full flex items-center justify-center"
                          >
                            <Check className="w-4 h-4 text-white" strokeWidth={3} />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
            </div>

            {/* Show More Button */}
            {!showAllNetworks && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAllNetworks(true)}
                className="mt-6 w-full py-4 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-[#0019ff] rounded-[4px] font-semibold text-black transition-all flex items-center justify-center gap-2 group"
              >
                <Sparkles className="w-4 h-4 text-gray-500 group-hover:text-[#0019ff] transition-colors" />
                <span>Show {Object.keys(CHAIN_INFO).length - DEFAULT_CHAINS.length} More Networks</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            )}

            {/* Show Less Button */}
            {showAllNetworks && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAllNetworks(false)}
                className="mt-6 w-full py-4 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-[#0019ff] rounded-[4px] font-semibold text-black transition-all flex items-center justify-center gap-2"
              >
                <span>Show Less</span>
                <motion.div
                  animate={{ rotate: 180 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </motion.div>
              </motion.button>
            )}
          </div>

          {/* Swap Details */}
          <div className="bg-white rounded-[4px] border-2 border-gray-300 p-8 space-y-6">
            <h3 className="text-lg font-bold text-black mb-6">Swap Details</h3>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-black">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-6 py-4 pr-20 text-lg font-semibold text-black placeholder:text-gray-500 bg-white border-2 border-gray-300 rounded-[4px] focus:outline-none focus:border-[#0019ff] transition-all"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">RAIN</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-black">Receiver Address</label>
              <input
                type="text"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                placeholder="0x..."
                className="w-full px-6 py-4 font-mono text-sm text-black placeholder:text-gray-500 bg-white border-2 border-gray-300 rounded-[4px] focus:outline-none focus:border-[#0019ff] transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-black">Lock Duration</label>
              <div className="grid grid-cols-4 gap-3">
                {['1', '6', '12', '24'].map((hours) => (
                  <button
                    key={hours}
                    onClick={() => setTimeoutHours(hours)}
                    className={`px-4 py-3 rounded-[4px] font-semibold text-sm transition-all ${
                      timeoutHours === hours
                        ? 'bg-[#0019ff] text-white border-2 border-[#0019ff]'
                        : 'bg-white text-black hover:bg-gray-50 border-2 border-gray-300'
                    }`}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Secret Generation */}
          <div className="bg-white rounded-[4px] border-2 border-gray-300 p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-black">Secret Key</h3>
                <p className="text-xs text-gray-600 mt-1">Required to claim funds on target chain</p>
              </div>
              {!generatedSecret ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={generateSecret}
                  className="px-6 py-3 bg-[#0019ff] text-white font-bold rounded-[4px] flex items-center gap-2 hover:bg-[#0015cc] transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => copyToClipboard(generatedSecret, 'secret')}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-black font-bold rounded-[4px] flex items-center gap-2 hover:border-[#0019ff] transition-all"
                >
                  {secretCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {secretCopied ? 'Copied!' : 'Copy'}
                </motion.button>
              )}
            </div>

            {generatedSecret && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div className="flex items-start gap-3 p-4 bg-orange-50 border-2 border-orange-500 rounded-[4px]">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-orange-900">Save this secret immediately!</p>
                    <p className="text-xs text-orange-700 mt-1">
                      You'll need it to claim funds. This will only be shown once.
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-gray-50 rounded-[4px] border-2 border-gray-300">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Secret (Private)</p>
                  <p className="font-mono text-xs text-black break-all leading-relaxed">{generatedSecret}</p>
                </div>

                <div className="p-5 bg-gray-50 rounded-[4px] border-2 border-gray-300">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Hash Lock (Public)</p>
                  <p className="font-mono text-xs text-gray-600 break-all leading-relaxed">{hashLock}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Create Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleCreateSwap}
            disabled={loading || !amount || !receiver || !generatedSecret}
            className="w-full py-5 bg-[#0019ff] text-white font-bold text-lg rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 hover:bg-[#0015cc]"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Creating Swap...
              </>
            ) : (
              <>
                <Lock className="w-6 h-6" />
                Create Atomic Swap
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </motion.button>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-4 pt-4">
            {[
              { icon: Shield, label: 'Trustless', desc: 'No intermediaries', color: 'blue' },
              { icon: Zap, label: 'Fast', desc: 'Complete in minutes', color: 'green' },
              { icon: Clock, label: 'Safe', desc: 'Auto-refund if unclaimed', color: 'purple' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-5 bg-white rounded-[4px] border-2 border-gray-300"
              >
                <feature.icon className={`w-8 h-8 text-[#0019ff] mb-3`} />
                <h4 className="font-bold text-black mb-1">{feature.label}</h4>
                <p className="text-xs text-gray-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Track Swaps Tab */}
      {activeTab === 'track' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-black">Active Swaps</h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchMySwaps}
              disabled={refreshing}
              className="px-4 py-2.5 bg-white border-2 border-gray-300 rounded-[4px] font-semibold text-sm text-black hover:border-[#0019ff] disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
          </div>

          {mySwaps.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[4px] border-2 border-gray-300 p-16 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <ArrowRightLeft className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">No swaps yet</h3>
              <p className="text-sm text-gray-600 mb-6">Create your first cross-chain swap to get started</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('create')}
                className="px-8 py-3 bg-[#0019ff] text-white font-bold rounded-[4px] inline-flex items-center gap-2 hover:bg-[#0015cc]"
              >
                Create Your First Swap
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {mySwaps.map((swap, index) => {
                const chainInfo = CHAIN_INFO[swap.target_chain as keyof typeof CHAIN_INFO] || CHAIN_INFO.ethereum;
                const timeRemaining = formatTimeRemaining(swap.timeout);
                const isExpired = timeRemaining === 'Expired';

                return (
                  <motion.div
                    key={swap.contract_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-[4px] border-2 border-gray-300 p-6 hover:border-[#0019ff] transition-all"
                  >
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-4">
                        <div className="relative w-12 h-12 rounded-[4px] bg-gray-50 border border-gray-200 flex items-center justify-center p-2">
                          <img
                            src={chainInfo.logo}
                            alt={chainInfo.name}
                            className="w-full h-full object-contain"
                            crossOrigin="anonymous"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-black">RAIN</span>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            <span className="font-bold text-black">{chainInfo.name}</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {swap.amount} RAIN → {swap.receiver.slice(0, 12)}...
                          </p>
                        </div>
                      </div>

                      <div className={`px-4 py-1.5 rounded-[4px] text-xs font-bold ${
                        swap.state === 'Locked'
                          ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                          : swap.state === 'Claimed'
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300'
                      }`}>
                        {swap.state}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-5 p-4 bg-gray-50 rounded-[4px] border border-gray-200">
                      <div>
                        <p className="text-xs text-gray-600 mb-1 font-medium">Contract ID</p>
                        <p className="text-xs font-mono text-black">{swap.contract_id.slice(0, 20)}...</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1 font-medium">Time Left</p>
                        <p className={`text-xs font-bold ${isExpired ? 'text-red-600' : 'text-black'}`}>
                          {timeRemaining}
                        </p>
                      </div>
                    </div>

                    {swap.state === 'Locked' && (
                      <div className="space-y-3">
                        {selectedSwapId === swap.contract_id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={claimSecret}
                              onChange={(e) => setClaimSecret(e.target.value)}
                              placeholder="Paste secret to claim..."
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-[4px] font-mono text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-[#0019ff] bg-white"
                            />
                            <div className="flex gap-2">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleClaimSwap(swap.contract_id)}
                                disabled={loading || !claimSecret}
                                className="flex-1 py-3 bg-green-600 text-white font-bold rounded-[4px] hover:bg-green-700 disabled:opacity-50"
                              >
                                {loading ? 'Claiming...' : 'Claim Now'}
                              </motion.button>
                              <button
                                onClick={() => {
                                  setSelectedSwapId('');
                                  setClaimSecret('');
                                }}
                                className="px-5 py-3 bg-white border-2 border-gray-300 text-black font-bold rounded-[4px] hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setSelectedSwapId(swap.contract_id)}
                              className="flex-1 py-3 bg-[#0019ff] text-white font-bold rounded-[4px] hover:bg-[#0015cc] flex items-center justify-center gap-2"
                            >
                              <Check className="w-4 h-4" />
                              Claim Swap
                            </motion.button>
                            {isExpired && (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleRefundSwap(swap.contract_id)}
                                disabled={loading}
                                className="flex-1 py-3 bg-gray-700 text-white font-bold rounded-[4px] hover:bg-gray-800 disabled:opacity-50"
                              >
                                {loading ? 'Refunding...' : 'Refund'}
                              </motion.button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
