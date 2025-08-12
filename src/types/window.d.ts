// src/types/window.d.ts
import type { Connection, PublicKey } from '@solana/web3.js';
import type { getAccount } from '@solana/spl-token';

declare global {
  interface Window {
    __SOLANA_WEB3__?: {
      Connection: typeof Connection;
      PublicKey: typeof PublicKey;
      getAccount: typeof getAccount;
    };
    __ETHEREUM_WEB3__?: {
      createConfig: any;
      getDefaultConfig: any;
    };
  }
}

export {};