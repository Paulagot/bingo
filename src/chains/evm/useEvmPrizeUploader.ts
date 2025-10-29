// src/chains/evm/useEvmPrizeUploader.ts
import { Address, parseUnits } from 'viem';
import {
  writeContract,
  waitForTransactionReceipt,
  getPublicClient,
  readContract,
} from '@wagmi/core';
import { config as wagmiConfig } from '../../config';

// --- Minimal ABIs (expanded for preflight reads) ---
const ERC20_ABI = [
  { type: 'function', name: 'decimals',  stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol',    stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }, { name: 's', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve',   stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;

const ERC721_ABI = [
  { type: 'function', name: 'ownerOf',         stateMutability: 'view',       inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'safeTransferFrom',stateMutability: 'nonpayable',  inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
] as const;

const ERC1155_ABI = [
  { type: 'function', name: 'balanceOf',       stateMutability: 'view',       inputs: [{ name: 'a', type: 'address' }, { name: 'id', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'safeTransferFrom',stateMutability: 'nonpayable',  inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'id', type: 'uint256' }, { name: 'value', type: 'uint256' }, { name: 'data', type: 'bytes' }], outputs: [] },
] as const;

const ASSET_ROOM_ABI = [
  { type: 'function', name: 'uploadPrize',  stateMutability: 'nonpayable', inputs: [{ name: 'place', type: 'uint8' }], outputs: [] },
  { type: 'function', name: 'getAllPrizes', stateMutability: 'view',       inputs: [], outputs: [
      { name: 'places',   type: 'uint8[]' },
      { name: 'types_',   type: 'uint8[]' },
      { name: 'assets',   type: 'address[]' },
      { name: 'amounts',  type: 'uint256[]' },
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'uploaded', type: 'bool[]' }
  ]},
] as const;

// ---- Types for callers ----
type CommonArgs = {
  roomAddress?: Address;
  sender?: Address;
  chainId?: number;
  explorerBase?: string;
};

type UploadOk  = { success: true;  hash: `0x${string}` };
type UploadErr = { success: false; error: string };
type UploadResult = UploadOk | UploadErr;

// Small helper to format bigints nicely in logs
const fmt = (x: bigint) => x.toString();

export function useEvmPrizeUploader(params: CommonArgs) {
  const { roomAddress, sender, chainId, explorerBase } = params;

  const requireBasics = () => {
    if (!roomAddress) throw new Error('Missing roomAddress');
    if (!sender)      throw new Error('Wallet not connected');
    if (!chainId)     throw new Error('Missing chainId');
  };

  async function robustWait(hash: `0x${string}`) {
    console.log('[EVM] waitForReceipt via wagmi', { hash, chainId });
    try {
      const r = await waitForTransactionReceipt(wagmiConfig, {
        hash,
        chainId,
        confirmations: 1,
        timeout: 90_000,
      });
      if (r.status !== 'success') throw new Error('Transaction reverted');
      return r;
    } catch (e1: any) {
      console.warn('[EVM] wagmi waitForReceipt failed; trying public client:', e1?.message);
      const pc = getPublicClient(wagmiConfig, { chainId });
      if (!pc) throw new Error(`No public client for chainId=${chainId}`);
      const r = await pc.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 90_000 });
      if (r.status !== 'success') throw new Error('Transaction reverted');
      return r;
    }
  }

  // ---- Prize preflight: ensure "place" exists & not already uploaded ----
  async function ensurePrizeSlot(place: number) {
    requireBasics();
    try {
      const res = await readContract(wagmiConfig, {
        abi: ASSET_ROOM_ABI,
        address: roomAddress!,
        functionName: 'getAllPrizes',
        args: [],
        chainId,
      }) as [number[], number[], Address[], bigint[], bigint[], boolean[]];

      const [places, , assets, amounts, tokenIds, uploaded] = res;
      const idx = places.findIndex((p) => Number(p) === Number(place));
      console.log('[AssetRoom][preflight] getAllPrizes idx:', idx, {
        places, assets, amounts: amounts.map(fmt), tokenIds: tokenIds.map(fmt), uploaded
      });

      if (idx === -1)         throw new Error(`Prize place ${place} is not configured in the room.`);
      if (uploaded[idx])      throw new Error(`Prize place ${place} is already uploaded.`);
      return { asset: assets[idx], amount: amounts[idx], tokenId: tokenIds[idx] };
    } catch (e: any) {
      throw new Error(`Room not ready for prize #${place}: ${e?.message || e}`);
    }
  }

  // -------- SINGLE SOURCE OF TRUTH READ --------
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
      places:   places.map(Number),
      uploaded: uploaded.map(Boolean),
      assets,
      amounts,
      tokenIds,
    };
  }

  // -------- MERGE HELPER (by place) --------
  function mergeOnchainUploadFlags<T extends {
    place: number;
    uploadStatus?: 'pending'|'uploading'|'completed'|'failed';
    transactionHash?: string;
    uploadedAt?: string;
  }>(
    local: T[],
    on: { places: number[]; uploaded: boolean[] }
  ): T[] {
    const upMap = new Map<number, boolean>();
    on.places.forEach((p, i) => upMap.set(Number(p), on.uploaded[i]));

    return local.map((prize) => {
      const onchainUploaded = upMap.get(prize.place);
      if (onchainUploaded === undefined) return prize;

      if (onchainUploaded) {
        // authoritative: mark completed
        if (prize.uploadStatus !== 'completed') {
          return { ...prize, uploadStatus: 'completed' };
        }
        return prize;
      }

      // on-chain says "not uploaded"
      if (prize.uploadStatus === 'completed') {
        return {
          ...prize,
          uploadStatus: 'pending',
          transactionHash: undefined,
          uploadedAt: undefined,
        };
      }
      return prize;
    });
  }

  // -------- ERC-20 (approve -> uploadPrize(place)) --------
  async function uploadErc20(opts: { token: Address; amountHuman: number | string; place: number }): Promise<UploadResult> {
    try {
      requireBasics();
      const place = Number(opts.place);
      console.log('[EVM][ERC20] begin upload', { place, token: opts.token, amountHuman: opts.amountHuman });

      await ensurePrizeSlot(place);

      // Detect decimals & symbol
      const [decimals, symbol] = await Promise.all([
        readContract(wagmiConfig, { abi: ERC20_ABI, address: opts.token, functionName: 'decimals', args: [], chainId }) as Promise<number>,
        readContract(wagmiConfig, { abi: ERC20_ABI, address: opts.token, functionName: 'symbol',   args: [], chainId }) as Promise<string>,
      ]);

      const amount = parseUnits(String(opts.amountHuman), decimals);
      const [balance, allowance] = await Promise.all([
        readContract(wagmiConfig, { abi: ERC20_ABI, address: opts.token, functionName: 'balanceOf', args: [sender!], chainId }) as Promise<bigint>,
        readContract(wagmiConfig, { abi: ERC20_ABI, address: opts.token, functionName: 'allowance', args: [sender!, roomAddress!], chainId }) as Promise<bigint>,
      ]);

      console.log('[EVM][ERC20] token meta', { symbol, decimals, amount: fmt(amount), balance: fmt(balance), allowance: fmt(allowance) });

      if (balance < amount) {
        return { success: false, error: `Insufficient ${symbol} balance: need ${opts.amountHuman}, have only ${(Number(balance) / 10 ** decimals).toFixed(6)}` };
      }

      // Approve only if needed
      if (allowance < amount) {
        console.log('[EVM][ERC20] approve() required…');
        const approveHash = await writeContract(wagmiConfig, {
          abi: ERC20_ABI,
          address: opts.token,
          functionName: 'approve',
          args: [roomAddress!, amount],
          chainId,
        });
        console.log('[EVM][ERC20] approve tx', approveHash, explorerBase ? `${explorerBase}/tx/${approveHash}` : '');
        await robustWait(approveHash);
      } else {
        console.log('[EVM][ERC20] approve() skipped: allowance already sufficient');
      }

      // Now call room.uploadPrize(place)
      const uploadHash = await writeContract(wagmiConfig, {
        abi: ASSET_ROOM_ABI,
        address: roomAddress!,
        functionName: 'uploadPrize',
        args: [place as any],
        chainId,
      });
      console.log('[EVM][Room] uploadPrize tx', uploadHash, explorerBase ? `${explorerBase}/tx/${uploadHash}` : '');
      await robustWait(uploadHash);

      console.log('[EVM][ERC20] ✅ upload complete');
      return { success: true, hash: uploadHash };
    } catch (e: any) {
      const raw = e?.shortMessage || e?.message || String(e);
      console.error('[EVM] uploadErc20 failed:', raw, e);
      const hint = raw.includes('transfer amount exceeds balance') ? ' (balance too low?)' :
                   raw.includes('ERC20: insufficient allowance')     ? ' (approve amount too low?)' :
                   raw.includes('need 1st')                          ? ' (first prize not uploaded?)' : '';
      return { success: false, error: `ERC-20 upload failed: ${raw}${hint}` };
    }
  }

  // -------- ERC-721 (safeTransferFrom -> uploadPrize(place)) --------
  async function uploadErc721(opts: { token: Address; tokenId: bigint; place: number }): Promise<UploadResult> {
    try {
      requireBasics();
      const place = Number(opts.place);
      console.log('[EVM][ERC721] begin upload', { place, token: opts.token, tokenId: fmt(opts.tokenId) });

      await ensurePrizeSlot(place);

      // Preflight: ownership
      const owner = await readContract(wagmiConfig, { abi: ERC721_ABI, address: opts.token, functionName: 'ownerOf', args: [opts.tokenId], chainId }) as Address;
      console.log('[EVM][ERC721] ownerOf', owner);
      if (owner.toLowerCase() !== sender!.toLowerCase()) {
        return { success: false, error: 'You are not the owner of this ERC-721 token.' };
      }

      const transferHash = await writeContract(wagmiConfig, {
        abi: ERC721_ABI,
        address: opts.token,
        functionName: 'safeTransferFrom',
        args: [sender!, roomAddress!, opts.tokenId],
        chainId,
      });
      console.log('[EVM][ERC721] safeTransferFrom tx', transferHash, explorerBase ? `${explorerBase}/tx/${transferHash}` : '');
      await robustWait(transferHash);

      const uploadHash = await writeContract(wagmiConfig, {
        abi: ASSET_ROOM_ABI,
        address: roomAddress!,
        functionName: 'uploadPrize',
        args: [place as any],
        chainId,
      });
      console.log('[EVM][Room] uploadPrize tx', uploadHash, explorerBase ? `${explorerBase}/tx/${uploadHash}` : '');
      await robustWait(uploadHash);

      console.log('[EVM][ERC721] ✅ upload complete');
      return { success: true, hash: uploadHash };
    } catch (e: any) {
      const raw = e?.shortMessage || e?.message || String(e);
      console.error('[EVM] uploadErc721 failed:', raw, e);
      const hint = raw.includes('caller is not token owner') ? ' (not owner?)' : '';
      return { success: false, error: `ERC-721 upload failed: ${raw}${hint}` };
    }
  }

  // -------- ERC-1155 (safeTransferFrom -> uploadPrize(place)) --------
  async function uploadErc1155(opts: { token: Address; tokenId: bigint; amount: bigint; place: number }): Promise<UploadResult> {
    try {
      requireBasics();
      const place = Number(opts.place);
      console.log('[EVM][ERC1155] begin upload', { place, token: opts.token, tokenId: fmt(opts.tokenId), amount: fmt(opts.amount) });

      await ensurePrizeSlot(place);

      // Preflight: sender balance for id
      const bal = await readContract(wagmiConfig, { abi: ERC1155_ABI, address: opts.token, functionName: 'balanceOf', args: [sender!, opts.tokenId], chainId }) as bigint;
      console.log('[EVM][ERC1155] balanceOf', fmt(bal));
      if (bal < opts.amount) {
        return { success: false, error: `Insufficient ERC-1155 balance for tokenId ${opts.tokenId}. Need ${fmt(opts.amount)}, have ${fmt(bal)}.` };
      }

      const transferHash = await writeContract(wagmiConfig, {
        abi: ERC1155_ABI,
        address: opts.token,
        functionName: 'safeTransferFrom',
        args: [sender!, roomAddress!, opts.tokenId, opts.amount, '0x'],
        chainId,
      });
      console.log('[EVM][ERC1155] safeTransferFrom tx', transferHash, explorerBase ? `${explorerBase}/tx/${transferHash}` : '');
      await robustWait(transferHash);

      const uploadHash = await writeContract(wagmiConfig, {
        abi: ASSET_ROOM_ABI,
        address: roomAddress!,
        functionName: 'uploadPrize',
        args: [place as any],
        chainId,
      });
      console.log('[EVM][Room] uploadPrize tx', uploadHash, explorerBase ? `${explorerBase}/tx/${uploadHash}` : '');
      await robustWait(uploadHash);

      console.log('[EVM][ERC1155] ✅ upload complete');
      return { success: true, hash: uploadHash };
    } catch (e: any) {
      const raw = e?.shortMessage || e?.message || String(e);
      console.error('[EVM] uploadErc1155 failed:', raw, e);
      return { success: false, error: `ERC-1155 upload failed: ${raw}` };
    }
  }

  return {
    uploadErc20,
    uploadErc721,
    uploadErc1155,
    readOnchainPrizes,        // NEW
    mergeOnchainUploadFlags,  // NEW
  };
}



