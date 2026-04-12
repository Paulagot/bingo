/**
 * useSolanaCreateAssetRoom — STUB
 *
 * Asset-based rooms were removed from the new contract.
 * This file is kept to avoid breaking any imports.
 */

import { useCallback } from 'react';
import type { CreateAssetRoomParams, CreateAssetRoomResult } from '../utils/types';

export function useSolanaCreateAssetRoom() {
  const createAssetRoom = useCallback(
    async (_params: CreateAssetRoomParams): Promise<CreateAssetRoomResult> => {
      throw new Error(
        'useSolanaCreateAssetRoom: asset-based rooms are not supported in the current contract. ' +
        'Use pool rooms (init_pool_room) instead.'
      );
    },
    []
  );

  return { createAssetRoom };
}