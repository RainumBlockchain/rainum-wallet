import { NextRequest, NextResponse } from "next/server";

const OPENSEA_API_BASE = "https://api.opensea.io/api/v2";
const OPENSEA_API_KEY = process.env.NEXT_PUBLIC_OPENSEA_API_KEY || "";

interface OpenSeaListing {
  order_hash: string;
  chain: string;
  protocol_data: {
    parameters: {
      offerer: string;
      offer: Array<{
        itemType: number;
        token: string;
        identifierOrCriteria: string;
        startAmount: string;
        endAmount: string;
      }>;
      consideration: Array<any>;
    };
  };
  price: {
    current: {
      currency: string;
      decimals: number;
      value: string;
    };
  };
}

interface OpenSeaNFT {
  identifier: string;
  collection: string;
  contract: string;
  name: string;
  description?: string;
  image_url: string;
  display_image_url?: string;
  opensea_url: string;
  rarity?: {
    rank: number;
  };
  traits?: Array<{
    trait_type: string;
    value: string;
  }>;
}

const POPULAR_COLLECTIONS = [
  "boredapeyachtclub",
  "mutant-ape-yacht-club",
  "azuki",
  "clonex",
  "doodles-official",
  "cool-cats-nft",
  "moonbirds",
  "pudgypenguins",
  "veefriends",
  "cryptopunks",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const collection = searchParams.get("collection") || "all";
    const limit = parseInt(searchParams.get("limit") || "20");
    const next = searchParams.get("next") || "";

    console.log("[NFT API] Fetching collection:", collection, "limit:", limit);

    if (!OPENSEA_API_KEY) {
      console.log("[NFT API] No API key configured");
      return NextResponse.json({ listings: [], next: null });
    }

    // If "all" collections, fetch from multiple collections
    if (collection === "all") {
      const allListings: any[] = [];
      const collectionsToFetch = POPULAR_COLLECTIONS.slice(0, 3); // Fetch from first 3 collections to start

      for (const collectionSlug of collectionsToFetch) {
        const url = `${OPENSEA_API_BASE}/listings/collection/${collectionSlug}/all?limit=${Math.ceil(limit / collectionsToFetch.length)}`;

        try {
          const response = await fetch(url, {
            headers: { "X-API-KEY": OPENSEA_API_KEY },
            next: { revalidate: 60 },
          });

          if (response.ok) {
            const data = await response.json();
            allListings.push(...(data.listings || []));
          }
        } catch (err) {
          console.error(`[NFT API] Error fetching ${collectionSlug}:`, err);
        }
      }

      console.log("[NFT API] Got", allListings.length, "total listings from", collectionsToFetch.length, "collections");

      // Enrich listings
      const enriched = await Promise.all(
        allListings.slice(0, limit).map(async (listing) => {
          try {
            const offer = listing.protocol_data.parameters.offer[0];
            const nftUrl = `${OPENSEA_API_BASE}/chain/${listing.chain}/contract/${offer.token}/nfts/${offer.identifierOrCriteria}`;
            const nftResponse = await fetch(nftUrl, {
              headers: { "X-API-KEY": OPENSEA_API_KEY },
              next: { revalidate: 300 },
            });

            if (nftResponse.ok) {
              const nftData = await nftResponse.json();
              const nft = nftData.nft;
              return {
                nft: {
                  identifier: nft.identifier,
                  collection: nft.collection,
                  contract: nft.contract,
                  name: nft.name || `#${nft.identifier}`,
                  description: nft.description || "",
                  image_url: nft.display_image_url || nft.image_url,
                  opensea_url: nft.opensea_url,
                  rarity: nft.rarity?.rank,
                  traits: nft.traits,
                },
                listing: {
                  order_hash: listing.order_hash,
                  chain: listing.chain,
                  price: listing.price,
                  protocol_data: listing.protocol_data,
                },
              };
            }
          } catch (err) {
            console.error("[NFT API] Error enriching listing:", err);
          }
          return null;
        })
      );

      return NextResponse.json({
        listings: enriched.filter((item) => item !== null),
        next: null, // Pagination across multiple collections is complex, disable for now
      });
    }

    // Fetch from specific collection
    let url = `${OPENSEA_API_BASE}/listings/collection/${collection}/all?limit=${limit}`;
    if (next) {
      url += `&next=${next}`;
    }

    const listingsResponse = await fetch(url, {
      headers: {
        "X-API-KEY": OPENSEA_API_KEY,
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!listingsResponse.ok) {
      const errorText = await listingsResponse.text();
      console.error("[NFT API] Listings error:", errorText);
      throw new Error(`Failed to fetch listings: ${listingsResponse.statusText}`);
    }

    const listingsData = await listingsResponse.json();
    const listings = listingsData.listings || [];

    console.log("[NFT API] Got", listings.length, "listings");

    // Fetch NFT metadata for each listing
    const enrichedListings = await Promise.all(
      listings.map(async (listing: OpenSeaListing) => {
        try {
          // Extract token info from the listing
          const offer = listing.protocol_data.parameters.offer[0];
          const contractAddress = offer.token;
          const tokenId = offer.identifierOrCriteria;

          // Fetch NFT metadata
          const nftUrl = `${OPENSEA_API_BASE}/chain/${listing.chain}/contract/${contractAddress}/nfts/${tokenId}`;
          const nftResponse = await fetch(nftUrl, {
            headers: {
              "X-API-KEY": OPENSEA_API_KEY,
            },
            next: { revalidate: 300 }, // Cache for 5 minutes
          });

          if (!nftResponse.ok) {
            console.error("[NFT API] Failed to fetch NFT:", tokenId);
            return null;
          }

          const nftData = await nftResponse.json();
          const nft: OpenSeaNFT = nftData.nft;

          // Combine listing and NFT data
          return {
            nft: {
              identifier: nft.identifier,
              collection: nft.collection,
              contract: nft.contract,
              name: nft.name || `#${nft.identifier}`,
              description: nft.description || "",
              image_url: nft.display_image_url || nft.image_url,
              opensea_url: nft.opensea_url,
              rarity: nft.rarity?.rank,
              traits: nft.traits,
            },
            listing: {
              order_hash: listing.order_hash,
              chain: listing.chain,
              price: listing.price,
              protocol_data: listing.protocol_data,
            },
          };
        } catch (error) {
          console.error("[NFT API] Error enriching listing:", error);
          return null;
        }
      })
    );

    // Filter out failed enrichments
    const validListings = enrichedListings.filter((item) => item !== null);

    console.log("[NFT API] Returning", validListings.length, "enriched listings");

    return NextResponse.json({
      listings: validListings,
      next: listingsData.next || null,
    });
  } catch (error) {
    console.error("[NFT API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch NFT marketplace data" },
      { status: 500 }
    );
  }
}
