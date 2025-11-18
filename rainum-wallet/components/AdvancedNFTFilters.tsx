"use client";

import { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  X,
  Star,
  DollarSign,
  Grid3x3,
  Sparkles,
  TrendingUp,
  Filter,
  RotateCcw,
  Save,
  Bookmark,
  Check,
} from "lucide-react";
import {
  AdvancedFilters,
  RarityTier,
  SortOption,
  DEFAULT_FILTER_PRESETS,
  DEFAULT_FILTERS,
} from "@/lib/nft-filter-types";
import { NFTListing } from "@/lib/opensea-api";
import {
  extractTraitsFromCollection,
  getRarityColor,
} from "@/lib/nft-rarity-utils";
import { getActiveFilterCount, getFilterSummary } from "@/lib/nft-filter-utils";

interface AdvancedNFTFiltersProps {
  nfts: NFTListing[];
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  onClose?: () => void;
}

const AdvancedNFTFiltersComponent = ({
  nfts,
  filters,
  onFiltersChange,
  onClose,
}: AdvancedNFTFiltersProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["price", "collections", "sort"])
  );

  // Extract unique collections from NFTs
  const collections = useMemo(() => {
    const uniqueCollections = new Map<string, { name: string; slug: string }>();
    nfts.forEach((nft) => {
      uniqueCollections.set(nft.collection.slug, nft.collection);
    });
    return Array.from(uniqueCollections.values());
  }, [nfts]);

  // Extract unique traits from NFTs
  const availableTraits = useMemo(() => {
    return extractTraitsFromCollection(nfts);
  }, [nfts]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const updateFilters = (updates: Partial<AdvancedFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearAllFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  const applyPreset = (presetId: string) => {
    const preset = DEFAULT_FILTER_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onFiltersChange({ ...DEFAULT_FILTERS, ...preset.filters });
    }
  };

  const activeFilterCount = getActiveFilterCount(filters);
  const filterSummary = getFilterSummary(filters);

  const RARITY_TIERS: RarityTier[] = [
    "Common",
    "Uncommon",
    "Rare",
    "Epic",
    "Legendary",
    "Mythic",
  ];

  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "recently_listed", label: "Recently Listed" },
    { value: "recently_created", label: "Recently Created" },
    { value: "price_low_high", label: "Price: Low to High" },
    { value: "price_high_low", label: "Price: High to Low" },
    { value: "rarity_rare_common", label: "Rarity: Rare to Common" },
    { value: "rarity_common_rare", label: "Rarity: Common to Rare" },
    { value: "alphabetical_az", label: "Alphabetical: A-Z" },
    { value: "alphabetical_za", label: "Alphabetical: Z-A" },
    { value: "most_viewed", label: "Most Viewed" },
    { value: "most_favorited", label: "Most Favorited" },
  ];

  const FilterSection = ({
    title,
    icon: Icon,
    section,
    children,
  }: {
    title: string;
    icon: React.ElementType;
    section: string;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections.has(section);

    return (
      <div className="border-b border-white/10">
        <button
          onClick={() => toggleSection(section)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-blue-400" />
            <span className="font-medium text-white text-sm">{title}</span>
          </div>
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
              className="overflow-hidden"
            >
              <div className="p-4 pt-0">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-xl">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-400" />
            Advanced Filters
          </h2>
          {activeFilterCount > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearAllFilters}
            disabled={activeFilterCount === 0}
            className="text-xs text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Clear All
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Summary */}
      {filterSummary.length > 0 && (
        <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20">
          <div className="flex flex-wrap gap-2">
            {filterSummary.map((summary, index) => (
              <div
                key={index}
                className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30"
              >
                {summary}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Presets */}
      <div className="p-4 border-b border-white/10">
        <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
          Quick Presets
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {DEFAULT_FILTER_PRESETS.slice(0, 4).map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded
                       transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3 w-3 text-blue-400" />
                <span className="text-xs font-medium text-white">{preset.name}</span>
              </div>
              <p className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Sections */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Price Filter */}
        <FilterSection title="Price Range" icon={DollarSign} section="price">
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["ETH", "RAIN", "USD"] as const).map((currency) => (
                <button
                  key={currency}
                  onClick={() =>
                    updateFilters({ price: { ...filters.price, currency } })
                  }
                  className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all duration-200
                    ${
                      filters.price.currency === currency
                        ? "bg-blue-500 text-white"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                >
                  {currency}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400">
                Min: {filters.price.min} {filters.price.currency}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={filters.price.min}
                onChange={(e) =>
                  updateFilters({
                    price: { ...filters.price, min: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400">
                Max: {filters.price.max} {filters.price.currency}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={filters.price.max}
                onChange={(e) =>
                  updateFilters({
                    price: { ...filters.price, max: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        </FilterSection>

        {/* Collections Filter */}
        <FilterSection title="Collections" icon={Grid3x3} section="collections">
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {collections.map((collection) => {
              const isSelected =
                filters.collections.selectedCollections.includes(collection.slug);
              return (
                <button
                  key={collection.slug}
                  onClick={() => {
                    const selected = isSelected
                      ? filters.collections.selectedCollections.filter(
                          (s) => s !== collection.slug
                        )
                      : [...filters.collections.selectedCollections, collection.slug];
                    updateFilters({
                      collections: { ...filters.collections, selectedCollections: selected },
                    });
                  }}
                  className={`w-full px-3 py-2 rounded text-sm text-left flex items-center gap-2
                    transition-all duration-200 ${
                      isSelected
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                        : "bg-white/5 text-gray-300 hover:bg-white/10 border border-transparent"
                    }`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? "bg-blue-500 border-blue-500"
                        : "border-gray-600"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  {collection.name}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Traits Filter */}
        {availableTraits.size > 0 && (
          <FilterSection title="Traits & Attributes" icon={Sparkles} section="traits">
            <div className="space-y-4">
              {Array.from(availableTraits.entries()).map(([traitType, values]) => (
                <div key={traitType} className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase">
                    {traitType}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(values).map((value) => {
                      const isSelected =
                        filters.traits[traitType]?.includes(value) || false;
                      return (
                        <button
                          key={value}
                          onClick={() => {
                            const currentValues = filters.traits[traitType] || [];
                            const newValues = isSelected
                              ? currentValues.filter((v) => v !== value)
                              : [...currentValues, value];
                            updateFilters({
                              traits: { ...filters.traits, [traitType]: newValues },
                            });
                          }}
                          className={`px-2 py-1 rounded text-xs transition-all duration-200 ${
                            isSelected
                              ? "bg-blue-500 text-white"
                              : "bg-white/5 text-gray-400 hover:bg-white/10"
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Rarity Filter */}
        <FilterSection title="Rarity" icon={Star} section="rarity">
          <div className="space-y-3">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase">Tiers</h4>
              <div className="flex flex-wrap gap-2">
                {RARITY_TIERS.map((tier) => {
                  const isSelected = filters.rarity.tiers.includes(tier);
                  return (
                    <button
                      key={tier}
                      onClick={() => {
                        const tiers = isSelected
                          ? filters.rarity.tiers.filter((t) => t !== tier)
                          : [...filters.rarity.tiers, tier];
                        updateFilters({ rarity: { ...filters.rarity, tiers } });
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-medium border transition-all duration-200 ${
                        isSelected
                          ? getRarityColor(tier)
                          : "bg-white/5 text-gray-400 border-gray-700 hover:bg-white/10"
                      }`}
                    >
                      {tier}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase">
                Top Percentage
              </h4>
              <select
                value={filters.rarity.topPercentage || ""}
                onChange={(e) =>
                  updateFilters({
                    rarity: {
                      ...filters.rarity,
                      topPercentage: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-white
                         focus:outline-none focus:border-blue-500/50"
              >
                <option value="">All</option>
                <option value="1">Top 1%</option>
                <option value="5">Top 5%</option>
                <option value="10">Top 10%</option>
                <option value="25">Top 25%</option>
              </select>
            </div>
          </div>
        </FilterSection>

        {/* Sort Options */}
        <FilterSection title="Sort By" icon={TrendingUp} section="sort">
          <div className="space-y-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updateFilters({ sort: option.value })}
                className={`w-full px-3 py-2 rounded text-sm text-left transition-all duration-200 ${
                  filters.sort === option.value
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                    : "bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </FilterSection>
      </div>
    </div>
  );
};

export const AdvancedNFTFilters = memo(AdvancedNFTFiltersComponent);
