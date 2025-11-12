/**
 * Token Store (Wallet)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Token } from './types/token';

interface TokenStoreState {
  tokens: Token[];
  addToken: (token: Token) => void;
  removeToken: (address: string) => void;
}

export const useTokenStore = create<TokenStoreState>()(
  persist(
    (set) => ({
      tokens: [],
      addToken: (token) => set((state) => ({ tokens: [...state.tokens, token] })),
      removeToken: (address) =>
        set((state) => ({
          tokens: state.tokens.filter((t) => t.address !== address),
        })),
    }),
    { name: 'rainum-tokens' }
  )
);
