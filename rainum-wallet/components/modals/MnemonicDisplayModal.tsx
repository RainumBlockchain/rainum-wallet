"use client";

import { useState, useRef, useEffect } from "react";
import { Copy, Check, AlertTriangle, ShieldCheck } from "lucide-react";

// Use mnemonic words as autocomplete suggestions
const getSuggestedWords = (words: string[], input: string): string[] => {
  if (!input || input.length === 0) return [];

  const inputLower = input.toLowerCase();
  // Filter words from the mnemonic that start with the input
  const matches = words.filter(w => w.toLowerCase().startsWith(inputLower));

  // Return unique matches, limited to 5
  return [...new Set(matches)].slice(0, 5);
};

interface MnemonicDisplayModalProps {
  mnemonic: string;
  address: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function MnemonicDisplayModal({
  mnemonic,
  address,
  onClose,
  onConfirm,
}: MnemonicDisplayModalProps) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationAnswers, setVerificationAnswers] = useState<{ [key: number]: string }>({});
  const [verificationError, setVerificationError] = useState("");
  const [activeInput, setActiveInput] = useState<number | null>(null);
  const [filteredSuggestions, setFilteredSuggestions] = useState<{ [key: number]: string[] }>({});

  const words = mnemonic.split(" ");

  // Generate 3 random word positions to verify (excluding first and last for variety)
  const [verificationIndices] = useState(() => {
    const indices: number[] = [];
    const availableIndices = Array.from({ length: 22 }, (_, i) => i + 1); // 1-22 (exclude 0 and 23)

    // Pick 3 random indices
    for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      indices.push(availableIndices[randomIndex]);
      availableIndices.splice(randomIndex, 1);
    }

    return indices.sort((a, b) => a - b);
  });

  const handleCopy = () => {
    // Format with numbers: "1. word1\n2. word2\n..."
    const formattedMnemonic = words
      .map((word, index) => `${index + 1}. ${word}`)
      .join('\n');
    navigator.clipboard.writeText(formattedMnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = () => {
    if (confirmed) {
      setShowVerification(true);
    }
  };

  const handleVerificationSubmit = () => {
    setVerificationError("");

    // Check all 3 answers
    const allCorrect = verificationIndices.every((index) => {
      const userAnswer = verificationAnswers[index]?.toLowerCase().trim();
      const correctAnswer = words[index].toLowerCase();
      return userAnswer === correctAnswer;
    });

    if (allCorrect) {
      onConfirm();
    } else {
      setVerificationError("One or more words are incorrect. Please check your seed phrase and try again.");
    }
  };

  if (showVerification) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
        <div
          className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-w-3xl w-full my-8 animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Side - Header & Info */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0019ff] to-[#0019ff]/70 flex items-center justify-center mb-6 shadow-lg">
                  <ShieldCheck className="text-white" size={40} />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  Verify Your Seed Phrase
                </h2>
                <p className="text-base text-gray-600 leading-relaxed">
                  Enter the following words to confirm you saved them correctly. Start typing and select from suggestions.
                </p>
              </div>

              {/* Visual Progress */}
              <div className="mt-auto pt-6 border-t border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0019ff] transition-all duration-300"
                      style={{
                        width: `${(Object.keys(verificationAnswers).filter(k => verificationAnswers[parseInt(k)]?.trim()).length / verificationIndices.length) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-600">
                    {Object.keys(verificationAnswers).filter(k => verificationAnswers[parseInt(k)]?.trim()).length}/{verificationIndices.length}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Words verified</p>
              </div>
            </div>

            {/* Right Side - Input Fields */}
            <div className="lg:col-span-3">
              {/* Verification Questions */}
              <div className="space-y-4 mb-6">
                {verificationIndices.map((wordIndex, idx) => (
                  <div key={wordIndex} className="relative">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-[#0019ff]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-[#0019ff]">{idx + 1}</span>
                      </div>
                      <label className="text-sm font-semibold text-gray-700">
                        Word #{wordIndex + 1}
                      </label>
                    </div>
                    <input
                      type="text"
                      value={verificationAnswers[wordIndex] || ""}
                      onChange={(e) => {
                        const value = e.target.value.toLowerCase();
                        setVerificationAnswers({
                          ...verificationAnswers,
                          [wordIndex]: value,
                        });
                        setVerificationError("");

                        const suggestions = getSuggestedWords(words, value);
                        setFilteredSuggestions({
                          ...filteredSuggestions,
                          [wordIndex]: suggestions,
                        });
                      }}
                      onFocus={() => setActiveInput(wordIndex)}
                      onBlur={() => setTimeout(() => setActiveInput(null), 200)}
                      placeholder="Start typing..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0019ff] focus:outline-none transition-all text-gray-900 font-mono text-base bg-white"
                      autoComplete="off"
                    />

                    {/* Autocomplete Dropdown */}
                    {activeInput === wordIndex && filteredSuggestions[wordIndex]?.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border-2 border-[#0019ff]/20 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                        {filteredSuggestions[wordIndex].map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              setVerificationAnswers({
                                ...verificationAnswers,
                                [wordIndex]: suggestion,
                              });
                              setFilteredSuggestions({
                                ...filteredSuggestions,
                                [wordIndex]: [],
                              });
                              setActiveInput(null);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-[#0019ff]/10 transition-colors font-mono text-base text-gray-900 border-b border-gray-100 last:border-0 first:rounded-t-xl last:rounded-b-xl"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Error Message */}
              {verificationError && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-6 flex gap-3">
                  <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
                  <p className="text-sm text-red-800 font-medium">{verificationError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowVerification(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-3 px-4 rounded-xl transition-all"
                >
                  Go Back
                </button>
                <button
                  onClick={handleVerificationSubmit}
                  disabled={verificationIndices.some((index) => !verificationAnswers[index]?.trim())}
                  className="flex-1 bg-[#0019ff] hover:bg-[#0019ff]/90 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 max-w-4xl w-full my-8 animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Your Wallet is Ready!
          </h2>
          <p className="text-sm text-gray-600">
            Write down these <strong>24 words</strong> in order and keep them safe.
          </p>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mb-6 flex gap-3">
          <AlertTriangle className="text-yellow-600 flex-shrink-0" size={24} />
          <div>
            <p className="font-bold text-yellow-900 mb-1">
              NEVER share your seed phrase!
            </p>
            <p className="text-sm text-yellow-800">
              Anyone with these words can access your wallet and steal your funds.
            </p>
          </div>
        </div>

        {/* Mnemonic Grid - 4 columns for 24 words */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {words.map((word, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-3 flex items-center gap-2"
            >
              <span className="text-xs font-bold text-gray-400 w-6">
                {index + 1}.
              </span>
              <span className="font-mono font-bold text-gray-900">{word}</span>
            </div>
          ))}
        </div>

        {/* Address */}
        <div className="bg-[#0019ff]/5 border-2 border-[#0019ff]/20 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-600 mb-1">Your Wallet Address:</p>
          <p className="font-mono text-sm text-[#0019ff] font-bold break-all">
            {address}
          </p>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="w-full mb-6 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 px-4 rounded-xl transition-all"
        >
          {copied ? (
            <>
              <Check size={20} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={20} />
              Copy Seed Phrase
            </>
          )}
        </button>

        {/* Confirmation Checkbox */}
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-gray-300 text-[#0019ff] focus:ring-[#0019ff]"
          />
          <span className="text-sm text-gray-700">
            I have written down my seed phrase and stored it in a safe place. I
            understand that I cannot recover my wallet without it.
          </span>
        </label>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-3 px-4 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!confirmed}
            className="flex-1 bg-[#0019ff] hover:bg-[#0019ff]/90 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            I've Saved It
          </button>
        </div>
      </div>
    </div>
  );
}
