import { NFTTrait, NFTRarity, RarityTier } from "./nft-filter-types";
import { NFTListing } from "./opensea-api";

/**
 * Extract all unique traits from a collection of NFTs
 */
export function extractTraitsFromCollection(nfts: NFTListing[]): Map<string, Set<string>> {
  const traitsMap = new Map<string, Set<string>>();

  nfts.forEach((nft) => {
    if (nft.attributes && Array.isArray(nft.attributes)) {
      nft.attributes.forEach((attr) => {
        const traitType = attr.trait_type;
        const value = String(attr.value);

        if (!traitsMap.has(traitType)) {
          traitsMap.set(traitType, new Set());
        }
        traitsMap.get(traitType)!.add(value);
      });
    }
  });

  return traitsMap;
}

/**
 * Count trait occurrences in a collection
 */
export function countTraitOccurrences(
  nfts: NFTListing[]
): Map<string, Map<string, number>> {
  const traitCounts = new Map<string, Map<string, number>>();

  nfts.forEach((nft) => {
    if (nft.attributes && Array.isArray(nft.attributes)) {
      nft.attributes.forEach((attr) => {
        const traitType = attr.trait_type;
        const value = String(attr.value);

        if (!traitCounts.has(traitType)) {
          traitCounts.set(traitType, new Map());
        }

        const valueMap = traitCounts.get(traitType)!;
        valueMap.set(value, (valueMap.get(value) || 0) + 1);
      });
    }
  });

  return traitCounts;
}

/**
 * Calculate rarity percentage for each trait
 */
export function calculateTraitRarities(
  nfts: NFTListing[]
): Map<string, Map<string, number>> {
  const traitCounts = countTraitOccurrences(nfts);
  const rarities = new Map<string, Map<string, number>>();
  const totalNFTs = nfts.length;

  traitCounts.forEach((valueCounts, traitType) => {
    const rarityMap = new Map<string, number>();
    valueCounts.forEach((count, value) => {
      const rarity = (count / totalNFTs) * 100;
      rarityMap.set(value, rarity);
    });
    rarities.set(traitType, rarityMap);
  });

  return rarities;
}

/**
 * Calculate rarity score for an NFT based on its traits
 * Lower score = more rare
 */
export function calculateRarityScore(
  nft: NFTListing,
  traitRarities: Map<string, Map<string, number>>
): number {
  if (!nft.attributes || !Array.isArray(nft.attributes) || nft.attributes.length === 0) {
    return 100; // Common if no attributes
  }

  let totalScore = 0;
  let validTraits = 0;

  nft.attributes.forEach((attr) => {
    const traitType = attr.trait_type;
    const value = String(attr.value);

    const rarityMap = traitRarities.get(traitType);
    if (rarityMap) {
      const rarity = rarityMap.get(value);
      if (rarity !== undefined) {
        totalScore += rarity;
        validTraits++;
      }
    }
  });

  return validTraits > 0 ? totalScore / validTraits : 100;
}

/**
 * Calculate rarity ranks for all NFTs in a collection
 */
export function calculateRarityRanks(nfts: NFTListing[]): Map<string, number> {
  const traitRarities = calculateTraitRarities(nfts);
  const nftScores: Array<{ id: string; score: number }> = [];

  nfts.forEach((nft) => {
    const score = calculateRarityScore(nft, traitRarities);
    nftScores.push({ id: nft.id, score });
  });

  // Sort by score (ascending = more rare)
  nftScores.sort((a, b) => a.score - b.score);

  const ranks = new Map<string, number>();
  nftScores.forEach((item, index) => {
    ranks.set(item.id, index + 1);
  });

  return ranks;
}

/**
 * Determine rarity tier based on score
 */
export function getRarityTier(score: number): RarityTier {
  if (score <= 5) return "Mythic";
  if (score <= 15) return "Legendary";
  if (score <= 30) return "Epic";
  if (score <= 50) return "Rare";
  if (score <= 75) return "Uncommon";
  return "Common";
}

