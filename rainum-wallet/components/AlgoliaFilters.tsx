"use client";

import { useState } from "react";
import { useRefinementList, useRange, useCurrentRefinements } from "react-instantsearch";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, X, Check, SlidersHorizontal } from "lucide-react";

export function AlgoliaCollectionFilter() {
  const { items, refine } = useRefinementList({
    attribute: 'collection.name',
    limit: 20,
    showMore: true,
    sortBy: ['count:desc', 'name:asc'],
  });
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-gray-900/30 border border-gray-700/30 rounded-xl p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-3"
      >
        <span className="text-sm font-semibold text-white">Collections</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 max-h-64 overflow-y-auto"
          >
            {items.map((item) => (
              <label
                key={item.value}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50
                         cursor-pointer transition-colors duration-200 group"
              >
                <input
                  type="checkbox"
                  checked={item.isRefined}
                  onChange={() => refine(item.value)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                           ${
                             item.isRefined
                               ? "bg-purple-500 border-purple-500"
                               : "border-gray-600 group-hover:border-purple-500/50"
                           }`}
                >
                  {item.isRefined && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="text-sm text-gray-300 group-hover:text-white flex-1">
                  {item.label}
                </span>
                <span className="text-xs text-gray-500 font-medium">{item.count}</span>
              </label>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AlgoliaPriceRangeFilter() {
  const { range, refine, start } = useRange({
    attribute: 'priceInRAIN',
  });
  const [isExpanded, setIsExpanded] = useState(true);
  const [minValue, setMinValue] = useState(start?.[0] ?? range.min ?? 0);
  const [maxValue, setMaxValue] = useState(start?.[1] ?? range.max ?? 1000000);

  const handleRefine = () => {
    refine([minValue, maxValue]);
  };

  const handleReset = () => {
    const min = range.min ?? 0;
    const max = range.max ?? 1000000;
    setMinValue(min);
    setMaxValue(max);
    refine([min, max]);
  };

  return (
    <div className="bg-gray-900/30 border border-gray-700/30 rounded-xl p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-3"
      >
        <span className="text-sm font-semibold text-white">Price Range (RAIN)</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Min</label>
                <input
                  type="number"
                  value={minValue}
                  onChange={(e) => setMinValue(Number(e.target.value))}
                  min={range.min ?? 0}
                  max={maxValue}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg
                           text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Max</label>
                <input
                  type="number"
                  value={maxValue}
                  onChange={(e) => setMaxValue(Number(e.target.value))}
                  min={minValue}
                  max={range.max ?? 1000000}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg
                           text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRefine}
                className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm
                         font-medium rounded-lg transition-colors duration-200"
              >
                Apply
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm
                         font-medium rounded-lg transition-colors duration-200"
              >
                Reset
              </button>
            </div>

            {/* Range display */}
            <div className="text-xs text-gray-400 text-center">
              Range: {range.min?.toFixed(0)} - {range.max?.toFixed(0)} RAIN
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AlgoliaActiveFilters() {
  const { items, refine } = useCurrentRefinements();

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {items.map((item) =>
        item.refinements.map((refinement: any) => (
          <motion.button
            key={`${item.attribute}-${refinement.value}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={() => refine(refinement)}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/50
                     rounded-full text-xs text-purple-300 hover:bg-purple-500/30 transition-colors
                     duration-200 group"
          >
            <span className="font-medium">{item.label}:</span>
            <span>{refinement.label}</span>
            <X className="h-3 w-3 group-hover:text-white transition-colors" />
          </motion.button>
        ))
      )}
    </div>
  );
}

export function AlgoliaSortBy() {
  const sortOptions = [
    { label: "Relevance", value: "nft_marketplace" },
    { label: "Price: Low to High", value: "nft_marketplace_price_asc" },
    { label: "Price: High to Low", value: "nft_marketplace_price_desc" },
    { label: "Recently Added", value: "nft_marketplace_date_desc" },
  ];

  const [selectedSort, setSelectedSort] = useState(sortOptions[0].value);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400">Sort by:</span>
      <select
        value={selectedSort}
        onChange={(e) => setSelectedSort(e.target.value)}
        className="px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-white text-sm
                 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AlgoliaFilterToggle({ showFilters, setShowFilters }: {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
}) {
  return (
    <button
      onClick={() => setShowFilters(!showFilters)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-200 ${
                  showFilters
                    ? "bg-purple-500 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
    >
      <SlidersHorizontal className="h-4 w-4" />
      {showFilters ? "Hide Filters" : "Show Filters"}
    </button>
  );
}
