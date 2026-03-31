/**
 * useSolanaAddPrizeAsset — STUB
 *
 * Asset-based rooms (init_asset_room, add_prize_asset) were removed from
 * the new contract. This file is kept to avoid breaking any imports that
 * reference it, but the hook always throws if called.
 */

import { useCallback } from 'react';
import type { AddPrizeAssetParams, AddPrizeAssetResult } from '../utils/types';

export function useSolanaAddPrizeAsset() {
  const addPrizeAsset = useCallback(
    async (_params: AddPrizeAssetParams): Promise<AddPrizeAssetResult> => {
      throw new Error(
        'useSolanaAddPrizeAsset: asset-based rooms are not supported in the current contract. ' +
        'Use pool rooms (init_pool_room) instead.'
      );
    },
    []
  );

  return { addPrizeAsset };
}