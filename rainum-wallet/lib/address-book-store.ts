import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedAddress {
  id: string;
  name: string;
  address: string;
  addedAt: number;
  isFavorite?: boolean;
  walletAddress?: string; // Which wallet saved this address
}

interface AddressBookState {
  addresses: SavedAddress[];

  // Actions
  addAddress: (name: string, address: string, walletAddress: string) => void;
  updateAddress: (id: string, name: string, address: string) => void;
  deleteAddress: (id: string) => void;
  toggleFavorite: (id: string) => void;
  getFavorites: (walletAddress: string) => SavedAddress[];
  getAddressByName: (name: string, walletAddress: string) => SavedAddress | undefined;
  searchAddresses: (query: string, walletAddress: string) => SavedAddress[];
  getAddressesForWallet: (walletAddress: string) => SavedAddress[];
}

export const useAddressBookStore = create<AddressBookState>()(
  persist(
    (set, get) => ({
      addresses: [],

      addAddress: (name: string, address: string, walletAddress: string) => {
        const newAddress: SavedAddress = {
          id: Date.now().toString(),
          name,
          address: address.toLowerCase(),
          addedAt: Date.now(),
          walletAddress: walletAddress.toLowerCase(),
        };

        set((state) => ({
          addresses: [...state.addresses, newAddress],
        }));
      },

      updateAddress: (id: string, name: string, address: string) => {
        set((state) => ({
          addresses: state.addresses.map((addr) =>
            addr.id === id
              ? { ...addr, name, address: address.toLowerCase() }
              : addr
          ),
        }));
      },

      deleteAddress: (id: string) => {
        set((state) => ({
          addresses: state.addresses.filter((addr) => addr.id !== id),
        }));
      },

      toggleFavorite: (id: string) => {
        set((state) => ({
          addresses: state.addresses.map((addr) =>
            addr.id === id
              ? { ...addr, isFavorite: !addr.isFavorite }
              : addr
          ),
        }));
      },

      getAddressesForWallet: (walletAddress: string) => {
        const { addresses } = get();
        return addresses.filter(
          (addr) => addr.walletAddress?.toLowerCase() === walletAddress.toLowerCase()
        );
      },

      getFavorites: (walletAddress: string) => {
        const { addresses } = get();
        return addresses.filter(
          (addr) => addr.isFavorite && addr.walletAddress?.toLowerCase() === walletAddress.toLowerCase()
        );
      },

      getAddressByName: (name: string, walletAddress: string) => {
        const { addresses } = get();
        return addresses.find(
          (addr) =>
            addr.name.toLowerCase() === name.toLowerCase() &&
            addr.walletAddress?.toLowerCase() === walletAddress.toLowerCase()
        );
      },

      searchAddresses: (query: string, walletAddress: string) => {
        const { addresses } = get();
        const lowerQuery = query.toLowerCase();

        const walletAddresses = addresses.filter(
          (addr) => addr.walletAddress?.toLowerCase() === walletAddress.toLowerCase()
        );

        if (!lowerQuery) return walletAddresses;

        return walletAddresses.filter(
          (addr) =>
            addr.name.toLowerCase().includes(lowerQuery) ||
            addr.address.toLowerCase().includes(lowerQuery)
        );
      },
    }),
    {
      name: 'rainum-address-book',
    }
  )
);
