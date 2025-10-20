"use client";

import { useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";

interface WalletCreationWarningModalProps {
  onClose: () => void;
  onContinue: () => void;
}

export default function WalletCreationWarningModal({
  onClose,
  onContinue,
}: WalletCreationWarningModalProps) {
  const [acknowledgedNoReset, setAcknowledgedNoReset] = useState(false);
  const [acknowledgedResponsibility, setAcknowledgedResponsibility] = useState(false);

  const handleContinue = () => {
    if (acknowledgedNoReset && acknowledgedResponsibility) {
      onContinue();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full my-8 animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
            <ShieldAlert className="text-yellow-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center">
            Create Wallet
          </h2>
        </div>

        {/* Warning Message */}
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm text-red-900 font-semibold mb-2">
                Blockchains do not have a "Reset Password" feature.
              </p>
              <p className="text-sm text-red-800">
                All you get is a <strong>Secret Phrase</strong> - make sure to keep it safe.
              </p>
            </div>
          </div>
        </div>

        {/* Important Points */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              Your Secret Phrase is the <strong>only way</strong> to recover your wallet
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              If you lose it, <strong>no one can help you</strong> recover your funds
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              Never share your Secret Phrase with anyone
            </p>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledgedNoReset}
              onChange={(e) => setAcknowledgedNoReset(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-[#0019ff] focus:ring-[#0019ff]"
            />
            <span className="text-sm text-gray-700">
              I understand that there is <strong>no password reset</strong> feature
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledgedResponsibility}
              onChange={(e) => setAcknowledgedResponsibility(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-[#0019ff] focus:ring-[#0019ff]"
            />
            <span className="text-sm text-gray-700">
              I am <strong>solely responsible</strong> for keeping my Secret Phrase safe
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleContinue}
            disabled={!acknowledgedNoReset || !acknowledgedResponsibility}
            className="w-full bg-[#0019ff] hover:bg-[#0019ff]/90 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
          <button
            onClick={onClose}
            className="w-full text-gray-600 hover:text-gray-900 font-semibold py-2 transition-colors text-sm"
          >
            Already have a wallet? Access it
          </button>
        </div>
      </div>
    </div>
  );
}
