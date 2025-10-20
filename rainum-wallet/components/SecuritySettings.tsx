/**
 * Security Settings Component
 * Editable security settings for wallet with in-place editing
 */

'use client';

import { useState, useEffect } from 'react';
import { Clock, ShieldAlert, AlertTriangle, Shield, Edit2, X, Check, Key, FileDown, Upload, CheckCircle } from 'lucide-react';
import { getWalletSettings, saveWalletSettings, type WalletSettings } from '@/lib/wallet-settings';
import { toast } from '@/lib/toast-store';
import { getAuditLogStats } from '@/lib/audit-log';
import { changePassword, exportWalletBackup, importWalletBackup, verifyWalletBackup } from '@/lib/auth-manager';

export default function SecuritySettings() {
  const [settings, setSettings] = useState<WalletSettings | null>(null);
  const [editingSessionTimeout, setEditingSessionTimeout] = useState(false);
  const [editingRateLimit, setEditingRateLimit] = useState(false);
  const [editingTransactionLimits, setEditingTransactionLimits] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [auditStats, setAuditStats] = useState<any>(null);

  // Temporary state for editing
  const [tempSessionTimeout, setTempSessionTimeout] = useState(30);
  const [tempSessionEnabled, setTempSessionEnabled] = useState(true);
  const [tempRateLimitEnabled, setTempRateLimitEnabled] = useState(true);
  const [tempMaxAttempts, setTempMaxAttempts] = useState(5);
  const [tempLockoutDuration, setTempLockoutDuration] = useState(15);
  const [tempTxLimitsEnabled, setTempTxLimitsEnabled] = useState(true);
  const [tempWarningThreshold, setTempWarningThreshold] = useState(100000);
  const [tempCriticalThreshold, setTempCriticalThreshold] = useState(1000000);

  // Change password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Backup import state
  const [importingBackup, setImportingBackup] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [importError, setImportError] = useState('');

  // Backup verification state
  const [verifyingBackup, setVerifyingBackup] = useState(false);
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState<any>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    const stats = getAuditLogStats();
    setAuditStats(stats);
  }, []);

  const loadSettings = () => {
    const currentSettings = getWalletSettings();
    setSettings(currentSettings);
  };

  const handleEditSessionTimeout = () => {
    if (settings) {
      setTempSessionTimeout(settings.security.sessionTimeout);
      setTempSessionEnabled(settings.security.sessionTimeoutEnabled);
      setEditingSessionTimeout(true);
    }
  };

  const handleSaveSessionTimeout = () => {
    if (settings) {
      const newSettings = {
        ...settings,
        security: {
          ...settings.security,
          sessionTimeout: tempSessionTimeout,
          sessionTimeoutEnabled: tempSessionEnabled,
        },
      };
      saveWalletSettings(newSettings);
      setSettings(newSettings);
      setEditingSessionTimeout(false);
      toast.success('Settings Updated', `Session timeout ${tempSessionEnabled ? `set to ${tempSessionTimeout} minutes` : 'disabled'}`);
    }
  };

  const handleEditRateLimit = () => {
    if (settings) {
      setTempRateLimitEnabled(settings.security.loginRateLimit.enabled);
      setTempMaxAttempts(settings.security.loginRateLimit.maxAttempts);
      setTempLockoutDuration(settings.security.loginRateLimit.lockoutDuration);
      setEditingRateLimit(true);
    }
  };

  const handleSaveRateLimit = () => {
    if (settings) {
      const newSettings = {
        ...settings,
        security: {
          ...settings.security,
          loginRateLimit: {
            enabled: tempRateLimitEnabled,
            maxAttempts: tempMaxAttempts,
            lockoutDuration: tempLockoutDuration,
          },
        },
      };
      saveWalletSettings(newSettings);
      setSettings(newSettings);
      setEditingRateLimit(false);
      toast.success('Settings Updated', `Rate limiting ${tempRateLimitEnabled ? 'updated' : 'disabled'}`);
    }
  };

  const handleEditTransactionLimits = () => {
    if (settings) {
      setTempTxLimitsEnabled(settings.security.transactionLimits.enabled);
      setTempWarningThreshold(settings.security.transactionLimits.warningThreshold);
      setTempCriticalThreshold(settings.security.transactionLimits.criticalThreshold);
      setEditingTransactionLimits(true);
    }
  };

  const handleSaveTransactionLimits = () => {
    if (settings) {
      const newSettings = {
        ...settings,
        security: {
          ...settings.security,
          transactionLimits: {
            enabled: tempTxLimitsEnabled,
            warningThreshold: tempWarningThreshold,
            criticalThreshold: tempCriticalThreshold,
          },
        },
      };
      saveWalletSettings(newSettings);
      setSettings(newSettings);
      setEditingTransactionLimits(false);
      toast.success('Settings Updated', `Transaction limits ${tempTxLimitsEnabled ? 'updated' : 'disabled'}`);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    // Validate inputs
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (oldPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setIsChangingPassword(true);

    try {
      const success = changePassword(oldPassword, newPassword);
      if (success) {
        toast.success('Password Changed', 'Your wallet password has been updated successfully');
        setEditingPassword(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setEditingPassword(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  // Export wallet backup to file
  const handleExportBackup = () => {
    try {
      const backupJson = exportWalletBackup();

      // Create blob and download
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rainum-wallet-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Backup Exported', 'Your wallet backup has been downloaded successfully');
    } catch (error: any) {
      toast.error('Export Failed', error.message || 'Failed to export backup');
      console.error(error);
    }
  };

  // Import wallet backup from file
  const handleImportBackup = async () => {
    setImportError('');

    if (!importFile) {
      setImportError('Please select a backup file');
      return;
    }

    if (!importPassword) {
      setImportError('Password is required');
      return;
    }

    setImportingBackup(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const backupJson = event.target?.result as string;
          const success = importWalletBackup(backupJson, importPassword);

          if (success) {
            toast.success('Backup Imported', 'Your wallet has been restored successfully. Reloading...');
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        } catch (error: any) {
          setImportError(error.message || 'Failed to import backup');
          setImportingBackup(false);
        }
      };
      reader.onerror = () => {
        setImportError('Failed to read file');
        setImportingBackup(false);
      };
      reader.readAsText(importFile);
    } catch (error: any) {
      setImportError(error.message || 'Failed to import backup');
      setImportingBackup(false);
    }
  };

  const handleCancelImportBackup = () => {
    setImportingBackup(false);
    setImportFile(null);
    setImportPassword('');
    setImportError('');
  };

  // Verify wallet backup
  const handleVerifyBackup = async () => {
    setVerifyError('');
    setVerifySuccess(null);

    if (!verifyFile) {
      setVerifyError('Please select a backup file');
      return;
    }

    if (!verifyPassword) {
      setVerifyError('Password is required');
      return;
    }

    setVerifyingBackup(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const backupJson = event.target?.result as string;
          const result = verifyWalletBackup(backupJson, verifyPassword);

          if (result.valid) {
            setVerifySuccess({
              address: result.address,
              createdAt: result.createdAt,
              version: result.version,
            });
            toast.success('Backup Verified', 'This backup is valid and can be imported successfully');
          } else {
            setVerifyError(result.error || 'Backup verification failed');
          }
          setVerifyingBackup(false);
        } catch (error: any) {
          setVerifyError(error.message || 'Failed to verify backup');
          setVerifyingBackup(false);
        }
      };
      reader.onerror = () => {
        setVerifyError('Failed to read file');
        setVerifyingBackup(false);
      };
      reader.readAsText(verifyFile);
    } catch (error: any) {
      setVerifyError(error.message || 'Failed to verify backup');
      setVerifyingBackup(false);
    }
  };

  const handleCancelVerifyBackup = () => {
    setVerifyingBackup(false);
    setVerifyFile(null);
    setVerifyPassword('');
    setVerifyError('');
    setVerifySuccess(null);
  };

  if (!settings) {
    return <div className="text-center text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Session Auto-Lock Card */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-sm">
                <Clock className="w-6 h-6 text-[#0019ff]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Session Auto-Lock</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Your session will automatically lock after inactivity for security
                </p>
                {!editingSessionTimeout ? (
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      settings.security.sessionTimeoutEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {settings.security.sessionTimeoutEnabled ? '✓ ENABLED' : '✗ DISABLED'}
                    </div>
                    <span className="text-xs text-gray-500">
                      {settings.security.sessionTimeoutEnabled
                        ? `${settings.security.sessionTimeout} minutes timeout`
                        : 'No timeout'}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 bg-white p-4 rounded-lg border border-blue-200 mt-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={tempSessionEnabled}
                        onChange={(e) => setTempSessionEnabled(e.target.checked)}
                        className="w-4 h-4 text-[#0019ff] rounded"
                      />
                      <label className="text-sm font-semibold text-gray-700">Enable session timeout</label>
                    </div>
                    {tempSessionEnabled && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Timeout (minutes)
                        </label>
                        <select
                          value={tempSessionTimeout}
                          onChange={(e) => setTempSessionTimeout(Number(e.target.value))}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0019ff] outline-none"
                        >
                          <option value={5}>5 minutes</option>
                          <option value={10}>10 minutes</option>
                          <option value={15}>15 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 hour</option>
                          <option value={120}>2 hours</option>
                        </select>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveSessionTimeout}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0019ff] text-white rounded-lg font-semibold hover:bg-[#0028ff] transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingSessionTimeout(false)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {!editingSessionTimeout && (
              <button
                onClick={handleEditSessionTimeout}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <Edit2 className="w-5 h-5 text-blue-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Rate Limiting Card */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="bg-white p-3 rounded-xl border border-orange-200 shadow-sm">
                <ShieldAlert className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Login Rate Limiting</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Account locks after failed login attempts
                </p>
                {!editingRateLimit ? (
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      settings.security.loginRateLimit.enabled ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {settings.security.loginRateLimit.enabled ? '✓ ACTIVE' : '✗ DISABLED'}
                    </div>
                    <span className="text-xs text-gray-500">
                      {settings.security.loginRateLimit.enabled
                        ? `${settings.security.loginRateLimit.maxAttempts} attempts / ${settings.security.loginRateLimit.lockoutDuration} min lockout`
                        : 'No limit'}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 bg-white p-4 rounded-lg border border-orange-200 mt-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={tempRateLimitEnabled}
                        onChange={(e) => setTempRateLimitEnabled(e.target.checked)}
                        className="w-4 h-4 text-[#0019ff] rounded"
                      />
                      <label className="text-sm font-semibold text-gray-700">Enable rate limiting</label>
                    </div>
                    {tempRateLimitEnabled && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Max failed attempts
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={tempMaxAttempts}
                            onChange={(e) => setTempMaxAttempts(Number(e.target.value))}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0019ff] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Lockout duration (minutes)
                          </label>
                          <input
                            type="number"
                            min="5"
                            max="60"
                            value={tempLockoutDuration}
                            onChange={(e) => setTempLockoutDuration(Number(e.target.value))}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0019ff] outline-none"
                          />
                        </div>
                      </>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveRateLimit}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0019ff] text-white rounded-lg font-semibold hover:bg-[#0028ff] transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingRateLimit(false)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {!editingRateLimit && (
              <button
                onClick={handleEditRateLimit}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <Edit2 className="w-5 h-5 text-orange-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Limits Card */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-sm">
                <AlertTriangle className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Transaction Amount Limits</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Extra confirmation required for large transactions to prevent mistakes
                </p>
                {!editingTransactionLimits ? (
                  <div className="space-y-2">
                    {settings.security.transactionLimits.enabled ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">
                            ⚠ {settings.security.transactionLimits.warningThreshold.toLocaleString()}+ RAIN
                          </div>
                          <span className="text-xs text-gray-500">Warning confirmation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                            🚨 {settings.security.transactionLimits.criticalThreshold.toLocaleString()}+ RAIN
                          </div>
                          <span className="text-xs text-gray-500">Critical confirmation</span>
                        </div>
                      </>
                    ) : (
                      <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold inline-block">
                        ✗ DISABLED
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 bg-white p-4 rounded-lg border border-purple-200 mt-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={tempTxLimitsEnabled}
                        onChange={(e) => setTempTxLimitsEnabled(e.target.checked)}
                        className="w-4 h-4 text-[#0019ff] rounded"
                      />
                      <label className="text-sm font-semibold text-gray-700">Enable transaction limits</label>
                    </div>
                    {tempTxLimitsEnabled && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Warning threshold (RAIN)
                          </label>
                          <input
                            type="number"
                            min="1000"
                            step="1000"
                            value={tempWarningThreshold}
                            onChange={(e) => setTempWarningThreshold(Number(e.target.value))}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0019ff] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Critical threshold (RAIN)
                          </label>
                          <input
                            type="number"
                            min="10000"
                            step="10000"
                            value={tempCriticalThreshold}
                            onChange={(e) => setTempCriticalThreshold(Number(e.target.value))}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0019ff] outline-none"
                          />
                        </div>
                      </>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveTransactionLimits}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0019ff] text-white rounded-lg font-semibold hover:bg-[#0028ff] transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTransactionLimits(false)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {!editingTransactionLimits && (
              <button
                onClick={handleEditTransactionLimits}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <Edit2 className="w-5 h-5 text-purple-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="bg-white p-3 rounded-xl border border-green-200 shadow-sm">
                <Key className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Change Password</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Update your wallet password for enhanced security
                </p>
                {!editingPassword ? (
                  <div className="flex items-center gap-2">
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                      🔒 ENCRYPTED
                    </div>
                    <span className="text-xs text-gray-500">
                      Your wallet is password-protected
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 bg-white p-4 rounded-lg border border-green-200 mt-2">
                    {passwordError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-700">{passwordError}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Enter current password"
                        disabled={isChangingPassword}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0019ff] outline-none disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 8 characters)"
                        disabled={isChangingPassword}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0019ff] outline-none disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        disabled={isChangingPassword}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0019ff] outline-none disabled:bg-gray-50"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleChangePassword}
                        disabled={isChangingPassword}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0019ff] text-white rounded-lg font-semibold hover:bg-[#0028ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="w-4 h-4" />
                        {isChangingPassword ? 'Changing...' : 'Change Password'}
                      </button>
                      <button
                        onClick={handleCancelPasswordChange}
                        disabled={isChangingPassword}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {!editingPassword && (
              <button
                onClick={() => setEditingPassword(true)}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <Edit2 className="w-5 h-5 text-green-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Backup & Recovery Card */}
      <div className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 rounded-xl overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileDown className="w-5 h-5 text-purple-600" />
            Backup & Recovery
          </h3>

          {/* Export Backup Button */}
          <button
            onClick={handleExportBackup}
            className="w-full mb-3 flex items-center justify-between bg-white hover:bg-gray-50 rounded-lg p-4 transition-all border-2 border-purple-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileDown className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Export Backup File</p>
                <p className="text-xs text-gray-600">Download encrypted wallet backup</p>
              </div>
            </div>
          </button>

          {/* Import Backup Section */}
          <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-gray-900">Import Backup File</p>
                <p className="text-xs text-gray-600">Restore wallet from backup file</p>
              </div>
            </div>

            {/* File Input */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Backup File
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImportFile(e.target.files[0]);
                      setImportError('');
                    }
                  }}
                  disabled={importingBackup}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-600 disabled:opacity-50"
                />
                {importFile && (
                  <p className="text-xs text-gray-600 mt-1">Selected: {importFile.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)}
                  placeholder="Enter backup password"
                  disabled={importingBackup}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 outline-none disabled:bg-gray-50"
                />
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Importing a backup will replace your current wallet. Make sure you have backed up your current wallet first!
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-700">{importError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleImportBackup}
                  disabled={importingBackup || !importFile || !importPassword}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0019ff] text-white rounded-lg font-semibold hover:bg-[#0028ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  {importingBackup ? 'Importing...' : 'Import Backup'}
                </button>
                {(importFile || importPassword) && !importingBackup && (
                  <button
                    onClick={handleCancelImportBackup}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Verify Backup Section */}
          <div className="bg-white rounded-lg p-4 border-2 border-blue-200 mt-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-gray-900">Verify Backup File</p>
                <p className="text-xs text-gray-600">Check backup validity without importing</p>
              </div>
            </div>

            {/* Success Message */}
            {verifySuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                <p className="text-sm font-bold text-green-700 mb-2">✓ Backup Verified Successfully</p>
                <div className="space-y-1 text-xs text-green-600">
                  <p>Address: {verifySuccess.address?.slice(0, 10)}...{verifySuccess.address?.slice(-8)}</p>
                  <p>Created: {verifySuccess.createdAt ? new Date(verifySuccess.createdAt).toLocaleDateString() : 'N/A'}</p>
                  <p>Version: {verifySuccess.version || 1}</p>
                </div>
              </div>
            )}

            {/* File Input */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Backup File
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setVerifyFile(e.target.files[0]);
                      setVerifyError('');
                      setVerifySuccess(null);
                    }
                  }}
                  disabled={verifyingBackup}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 disabled:opacity-50"
                />
                {verifyFile && (
                  <p className="text-xs text-gray-600 mt-1">Selected: {verifyFile.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  placeholder="Enter backup password"
                  disabled={verifyingBackup}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none disabled:bg-gray-50"
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    Verification checks if your backup file is valid and can be decrypted without actually importing it.
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {verifyError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-700">{verifyError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleVerifyBackup}
                  disabled={verifyingBackup || !verifyFile || !verifyPassword}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0019ff] text-white rounded-lg font-semibold hover:bg-[#0028ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  {verifyingBackup ? 'Verifying...' : 'Verify Backup'}
                </button>
                {(verifyFile || verifyPassword || verifySuccess) && !verifyingBackup && (
                  <button
                    onClick={handleCancelVerifyBackup}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Stats */}
      {auditStats && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0019ff]" />
            Security Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-green-700 mb-1">Successful Logins</p>
              <p className="text-2xl font-bold text-green-600">{auditStats.byType.login_success || 0}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-red-700 mb-1">Failed Attempts</p>
              <p className="text-2xl font-bold text-red-600">{auditStats.failedLogins || 0}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-orange-700 mb-1">Blocked Attempts</p>
              <p className="text-2xl font-bold text-orange-600">{auditStats.blockedAttempts || 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
