"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Search,
  SlidersHorizontal,
  ExternalLink,
  Heart,
  X,
  TrendingUp,
  ShoppingCart,
  Eye,
  ChevronDown,
  Grid3x3,
  List,
  Star,
} from "lucide-react";
import Preloader from "./Preloader";
import { toast } from "@/lib/toast-store";
import { useWalletStore } from "@/lib/wallet-store";
import { useNFTStore } from "@/lib/nft-store";
import { getExchangeRates, swapRAINToETH, estimateTotalCostInRAIN } from "@/lib/rain-swap";
import { getAllMarketplaceListings } from "@/lib/opensea-api";
import { AlgoliaSearchBox } from "./AlgoliaSearchBox";
import {
  AlgoliaCollectionFilter,
  AlgoliaPriceRangeFilter,
  AlgoliaActiveFilters,
  AlgoliaFilterToggle,
} from "./AlgoliaFilters";
import { AdvancedNFTFilters } from "./AdvancedNFTFilters";
import { AdvancedFilters, DEFAULT_FILTERS } from "@/lib/nft-filter-types";
import { applyFilters as applyAdvancedFilters, getActiveFilterCount } from "@/lib/nft-filter-utils";

// Types
interface NFTListing {
  id: string;
  name: string;
  description: string;
  image_url: string;
  collection: {
    name: string;
    slug: string;
  };
  owner: {
    address: string;
  };
  priceInETH: number;
  priceInRAIN: number;
  priceInUSD: number;
  opensea_url: string;
  rarity?: number;
  attributes?: Array<{ trait_type: string; value: string }>;
}

interface Collection {
  slug: string;
  name: string;
  image: string;
  verified: boolean;
}

