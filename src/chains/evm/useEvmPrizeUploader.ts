// src/chains/evm/useEvmPrizeUploader.ts

import { Address, parseUnits } from 'viem';
import {
  writeContract,
  waitForTransactionReceipt,
  getPublicClient,
  readContract,
} from '@wagmi/core';

import { wagmiConfig } from '../../config';

/* ----------------------------------------
 * Token ABIs
 * -------------------------------------- */
const ERC20_ABI = [
  { type: 'function', name: 'decimals',  stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol',    stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }, { name: 's', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve',   stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;

const ERC721_ABI = [
  { type: 'function', name: 'ownerOf',         stateMutability: 'view',       inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'getApproved',     stateMutability: 'view',       inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'isApprovedForAll',stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'approve',         stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
] as const;

const ERC1155_ABI = [
  { type: 'function', name: 'balanceOf',        stateMutability: 'view',       inputs: [{ name: 'a', type: 'address' }, { name: 'id', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'isApprovedForAll', stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'setApprovalForAll',stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
] as const;

/* ----------------------------------------
 * AssetRoomV2 ABI (prize parts only)
 * -------------------------------------- */
const ASSET_ROOM_ABI = [
  {
    type: 'function',
    name: 'uploadPrize',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'place', type: 'uint8' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getAllPrizes',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'places',   type: 'uint8[]' },
      { name: 'types',    type: 'uint8[]' },
      { name: 'assets',   type: 'address[]' },
      { name: 'amounts',  type: 'uint256[]' },
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'uploaded', type: 'bool[]' },
    ],
  },
] as const;

/* ----------------------------------------
 * Local TS Types
 * -------------------------------------- */
type CommonArgs = {
  roomAddress?: Address;
  sender?: Address;
  chainId?: number;
};

type UploadOk  = { success: true; hash: `0x${string}` };
type UploadErr = { success: false; error: string };
type UploadResult = UploadOk | UploadErr;

type PrizeSlotInfo = {
  asset: Address;
  amount: bigint;
  tokenId: bigint;
  contractType: 0 | 1 | 2;
  tokenType: 'erc20' | 'erc721' | 'erc1155';
};

/* ------------------------------ */

export function useEvmPrizeUploader(params: CommonArgs) {
  const { roomAddress, sender, chainId } = params;

  const requireBasics = () => {
    if (!roomAddress) throw new Error('Missing roomAddress');
    if (!sender) throw new Error('Wallet not connected');
    if (!chainId) throw new Error('Missing chainId');
  };

  /* ----------------------------------------
   * Robust wait with safe public client fallback
   * -------------------------------------- */
  async function robustWait(hash: `0x${string}`) {
    try {
      const r = await waitForTransactionReceipt(wagmiConfig, {
        hash, chainId, confirmations: 1, timeout: 90_000,
      });
      if (r.status !== 'success') throw new Error('Transaction reverted');
      return r;
    } catch {
      const pc = getPublicClient(wagmiConfig, { chainId });
      if (!pc) throw new Error('No public client available');

      const r = await pc.waitForTransactionReceipt({
        hash, confirmations: 1, timeout: 90_000,
      });
      if (r.status !== 'success') throw new Error('Transaction reverted');
      return r;
    }
  }

  /* ----------------------------------------
   * Prize Preflight (pull from contract)
   * Ensures: asset, amount, tokenId are defined
   * -------------------------------------- */
  async function ensurePrizeSlot(place: number): Promise<PrizeSlotInfo> {
    requireBasics();

    const res = await readContract(wagmiConfig, {
      abi: ASSET_ROOM_ABI,
      address: roomAddress!,
      functionName: 'getAllPrizes',
      args: [],
      chainId,
    }) as [number[], number[], Address[], bigint[], bigint[], boolean[]];

    const [places, types, assets, amounts, tokenIds, uploaded] = res;

    const idx = places.findIndex((p) => Number(p) === place);
    if (idx === -1) throw new Error(`Prize place ${place} is not configured`);
    if (uploaded[idx]) throw new Error(`Prize place ${place} is already uploaded`);

    const asset = assets[idx];
    const amount = amounts[idx];
    const tokenId = tokenIds[idx];
    const contractType = Number(types[idx]) as 0 | 1 | 2;

    if (!asset) throw new Error('Missing asset address');
    if (amount === undefined) throw new Error('Missing amount');
    if (tokenId === undefined) throw new Error('Missing tokenId');

    const tokenType =
      contractType === 0 ? 'erc20' :
      contractType === 1 ? 'erc721' :
      'erc1155';

    return { asset, amount, tokenId, contractType, tokenType };
  }

  /* ----------------------------------------
   * ERC20 Upload
   * -------------------------------------- */
  async function uploadErc20(opts: { token: Address; amountHuman: number | string; place: number }): Promise<UploadResult> {
    try {
      requireBasics();
      const { token, amountHuman, place } = opts;

      await ensurePrizeSlot(place);

      const decimals = await readContract(wagmiConfig, {
        abi: ERC20_ABI, address: token, functionName: 'decimals', args: [], chainId
      }) as number;

      const amount = parseUnits(String(amountHuman), decimals);

      const [bal, allowance] = await Promise.all([
        readContract(wagmiConfig, { abi: ERC20_ABI, address: token, functionName: 'balanceOf', args: [sender!], chainId }) as Promise<bigint>,
        readContract(wagmiConfig, { abi: ERC20_ABI, address: token, functionName: 'allowance', args: [sender!, roomAddress!], chainId }) as Promise<bigint>,
      ]);

      if (bal < amount) return { success: false, error: 'Insufficient ERC20 balance' };

      if (allowance < amount) {
        const approveHash = await writeContract(wagmiConfig, {
          abi: ERC20_ABI, address: token,
          functionName: 'approve',
          args: [roomAddress!, amount],
          chainId,
        });
        await robustWait(approveHash);
      }

      const uploadHash = await writeContract(wagmiConfig, {
        abi: ASSET_ROOM_ABI,
        address: roomAddress!,
        functionName: 'uploadPrize',
        args: [place],
        chainId,
      });

      await robustWait(uploadHash);
      return { success: true, hash: uploadHash };
    } catch (e: any) {
      return { success: false, error: e?.message ?? String(e) };
    }
  }

  /* ----------------------------------------
   * ERC721 Upload
   * -------------------------------------- */
  async function uploadErc721(opts: { token: Address; tokenId: bigint; place: number }): Promise<UploadResult> {
    try {
      requireBasics();
      const { token, tokenId, place } = opts;

      await ensurePrizeSlot(place);

      const owner = await readContract(wagmiConfig, {
        abi: ERC721_ABI, address: token, functionName: 'ownerOf', args: [tokenId], chainId
      }) as Address;

      if (owner.toLowerCase() !== sender!.toLowerCase()) {
        return { success: false, error: 'You do not own this NFT' };
      }

      const [approvedAddr, isApprovedForAll] = await Promise.all([
        readContract(wagmiConfig, { abi: ERC721_ABI, address: token, functionName: 'getApproved', args: [tokenId], chainId }) as Promise<Address>,
        readContract(wagmiConfig, { abi: ERC721_ABI, address: token, functionName: 'isApprovedForAll', args: [sender!, roomAddress!], chainId }) as Promise<boolean>,
      ]);

      if (
        approvedAddr.toLowerCase() !== roomAddress!.toLowerCase() &&
        !isApprovedForAll
      ) {
        const approveHash = await writeContract(wagmiConfig, {
          abi: ERC721_ABI,
          address: token,
          functionName: 'approve',
          args: [roomAddress!, tokenId],
          chainId,
        });
        await robustWait(approveHash);
      }

      const uploadHash = await writeContract(wagmiConfig, {
        abi: ASSET_ROOM_ABI,
        address: roomAddress!,
        functionName: 'uploadPrize',
        args: [place],
        chainId,
      });

      await robustWait(uploadHash);
      return { success: true, hash: uploadHash };
    } catch (e: any) {
      return { success: false, error: e?.message ?? String(e) };
    }
  }

  /* ----------------------------------------
   * ERC1155 Upload
   * -------------------------------------- */
  async function uploadErc1155(opts: { token: Address; tokenId: bigint; amount: bigint; place: number }): Promise<UploadResult> {
    try {
      requireBasics();
      const { token, tokenId, amount, place } = opts;

      await ensurePrizeSlot(place);

      const [bal, approved] = await Promise.all([
        readContract(wagmiConfig, { abi: ERC1155_ABI, address: token, functionName: 'balanceOf', args: [sender!, tokenId], chainId }) as Promise<bigint>,
        readContract(wagmiConfig, { abi: ERC1155_ABI, address: token, functionName: 'isApprovedForAll', args: [sender!, roomAddress!], chainId }) as Promise<boolean>,
      ]);

      if (bal < amount) return { success: false, error: 'Insufficient ERC1155 balance' };

      if (!approved) {
        const approveHash = await writeContract(wagmiConfig, {
          abi: ERC1155_ABI,
          address: token,
          functionName: 'setApprovalForAll',
          args: [roomAddress!, true],
          chainId,
        });
        await robustWait(approveHash);
      }

      const uploadHash = await writeContract(wagmiConfig, {
        abi: ASSET_ROOM_ABI,
        address: roomAddress!,
        functionName: 'uploadPrize',
        args: [place],
        chainId,
      });

      await robustWait(uploadHash);
      return { success: true, hash: uploadHash };
    } catch (e: any) {
      return { success: false, error: e?.message ?? String(e) };
    }
  }

  /* ----------------------------------------
   * Unified Upload
   * -------------------------------------- */
  async function uploadPrize(opts: {
    place: number;
    tokenAddress?: Address;
    amountHuman?: number | string;
    tokenId?: bigint;
  }): Promise<UploadResult> {
    try {
      requireBasics();

      const {
        asset,
        amount,
        tokenId,
        contractType,
      } = await ensurePrizeSlot(opts.place);

      if (contractType === 0) {
        return uploadErc20({
          token: opts.tokenAddress || asset,
          amountHuman: opts.amountHuman ?? Number(amount),
          place: opts.place,
        });
      }

      if (contractType === 1) {
        return uploadErc721({
          token: opts.tokenAddress || asset,
          tokenId: opts.tokenId ?? tokenId,
          place: opts.place,
        });
      }

      return uploadErc1155({
        token: opts.tokenAddress || asset,
        tokenId: opts.tokenId ?? tokenId,
        amount,
        place: opts.place,
      });

    } catch (e: any) {
      return { success: false, error: e?.message ?? String(e) };
    }
  }

  /* ----------------------------------------
   * Exposed API
   * -------------------------------------- */
  async function readOnchainPrizes() {
    requireBasics();

    const res = await readContract(wagmiConfig, {
      abi: ASSET_ROOM_ABI,
      address: roomAddress!,
      functionName: 'getAllPrizes',
      args: [],
      chainId,
    }) as [number[], number[], Address[], bigint[], bigint[], boolean[]];

    const [places, _types, assets, amounts, tokenIds, uploaded] = res;

    return {
      places: places.map(Number),
      assets,
      amounts,
      tokenIds,
      uploaded: uploaded.map(Boolean),
    };
  }

  return {
    uploadPrize,
    uploadErc20,
    uploadErc721,
    uploadErc1155,
    readOnchainPrizes,
  };
}




