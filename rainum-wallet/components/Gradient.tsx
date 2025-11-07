"use client";

import { ReactNode, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Wallet,
  KeyRound,
  Plus,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import MovingGradient from "@/animata/background/moving-gradient";
import { cn } from "@/lib/utils";
import { handleImportWallet, handleLogin, isAuthenticated, handleCreateWallet, overwriteAndCreateWallet, overwriteAndImportWallet } from "@/lib/auth-flow";
import { hasStoredWallet, saveWallet } from "@/lib/auth-manager";
import { sessionManager } from "@/lib/session-manager";
import { useWalletStore } from "@/lib/wallet-store";
import { createWallet as createWalletAPI } from "@/lib/rainum-api";
import { toast } from "@/lib/toast-store";
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  hasWebAuthnCredential,
  getBiometricName,
  registerWebAuthnCredential,
} from "@/lib/webauthn-manager";
import MnemonicDisplayModal from "./modals/MnemonicDisplayModal";
import ImportSeedModal from "./modals/ImportSeedModal";
import PasswordModal from "./modals/PasswordModal";
import WalletCreationWarningModal from "./modals/WalletCreationWarningModal";

function BentoCard({
  title,
  icon,
  description,
  children,
  gradient,
  className,
}: {
  children?: ReactNode;
  title: ReactNode;
  icon: ReactNode;
  gradient?: string;
  description: ReactNode;
  className?: string;
}) {
  return (
    <MovingGradient
      animated={false}
      className={cn("rounded border-2 border-gray-200 bg-white h-full min-h-[280px] sm:min-h-[300px]", className)}
      gradientClassName={cn("opacity-5", gradient)}
    >
      <section className="flex h-full flex-col p-4 sm:p-6 lg:p-8">
        <header>
          <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
            <div className="rounded-lg sm:rounded-xl bg-white p-1.5 sm:p-2 shadow-sm">
              {icon}
            </div>
            <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">{title}</p>
          </div>
        </header>
        <div className="flex-1 text-sm sm:text-base font-medium text-gray-800 mb-4 sm:mb-6 line-clamp-2">{description}</div>
        <div className="mt-auto">
          {children}
        </div>
      </section>
    </MovingGradient>
  );
}

function CreateWallet({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <BentoCard
      title="Create Wallet"
      icon={<Plus size={32} className="text-blue-600" />}
      description="Generate a new secure wallet"
      className="sm:col-span-1"
      gradient="from-blue-600 via-60% via-blue-500 to-cyan-500"
    >
      <button
        onClick={onClick}
        disabled={loading}
        className="w-full group relative flex cursor-pointer items-center justify-between rounded bg-[#0019ff] p-4 sm:p-5 lg:p-6 h-[80px] sm:h-[90px] lg:h-[100px] text-xl sm:text-2xl lg:text-3xl tracking-tight text-white transition-all hover:shadow-2xl hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 border-0"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-light">New</span>
          <span className="font-bold">Wallet</span>
        </div>
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 items-center justify-center rounded-full border-2 border-white bg-white transition-all duration-700 group-hover:rotate-[360deg]">
          {loading ? (
            <Loader2 size={20} className="text-blue-600 animate-spin sm:hidden" />
          ) : (
            <ArrowRight size={20} className="text-blue-600 sm:hidden" />
          )}
          {loading ? (
            <Loader2 size={24} className="text-blue-600 animate-spin hidden sm:block" />
          ) : (
            <ArrowRight size={24} className="text-blue-600 hidden sm:block" />
          )}
        </div>
        <div className="absolute right-4 top-4 h-3 w-3 rounded-full bg-white opacity-50 transition-all duration-700 group-hover:opacity-25" />
      </button>
    </BentoCard>
  );
}

