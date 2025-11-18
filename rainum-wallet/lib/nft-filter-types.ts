// Comprehensive NFT Filtering Types

export interface NFTTrait {
  trait_type: string;
  value: string;
  display_type?: string;
  max_value?: number;
  trait_count?: number;
  rarity_percentage?: number;
}

export interface NFTRarity {
  score: number;
  rank: number;
  tier: RarityTier;
}

export type RarityTier =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Epic"
  | "Legendary"
  | "Mythic";

export type ListingStatus =
  | "buy_now"
  | "auction"
  | "has_offers"
  | "new_listing"
  | "recently_sold"
  | "price_reduced";

export type MediaType =
  | "image"
  | "video"
  | "audio"
  | "3d_model"
  | "animated";

export type SortOption =
  | "recently_listed"
  | "recently_created"
  | "recently_sold"
  | "ending_soon"
  | "price_low_high"
  | "price_high_low"
  | "most_viewed"
  | "most_favorited"
  | "highest_last_sale"
  | "rarity_rare_common"
  | "rarity_common_rare"
  | "alphabetical_az"
  | "alphabetical_za";

export interface PriceFilter {
  min: number;
  max: number;
  currency: "ETH" | "RAIN" | "USD";
  includeAuctions: boolean;
}

export interface CollectionFilter {
  selectedCollections: string[];
  verifiedOnly: boolean;
  minFloorPrice?: number;
  maxFloorPrice?: number;
  minVolume?: number;
  collectionAge?: {
    min?: number; // days
    max?: number;
  };
}

export interface TraitFilter {
  [traitType: string]: string[]; // trait_type -> selected values
}

export interface RarityFilter {
  minScore?: number;
  maxScore?: number;
  minRank?: number;
  maxRank?: number;
  tiers: RarityTier[];
  topPercentage?: number; // Top 1%, 5%, 10%
}

export interface StatusFilter {
  statuses: ListingStatus[];
  newListingDays?: number; // Show listings from last N days
  priceReductionMin?: number; // Minimum % price reduction
}

export interface MediaFilter {
  types: MediaType[];
  hasUnlockableContent?: boolean;
  hasVideo?: boolean;
  hasAudio?: boolean;
  isAnimated?: boolean;
}

export interface ActivityFilter {
  minSalesCount?: number;
  maxSalesCount?: number;
  minOwners?: number;
  lastSaleDays?: number;
  minTransfers?: number;
  listingAgeDays?: {
    min?: number;
    max?: number;
  };
}

export interface AdvancedFilters {
  price: PriceFilter;
  collections: CollectionFilter;
  traits: TraitFilter;
  rarity: RarityFilter;
  status: StatusFilter;
  media: MediaFilter;
  activity: ActivityFilter;
  sort: SortOption;
  searchQuery: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filters: AdvancedFilters;
  createdAt: number;
  lastUsed: number;
  usageCount: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  filters: Partial<AdvancedFilters>;
}

// Default filter presets
export const DEFAULT_FILTER_PRESETS: FilterPreset[] = [
  {
    id: "trending",
    name: "Trending",
    description: "Popular NFTs with high activity",
    icon: "TrendingUp",
    filters: {
      sort: "most_viewed",
      status: {
        statuses: ["buy_now"],
        newListingDays: 7,
      },
      activity: {
        minSalesCount: 5,
      },
    },
  },
  {
    id: "new_cheap",
    name: "New & Cheap",
    description: "Recently listed affordable NFTs",
    icon: "Sparkles",
    filters: {
      sort: "recently_listed",
      status: {
        statuses: ["buy_now", "new_listing"],
        newListingDays: 3,
      },
      price: {
        min: 0,
        max: 0.1,
        currency: "ETH",
        includeAuctions: false,
      },
    },
  },
  {
    id: "rare_finds",
    name: "Rare Finds",
    description: "High rarity NFTs under market value",
    icon: "Gem",
    filters: {
      sort: "rarity_rare_common",
      rarity: {
        tiers: ["Epic", "Legendary", "Mythic"],
        topPercentage: 10,
      },
      status: {
        statuses: ["buy_now"],
      },
    },
  },
  {
    id: "floor_sweeps",
    name: "Floor Sweeps",
    description: "NFTs at or near collection floor",
    icon: "ArrowDown",
    filters: {
      sort: "price_low_high",
      status: {
        statuses: ["buy_now"],
      },
    },
  },
  {
    id: "recent_sales",
    name: "Recent Sales",
    description: "Recently sold NFTs to track market",
    icon: "ShoppingBag",
    filters: {
      sort: "recently_sold",
      status: {
        statuses: ["recently_sold"],
      },
      activity: {
        lastSaleDays: 7,
      },
    },
  },
];

// Default filter state
export const DEFAULT_FILTERS: AdvancedFilters = {
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
  sort: "recently_listed",
  searchQuery: "",
};
