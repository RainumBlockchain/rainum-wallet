"use client";

import { useState } from "react";
import { Loader2, KeyRound, X, Eye, EyeOff, Lock } from "lucide-react";

interface ImportSeedModalProps {
  onClose: () => void;
  onImport: (mnemonic: string, password: string) => Promise<void>;
}

export default function ImportSeedModal({
  onClose,
  onImport,
}: ImportSeedModalProps) {
  const [words, setWords] = useState<string[]>(Array(24).fill("")); // Changed from 12 to 24
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = value.toLowerCase().trim();
    setWords(newWords);
    setError("");
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");

    // Remove numbers and dots from the beginning of each line (e.g., "1. fantasy" -> "fantasy")
    const cleanedText = pastedText
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0)
      .join(' ');

    const pastedWords = cleanedText.trim().split(/\s+/);

    if (pastedWords.length === 24 || pastedWords.length === 12) {
      // Support both 24-word (new) and 12-word (legacy) mnemonics
      const targetLength = pastedWords.length === 24 ? 24 : 12;
      setWords(Array(24).fill(""));
      const newWords = Array(24).fill("");
      pastedWords.forEach((word, i) => {
        if (i < targetLength) {
          newWords[i] = word.toLowerCase().trim();
        }
      });
      setWords(newWords);
      setError("");
    } else {
      setError(`Please paste exactly 24 words (or 12 for legacy wallets). Got ${pastedWords.length}`);
    }
  };

  const handleSubmit = async () => {
    // Filter out empty words and join
    const filledWords = words.filter(w => w.trim() !== "");
    const mnemonic = filledWords.join(" ").trim();

    // Validate seed phrase - must be 12 or 24 words
    if (filledWords.length !== 12 && filledWords.length !== 24) {
      setError(`Please enter exactly 12 or 24 words. You have ${filledWords.length} words.`);
      return;
    }

    // Ensure mnemonic is not empty
    if (!mnemonic) {
      setError("Please enter your recovery phrase");
      return;
    }

    // Validate password
    if (!password) {
      setError("Password is required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onImport(mnemonic, password);
    } catch (err: any) {
      // Let WALLET_EXISTS be handled by parent without showing error
      if (err.code === 'WALLET_EXISTS') {
        setLoading(false);
        throw err; // Re-throw to let parent handle the overwrite modal
      }
      setError(err.message || "Invalid seed phrase. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 max-w-2xl w-full my-8 animate-in fade-in zoom-in duration-300 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <KeyRound className="text-[#0019ff]" size={32} />
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Import Wallet
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            Enter your 24-word recovery phrase (or 12-word for legacy wallets) to restore your wallet.
          </p>
        </div>

        {/* Seed Phrase Input Grid */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-3">
            Tip: You can paste all 24 words at once
          </p>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
            onPaste={handlePaste}
          >
            {words.map((word, index) => (
              <div key={index} className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  {index + 1}.
                </span>
                <input
                  type="text"
                  value={word}
                  onChange={(e) => handleWordChange(index, e.target.value)}
                  placeholder={`word ${index + 1}`}
                  className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0019ff] focus:outline-none font-mono text-sm text-gray-900"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Password Section */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="text-[#0019ff]" size={20} />
            <h3 className="text-lg font-bold text-gray-900">Set Password</h3>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            Create a password to encrypt your imported wallet
          </p>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-[#0019ff] focus:outline-none transition-all text-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Password strength indicator */}
            {password && (
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

          {/* Confirm Password Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-[#0019ff] focus:outline-none transition-all text-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-xl p-4">
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || words.some((w) => !w) || !password || !confirmPassword}
            className="flex-1 bg-[#0019ff] hover:bg-[#0019ff]/90 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Importing...
              </>
            ) : (
              "Import Wallet"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
