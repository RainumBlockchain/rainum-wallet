import { NFTListing } from "./opensea-api";
import {
  AdvancedFilters,
  SortOption,
  RarityTier,
  ListingStatus,
} from "./nft-filter-types";
import {
  enrichNFTsWithRarity,
  calculateTraitRarities,
  calculateRarityRanks,
  calculateNFTRarity,
} from "./nft-rarity-utils";

export type EnrichedNFT = NFTListing & {
  rarity: {
    score: number;
    rank: number;
    tier: RarityTier;
  };
};

/**
 * Apply all filters to NFT array
 */
export function applyFilters(
  nfts: NFTListing[],
  filters: AdvancedFilters
): EnrichedNFT[] {
  // First enrich with rarity data
  let filtered = enrichNFTsWithRarity(nfts);

  // Apply search query
  if (filters.searchQuery && filters.searchQuery.trim()) {
    filtered = applySearchFilter(filtered, filters.searchQuery);
  }

  // Apply price filters
  filtered = applyPriceFilter(filtered, filters.price);

  // Apply collection filters
  if (filters.collections.selectedCollections.length > 0) {
    filtered = applyCollectionFilter(filtered, filters.collections);
  }

  // Apply trait filters
  if (Object.keys(filters.traits).length > 0) {
    filtered = applyTraitFilter(filtered, filters.traits);
  }

  // Apply rarity filters
  if (
    filters.rarity.tiers.length > 0 ||
    filters.rarity.minScore !== undefined ||
    filters.rarity.maxScore !== undefined ||
    filters.rarity.minRank !== undefined ||
    filters.rarity.maxRank !== undefined
  ) {
    filtered = applyRarityFilter(filtered, filters.rarity);
  }

  // Apply status filters
  if (filters.status.statuses.length > 0) {
    filtered = applyStatusFilter(filtered, filters.status);
  }

  // Apply media filters
  if (filters.media.types.length > 0) {
    filtered = applyMediaFilter(filtered, filters.media);
  }

  // Apply activity filters
  filtered = applyActivityFilter(filtered, filters.activity);

  // Apply sorting
  filtered = applySorting(filtered, filters.sort);

  return filtered;
}

/**
 * Apply search filter
 */
function applySearchFilter(nfts: EnrichedNFT[], query: string): EnrichedNFT[] {
  const lowerQuery = query.toLowerCase().trim();

  return nfts.filter((nft) => {
    const searchFields = [
      nft.name,
      nft.description,
      nft.collection.name,
      nft.id,
      nft.owner.address,
    ].filter(Boolean);

    // Also search in attributes
    if (nft.attributes && Array.isArray(nft.attributes)) {
      nft.attributes.forEach((attr) => {
        searchFields.push(attr.trait_type, String(attr.value));
      });
    }

    return searchFields.some((field) =>
      field.toLowerCase().includes(lowerQuery)
    );
  });
}

/**
 * Apply price filter
 */
function applyPriceFilter(
  nfts: EnrichedNFT[],
  priceFilter: AdvancedFilters["price"]
): EnrichedNFT[] {
  return nfts.filter((nft) => {
    let price: number;
    switch (priceFilter.currency) {
      case "ETH":
        price = nft.priceInETH;
        break;
      case "RAIN":
        price = nft.priceInRAIN;
        break;
      case "USD":
        price = nft.priceInUSD;
        break;
      default:
        price = nft.priceInETH;
    }

    return price >= priceFilter.min && price <= priceFilter.max;
  });
}

/**
 * Apply collection filter
 */
function applyCollectionFilter(
  nfts: EnrichedNFT[],
  collectionFilter: AdvancedFilters["collections"]
): EnrichedNFT[] {
  return nfts.filter((nft) => {
    return collectionFilter.selectedCollections.includes(nft.collection.slug);
  });
}

/**
 * Apply trait filter
 */
function applyTraitFilter(
  nfts: EnrichedNFT[],
  traitFilter: AdvancedFilters["traits"]
): EnrichedNFT[] {
  return nfts.filter((nft) => {
    if (!nft.attributes || !Array.isArray(nft.attributes)) return false;

    // NFT must have at least one of the selected values for each trait type
    return Object.entries(traitFilter).every(([traitType, selectedValues]) => {
      if (selectedValues.length === 0) return true;

      return nft.attributes!.some(
        (attr) =>
          attr.trait_type === traitType &&
          selectedValues.includes(String(attr.value))
      );
    });
  });
}

/**
 * Apply rarity filter
 */