const COLLECTIONS: Collection[] = [
  { slug: "all", name: "All NFTs", image: "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=100&h=100&fit=crop", verified: true },
  { slug: "boredapeyachtclub", name: "Bored Ape Yacht Club", image: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=100&h=100&fit=crop", verified: true },
  { slug: "mutant-ape-yacht-club", name: "Mutant Ape Yacht Club", image: "https://images.unsplash.com/photo-1641259041823-70c83ba2c04b?w=100&h=100&fit=crop", verified: true },
  { slug: "azuki", name: "Azuki", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop", verified: true },
  { slug: "clonex", name: "CloneX", image: "https://images.unsplash.com/photo-1635002958764-13d991092f0c?w=100&h=100&fit=crop", verified: true },
  { slug: "doodles-official", name: "Doodles", image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=100&h=100&fit=crop", verified: true },
  { slug: "cool-cats-nft", name: "Cool Cats", image: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=100&h=100&fit=crop", verified: true },
  { slug: "moonbirds", name: "Moonbirds", image: "https://images.unsplash.com/photo-1551946154-408dcbda9e8f?w=100&h=100&fit=crop", verified: true },
  { slug: "pudgypenguins", name: "Pudgy Penguins", image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=100&h=100&fit=crop", verified: true },
  { slug: "veefriends", name: "VeeFriends", image: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=100&h=100&fit=crop", verified: true },
  { slug: "cryptopunks", name: "CryptoPunks", image: "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=100&h=100&fit=crop", verified: true },
];

interface NFTMarketplaceProps {
  useAlgolia?: boolean;
}

export default function NFTMarketplace({ useAlgolia = false }: NFTMarketplaceProps) {
  const { address, balance } = useWalletStore();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useNFTStore();

  // State
  const [nfts, setNfts] = useState<NFTListing[]>([]);
  const [filteredNfts, setFilteredNfts] = useState<NFTListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNFT, setSelectedNFT] = useState<NFTListing | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search state (for basic search when not using Algolia)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<NFTListing[]>([]);

  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(DEFAULT_FILTERS);

  // Price state
  const [ethPrice, setEthPrice] = useState(3000);
  const [rainPrice, setRainPrice] = useState(1.2);

  // Sync basic search with advanced filters
  useEffect(() => {
    if (!useAlgolia && searchQuery !== advancedFilters.searchQuery) {
      setAdvancedFilters(prev => ({ ...prev, searchQuery }));
    }
  }, [searchQuery, useAlgolia, advancedFilters.searchQuery]);

  const fetchCryptoPrices = async () => {
    try {
      const rates = await getExchangeRates();
      setEthPrice(rates.ethToUsd);
      setRainPrice(rates.rainToUsd);
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
  };

  const convertETHToRAIN = useCallback((ethAmount: number): number => {
    const usdValue = ethAmount * ethPrice;
    return Math.round((usdValue / rainPrice) * 100) / 100;
  }, [ethPrice, rainPrice]);

  const fetchMarketplaceNFTs = useCallback(async (reset: boolean = true) => {
    if (reset) {
      setLoading(true);
      setNfts([]);
      setNextCursor(null);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await getAllMarketplaceListings(
        50,
        reset ? undefined : nextCursor || undefined,
        selectedCollection
      );

      if (result.listings.length > 0) {
        const converted: NFTListing[] = result.listings.map((item) => {
          const ethPrice = parseFloat(item.listing.price.current.value) /
            Math.pow(10, item.listing.price.current.decimals);

          return {
            id: item.nft.identifier,
            name: item.nft.name || `#${item.nft.identifier}`,
            description: item.nft.description || "",
            image_url: item.nft.image_url || "",
            collection: {
              name: item.nft.collection || "",
              slug: item.nft.collection || "",
            },
            owner: {
              address: item.listing.protocol_data.parameters.offerer || "Unknown",
            },
            priceInETH: ethPrice,
            priceInRAIN: convertETHToRAIN(ethPrice),
            priceInUSD: ethPrice * ethPrice,
            opensea_url: `https://opensea.io/assets/${item.listing.chain}/${item.nft.contract}/${item.nft.identifier}`,
          };
        });

        // Deduplicate NFTs by ID to prevent duplicate key errors
        setNfts(prev => {
          const combined = reset ? converted : [...prev, ...converted];
          const uniqueNfts = Array.from(
            new Map(combined.map(nft => [nft.id, nft])).values()
          );
          return uniqueNfts;
        });
        setNextCursor(result.next);
        setHasMore(result.next !== null);
      }
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      toast.error("Failed to load NFTs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCollection, convertETHToRAIN]);

  // Fetch on mount and when collection changes
  useEffect(() => {
    fetchCryptoPrices();
  }, []);

  useEffect(() => {
    fetchMarketplaceNFTs();
  }, [fetchMarketplaceNFTs]);

  // Memoized filter change handler
  const handleFiltersChange = useCallback((newFilters: AdvancedFilters) => {
    setAdvancedFilters(newFilters);
  }, []);

  // Memoized close handler
  const handleCloseFilters = useCallback(() => {
    setShowFilters(false);
  }, []);

  // Apply advanced filters
  useEffect(() => {
    if (nfts.length === 0) {
      setFilteredNfts([]);
      setSearchResults([]);
      return;
    }

    const filtered = applyAdvancedFilters(nfts, advancedFilters);
    setFilteredNfts(filtered);

    // Update search results for instant search dropdown (when not using Algolia)
    if (!useAlgolia && searchQuery) {
      setSearchResults(filtered.slice(0, 5));
    } else {
      setSearchResults([]);
    }
  }, [nfts, advancedFilters, searchQuery, useAlgolia]);

  const handleBuyNFT = async (nft: NFTListing) => {
    try {
      const costEstimate = await estimateTotalCostInRAIN(nft.priceInETH);

      if (balance < costEstimate.total) {
        toast.error(`Insufficient RAIN balance. Need ${costEstimate.total.toFixed(2)} RAIN`);
        return;
      }

      toast.info("Initiating purchase...");
      const swapResult = await swapRAINToETH(costEstimate.total);

      if (!swapResult.success) {
        toast.error("Swap failed: " + swapResult.error);
        return;
      }

      toast.info("Purchasing NFT on OpenSea...");
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success("NFT purchased successfully!");
      setSelectedNFT(null);
      fetchMarketplaceNFTs();
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("Purchase failed");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Explore NFTs</h1>

            <div className="flex items-center gap-3">
              {/* Advanced Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-all duration-200 ${
                  showFilters
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {getActiveFilterCount(advancedFilters) > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-white text-blue-600 font-bold">
                    {getActiveFilterCount(advancedFilters)}
                  </span>
                )}
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 rounded p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded ${viewMode === "grid" ? "bg-white shadow-sm" : "text-gray-500"}`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded ${viewMode === "list" ? "bg-white shadow-sm" : "text-gray-500"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Search Bar - Algolia or Basic Search */}
          <div className="mt-4 relative">
            {useAlgolia ? (
              <AlgoliaSearchBox onSelectNFT={(nft) => setSelectedNFT(nft)} />
            ) : (
              <>
                <div className={`relative transition-all ${searchFocused ? "scale-[1.01]" : ""}`}>
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search NFTs, collections, and more..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                    className="w-full pl-12 pr-4 py-4 text-base border border-gray-200 rounded focus:border-blue-500 focus:outline-none transition-all bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Instant Search Results */}
                <AnimatePresence>
                  {searchFocused && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded shadow-2xl overflow-hidden z-50"
                    >
                      {searchResults.map((nft) => (
                        <button
                          key={nft.id}
                          onClick={() => {
                            setSelectedNFT(nft);
                            setSearchFocused(false);
                          }}
                          className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                        >
                          <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                            <Image
                              src={nft.image_url}
                              alt={nft.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-900">{nft.name}</p>
                            <p className="text-sm text-gray-500">{nft.collection.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">{nft.priceInRAIN.toFixed(0)} RAIN</p>
                            <p className="text-sm text-gray-500">{nft.priceInETH.toFixed(2)} ETH</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-6 flex gap-6">
        {/* Advanced Filters Sidebar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-shrink-0 overflow-hidden"
            >
              <div className="sticky top-6 h-[calc(100vh-120px)] border border-gray-200 rounded shadow-lg overflow-hidden">
                <AdvancedNFTFilters
                  nfts={nfts}
                  filters={advancedFilters}
                  onFiltersChange={handleFiltersChange}
                  onClose={handleCloseFilters}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NFT Grid */}
        <div className="flex-1 min-w-0">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="font-medium">Filters</span>
              </button>
              <p className="text-sm text-gray-600">
                {filteredNfts.length} items
              </p>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Preloader size={64} />
            </div>
          )}

          {/* NFT Grid */}
          {!loading && (
            <div className={viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
              : "space-y-4"
            }>
              {filteredNfts.map((nft) => (
                <motion.div
                  key={nft.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={viewMode === "grid"
                    ? "group cursor-pointer"
                    : "flex gap-4 bg-white border border-gray-200 rounded p-4 hover:shadow-md transition-shadow"
                  }
                  onClick={() => setSelectedNFT(nft)}
                >
                  {viewMode === "grid" ? (
                    <div className="bg-white border border-gray-200 rounded shadow-sm hover:shadow-md transition-shadow">
                      <div className="relative aspect-square bg-gray-50">
                        <Image
                          src={nft.image_url}
                          alt={nft.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            isInWatchlist(nft.id) ? removeFromWatchlist(nft.id) : addToWatchlist({
                              id: nft.id,
                              name: nft.name,
                              image_url: nft.image_url,
                              collection: nft.collection.name,
                              currentPrice: nft.priceInRAIN,
                              addedAt: Date.now(),
                            });
                          }}
                          className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
                        >
                          <Heart className={`w-4 h-4 ${isInWatchlist(nft.id) ? "fill-blue-500 text-blue-500" : "text-gray-400"}`} />
                        </button>
                      </div>
                      <div className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-0.5">{nft.collection.name}</p>
                            <p className="font-semibold text-sm text-gray-900 truncate">{nft.name}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded p-2 mb-2">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-xs text-gray-500">RAIN</span>
                            <span className="text-base font-bold text-gray-900">{nft.priceInRAIN.toFixed(0)}</span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-gray-500">ETH</span>
                            <span className="text-sm font-medium text-gray-600">{nft.priceInETH.toFixed(4)}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyNFT(nft);
                          }}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                        >
                          Buy Now
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="relative w-20 h-20 rounded overflow-hidden flex-shrink-0 bg-gray-50">
                        <Image
                          src={nft.image_url}
                          alt={nft.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">{nft.collection.name}</p>
                        <p className="font-semibold text-base text-gray-900 mb-1">{nft.name}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{nft.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="bg-gray-50 rounded p-2 min-w-[140px]">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-xs text-gray-500">RAIN</span>
                            <span className="text-base font-bold text-gray-900">{nft.priceInRAIN.toFixed(0)}</span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-gray-500">ETH</span>
                            <span className="text-sm font-medium text-gray-600">{nft.priceInETH.toFixed(4)}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyNFT(nft);
                          }}
                          className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
                        >
                          Buy Now
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && !loading && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => fetchMarketplaceNFTs(false)}
                disabled={loadingMore}
                className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <Preloader size={20} />
                ) : (
                  "Load More"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel for NFT Details */}
      <AnimatePresence>
        {selectedNFT && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNFT(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-gray-50 shadow-2xl z-50 overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">{selectedNFT.collection.name}</p>
                  <h2 className="text-xl font-bold text-gray-900">{selectedNFT.name}</h2>
                </div>
                <button
                  onClick={() => setSelectedNFT(null)}
                  className="w-10 h-10 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Image Section */}
                <div className="space-y-4">
                    <div className="relative aspect-square rounded overflow-hidden bg-gray-100 border border-gray-200">
                      <Image
                        src={selectedNFT.image_url}
                        alt={selectedNFT.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute top-3 right-3 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            isInWatchlist(selectedNFT.id) ? removeFromWatchlist(selectedNFT.id) : addToWatchlist({
                              id: selectedNFT.id,
                              name: selectedNFT.name,
                              image_url: selectedNFT.image_url,
                              collection: selectedNFT.collection.name,
                              currentPrice: selectedNFT.priceInRAIN,
                              addedAt: Date.now(),
                            });
                          }}
                          className="w-9 h-9 bg-white rounded flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
                        >
                          <Heart className={`w-4 h-4 ${isInWatchlist(selectedNFT.id) ? "fill-blue-600 text-blue-600" : "text-gray-600"}`} />
                        </button>
                        <a
                          href={selectedNFT.opensea_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-9 h-9 bg-white rounded flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-600" />
                        </a>
                      </div>
                    </div>

                    {/* Collection Stats */}
                    <div className="bg-white border border-gray-200 rounded p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                          {selectedNFT.collection.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Collection</p>
                          <p className="font-semibold text-sm text-gray-900">{selectedNFT.collection.name}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-500 mb-1">Floor</p>
                          <p className="font-bold text-sm text-gray-900">{(selectedNFT.priceInRAIN * 0.8).toFixed(0)}</p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-500 mb-1">Volume</p>
                          <p className="font-bold text-sm text-gray-900">{(selectedNFT.priceInRAIN * 150).toFixed(0)}</p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-500 mb-1">Items</p>
                          <p className="font-bold text-sm text-gray-900">10,000</p>
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Price & Actions Section */}
                <div className="space-y-3">
                    {/* Price Section */}
                    <div className="bg-blue-600 rounded p-4 text-white">
                      <p className="text-xs opacity-90 mb-2">Current Price</p>
                      <div className="flex items-baseline gap-2 mb-3">
                        <p className="text-3xl font-bold">{selectedNFT.priceInRAIN.toFixed(0)}</p>
                        <span className="text-lg font-medium opacity-90">RAIN</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs opacity-75">ETH</span>
                            <span className="text-sm font-medium">{selectedNFT.priceInETH.toFixed(4)}</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs opacity-75">USD</span>
                            <span className="text-sm font-medium">${selectedNFT.priceInUSD.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/20 rounded px-2.5 py-1.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">+12.5%</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <button
                        onClick={() => handleBuyNFT(selectedNFT)}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Buy Now for {selectedNFT.priceInRAIN.toFixed(0)} RAIN
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button className="px-4 py-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded transition-colors text-sm">
                          Make Offer
                        </button>
                        <button className="px-4 py-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded transition-colors text-sm">
                          Add to Cart
                        </button>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white border border-gray-200 rounded p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Eye className="w-4 h-4 text-blue-600" />
                          <p className="text-xs text-gray-500">Views</p>
                        </div>
                        <p className="text-lg font-bold text-gray-900">1,247</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Heart className="w-4 h-4 text-blue-600" />
                          <p className="text-xs text-gray-500">Favorites</p>
                        </div>
                        <p className="text-lg font-bold text-gray-900">342</p>
                      </div>
                    </div>
                </div>

                {/* Properties/Traits Section */}
                <div className="bg-white border border-gray-200 rounded p-4">
                  <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-blue-600" />
                    Properties
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { trait: "Background", value: "Blue", rarity: "12%" },
                      { trait: "Fur", value: "Golden", rarity: "8%" },
                      { trait: "Eyes", value: "Laser", rarity: "3%" },
                      { trait: "Mouth", value: "Smile", rarity: "15%" },
                      { trait: "Hat", value: "Crown", rarity: "5%" },
                      { trait: "Clothes", value: "Suit", rarity: "10%" },
                    ].map((prop, i) => (
                      <div key={i} className="bg-gray-50 border border-gray-200 rounded p-2.5 hover:border-gray-300 transition-colors">
                        <p className="text-xs text-blue-600 font-semibold mb-0.5">{prop.trait}</p>
                        <p className="font-semibold text-sm text-gray-900 mb-0.5">{prop.value}</p>
                        <p className="text-xs text-gray-500">{prop.rarity} have this</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                {selectedNFT.description && (
                  <div className="bg-white border border-gray-200 rounded p-4">
                    <h3 className="text-base font-bold text-gray-900 mb-2">Description</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedNFT.description}</p>
                  </div>
                )}

                {/* Price History Chart */}
                <div className="bg-white border border-gray-200 rounded p-4">
                  <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Price History
                  </h3>
                  <div className="h-32 flex items-end gap-1">
                    {[65, 70, 68, 75, 72, 80, 85, 82, 90, 95, 92, 100].map((height, i) => (
                      <div key={i} className="flex-1 bg-blue-600 rounded-t hover:bg-blue-700 transition-colors cursor-pointer" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <div className="flex justify-between mt-3 text-xs text-gray-500">
                    <span>30d ago</span>
                    <span>Today</span>
                  </div>
                </div>

                {/* Activity History */}
                <div className="bg-white border border-gray-200 rounded p-4">
                  <h3 className="text-base font-bold text-gray-900 mb-3">Recent Activity</h3>
                  <div className="space-y-2">
                    {[
                      { type: "Sale", from: "0x1234...5678", to: "0x8765...4321", price: selectedNFT.priceInRAIN * 0.95, time: "2 hours ago" },
                      { type: "Transfer", from: "0x2345...6789", to: "0x1234...5678", price: 0, time: "1 day ago" },
                      { type: "Sale", from: "0x3456...7890", to: "0x2345...6789", price: selectedNFT.priceInRAIN * 0.88, time: "3 days ago" },
                      { type: "Mint", from: "NullAddress", to: "0x3456...7890", price: 0, time: "7 days ago" },
                    ].map((activity, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${activity.type === "Sale" ? "bg-green-100 text-green-600" : activity.type === "Transfer" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"} flex items-center justify-center font-bold text-xs`}>
                            {activity.type === "Sale" ? "$" : activity.type === "Transfer" ? "→" : "★"}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{activity.type}</p>
                            <p className="text-xs text-gray-500">From {activity.from} to {activity.to}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {activity.price > 0 && <p className="font-bold text-gray-900">{activity.price.toFixed(0)} RAIN</p>}
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Owner & Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-white border border-gray-200 rounded p-4">
                    <h3 className="text-sm text-gray-500 mb-2">Owner</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400" />
                      <div>
                        <p className="font-mono text-sm text-gray-900">{selectedNFT.owner.address.slice(0, 6)}...{selectedNFT.owner.address.slice(-4)}</p>
                        <p className="text-xs text-gray-500">12 items owned</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-4">
                    <h3 className="text-sm text-gray-500 mb-2">Contract Address</h3>
                    <p className="font-mono text-sm text-gray-900">0xbc4c...a09f</p>
                    <p className="text-xs text-gray-500 mt-1">Token ID: #{selectedNFT.id}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
