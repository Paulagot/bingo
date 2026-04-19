/**
 * Solana End Room Hook (Two-Step Flow) — IDL-verified (newquiz.json)
 *
 * ## Account layout confirmed from IDL
 *
 * declare_winners accounts: room, host ONLY
 *   - No roomVault, no tokenProgram, no remainingAccounts
 *
 * end_room remainingAccounts layout (from IDL docs):
 *   "Pass 1 or 2 winner token accounts + all PlayerEntry/token pairs"
 *   [winner1TokenAcct]                            ← always
 *   [winner2TokenAcct]                            ← if 2 winners
 *   [playerEntryPDA_0, playerTokenAcct_0, ...]    ← ALL players who joined (pairs)
 *
 * RoomEnded event fields (new contract):
 *   room, room_id, winners, total_distributed, charity_amount,
 *   intent_id_hash, timestamp
 *   (platform_amount / host_amount / prize_amount are GONE)
 *
 * IDL error 6010: InvalidWinnerCount — "Exactly 2 winners required"
 *   If you only have 1 winner, pass 1 — the contract gives 2nd-place share to charity.
 *   But you cannot pass 3+.
 */

import { useCallback } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { keccak_256 } from '@noble/hashes/sha3';

import { useSolanaShared } from './useSolanaShared';
import {
  deriveRoomVaultPDA,
  derivePlayerEntryPDA,
} from '../utils/pda';
import {
  buildTransaction,
  simulateTransaction,
  formatTransactionError,
  waitForConfirmation,
} from '../utils/transaction-helpers';

import {
  getTokenByMint,
  meetsMinDonation,
  toDisplayAmount,
  PLATFORM_CHARITY_RESERVE,
} from '../config/solanaTokenConfig';

import {
  isNativeSolRoom,
  WSOL_MINT,
} from '../utils/wsolUtils';

import { fetchAndParseRoomEndedEvent } from '../utils/event-praser';
import { SOLANA_CONTRACT, getPlatformWallet } from '../config/contracts';

import type {
  DistributePrizesParams,
  DistributePrizesResult,
} from '../utils/types';

export interface EndRoomParams extends DistributePrizesParams {
  /**
   * All wallets that joined the room (including winners).
   * Required to build the correct PlayerEntry/token pairs for remainingAccounts.
   * If you don't have this list, the transaction will fail with RefundAccountMismatch (6019).
   */
  allPlayers?: (PublicKey | string)[];
}

