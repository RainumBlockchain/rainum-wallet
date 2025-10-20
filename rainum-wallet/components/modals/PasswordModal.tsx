/**
 * Password Modal Component
 * Used for both setting password (wallet creation) and entering password (login)
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Lock, AlertCircle, ShieldAlert } from 'lucide-react';
import { isLoginBlocked, getRemainingAttempts, getLockoutTimeRemainingFormatted } from '@/lib/login-rate-limiter';

interface PasswordModalProps {
  title: string;
  description: string;
  onClose: () => void;
  onSubmit: (password: string) => void;
  isCreatingPassword: boolean; // true = set new password, false = login
}

export default function PasswordModal({
  title,
  description,
  onClose,
  onSubmit,
  isCreatingPassword
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  // Rate limiting state (only for login)
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [lockoutTime, setLockoutTime] = useState('');

  // Check rate limit status on mount and update periodically (only for login)
  useEffect(() => {
    if (!isCreatingPassword) {
      const updateRateLimitStatus = () => {
        setIsBlocked(isLoginBlocked());
        setRemainingAttempts(getRemainingAttempts());
        setLockoutTime(getLockoutTimeRemainingFormatted());
      };

      updateRateLimitStatus();

      // Update every second if blocked
      const interval = setInterval(updateRateLimitStatus, 1000);
      return () => clearInterval(interval);
    }
  }, [isCreatingPassword]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!password) {
      setError('Password is required');
      return;
    }

    if (isCreatingPassword) {
      // Creating new password - validate strength and match
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    // Submit password
    onSubmit(password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl my-8 max-h-[90vh] overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0019ff]/5 via-transparent to-[#61dca3]/5 pointer-events-none" />

        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#0019ff] via-[#0019ff] to-[#0028ff] px-8 py-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-2xl blur"></div>
                <div className="relative w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <Lock className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
                <p className="text-white/70 text-xs mt-0.5">Secure authentication</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="relative p-8 space-y-6">
          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>

          {/* Password Input */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-800">
              Password
            </label>
            <div className="relative group">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isCreatingPassword ? 'Create a strong password' : 'Enter your password'}
                className="w-full px-5 py-4 pr-14 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0019ff]/20 focus:border-[#0019ff] outline-none transition-all text-gray-900 bg-white group-hover:border-gray-300"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Password strength indicator (only when creating) */}
            {isCreatingPassword && password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  <div className={`h-1 flex-1 rounded ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-200'}`} />
                  <div className={`h-1 flex-1 rounded ${password.length >= 12 ? 'bg-green-500' : 'bg-gray-200'}`} />
                  <div className={`h-1 flex-1 rounded ${password.length >= 16 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'bg-green-500' : 'bg-gray-200'}`} />
                </div>
                <p className="text-xs text-gray-500">
                  {password.length < 8 && 'Weak - Use at least 8 characters'}
                  {password.length >= 8 && password.length < 12 && 'Good - Consider making it longer'}
                  {password.length >= 12 && 'Strong password!'}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password Input (only when creating) */}
          {isCreatingPassword && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-800">
                Confirm Password
              </label>
              <div className="relative group">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full px-5 py-4 pr-14 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0019ff]/20 focus:border-[#0019ff] outline-none transition-all text-gray-900 bg-white group-hover:border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Rate Limit Warnings (only for login) */}
          {!isCreatingPassword && (
            <>
              {/* Account Locked Warning */}
              {isBlocked && (
                <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-900 mb-1">Account Locked</p>
                    <p className="text-xs text-red-700">
                      Too many failed login attempts. Please try again in <span className="font-bold">{lockoutTime}</span>.
                    </p>
                  </div>
                </div>
              )}

              {/* Low Attempts Warning */}
              {!isBlocked && remainingAttempts <= 3 && remainingAttempts > 0 && (
                <div className={`border-2 rounded-xl p-4 flex items-start gap-3 ${
                  remainingAttempts === 1
                    ? 'bg-red-50 border-red-400'
                    : remainingAttempts === 2
                    ? 'bg-orange-50 border-orange-400'
                    : 'bg-yellow-50 border-yellow-400'
                }`}>
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    remainingAttempts === 1
                      ? 'text-red-600'
                      : remainingAttempts === 2
                      ? 'text-orange-600'
                      : 'text-yellow-600'
                  }`} />
                  <div>
                    <p className={`text-sm font-semibold mb-1 ${
                      remainingAttempts === 1
                        ? 'text-red-900'
                        : remainingAttempts === 2
                        ? 'text-orange-900'
                        : 'text-yellow-900'
                    }`}>
                      Warning: {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                    </p>
                    <p className={`text-xs ${
                      remainingAttempts === 1
                        ? 'text-red-700'
                        : remainingAttempts === 2
                        ? 'text-orange-700'
                        : 'text-yellow-700'
                    }`}>
                      {remainingAttempts === 1
                        ? 'Your account will be locked for 15 minutes after one more failed attempt.'
                        : `After ${remainingAttempts} more failed attempts, your account will be locked for 15 minutes.`
                      }
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Security Notice (only when creating) */}
          {isCreatingPassword && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-900 leading-relaxed">
                <strong className="font-semibold">Important:</strong> This password encrypts your wallet.
                If you lose it, you won't be able to access your funds.
                Make sure to remember it or store it securely!
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isCreatingPassword && isBlocked}
              className={`flex-1 px-6 py-4 text-white rounded-xl font-semibold transition-all ${
                !isCreatingPassword && isBlocked
                  ? 'bg-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-[#0019ff] to-[#0028ff] hover:shadow-lg hover:shadow-[#0019ff]/30'
              }`}
            >
              {!isCreatingPassword && isBlocked
                ? `Locked (${lockoutTime})`
                : isCreatingPassword
                ? 'Set Password'
                : 'Unlock Wallet'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
