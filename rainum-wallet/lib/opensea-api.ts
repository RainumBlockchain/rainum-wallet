/**
 * OpenSea API v2 Integration
 * Docs: https://docs.opensea.io/reference/api-overview
 */

const OPENSEA_API_BASE = "https://api.opensea.io/api/v2";
const OPENSEA_API_KEY = process.env.NEXT_PUBLIC_OPENSEA_API_KEY || "";

export interface OpenSeaNFT {
  identifier: string;
  collection: string;
  contract: string;
  token_standard: string;
  name: string;
  description: string;
  image_url: string;
  metadata_url: string;
  created_at: string;
  updated_at: string;
  is_disabled: boolean;
  is_nsfw: boolean;
}

export interface OpenSeaListing {
  order_hash: string;
  chain: string;
  price: {
    current: {
      currency: string;
      decimals: number;
      value: string;
    };
  };
  protocol_data: {
    parameters: {
      offerer: string;
      offer: Array<any>;
      consideration: Array<any>;
    };
  };
}

export interface OpenSeaCollection {
  collection: string;
  name: string;
  description: string;
  image_url: string;
  banner_image_url: string;
  owner: string;
  safelist_status: string;
  category: string;
  is_disabled: boolean;
  is_nsfw: boolean;
  trait_offers_enabled: boolean;
  total_supply: number;
  created_date: string;
}

/**
 * Get popular collection slugs for fetching listings
 */
export function getPopularCollections(): string[] {
  return [
    "boredapeyachtclub",
    "mutant-ape-yacht-club",
    "azuki",
    "clonex",
    "doodles-official",
    "cool-cats-nft",
    "moonbirds",
    "proof-moonbirds",
    "pudgypenguins",
    "veefriends",
  ];
}

/**
 * Fetch all listings from multiple popular collections
 */
export async function getAllMarketplaceListings(
  limit: number = 50,
  next?: string,
  collection?: string
): Promise<{
  listings: { nft: OpenSeaNFT; listing: OpenSeaListing }[];
  next: string | null;
}> {
  try {
    console.log("[OpenSea API] Starting getAllMarketplaceListings...");
    console.log("[OpenSea API] Fetching via server API route...");

    // Use our Next.js API route instead of calling OpenSea directly
    // This avoids CORS issues and allows us to combine listing + NFT data
    const collectionSlug = collection || "all";
    let url = `/api/nft-marketplace?collection=${collectionSlug}&limit=${limit}`;
    if (next) {
      url += `&next=${encodeURIComponent(next)}`;
    }

    console.log("[OpenSea API] Calling:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[OpenSea API] Got", data.listings?.length || 0, "listings");

    return {
      listings: data.listings || [],
      next: data.next || null,
    };
  } catch (error) {
    console.error("[OpenSea API] Error fetching marketplace listings:", error);
    return { listings: [], next: null };
  }
}

/**
 * Get listings for a specific collection with pagination
 */
export async function getCollectionListings(
  collectionSlug: string,
  limit: number = 100,
  next?: string
): Promise<{
  listings: { nft: OpenSeaNFT; listing: OpenSeaListing }[];
  next: string | null;
}> {
  try {
    if (!OPENSEA_API_KEY || OPENSEA_API_KEY === "") {
      console.log("[OpenSea API] No API key in getCollectionListings");
      return { listings: [], next: null };
    }

    let url = `${OPENSEA_API_BASE}/listings/collection/${collectionSlug}/all?limit=${limit}`;
    if (next) {
      url += `&next=${next}`;
    }

    console.log("[OpenSea API] Fetching URL:", url);
    console.log("[OpenSea API] Using API key:", OPENSEA_API_KEY.substring(0, 8) + "...");

    const response = await fetch(url, {
      headers: {
        "X-API-KEY": OPENSEA_API_KEY,
      },
    });

    console.log("[OpenSea API] Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[OpenSea API] Error response:", errorText);
      throw new Error(`OpenSea API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log("[OpenSea API] Response data keys:", Object.keys(data));
    console.log("[OpenSea API] Listings count:", data.listings?.length || 0);

    return {
      listings: data.listings || [],
      next: data.next || null,
    };
  } catch (error) {
    console.error("[OpenSea API] Error fetching collection listings:", error);
    return { listings: [], next: null };
  }
}

/**
 * Get NFTs owned by a specific address
 */
export async function getNFTsByAddress(
  address: string,
  chain: string = "ethereum",
  limit: number = 50
): Promise<OpenSeaNFT[]> {
  try {
    const response = await fetch(
      `${OPENSEA_API_BASE}/chain/${chain}/account/${address}/nfts?limit=${limit}`,
      {
        headers: {
          "X-API-KEY": OPENSEA_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenSea API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.nfts || [];
  } catch (error) {
    console.error("Error fetching NFTs by address:", error);
    return [];
  }
}

/**
 * Get a single NFT by contract and token ID
 */
export async function getNFT(
  chain: string,
  contractAddress: string,
  tokenId: string
): Promise<OpenSeaNFT | null> {
  try {
    const response = await fetch(
      `${OPENSEA_API_BASE}/chain/${chain}/contract/${contractAddress}/nfts/${tokenId}`,
      {
        headers: {
          "X-API-KEY": OPENSEA_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenSea API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.nft || null;
  } catch (error) {
    console.error("Error fetching NFT:", error);
    return null;
  }
}

/**
 * Search NFTs
 */
export async function searchNFTs(query: string, limit: number = 20): Promise<OpenSeaNFT[]> {
  try {
    // Note: OpenSea v2 search is limited - this is a basic implementation
    const response = await fetch(
      `${OPENSEA_API_BASE}/nfts?search=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          "X-API-KEY": OPENSEA_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenSea API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.nfts || [];
  } catch (error) {
    console.error("Error searching NFTs:", error);
    return [];
  }
}

/**
 * Get collection stats
 */
export async function getCollectionStats(collectionSlug: string) {
  try {
    const response = await fetch(
      `${OPENSEA_API_BASE}/collections/${collectionSlug}/stats`,
      {
        headers: {
          "X-API-KEY": OPENSEA_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenSea API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.stats || null;
  } catch (error) {
    console.error("Error fetching collection stats:", error);
    return null;
  }
}

/**
 * Convert Wei to ETH
 */
export function weiToEth(wei: string): number {
  return parseFloat(wei) / 1e18;
}

/**
 * Format NFT price from OpenSea listing
 */
export function formatNFTPrice(listing: OpenSeaListing): number {
  if (!listing?.price?.current) return 0;
  const { value, decimals } = listing.price.current;
  return parseFloat(value) / Math.pow(10, decimals);
}