export function useSolanaEndRoom() {
  const {
    publicKey,
    program,
    connection,
    provider,
    isConnected,
    getTxExplorerUrl,
  } = useSolanaShared();

  const endRoom = useCallback(
    async (params: EndRoomParams): Promise<DistributePrizesResult> => {
      console.log('[Solana][EndRoom] 🏆 Starting two-step prize distribution...');

      if (!isConnected || !publicKey || !program || !connection || !provider) {
        const missing: string[] = [];
        if (!isConnected) missing.push('not connected');
        if (!publicKey) missing.push('no publicKey');
        if (!program) missing.push('no program');
        if (!connection) missing.push('no connection');
        if (!provider) missing.push('no provider');
        throw new Error(`Wallet not ready: ${missing.join(', ')}`);
      }

      console.log('[Solana][EndRoom] ✅ Wallet connected:', publicKey.toBase58());

      const { roomId, roomAddress, winners, charityOrgId } = params;

      if (!roomId) throw new Error('Room ID is required');
      if (!roomAddress) throw new Error('Room address is required');
      if (!winners || winners.length === 0) throw new Error('At least one winner is required');
      if (winners.length > 2) {
        console.warn('[Solana][EndRoom] ⚠️ Max 2 winners (IDL error 6010). Trimming to 2.');
      }

      const winnerPublicKeys: PublicKey[] = winners
        .slice(0, 2)
        .map((addr) => {
          try {
            return typeof addr === 'string' ? new PublicKey(addr) : addr;
          } catch {
            throw new Error(`Invalid winner address: ${addr}`);
          }
        });

      console.log('[Solana][EndRoom] ✅ Winners:', winnerPublicKeys.length);

      console.log('[Solana][EndRoom] 🔍 Fetching room account...');

      const roomPDA = typeof roomAddress === 'string'
        ? new PublicKey(roomAddress)
        : roomAddress;

      const roomAccount = await (program.account as any).room.fetch(roomPDA);

      const host = roomAccount.host as PublicKey;
      const tokenMint = roomAccount.feeTokenMint as PublicKey;
      const totalEntryFees = new BN(roomAccount.totalEntryFees.toString());
      const totalExtrasFees = new BN(roomAccount.totalExtrasFees.toString());

      console.log('[Solana][EndRoom] ✅ Room fetched:', {
        host: host.toBase58(),
        tokenMint: tokenMint.toBase58(),
        totalEntry: totalEntryFees.toString(),
        totalExtras: totalExtrasFees.toString(),
        playerCount: roomAccount.playerCount,
        status: Object.keys(roomAccount.status)[0],
        ended: roomAccount.ended,
        joiningClosed: roomAccount.joiningClosed,
        winners: (roomAccount.winners ?? []).map((w: any) => w.toBase58()),
      });

      const tokenConfig = getTokenByMint(tokenMint.toBase58());
      if (!tokenConfig) {
        throw new Error(`Unsupported token mint: ${tokenMint.toBase58()}`);
      }

      const currency = tokenConfig.code;
      const decimals = tokenConfig.decimals;
      const isSolRoom = isNativeSolRoom(tokenMint);
      const splMint = isSolRoom ? WSOL_MINT : tokenMint;

      console.log('[Solana][EndRoom] 💰 Token:', currency, `(${decimals} decimals) SOL room:`, isSolRoom);

      const CHARITY_BPS = SOLANA_CONTRACT.FEE_SPLITS.charity * 100;
      const totalPool = totalEntryFees.add(totalExtrasFees);
      const charityRaw = totalPool.mul(new BN(CHARITY_BPS)).div(new BN(10_000));
      const charityDecimal = toDisplayAmount(BigInt(charityRaw.toString()), currency).toFixed(6);

      console.log('[Solana][EndRoom] 💰 Charity preview:', charityDecimal, currency);

      console.log('[Solana][EndRoom] 🔑 Deriving PDAs...');

      const [roomVault] = deriveRoomVaultPDA(roomPDA);
      console.log('[Solana][EndRoom]   Room vault:', roomVault.toBase58());

      console.log('[Solana][EndRoom] 🥇 Step 1/2: Declaring winners...');

      if (!program.methods?.declareWinners) {
        throw new Error('declareWinners method not available');
      }

      const declareInstruction = await program.methods
        .declareWinners(roomId, winnerPublicKeys)
        .accountsStrict({
          room: roomPDA,
          host: publicKey,
        })
        .instruction();

      const declareTx = await buildTransaction(connection, [declareInstruction], publicKey);

      console.log('[Solana][EndRoom] 🧪 Simulating declare_winners...');
      const declareSim = await simulateTransaction(connection, declareTx);

      if (!declareSim.success) {
        console.error('[Solana][EndRoom] ❌ Declare simulation failed:', declareSim.error);
        console.error('[Solana][EndRoom] Logs:', declareSim.logs);
        throw new Error(`Declare winners simulation failed: ${declareSim.error}`);
      }

      console.log('[Solana][EndRoom] ✅ Declare simulation passed — sending...');

      let declareWinnersTxHash: string | undefined;
      try {
        const signedDeclareTx = await provider.wallet.signTransaction(declareTx);

        declareWinnersTxHash = await connection.sendRawTransaction(
          signedDeclareTx.serialize(),
          {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          }
        );

        console.log('[Solana][EndRoom] 📝 Declare signature:', declareWinnersTxHash);

        const declareConfirmed = await waitForConfirmation(connection, declareWinnersTxHash, 60_000);
        if (!declareConfirmed) {
          throw new Error('Declare winners transaction was sent but not confirmed in time');
        }

        console.log('[Solana][EndRoom] ✅ Winners declared:', declareWinnersTxHash);
      } catch (error: any) {
        throw new Error(formatTransactionError(error));
      }

      let charityWallet: PublicKey;
      const charityAmountNum = parseFloat(charityDecimal);

      if (charityOrgId && charityAmountNum > 0) {
        if (!meetsMinDonation(charityAmountNum, currency)) {
          console.warn('[Solana][EndRoom] ⚠️ Below TGB minimum — using reserve wallet');
          const fb = params.charityWallet ?? PLATFORM_CHARITY_RESERVE;
          charityWallet = typeof fb === 'string' ? new PublicKey(fb) : fb;
        } else {
          try {
            const res = await fetch('/api/tgb/create-deposit-address', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                organizationId: Number(charityOrgId),
                tokenCode: currency,
                amount: charityDecimal,
                metadata: { roomId },
              }),
            });
            const data = await res.json();
            if (!data.ok || !data.depositAddress) {
              throw new Error(data.error || 'No deposit address returned');
            }
            charityWallet = new PublicKey(data.depositAddress);
            console.log('[Solana][EndRoom] ✅ TGB wallet:', charityWallet.toBase58());
          } catch (tgbErr: any) {
            console.warn('[Solana][EndRoom] ⚠️ TGB failed:', tgbErr.message, '— using reserve');
            const fb = params.charityWallet ?? PLATFORM_CHARITY_RESERVE;
            charityWallet = typeof fb === 'string' ? new PublicKey(fb) : fb;
          }
        }
      } else {
        const fb = params.charityWallet ?? PLATFORM_CHARITY_RESERVE;
        charityWallet = typeof fb === 'string' ? new PublicKey(fb) : fb;
        console.log('[Solana][EndRoom] 📍 Charity wallet (no TGB):', charityWallet.toBase58());
      }

      console.log('[Solana][EndRoom] 🔍 Deriving ATAs...');

      const platformWallet = getPlatformWallet();
      const platformTokenAccount = await getAssociatedTokenAddress(splMint, platformWallet);
      const charityTokenAccount = await getAssociatedTokenAddress(splMint, charityWallet);
      const hostTokenAccount = await getAssociatedTokenAddress(splMint, host);

      const winnerTokenAccounts: PublicKey[] = [];
      for (const w of winnerPublicKeys) {
        winnerTokenAccounts.push(await getAssociatedTokenAddress(splMint, w));
      }

      const allPlayerWallets: PublicKey[] = params.allPlayers
        ? params.allPlayers.map((w) => (typeof w === 'string' ? new PublicKey(w) : w))
        : winnerPublicKeys;

      if (!params.allPlayers) {
        console.warn(
          '[Solana][EndRoom] ⚠️ allPlayers not provided. Using winners only. ' +
          'This will fail (error 6019) if there were non-winner players in the room.'
        );
      }

      const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
      const ataIxs: any[] = [];

      const maybeCreateAta = async (ata: PublicKey, owner: PublicKey, label: string) => {
        const info = await connection.getAccountInfo(ata);
        if (!info) {
          console.log(`[Solana][EndRoom] 📝 Creating ATA: ${label} → ${ata.toBase58()}`);
          ataIxs.push(createAssociatedTokenAccountInstruction(publicKey, ata, owner, splMint));
        } else {
          console.log(`[Solana][EndRoom] ✅ ATA exists: ${label} → ${ata.toBase58()} (owner: ${info.owner.toBase58()})`);
        }
      };

      await maybeCreateAta(platformTokenAccount, platformWallet, 'platform');
      await maybeCreateAta(charityTokenAccount, charityWallet, 'charity');
      await maybeCreateAta(hostTokenAccount, host, 'host');
      for (const w of winnerPublicKeys) {
        const ata = await getAssociatedTokenAddress(splMint, w);
        await maybeCreateAta(ata, w, `winner ${w.toBase58().slice(0, 8)}...`);
      }

      if (ataIxs.length > 0) {
        console.log(`[Solana][EndRoom] 📤 Creating ${ataIxs.length} missing ATAs...`);
        const ataTx = await buildTransaction(connection, ataIxs, publicKey);

        let ataSig: string | undefined;
        try {
          const signedAtaTx = await provider.wallet.signTransaction(ataTx);

          ataSig = await connection.sendRawTransaction(signedAtaTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          });

          console.log('[Solana][EndRoom] 📝 ATA signature:', ataSig);

          const ataConfirmed = await waitForConfirmation(connection, ataSig, 60_000);
          if (!ataConfirmed) {
            throw new Error('ATA creation transaction was sent but not confirmed in time');
          }

          console.log('[Solana][EndRoom] ✅ ATAs created:', ataSig);
        } catch (error: any) {
          throw new Error(formatTransactionError(error));
        }

        await new Promise((r) => setTimeout(r, 1000));
      } else {
        console.log('[Solana][EndRoom] ✅ All ATAs already exist');
      }

      console.log('[Solana][EndRoom] 📋 Building remaining accounts...');

      const remainingAccounts: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }> = [];

      for (const ata of winnerTokenAccounts) {
        remainingAccounts.push({ pubkey: ata, isSigner: false, isWritable: true });
        console.log('[Solana][EndRoom]   Winner ATA:', ata.toBase58());
      }

      for (const player of allPlayerWallets) {
        const [playerEntry] = derivePlayerEntryPDA(roomPDA, player);
        const playerTokenAccount = await getAssociatedTokenAddress(splMint, player);

        remainingAccounts.push({ pubkey: playerEntry, isSigner: false, isWritable: true });
        remainingAccounts.push({ pubkey: playerTokenAccount, isSigner: false, isWritable: true });
      }

      console.log('[Solana][EndRoom] ✅ Remaining accounts:', remainingAccounts.length);

      console.log('[Solana][EndRoom] 💰 Step 2/2: end_room...');

      if (!program.methods?.endRoom) {
        throw new Error('endRoom method not available');
      }

      console.log('[Solana][EndRoom] 📋 Accounts being passed to end_room:');
      console.log('  room:                ', roomPDA.toBase58());
      console.log('  roomVault:           ', roomVault.toBase58());
      console.log('  platformTokenAccount:', platformTokenAccount.toBase58());
      console.log('  platformWallet:      ', platformWallet.toBase58());
      console.log('  charityTokenAccount: ', charityTokenAccount.toBase58());
      console.log('  hostTokenAccount:    ', hostTokenAccount.toBase58());
      console.log('  host (signer):       ', publicKey.toBase58());
      console.log('  charityWallet:       ', charityWallet.toBase58());
      console.log('[Solana][EndRoom] 📋 Remaining accounts:');
      remainingAccounts.forEach((a, i) =>
        console.log(`  [${i}] ${a.pubkey.toBase58()} writable=${a.isWritable}`)
      );
      console.log('[Solana][EndRoom] 📋 Winners arg:');
      winnerPublicKeys.forEach((w, i) =>
        console.log(`  [${i}] ${w.toBase58()}`)
      );

      const offchainIntentId = `FR-${roomId}-${Date.now()}`;
      const intentIdBytes = new TextEncoder().encode(offchainIntentId.padEnd(32, '\0'));
      const intentIdHash = Array.from(keccak_256(intentIdBytes));

      const endRoomIx = await program.methods
        .endRoom(roomId, charityWallet, intentIdHash, winnerPublicKeys)
        .accountsStrict({
          room: roomPDA,
          roomVault: roomVault,
          platformTokenAccount: platformTokenAccount,
          platformWallet: platformWallet,
          charityTokenAccount: charityTokenAccount,
          hostTokenAccount: hostTokenAccount,
          host: publicKey,
          charityWallet: charityWallet,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

      const endRoomIxs = [endRoomIx];
      const endRoomTx = await buildTransaction(connection, endRoomIxs, publicKey);

      console.log('[Solana][EndRoom] 🧪 Simulating end_room...');
      const endRoomSim = await simulateTransaction(connection, endRoomTx);

      if (!endRoomSim.success) {
        console.error('[Solana][EndRoom] ❌ Simulation failed:', endRoomSim.error);
        console.error('[Solana][EndRoom] Full logs:');
        (endRoomSim.logs ?? []).forEach((l: string, i: number) =>
          console.error(`  [${i}] ${l}`)
        );
        throw new Error(`End room simulation failed: ${endRoomSim.error}`);
      }

      console.log('[Solana][EndRoom] ✅ Simulation passed — sending end_room...');

      let endRoomTxHash: string | undefined;
      try {
        const signedEndRoomTx = await provider.wallet.signTransaction(endRoomTx);

        endRoomTxHash = await connection.sendRawTransaction(
          signedEndRoomTx.serialize(),
          {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          }
        );

        console.log('[Solana][EndRoom] 📝 End room signature:', endRoomTxHash);

        const endRoomConfirmed = await waitForConfirmation(connection, endRoomTxHash, 60_000);
        if (!endRoomConfirmed) {
          throw new Error('End room transaction was sent but not confirmed in time');
        }

        console.log('[Solana][EndRoom] ✅ Prizes distributed:', endRoomTxHash);
      } catch (error: any) {
        throw new Error(formatTransactionError(error));
      }

      console.log('[Solana][EndRoom] 📊 Parsing RoomEnded event...');

      let actualCharityAmount = charityDecimal;

      try {
        const { event, charityAmountDecimal } = await fetchAndParseRoomEndedEvent(
          connection,
          endRoomTxHash,
          decimals,
          10
        );
        if (event && charityAmountDecimal) {
          actualCharityAmount = charityAmountDecimal;
          console.log('[Solana][EndRoom] ✅ On-chain charity amount:', actualCharityAmount, currency);
        } else {
          console.warn('[Solana][EndRoom] ⚠️ Event not parsed — using preview value');
        }
      } catch (parseError: any) {
        console.warn('[Solana][EndRoom] ⚠️ Event parse error:', parseError.message);
      }

      const explorerUrl = getTxExplorerUrl(endRoomTxHash);

      console.log('[Solana][EndRoom] 🎉 Done!');
      console.log('[Solana][EndRoom]   Declare tx:', getTxExplorerUrl(declareWinnersTxHash));
      console.log('[Solana][EndRoom]   End tx:    ', explorerUrl);

      return {
        success: true,
        txHash: endRoomTxHash,
        explorerUrl,
        charityAmount: actualCharityAmount,
        tgbDepositAddress: charityWallet.toBase58(),
        declareWinnersTxHash,
      } as DistributePrizesResult & {
        declareWinnersTxHash: string;
        tgbDepositAddress: string;
      };
    },
    [publicKey, program, connection, provider, isConnected, getTxExplorerUrl]
  );

  return { endRoom };
}
