"use client";

import { useRef, useState, useEffect } from "react";
import { useSearchBox, useHits } from "react-instantsearch";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Search, X, TrendingUp, Clock, Command } from "lucide-react";

interface SearchBoxProps {
  onSelectNFT?: (nft: any) => void;
}

export function AlgoliaSearchBox({ onSelectNFT }: SearchBoxProps) {
  const { query, refine, clear } = useSearchBox();
  const { hits, results } = useHits();
  const [isFocused, setIsFocused] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isMac, setIsMac] = useState(false);

  // Detect if user is on Mac
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('algolia_recent_searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Keyboard shortcut handler (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur();
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (value: string) => {
    refine(value);
    if (value) {
      setShowAutocomplete(true);
    }
  };

  const handleSelectNFT = (nft: any) => {
    setShowAutocomplete(false);
    if (onSelectNFT) {
      onSelectNFT(nft);
    }
    // Save to recent searches
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('algolia_recent_searches', JSON.stringify(updated));
  };

  const handleClear = () => {
    clear();
    setShowAutocomplete(false);
    inputRef.current?.focus();
  };

  const handleRecentSearch = (search: string) => {
    refine(search);
    inputRef.current?.focus();
  };

  const removeRecentSearch = (search: string) => {
    const updated = recentSearches.filter(s => s !== search);
    setRecentSearches(updated);
    localStorage.setItem('algolia_recent_searches', JSON.stringify(updated));
  };

  // Show autocomplete when focused and has query or recent searches
  useEffect(() => {
    setShowAutocomplete(isFocused && (!!query || recentSearches.length > 0));
  }, [isFocused, query, recentSearches.length]);

  return (
    <div className="relative w-full">
      {/* Search Input with Algolia-style design */}
      <motion.div
        className="relative group"
        animate={{
          scale: isFocused ? 1.01 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Gradient border effect */}
        <div className={`absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300 ${isFocused ? 'opacity-30' : ''}`} />

        <div className="relative">
          {/* Search Icon */}
          <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isFocused ? 'text-purple-400' : 'text-gray-500'}`}>
            <Search className="h-5 w-5" />
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="Search NFTs, collections, or creators..."
            className={`w-full pl-12 pr-32 py-4 bg-white/5 backdrop-blur-xl border rounded-2xl
                     text-white placeholder-gray-500 focus:outline-none
                     transition-all duration-300 shadow-lg
                     ${isFocused
                       ? 'border-purple-500/50 bg-white/10 shadow-purple-500/20 shadow-2xl'
                       : 'border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
                     }`}
          />

          {/* Right side controls */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Processing time indicator */}
            {results?.processingTimeMS !== undefined && query && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs text-purple-400 font-medium px-2 py-1 bg-purple-500/10 rounded-lg"
              >
                {results.processingTimeMS}ms
              </motion.div>
            )}

            {/* Clear button */}
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleClear}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg
                         transition-all duration-200"
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}

            {/* Keyboard shortcut hint */}
            {!isFocused && !query && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 bg-white/5 rounded-lg border border-white/10"
              >
                {isMac ? (
                  <>
                    <Command className="h-3 w-3" />
                    <span>K</span>
                  </>
                ) : (
                  <span>Ctrl K</span>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Autocomplete Dropdown with Algolia styling */}
      <AnimatePresence>
        {showAutocomplete && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 w-full mt-3 bg-gray-900/95 backdrop-blur-2xl border border-white/10
                     rounded-2xl shadow-2xl shadow-purple-500/10 overflow-hidden ring-1 ring-white/5"
          >
            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Recent</span>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <motion.div
                      key={search}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between py-2.5 px-3 hover:bg-white/5
                               rounded-lg cursor-pointer group transition-all duration-200"
                    >
                      <button
                        onClick={() => handleRecentSearch(search)}
                        className="flex items-center gap-3 flex-1 text-left text-sm text-gray-300 group-hover:text-white"
                      >
                        <Search className="h-3.5 w-3.5 text-gray-600" />
                        <span>{search}</span>
                      </button>
                      <button
                        onClick={() => removeRecentSearch(search)}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400
                                 transition-all duration-200 p-1 hover:bg-red-500/10 rounded"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {query && (
              <div className="max-h-[32rem] overflow-y-auto custom-scrollbar">
                {hits.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800/50 mb-4">
                      <Search className="h-8 w-8 text-gray-600" />
                    </div>
                    <p className="text-base font-medium text-white mb-1">No results found for &quot;{query}&quot;</p>
                    <p className="text-sm text-gray-500">Try different keywords or check spelling</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-3 bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-b border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
                          <span>Results</span>
                        </div>
                        <span className="text-xs text-purple-400 font-medium">{hits.length} found</span>
                      </div>
                    </div>
                    {hits.slice(0, 5).map((hit: any, index) => (
                      <motion.button
                        key={hit.objectID}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSelectNFT(hit)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10
                                 transition-all duration-200 text-left group border-b border-white/5 last:border-0"
                      >
                        {/* NFT Image */}
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0
                                      bg-gray-800 border border-gray-700/50">
                          {hit.image_url ? (
                            <Image
                              src={hit.image_url}
                              alt={hit.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                              <Search className="h-8 w-8" />
                            </div>
                          )}
                        </div>

                        {/* NFT Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white truncate mb-1">
                            {hit._highlightResult?.name?.value ? (
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: hit._highlightResult.name.value,
                                }}
                              />
                            ) : (
                              hit.name
                            )}
                          </h4>
                          <p className="text-xs text-gray-400 truncate">
                            {hit._highlightResult?.collection?.name?.value ? (
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: hit._highlightResult.collection.name.value,
                                }}
                              />
                            ) : (
                              hit.collection?.name
                            )}
                          </p>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {hit.priceInRAIN?.toFixed(2)} RAIN
                          </div>
                          <div className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                            {hit.priceInETH?.toFixed(4)} ETH
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Powered by Algolia badge */}
            <div className="px-4 py-3 bg-gradient-to-r from-gray-900/50 to-gray-800/50 border-t border-white/5">
              <a
                href="https://www.algolia.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-end gap-2 text-xs text-gray-500 hover:text-purple-400 transition-colors duration-200 group"
              >
                <span>Search by</span>
                <svg className="h-4 opacity-60 group-hover:opacity-100 transition-opacity" viewBox="0 0 90 28" fill="currentColor">
                  <path d="M71.3 12.4l-3.5-10.5C67.4.8 66.3 0 65.1 0H54.8c-1.2 0-2.3.8-2.7 1.9l-3.5 10.5c-.4 1.1.5 2.3 1.7 2.3h19.3c1.2 0 2.1-1.2 1.7-2.3zM88.4 17.8l-3.6-10.5c-.4-1.1-1.5-1.9-2.7-1.9H71.8c-1.2 0-2.3.8-2.7 1.9l-3.6 10.5c-.4 1.1.5 2.3 1.7 2.3h19.5c1.2 0 2.1-1.2 1.7-2.3zM31.7 17.8l-3.6-10.5c-.4-1.1-1.5-1.9-2.7-1.9H15.1c-1.2 0-2.3.8-2.7 1.9L8.8 17.8c-.4 1.1.5 2.3 1.7 2.3h19.5c1.2 0 2.1-1.2 1.7-2.3z"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M52.2 7.2l-1.9 5.7h-8.7l-1.9-5.7c-.3-.8.3-1.6 1.1-1.6h10.2c.9 0 1.5.8 1.2 1.6zm-23.9 5.7l-1.9-5.7c-.3-.8.3-1.6 1.1-1.6H37.7c.9 0 1.5.8 1.2 1.6l-1.9 5.7h-8.7zm36.9 0l-1.9-5.7c-.3-.8.3-1.6 1.1-1.6h10.2c.9 0 1.5.8 1.2 1.6l-1.9 5.7h-8.7z"/>
                </svg>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
