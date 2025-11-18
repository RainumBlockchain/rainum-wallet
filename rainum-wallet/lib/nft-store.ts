import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WatchlistNFT {
  id: string;
  name: string;
  image_url: string;
  collection: string;
  contract: string;
  tokenId: string;
  chain: string;
  addedAt: number;
  priceAlert?: {
    enabled: boolean;
    targetPrice: number; // in RAIN
    notified: boolean;
  };
}

interface NFTStore {
  watchlist: WatchlistNFT[];
  priceAlerts: Record<string, number>; // NFT ID -> target price in RAIN

  // Watchlist actions
  addToWatchlist: (nft: Omit<WatchlistNFT, "addedAt">) => void;
  removeFromWatchlist: (nftId: string) => void;
  isInWatchlist: (nftId: string) => boolean;
  clearWatchlist: () => void;

  // Price alert actions
  setPriceAlert: (nftId: string, targetPrice: number) => void;
  removePriceAlert: (nftId: string) => void;
  getPriceAlert: (nftId: string) => number | undefined;
  checkPriceAlerts: (nftId: string, currentPrice: number) => boolean;
}

export const useNFTStore = create<NFTStore>()(
  persist(
    (set, get) => ({
      watchlist: [],
      priceAlerts: {},

      addToWatchlist: (nft) => {
        const { watchlist } = get();
        if (!watchlist.find((item) => item.id === nft.id)) {
          set({
            watchlist: [
              ...watchlist,
              {
                ...nft,
                addedAt: Date.now(),
              },
            ],
          });
        }
      },

      removeFromWatchlist: (nftId) => {
        set({
          watchlist: get().watchlist.filter((nft) => nft.id !== nftId),
        });
      },

      isInWatchlist: (nftId) => {
        return get().watchlist.some((nft) => nft.id === nftId);
      },

      clearWatchlist: () => {
        set({ watchlist: [] });
      },

      setPriceAlert: (nftId, targetPrice) => {
        const priceAlerts = { ...get().priceAlerts };
        priceAlerts[nftId] = targetPrice;
        set({ priceAlerts });

        // Update watchlist item if it exists
        const watchlist = get().watchlist.map((nft) =>
          nft.id === nftId
            ? {
                ...nft,
                priceAlert: {
                  enabled: true,
                  targetPrice,
                  notified: false,
                },
              }
            : nft
        );
        set({ watchlist });
      },

      removePriceAlert: (nftId) => {
        const priceAlerts = { ...get().priceAlerts };
        delete priceAlerts[nftId];
        set({ priceAlerts });

        // Update watchlist item
        const watchlist = get().watchlist.map((nft) =>
          nft.id === nftId ? { ...nft, priceAlert: undefined } : nft
        );
        set({ watchlist });
      },

      getPriceAlert: (nftId) => {
        return get().priceAlerts[nftId];
      },

      checkPriceAlerts: (nftId, currentPrice) => {
        const targetPrice = get().priceAlerts[nftId];
        if (!targetPrice) return false;
        return currentPrice <= targetPrice;
      },
    }),
    {
      name: "rainum-nft-storage",
    }
  )
);
