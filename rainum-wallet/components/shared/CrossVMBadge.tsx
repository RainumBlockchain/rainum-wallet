/// Cross-VM Call Badge Component for Wallet
///
/// Displays when a transaction involves cross-VM calls

'use client';

import { ArrowLeftRight, Zap } from 'lucide-react';

interface CrossVMBadgeProps {
  sourceVM: 'evm' | 'move';
  targetVM: 'evm' | 'move';
  size?: 'sm' | 'md';
}

export function CrossVMBadge({ sourceVM, targetVM, size = 'sm' }: CrossVMBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  const iconSizes = {
    sm: 10,
    md: 12,
  };

  return (
    <div
      className={`inline-flex items-center gap-1 font-bold rounded transition-all ${sizeClasses[size]} bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-700 border border-purple-300`}
    >
      <ArrowLeftRight size={iconSizes[size]} className="text-purple-600" strokeWidth={2.5} />
      <span className="uppercase text-[9px]">
        {sourceVM}→{targetVM}
      </span>
    </div>
  );
}

export function CrossVMIndicator({ isCrossVM }: { isCrossVM: boolean }) {
  if (!isCrossVM) return null;

  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-gradient-to-r from-purple-500 to-blue-500 text-white">
      <Zap size={9} strokeWidth={3} />
      <span>X-VM</span>
    </span>
  );
}
