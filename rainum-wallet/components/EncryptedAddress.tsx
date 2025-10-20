/**
 * Encrypted Address Display Component
 * Visual styling options for encrypted/private addresses
 */

import { Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface EncryptedAddressProps {
  address: string;
  variant?: 'badge' | 'gradient' | 'minimal' | 'animated';
  size?: 'sm' | 'md' | 'lg';
}

export default function EncryptedAddress({
  address,
  variant = 'gradient',
  size = 'md'
}: EncryptedAddressProps) {
  const isEncrypted = address === '[ENCRYPTED]' || address === '[PRIVATE]';

  if (!isEncrypted) {
    return <span className="font-mono text-sm">{address}</span>;
  }

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSize = {
    sm: 10,
    md: 14,
    lg: 16
  };

  // Badge style - solid background with icon
  if (variant === 'badge') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-purple-100 text-purple-800 font-medium border border-purple-200 ${sizeClasses[size]}`}>
        <Lock size={iconSize[size]} className="opacity-70" />
        {address === '[ENCRYPTED]' ? 'Encrypted' : 'Private'}
      </span>
    );
  }

  // Gradient style - gradient background with shield icon and premium glow animation
  if (variant === 'gradient') {
    return (
      <span className={`inline-flex items-center gap-1 border border-purple-200 font-semibold relative overflow-hidden ${sizeClasses[size]}`} style={{ borderRadius: '4px' }}>
        <span className="absolute inset-0 bg-gradient-to-r from-purple-100 via-blue-100 to-purple-100 bg-[length:200%_100%] animate-[gradient_3s_ease_infinite,glow-pulse_2s_ease-in-out_infinite]"></span>
        <ShieldCheck size={iconSize[size]} className="text-purple-900 relative z-10" />
        <span className="text-purple-900 relative z-10">{address === '[ENCRYPTED]' ? 'Encrypted' : 'Private'}</span>
      </span>
    );
  }

  // Minimal style - subtle with eye-off icon
  if (variant === 'minimal') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-gray-600 font-medium ${sizeClasses[size]}`}>
        <EyeOff size={iconSize[size]} className="opacity-50" />
        <span className="italic opacity-75">{address === '[ENCRYPTED]' ? 'Hidden' : 'Private'}</span>
      </span>
    );
  }

  // Animated style - pulsing gradient
  if (variant === 'animated') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite] text-purple-700 font-semibold border border-purple-300/30 ${sizeClasses[size]}`}>
        <Lock size={iconSize[size]} className="text-purple-500 animate-pulse" />
        {address === '[ENCRYPTED]' ? 'Encrypted' : 'Private'}
      </span>
    );
  }

  return <span className="font-mono text-sm">{address}</span>;
}