function ExistingWallet({ onClick, loading, hasWallet }: { onClick: () => void; loading: boolean; hasWallet?: boolean }) {
  return (
    <BentoCard
      title={hasWallet ? "Login" : "Connect Wallet"}
      icon={<Wallet size={32} className="text-gray-900" />}
      description={hasWallet ? "Login with password & biometrics" : "Import wallet using seed phrase"}
      gradient="from-gray-900 via-60% via-gray-700 to-gray-600"
      className="group sm:col-span-1"
    >
      <button
        onClick={onClick}
        disabled={loading}
        className="w-full group relative flex cursor-pointer items-center justify-between rounded bg-gradient-to-br from-gray-900 to-gray-800 p-4 sm:p-5 lg:p-6 h-[80px] sm:h-[90px] lg:h-[100px] text-xl sm:text-2xl lg:text-3xl tracking-tight text-white transition-all hover:shadow-2xl hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 border-0"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-light">{hasWallet ? "Quick" : "Connect"}</span>
          <span className="font-bold">{hasWallet ? "Login" : "Wallet"}</span>
        </div>
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 items-center justify-center rounded-full border-2 border-white bg-white transition-all duration-700 group-hover:rotate-[360deg]">
          {loading ? (
            <Loader2 size={20} className="text-gray-900 animate-spin sm:hidden" />
          ) : (
            <ArrowRight size={20} className="text-gray-900 sm:hidden" />
          )}
          {loading ? (
            <Loader2 size={24} className="text-gray-900 animate-spin hidden sm:block" />
          ) : (
            <ArrowRight size={24} className="text-gray-900 hidden sm:block" />
          )}
        </div>
        <div className="absolute right-4 top-4 h-3 w-3 rounded-full bg-white opacity-50 transition-all duration-700 group-hover:opacity-25" />
      </button>
    </BentoCard>
  );
}

function ImportSeed({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <BentoCard
      title="Import Wallet"
      icon={<KeyRound size={32} className="text-blue-600" />}
      description="Restore wallet with seed phrase"
      gradient="from-blue-600 via-60% via-blue-500 to-cyan-500"
      className="group sm:col-span-1"
    >
      <button
        onClick={onClick}
        disabled={loading}
        className="w-full group relative flex cursor-pointer items-center justify-between rounded bg-[#0019ff] p-4 sm:p-5 lg:p-6 h-[80px] sm:h-[90px] lg:h-[100px] text-xl sm:text-2xl lg:text-3xl tracking-tight text-white transition-all hover:shadow-2xl hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 border-0"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-light">Import</span>
          <span className="font-bold">Seed</span>
        </div>
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 items-center justify-center rounded-full border-2 border-white bg-white transition-all duration-700 group-hover:rotate-[360deg]">
          {loading ? (
            <Loader2 size={20} className="text-blue-600 animate-spin sm:hidden" />
          ) : (
            <ArrowRight size={20} className="text-blue-600 sm:hidden" />
          )}
          {loading ? (
            <Loader2 size={24} className="text-blue-600 animate-spin hidden sm:block" />
          ) : (
            <ArrowRight size={24} className="text-blue-600 hidden sm:block" />
          )}
        </div>
        <div className="absolute right-4 top-4 h-3 w-3 rounded-full bg-white opacity-50 transition-all duration-700 group-hover:opacity-25" />
      </button>
    </BentoCard>
  );
}