/**
 * Get rarity tier color
 */
export function getRarityColor(tier: RarityTier): string {
  const colors: Record<RarityTier, string> = {
    Mythic: "text-blue-600 bg-blue-100 border-blue-500",
    Legendary: "text-blue-500 bg-blue-50 border-blue-400",
    Epic: "text-blue-700 bg-blue-200 border-blue-600",
    Rare: "text-blue-600 bg-blue-100 border-blue-500",
    Uncommon: "text-gray-600 bg-gray-100 border-gray-500",
    Common: "text-gray-500 bg-gray-50 border-gray-400",
  };
  return colors[tier];
}

/**
 * Calculate full rarity data for an NFT
 */
export function calculateNFTRarity(
  nft: NFTListing,
  traitRarities: Map<string, Map<string, number>>,
  ranks: Map<string, number>
): NFTRarity {
  const score = calculateRarityScore(nft, traitRarities);
  const rank = ranks.get(nft.id) || 0;
  const tier = getRarityTier(score);

  return { score, rank, tier };
}

/**
 * Enrich NFT with rarity data
 */
export function enrichNFTsWithRarity(
  nfts: NFTListing[]
): Array<NFTListing & { rarity: NFTRarity }> {
  const traitRarities = calculateTraitRarities(nfts);
  const ranks = calculateRarityRanks(nfts);

  return nfts.map((nft) => ({
    ...nft,
    rarity: calculateNFTRarity(nft, traitRarities, ranks),
  }));
}

/**
 * Get trait rarity for display
 */
export function getTraitRarityPercentage(
  traitType: string,
  value: string,
  traitRarities: Map<string, Map<string, number>>
): number | null {
  const rarityMap = traitRarities.get(traitType);
  if (!rarityMap) return null;
  return rarityMap.get(value) || null;
}

/**
 * Find rarest trait in an NFT
 */
export function findRarestTrait(
  nft: NFTListing,
  traitRarities: Map<string, Map<string, number>>
): { trait_type: string; value: string; rarity: number } | null {
  if (!nft.attributes || !Array.isArray(nft.attributes)) return null;

  let rarestTrait: { trait_type: string; value: string; rarity: number } | null = null;
  let lowestRarity = 100;

  nft.attributes.forEach((attr) => {
    const rarity = getTraitRarityPercentage(
      attr.trait_type,
      String(attr.value),
      traitRarities
    );
    if (rarity !== null && rarity < lowestRarity) {
      lowestRarity = rarity;
      rarestTrait = {
        trait_type: attr.trait_type,
        value: String(attr.value),
        rarity,
      };
    }
  });

  return rarestTrait;
}

/**
 * Get similar NFTs based on shared traits
 */
export function findSimilarNFTs(
  targetNft: NFTListing,
  allNfts: NFTListing[],
  minSharedTraits: number = 2,
  limit: number = 10
): NFTListing[] {
  if (!targetNft.attributes || !Array.isArray(targetNft.attributes)) return [];

  const targetTraits = new Set(
    targetNft.attributes.map((attr) => `${attr.trait_type}:${attr.value}`)
  );

  const similarities = allNfts
    .filter((nft) => nft.id !== targetNft.id)
    .map((nft) => {
      if (!nft.attributes || !Array.isArray(nft.attributes)) {
        return { nft, sharedTraits: 0 };
      }

      const nftTraits = new Set(
        nft.attributes.map((attr) => `${attr.trait_type}:${attr.value}`)
      );

      const sharedTraits = Array.from(targetTraits).filter((trait) =>
        nftTraits.has(trait)
      ).length;

      return { nft, sharedTraits };
    })
    .filter((item) => item.sharedTraits >= minSharedTraits)
    .sort((a, b) => b.sharedTraits - a.sharedTraits)
    .slice(0, limit)
    .map((item) => item.nft);

  return similarities;
}
