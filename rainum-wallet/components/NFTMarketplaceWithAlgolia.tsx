"use client";

import { InstantSearch, Configure } from "react-instantsearch";
import { searchClient, INDEX_NAME, isAlgoliaConfigured } from "@/lib/algolia-client";
import NFTMarketplace from "./NFTMarketplace";

export default function NFTMarketplaceWithAlgolia() {
  // Check if Algolia is configured
  const algoliaEnabled = isAlgoliaConfigured();

  if (!algoliaEnabled) {
    console.warn('⚠️  Algolia not configured. Using fallback search.');
    // Return regular NFTMarketplace without Algolia
    return <NFTMarketplace useAlgolia={false} />;
  }

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={INDEX_NAME}
      future={{
        preserveSharedStateOnUnmount: true,
      }}
    >
      {/* Configure search parameters */}
      <Configure
        hitsPerPage={24}
        analytics={true}
        enablePersonalization={true}
        distinct
        clickAnalytics
      />

      <NFTMarketplace useAlgolia={true} />
    </InstantSearch>
  );
}