export default function Gradient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false); // Start as false - simpler
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showMnemonicModal, setShowMnemonicModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'create' | 'import'; password: string; mnemonic?: string } | null>(null);
  const [walletData, setWalletData] = useState<{ mnemonic: string; address: string } | null>(null);
  const [hasExistingWallet, setHasExistingWallet] = useState(false);

  // Check authentication and wallet on mount
  useEffect(() => {
    // If already authenticated, redirect to dashboard immediately
    if (isAuthenticated()) {
      router.replace('/dashboard');
      return;
    }

    // Check if wallet exists in localStorage
    const walletExists = hasStoredWallet();
    setHasExistingWallet(walletExists);
  }, [router]);

  const handleCreateWalletClick = () => {
    // First show warning modal
    setShowWarningModal(true);
  };

  const handleWarningContinue = async () => {
    setShowWarningModal(false);
    setLoading(true);

    try {
      // Generate wallet
      const { address, mnemonic } = await createWalletAPI();

      // Store wallet data to show mnemonic modal
      setWalletData({ mnemonic, address });

      // Show mnemonic modal so user can save their seed phrase
      setShowMnemonicModal(true);

      setLoading(false);
    } catch (error: any) {
      console.error("Failed to create wallet:", error);
      toast.error("Wallet Creation Failed", error.message || "Failed to create wallet");
      setLoading(false);
    }
  };

  const handlePasswordSet = async (password: string) => {
    if (!walletData) return;

    setShowPasswordModal(false);
    setLoading(true);

    try {
      // Save encrypted wallet to localStorage
      saveWallet(walletData.address, walletData.mnemonic, password);

      // Register WebAuthn credential if supported
      if (isWebAuthnSupported()) {
        const isAvailable = await isPlatformAuthenticatorAvailable();
        if (isAvailable) {
          const biometricName = getBiometricName();
          toast.info('Setup Biometrics', `Please authenticate with ${biometricName} for future quick access`);

          const credentialId = await registerWebAuthnCredential(
            walletData.address,
            `Rainum Wallet (${walletData.address.slice(0, 8)}...)`
          );

          if (!credentialId) {
            toast.warning('Biometric Setup Skipped', 'You can still login with password');
          } else {
            toast.success('Biometric Enabled', `${biometricName} has been set up for quick login`);
          }
        }
      }

      // Create session and log in
      handleFinalLogin();
    } catch (error: any) {
      console.error("Failed to save wallet:", error);
      toast.error("Failed to Save Wallet", error.message || "Failed to save wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleImportWalletSubmit = async (mnemonic: string, password: string) => {
    setShowImportModal(false);
    setLoading(true);

    try {
      await handleImportWallet(mnemonic, password, router);
      // handleImportWallet will redirect to dashboard on success
    } catch (error: any) {
      // Check if error is because wallet already exists
      if (error.code === 'WALLET_EXISTS' && error.action === 'import') {
        setPendingAction({ type: 'import', password, mnemonic });
        setShowOverwriteModal(true);
      } else {
        console.error("Failed to import wallet:", error);
        toast.error("Import Failed", error.message || "Failed to import wallet");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  const handleLoginSubmit = async (password: string) => {
    setShowLoginModal(false);
    setLoading(true);

    try {
      const redirectTo = searchParams.get('redirectTo') || undefined;

      // Try WebAuthn first if available, then password
      await handleLogin(password, router, redirectTo, true);
      // handleLogin will redirect to dashboard on success
    } catch (error) {
      console.error("Failed to login:", error);
      toast.error("Login Failed", error instanceof Error ? error.message : "Failed to login");
    } finally {
      // Always reset loading state, even if redirect happens
      setLoading(false);
    }
  };

  // NEW: Handle biometric-only login (triggered on page load if biometric is available)
  const handleBiometricOnlyLogin = async () => {
    try {
      // Check if WebAuthn credential exists
      if (!hasWebAuthnCredential()) {
        return; // No biometric registered, show normal login
      }

      const biometricName = getBiometricName();
      toast.info('Quick Login', `Use ${biometricName} for quick access`);

      setLoading(true);

      // For now, we still need password for decryption
      // In future, we could encrypt mnemonic with WebAuthn
      // For now, just show that biometric is available
      setShowLoginModal(true);
      setLoading(false);
    } catch (error) {
      console.error('Biometric check failed:', error);
    }
  };

  const handleMnemonicConfirm = () => {
    if (!walletData) return;

    // After verification, show password modal to encrypt and save wallet
    setShowMnemonicModal(false);
    setShowPasswordModal(true);
  };

  const handleOverwriteConfirm = async () => {
    setShowOverwriteModal(false);
    if (!pendingAction) return;

    setLoading(true);
    try {
      if (pendingAction.type === 'import' && pendingAction.mnemonic) {
        await overwriteAndImportWallet(pendingAction.mnemonic, pendingAction.password, router);
      } else if (pendingAction.type === 'create') {
        await overwriteAndCreateWallet(pendingAction.password, router);
      }
      // Will redirect to dashboard on success
    } catch (error: any) {
      console.error("Failed to overwrite wallet:", error);
      toast.error("Failed", error.message || "Failed to complete operation");
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  };

  const handleOverwriteCancel = () => {
    setShowOverwriteModal(false);
    setPendingAction(null);
  };

  const handleQuickTestWallet = async () => {
    // Only works in development
    if (process.env.NODE_ENV !== 'development') {
      toast.error('Not Available', 'Quick test wallet only available in development');
      return;
    }

    setLoading(true);

    try {
      // Generate wallet
      const { address, mnemonic } = await createWalletAPI();

      // Skip all modals and create wallet with password "testtest"
      const password = 'testtest';

      // Save wallet with password
      await saveWallet(address, mnemonic, password);

      // Create session (await for HttpOnly cookie)
      await sessionManager.createSession(address);

      // Connect wallet in store
      await useWalletStore.getState().connect(address, mnemonic);

      // Start session monitoring
      sessionManager.startSessionMonitoring(async () => {
        sessionManager.stopSessionMonitoring();
        await sessionManager.destroySession(false);
        useWalletStore.getState().disconnect();
        router.replace('/');
      });

      toast.success('Test Wallet Created', `Password: "testtest" | Address: ${address.slice(0, 10)}...`);

      // Navigate to dashboard
      router.replace('/dashboard');
    } catch (error: any) {
      console.error('Failed to create quick test wallet:', error);
      toast.error('Failed', error.message || 'Failed to create test wallet');
      setLoading(false);
    }
  };

  const handleFinalLogin = async () => {
    if (!walletData) return;

    // Create session (await for HttpOnly cookie)
    await sessionManager.createSession(walletData.address);

    // Update wallet store
    useWalletStore.getState().connect(walletData.address, walletData.mnemonic);

    // Start session monitoring
    sessionManager.startSessionMonitoring(async () => {
      // Auto logout on session expiry
      sessionManager.stopSessionMonitoring();
      await sessionManager.destroySession(false); // auto-logout
      useWalletStore.getState().disconnect();
      router.replace('/');
    });

    toast.success('Wallet Created', 'Your wallet has been created successfully');

    // Navigate to dashboard
    router.replace('/dashboard');
  };

  return (
    <>
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 mt-24 sm:mt-0">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-3">
          <CreateWallet onClick={handleCreateWalletClick} loading={loading} />

          {/* Show Login button if wallet exists, otherwise show Import */}
          <ExistingWallet
            onClick={hasExistingWallet ? handleLoginClick : () => setShowImportModal(true)}
            loading={loading}
            hasWallet={hasExistingWallet}
          />

          <ImportSeed onClick={() => setShowImportModal(true)} loading={loading} />
        </div>

        {/* Quick Test Wallet Button - Development Only */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleQuickTestWallet}
              disabled={loading}
              className="px-4 py-2 bg-gray-800 text-white text-sm font-mono rounded border-2 border-gray-600 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : 'hidden'}`} />
              {loading ? 'Creating...' : '[DEV] Quick Test Wallet (password: "testtest")'}
            </button>
          </div>
        )}
      </div>

      {/* Warning Modal (first step when creating wallet) */}
      {showWarningModal && (
        <WalletCreationWarningModal
          onClose={() => setShowWarningModal(false)}
          onContinue={handleWarningContinue}
        />
      )}

      {/* Password Modal for creating new wallet */}
      {showPasswordModal && (
        <PasswordModal
          title="Set Password"
          description="Create a secure password to encrypt your wallet. This password will be required to access your wallet."
          onClose={() => setShowPasswordModal(false)}
          onSubmit={handlePasswordSet}
          isCreatingPassword={true}
        />
      )}

      {/* Login Modal for existing wallet */}
      {showLoginModal && (
        <PasswordModal
          title="Enter Password"
          description="Enter your password to unlock your wallet."
          onClose={() => setShowLoginModal(false)}
          onSubmit={handleLoginSubmit}
          isCreatingPassword={false}
        />
      )}

      {/* Mnemonic Display Modal (after wallet creation) */}
      {showMnemonicModal && walletData && (
        <MnemonicDisplayModal
          mnemonic={walletData.mnemonic}
          address={walletData.address}
          onClose={() => setShowMnemonicModal(false)}
          onConfirm={handleMnemonicConfirm}
        />
      )}

      {/* Import Seed Modal (now includes password input) */}
      {showImportModal && (
        <ImportSeedModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportWalletSubmit}
        />
      )}

      {/* Overwrite Wallet Confirmation Modal */}
      {showOverwriteModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
            {/* Warning Icon */}
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-100">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-3">
              Wallet Already Exists
            </h2>

            {/* Description */}
            <p className="text-center text-gray-600 mb-6">
              {pendingAction?.type === 'import'
                ? 'A wallet already exists. Importing will overwrite the existing one. Continue?'
                : 'A wallet already exists. Creating a new wallet will overwrite the existing one. Continue?'
              }
            </p>

            {/* Warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Warning: This action cannot be undone!
              </p>
              <p className="text-xs text-red-700 mt-1">
                Make sure you have backed up your current wallet's seed phrase before proceeding.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleOverwriteCancel}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOverwriteConfirm}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
