import { getAdminClient, INDEX_NAME, configureIndex } from './algolia-client';

export interface NFTRecord {
  objectID: string;
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
  verified?: boolean;
  attributes?: Array<{ trait_type: string; value: string }>;
  created_at?: number;
  updated_at?: number;
}

/**
 * Index a single NFT to Algolia (v5 API)
 */
export async function indexNFT(nft: Omit<NFTRecord, 'objectID' | 'created_at' | 'updated_at'>): Promise<void> {
  const client = getAdminClient();
  if (!client) {
    console.error('Algolia admin client not available');
    return;
  }

  try {
    const record: NFTRecord = {
      objectID: nft.id,
      ...nft,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    await client.saveObject({
      indexName: INDEX_NAME,
      body: record,
    });
    console.log(`✅ Indexed NFT: ${nft.name} (${nft.id})`);
  } catch (error) {
    console.error(`❌ Error indexing NFT ${nft.id}:`, error);
    throw error;
  }
}

/**
 * Index multiple NFTs to Algolia in batch (v5 API)
 */
export async function indexNFTs(nfts: Omit<NFTRecord, 'objectID' | 'created_at' | 'updated_at'>[]): Promise<void> {
  const client = getAdminClient();
  if (!client) {
    console.error('Algolia admin client not available');
    return;
  }

  try {
    const records: NFTRecord[] = nfts.map((nft) => ({
      objectID: nft.id,
      ...nft,
      created_at: Date.now(),
      updated_at: Date.now(),
    }));

    await client.saveObjects({
      indexName: INDEX_NAME,
      objects: records,
    });
    console.log(`✅ Indexed ${records.length} NFTs to Algolia`);
  } catch (error) {
    console.error('❌ Error batch indexing NFTs:', error);
    throw error;
  }
}

/**
 * Update an NFT in Algolia (v5 API)
 */
export async function updateNFT(
  nftId: string,
  updates: Partial<Omit<NFTRecord, 'objectID' | 'id' | 'created_at'>>
): Promise<void> {
  const client = getAdminClient();
  if (!client) {
    console.error('Algolia admin client not available');
    return;
  }

  try {
    await client.partialUpdateObject({
      indexName: INDEX_NAME,
      objectID: nftId,
      attributesToUpdate: {
        ...updates,
        updated_at: Date.now(),
      },
    });
    console.log(`✅ Updated NFT: ${nftId}`);
  } catch (error) {
    console.error(`❌ Error updating NFT ${nftId}:`, error);
    throw error;
  }
}

/**
 * Delete an NFT from Algolia (v5 API)
 */
export async function deleteNFT(nftId: string): Promise<void> {
  const client = getAdminClient();
  if (!client) {
    console.error('Algolia admin client not available');
    return;
  }

  try {
    await client.deleteObject({
      indexName: INDEX_NAME,
      objectID: nftId,
    });
    console.log(`✅ Deleted NFT: ${nftId}`);
  } catch (error) {
    console.error(`❌ Error deleting NFT ${nftId}:`, error);
    throw error;
  }
}

/**
 * Delete multiple NFTs from Algolia (v5 API)
 */
export async function deleteNFTs(nftIds: string[]): Promise<void> {
  const client = getAdminClient();
  if (!client) {
    console.error('Algolia admin client not available');
    return;
  }

  try {
    await client.deleteObjects({
      indexName: INDEX_NAME,
      objectIDs: nftIds,
    });
    console.log(`✅ Deleted ${nftIds.length} NFTs from Algolia`);
  } catch (error) {
    console.error('❌ Error batch deleting NFTs:', error);
    throw error;
  }
}

/**
 * Clear all NFTs from Algolia index (v5 API)
 */
export async function clearAllNFTs(): Promise<void> {
  const client = getAdminClient();
  if (!client) {
    console.error('Algolia admin client not available');
    return;
  }

  try {
    await client.clearObjects({
      indexName: INDEX_NAME,
    });
    console.log('✅ Cleared all NFTs from Algolia index');
  } catch (error) {
    console.error('❌ Error clearing Algolia index:', error);
    throw error;
  }
}

/**
 * Initialize Algolia index with settings
 */
export async function initializeAlgoliaIndex(): Promise<void> {
  const client = getAdminClient();
  if (!client) {
    console.error('Algolia admin client not available');
    return;
  }

  try {
    console.log('🔧 Configuring Algolia index settings...');
    await configureIndex();
    console.log('✅ Algolia index initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Algolia index:', error);
    throw error;
  }
}

/**
 * Sync NFTs from OpenSea to Algolia
 */
export async function syncNFTsToAlgolia(
  nfts: Omit<NFTRecord, 'objectID' | 'created_at' | 'updated_at'>[]
): Promise<{ success: boolean; indexed: number; errors: number }> {
  const client = getAdminClient();
  if (!client) {
    console.error('Algolia admin client not available');
    return { success: false, indexed: 0, errors: 0 };
  }

  let indexed = 0;
  let errors = 0;

  try {
    // Batch index in chunks of 1000 (Algolia's limit)
    const BATCH_SIZE = 1000;
    for (let i = 0; i < nfts.length; i += BATCH_SIZE) {
      const batch = nfts.slice(i, i + BATCH_SIZE);
      try {
        await indexNFTs(batch);
        indexed += batch.length;
      } catch (error) {
        console.error(`❌ Error indexing batch ${i / BATCH_SIZE + 1}:`, error);
        errors += batch.length;
      }
    }

    console.log(`✅ Sync complete: ${indexed} indexed, ${errors} errors`);
    return { success: errors === 0, indexed, errors };
  } catch (error) {
    console.error('❌ Error syncing NFTs to Algolia:', error);
    return { success: false, indexed, errors: nfts.length - indexed };
  }
}
