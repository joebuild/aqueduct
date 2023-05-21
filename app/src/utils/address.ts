import type { PublicKey } from '@solana/web3.js';

export const addressDisplay = (pubkey: PublicKey): string => {
  if (pubkey) {
    const addr = pubkey.toBase58();
    return addr.slice(0, 4) + '...' + addr.slice(-4);
  }
};

export const addressDisplayString = (addr: string): string => {
  if (addr.length) {
    return addr.slice(0, 4) + '...' + addr.slice(-4);
  }
  return '...';
};
