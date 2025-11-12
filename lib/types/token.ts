/**
 * Token Types (Wallet)
 */

export enum VMType {
  EVM = 'evm',
  MOVE = 'move',
}

export enum TokenStandard {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  MOVE_COIN = 'MOVE_COIN',
  NATIVE = 'NATIVE',
}

export interface Token {
  address: string;
  vm: VMType;
  standard: TokenStandard;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
  balanceUSD?: number;
}