function applyRarityFilter(
  nfts: EnrichedNFT[],
  rarityFilter: AdvancedFilters["rarity"]
): EnrichedNFT[] {
  return nfts.filter((nft) => {
    const { score, rank, tier } = nft.rarity;

    // Check tier filter
    if (rarityFilter.tiers.length > 0 && !rarityFilter.tiers.includes(tier)) {
      return false;
    }

    // Check score range
    if (
      rarityFilter.minScore !== undefined &&
      score < rarityFilter.minScore
    ) {
      return false;
    }
    if (
      rarityFilter.maxScore !== undefined &&
      score > rarityFilter.maxScore
    ) {
      return false;
    }

    // Check rank range
    if (rarityFilter.minRank !== undefined && rank < rarityFilter.minRank) {
      return false;
    }
    if (rarityFilter.maxRank !== undefined && rank > rarityFilter.maxRank) {
      return false;
    }

    // Check top percentage
    if (rarityFilter.topPercentage !== undefined) {
      const totalNFTs = nfts.length;
      const topNCount = Math.ceil((rarityFilter.topPercentage / 100) * totalNFTs);
      if (rank > topNCount) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Apply status filter (placeholder - would need API data)
 */
function applyStatusFilter(
  nfts: EnrichedNFT[],
  statusFilter: AdvancedFilters["status"]
): EnrichedNFT[] {
  // For now, just return all NFTs as most status data would come from API
  // In a real implementation, you'd check listing type, auction status, etc.
  return nfts;
}

/**
 * Apply media filter (placeholder - would need metadata)
 */
function applyMediaFilter(
  nfts: EnrichedNFT[],
  mediaFilter: AdvancedFilters["media"]
): EnrichedNFT[] {
  // Would need to check image_url extension or metadata
  return nfts.filter((nft) => {
    if (mediaFilter.types.length === 0) return true;

    const imageUrl = nft.image_url.toLowerCase();

    for (const type of mediaFilter.types) {
      switch (type) {
        case "image":
          if (
            imageUrl.endsWith(".png") ||
            imageUrl.endsWith(".jpg") ||
            imageUrl.endsWith(".jpeg") ||
            imageUrl.endsWith(".svg") ||
            imageUrl.endsWith(".gif")
          ) {
            return true;
          }
          break;
        case "video":
          if (
            imageUrl.endsWith(".mp4") ||
            imageUrl.endsWith(".webm") ||
            imageUrl.endsWith(".mov")
          ) {
            return true;
          }
          break;
        case "animated":
          if (imageUrl.endsWith(".gif") || imageUrl.includes("animation")) {
            return true;
          }
          break;
      }
    }

    return false;
  });
}

/**
 * Apply activity filter (placeholder - would need historical data)
 */
function applyActivityFilter(
  nfts: EnrichedNFT[],
  activityFilter: AdvancedFilters["activity"]
): EnrichedNFT[] {
  // Would need sales history, transfer data, etc. from API
  return nfts;
}

/**
 * Apply sorting
 */
function applySorting(nfts: EnrichedNFT[], sortOption: SortOption): EnrichedNFT[] {
  const sorted = [...nfts];

  switch (sortOption) {
    case "price_low_high":
      sorted.sort((a, b) => a.priceInETH - b.priceInETH);
      break;
    case "price_high_low":
      sorted.sort((a, b) => b.priceInETH - a.priceInETH);
      break;
    case "rarity_rare_common":
      sorted.sort((a, b) => a.rarity.rank - b.rarity.rank);
      break;
    case "rarity_common_rare":
      sorted.sort((a, b) => b.rarity.rank - a.rarity.rank);
      break;
    case "alphabetical_az":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "alphabetical_za":
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "recently_listed":
    case "recently_created":
    case "recently_sold":
    case "ending_soon":
    case "most_viewed":
    case "most_favorited":
    case "highest_last_sale":
      // These would need timestamp/analytics data from API
      // For now, maintain current order
      break;
  }

  return sorted;
}

/**
 * Get active filter count
 */
export function getActiveFilterCount(filters: AdvancedFilters): number {
  let count = 0;

  if (filters.searchQuery.trim()) count++;
  if (filters.collections.selectedCollections.length > 0) count++;
  if (Object.keys(filters.traits).some((key) => filters.traits[key].length > 0))
    count++;
  if (filters.rarity.tiers.length > 0) count++;
  if (filters.status.statuses.length > 0) count++;
  if (filters.media.types.length > 0) count++;

  return count;
}

/**
 * Clear all filters
 */
export function clearAllFilters(filters: AdvancedFilters): AdvancedFilters {
  return {
    price: {
      min: 0,
      max: 100,
      currency: "ETH",
      includeAuctions: true,
    },
    collections: {
      selectedCollections: [],
      verifiedOnly: false,
    },
    traits: {},
    rarity: {
      tiers: [],
    },
    status: {
      statuses: ["buy_now"],
    },
    media: {
      types: [],
    },
    activity: {},
    sort: filters.sort, // Keep current sort
    searchQuery: "",
  };
}

/**
 * Get filter summary text
 */
export function getFilterSummary(filters: AdvancedFilters): string[] {
  const summary: string[] = [];

  if (filters.searchQuery.trim()) {
    summary.push(`Search: "${filters.searchQuery}"`);
  }

  if (filters.collections.selectedCollections.length > 0) {
    summary.push(
      `Collections: ${filters.collections.selectedCollections.length} selected`
    );
  }

  const traitCount = Object.values(filters.traits).flat().length;
  if (traitCount > 0) {
    summary.push(`Traits: ${traitCount} selected`);
  }

  if (filters.rarity.tiers.length > 0) {
    summary.push(`Rarity: ${filters.rarity.tiers.join(", ")}`);
  }

  if (filters.price.min > 0 || filters.price.max < 100) {
    summary.push(
      `Price: ${filters.price.min}-${filters.price.max} ${filters.price.currency}`
    );
  }

  return summary;
}
