'use client';

/**
 * Backup & Export Page
 *
 * Secure page for exporting sensitive wallet data with:
 * - Password re-authentication
 * - Rate limiting with exponential backoff
 * - Export cooldown timers
 * - Audit logging
 * - Security warnings
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/lib/wallet-store';
import { verifyPassword } from '@/lib/auth-manager';
import {
  canExport,
  recordExportAttempt,
  getAuditLog,
  formatRemainingTime,
  type ExportAttempt,
} from '@/lib/export-security';
import {
  ArrowLeft,
  Key,
  Lock,
  AlertTriangle,
  Copy,
  Check,
  Clock,
  Shield,
  Eye,
  EyeOff,
  History,
} from 'lucide-react';

type ExportStep = 'auth' | 'select' | 'export';
type ExportType = 'seed_phrase' | 'private_key';

export default function BackupExportPage() {
  const router = useRouter();
  const { mnemonic, accounts, activeAccountIndex } = useWalletStore();

  // Steps
  const [step, setStep] = useState<ExportStep>('auth');
  const [exportType, setExportType] = useState<ExportType>('seed_phrase');

  // Auth
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Export
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(activeAccountIndex);
  const [copied, setCopied] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [clipboardTimer, setClipboardTimer] = useState<number | null>(null);

  // Security
  const [canExportNow, setCanExportNow] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [remainingTime, setRemainingTime] = useState(0);
  const [auditLog, setAuditLog] = useState<ExportAttempt[]>([]);

  // Redirect if not connected
  useEffect(() => {
    if (!mnemonic) {
      router.push('/');
    }
  }, [mnemonic, router]);

  // Load audit log and check export permissions
  useEffect(() => {
    if (!mnemonic) return;

    const checkPermissions = () => {
      const result = canExport(mnemonic);
      setCanExportNow(result.allowed);
      setBlockReason(result.reason || '');
      setRemainingTime(result.remainingTime || 0);
    };

    checkPermissions();
    const log = getAuditLog(mnemonic, 5);
    setAuditLog(log);

    // Update remaining time every second
    const interval = setInterval(() => {
      checkPermissions();
      if (clipboardTimer !== null && clipboardTimer > 0) {
        setClipboardTimer(clipboardTimer - 1);
      } else if (clipboardTimer === 0) {
        setClipboardTimer(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mnemonic, step, clipboardTimer]);

  // Handle password verification
  const handleVerifyPassword = () => {
    if (!password) {
      setAuthError('Please enter your password');
      return;
    }

    setIsVerifying(true);
    setAuthError('');

    // Small delay for UX
    setTimeout(() => {
      const isValid = verifyPassword(password);

      if (isValid) {
        setStep('select');
        setPassword(''); // Clear password from memory
      } else {
        setAuthError('Incorrect password');
      }

      setIsVerifying(false);
    }, 300);
  };

  // Handle export
  const handleExport = () => {
    if (!mnemonic || !canExportNow) return;

    // Record successful export
    recordExportAttempt(
      mnemonic,
      exportType,
      true,
      exportType === 'private_key' ? selectedAccountIndex : undefined
    );

    // Refresh permissions and audit log
    const result = canExport(mnemonic);
    setCanExportNow(result.allowed);
    setBlockReason(result.reason || '');
    setRemainingTime(result.remainingTime || 0);

    const log = getAuditLog(mnemonic, 5);
    setAuditLog(log);

    setStep('export');
    setShowSensitiveData(false);
  };

  // Handle copy to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setClipboardTimer(60); // 60 second countdown

    setTimeout(() => {
      setCopied(false);
    }, 2000);

    // Auto-clear clipboard after 60 seconds
    setTimeout(() => {
      navigator.clipboard.writeText('');
      setClipboardTimer(null);
    }, 60000);
  };

  // Get export data
  const getExportData = (): string => {
    if (!mnemonic) return '';

    if (exportType === 'seed_phrase') {
      return mnemonic;
    } else {
      const { getPrivateKey } = useWalletStore.getState();
      const privateKey = getPrivateKey(selectedAccountIndex);
      if (privateKey) {
        return Array.from(privateKey)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }
      return '';
    }
  };

  if (!mnemonic) return null;

  // AUTH STEP
  if (step === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold">Backup & Export</h1>
          </div>

          {/* Password Verification */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-white/10 rounded-2xl p-8 mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-blue-500/20 rounded-xl">
                <Lock className="text-blue-400" size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Verify Password</h2>
                <p className="text-white/60">
                  Confirm your identity to continue
                </p>
              </div>
            </div>

            <div className="relative mb-6">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleVerifyPassword()}
                placeholder="Enter your password"
                className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-5 py-4 pr-14 text-white text-lg placeholder-white/40 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                {showPassword ? (
                  <EyeOff size={20} className="text-white/60" />
                ) : (
                  <Eye size={20} className="text-white/60" />
                )}
              </button>
            </div>

            {authError && (
              <div className="bg-red-500/20 border-2 border-red-500/50 rounded-xl p-4 mb-6">
                <p className="text-red-300">{authError}</p>
              </div>
            )}

            <button
              onClick={handleVerifyPassword}
              disabled={isVerifying || !password}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all text-lg"
            >
              {isVerifying ? 'Verifying...' : 'Continue'}
            </button>
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl p-6">
            <div className="flex gap-4">
              <Shield className="text-yellow-400 flex-shrink-0 mt-1" size={24} />
              <div>
                <p className="font-semibold text-yellow-300 mb-2">
                  Enhanced Security
                </p>
                <p className="text-sm text-yellow-200/80">
                  This page is protected by multiple security layers including password
                  verification, rate limiting, and audit logging.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SELECT STEP
  if (step === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setStep('auth')}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold">Select Export Type</h1>
          </div>

          {/* Export Type Selection */}
          <div className="space-y-4 mb-8">
            {/* Seed Phrase Option */}
            <button
              onClick={() => setExportType('seed_phrase')}
              className={`w-full text-left bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 rounded-2xl p-6 transition-all ${
                exportType === 'seed_phrase'
                  ? 'border-red-500/50 ring-2 ring-red-500/30'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-xl ${
                    exportType === 'seed_phrase' ? 'bg-red-500/20' : 'bg-white/5'
                  }`}>
                    <Key className={exportType === 'seed_phrase' ? 'text-red-400' : 'text-white/60'} size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Recovery Phrase</h3>
                    <p className="text-white/60">24-word seed phrase</p>
                  </div>
                </div>
                {exportType === 'seed_phrase' && (
                  <Check className="text-red-400" size={28} />
                )}
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-sm text-red-300">
                  <span className="font-bold">EXTREME CAUTION:</span> Controls ALL accounts. Anyone with this phrase can steal all your funds.
                </p>
              </div>
            </button>

            {/* Private Key Option */}
            <button
              onClick={() => setExportType('private_key')}
              className={`w-full text-left bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 rounded-2xl p-6 transition-all ${
                exportType === 'private_key'
                  ? 'border-orange-500/50 ring-2 ring-orange-500/30'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-xl ${
                    exportType === 'private_key' ? 'bg-orange-500/20' : 'bg-white/5'
                  }`}>
                    <Key className={exportType === 'private_key' ? 'text-orange-400' : 'text-white/60'} size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Private Key</h3>
                    <p className="text-white/60">Single account only</p>
                  </div>
                </div>
                {exportType === 'private_key' && (
                  <Check className="text-orange-400" size={28} />
                )}
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                <p className="text-sm text-orange-300">
                  <span className="font-bold">CAUTION:</span> Controls one account only. More limited than seed phrase.
                </p>
              </div>
            </button>
          </div>

          {/* Account Selection (if private key) */}
          {exportType === 'private_key' && (
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-white/10 rounded-2xl p-6 mb-8">
              <h3 className="text-xl font-bold mb-4">Select Account</h3>
              <div className="space-y-3">
                {accounts.map((account) => (
                  <button
                    key={account.index}
                    onClick={() => setSelectedAccountIndex(account.index)}
                    className={`w-full text-left px-5 py-4 rounded-xl transition-all ${
                      selectedAccountIndex === account.index
                        ? 'bg-orange-500/20 border-2 border-orange-500/50'
                        : 'bg-white/5 border-2 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <p className="font-bold text-lg">{account.name}</p>
                    <p className="text-sm text-white/60 font-mono mt-1">
                      {account.address.slice(0, 12)}...{account.address.slice(-10)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rate Limit / Cooldown Warning */}
          {!canExportNow && remainingTime > 0 && (
            <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl p-6 mb-8">
              <div className="flex gap-4">
                <Clock className="text-yellow-400 flex-shrink-0 mt-1" size={24} />
                <div>
                  <p className="font-semibold text-yellow-300 mb-2">
                    Export Cooldown Active
                  </p>
                  <p className="text-sm text-yellow-200/80 mb-3">{blockReason}</p>
                  <p className="text-lg font-bold text-yellow-400">
                    Time remaining: {formatRemainingTime(remainingTime)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Audit Log */}
          {auditLog.length > 0 && (
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-white/10 rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <History size={22} className="text-white/60" />
                <h3 className="text-xl font-bold">Recent Exports</h3>
              </div>
              <div className="space-y-3">
                {auditLog.map((entry, index) => (
                  <div
                    key={index}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {entry.type === 'seed_phrase' ? 'Seed Phrase' : `Private Key (Account ${(entry.accountIndex ?? 0) + 1})`}
                      </p>
                      <p className="text-sm text-white/60">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={handleExport}
            disabled={!canExportNow}
            className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all text-lg flex items-center justify-center gap-3"
          >
            <AlertTriangle size={22} />
            {canExportNow ? 'Continue to Export' : 'Export Blocked'}
          </button>
        </div>
      </div>
    );
  }

  // EXPORT STEP
  const exportData = getExportData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => {
              setStep('select');
              setShowSensitiveData(false);
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold">
            {exportType === 'seed_phrase' ? 'Recovery Phrase' : 'Private Key'}
          </h1>
        </div>

        {/* Critical Warning */}
        <div className="bg-red-500/20 border-2 border-red-500/50 rounded-2xl p-6 mb-8">
          <div className="flex gap-4 mb-4">
            <AlertTriangle className="text-red-400 flex-shrink-0" size={28} />
            <h3 className="text-2xl font-bold text-red-300">CRITICAL SECURITY WARNING</h3>
          </div>
          <ul className="space-y-3 text-red-200">
            <li className="flex gap-3">
              <span className="text-red-400 text-xl">•</span>
              <span>Never share this with anyone</span>
            </li>
            <li className="flex gap-3">
              <span className="text-red-400 text-xl">•</span>
              <span>Anyone with this can steal ALL your funds</span>
            </li>
            <li className="flex gap-3">
              <span className="text-red-400 text-xl">•</span>
              <span>Store offline in a secure location</span>
            </li>
            <li className="flex gap-3">
              <span className="text-red-400 text-xl">•</span>
              <span>Rainum will NEVER ask for this</span>
            </li>
          </ul>
        </div>

        {/* Data Display */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-white/10 rounded-2xl p-6 mb-8">
          {!showSensitiveData ? (
            <button
              onClick={() => setShowSensitiveData(true)}
              className="w-full flex items-center justify-center gap-3 py-12 text-white/60 hover:text-white transition-all"
            >
              <Eye size={28} />
              <span className="text-lg font-medium">Click to reveal sensitive data</span>
            </button>
          ) : (
            <div>
              {exportType === 'seed_phrase' ? (
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {exportData.split(' ').map((word, index) => (
                    <div
                      key={index}
                      className="bg-gray-900 border border-white/10 rounded-lg p-3 flex items-center gap-2"
                    >
                      <span className="text-sm text-white/40 font-mono">{index + 1}.</span>
                      <span className="text-white font-semibold font-mono">{word}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-900 border border-white/10 rounded-xl p-5 mb-6">
                  <p className="text-sm text-white/60 mb-3">Private Key (Hex)</p>
                  <p className="text-green-400 font-mono break-all leading-relaxed">{exportData}</p>
                </div>
              )}

              <button
                onClick={() => handleCopy(exportData)}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-4 px-6 rounded-xl transition-all text-lg flex items-center justify-center gap-3"
              >
                {copied ? (
                  <>
                    <Check size={22} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={22} />
                    Copy to Clipboard
                  </>
                )}
              </button>

              {clipboardTimer !== null && (
                <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-sm text-blue-300 text-center">
                    Clipboard will auto-clear in <span className="font-bold text-lg">{clipboardTimer}s</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Done Button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-white/10 hover:bg-white/20 border-2 border-white/20 text-white font-bold py-4 px-6 rounded-xl transition-all text-lg"
        >
          Done
        </button>
      </div>
    </div>
  );
}
