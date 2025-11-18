import { algoliasearch } from 'algoliasearch';

export const INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'nft_marketplace';

// Client-side search client (read-only) - for react-instantsearch
export const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '',
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || ''
);

// Admin client for indexing (server-side only)
export const getAdminClient = () => {
  if (typeof window !== 'undefined') {
    return null;
  }

  return algoliasearch(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '',
    process.env.ALGOLIA_ADMIN_API_KEY || ''
  );
};

// Configure index settings (v5 API)
export const configureIndex = async () => {
  const client = getAdminClient();
  if (!client) {
    console.error('Admin client not available');
    return;
  }

  try {
    await client.setSettings({
      indexName: INDEX_NAME,
      indexSettings: {
        // Searchable attributes with priority
        searchableAttributes: [
          'name',
          'collection.name',
          'description',
          'attributes.value',
          'owner.address',
        ],

        // Attributes for faceting
        attributesForFaceting: [
          'filterOnly(collection.slug)',
          'filterOnly(collection.name)',
          'searchable(collection.name)',
          'priceInRAIN',
          'priceInETH',
          'priceInUSD',
          'attributes.trait_type',
          'attributes.value',
          'verified',
        ],

        // Custom ranking
        customRanking: [
          'desc(rarity)',
          'asc(priceInRAIN)',
          'desc(created_at)',
        ],

        // Typo tolerance
        typoTolerance: 'true',
        minWordSizefor1Typo: 4,
        minWordSizefor2Typos: 8,

        // Highlighting
        attributesToHighlight: [
          'name',
          'collection.name',
          'description',
        ],

        // Snippeting for long descriptions
        attributesToSnippet: [
          'description:50',
        ],

        // Distinct
        distinct: 1,
        attributeForDistinct: 'id',

        // Ranking
        ranking: [
          'typo',
          'geo',
          'words',
          'filters',
          'proximity',
          'attribute',
          'exact',
          'custom',
        ],

        // Pagination
        hitsPerPage: 24,
        paginationLimitedTo: 1000,

        // Remove words if no results
        removeWordsIfNoResults: 'allOptional',
      },
    });

    console.log('✅ Algolia index settings configured successfully');
  } catch (error) {
    console.error('❌ Error configuring Algolia index:', error);
  }
};

// Helper to check if Algolia is properly configured
export const isAlgoliaConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID &&
    process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY &&
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID !== 'YOUR_ALGOLIA_APP_ID'
  );
};
