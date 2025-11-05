// src/chains/stellar/useQuizContract.ts - Fixed version

import { useCallback } from 'react';
import { useStellarWallet } from './useStellarWallet';
import { Client, networks } from './contract-client'; // Your generated client
import type { u32, Option } from '@stellar/stellar-sdk/contract';


// Correct contract address from your CLI success
const CONTRACT_ID = 'CAIJMMJUKKVT6U4EGG3EER7FWGGRK2VGK3JDTIKWMBMNL3FGUXTMBAZW';

// Token addresses that work with your contract (from CLI success)
const APPROVED_TOKENS = {
  testnet: {
    XLM: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', // From your CLI success
    USDC: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    GLOUSD: 'GCKFBEIYTKP5RDBWJBH6MWKUFWKKLLB4GCQJ4GGKMVAJHJ2PQOXYMKLQ'
  },
  mainnet: {
    XLM: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    USDC: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    GLOUSD: 'GAL4GIVM6FKUACIIVI4EBTXKECR3DGB2YGD5W7KO5RTZBTXJ6FZFMHVJ'
  }
};

// Convert human-readable amount to stroops (7 decimals for most Stellar tokens)
const toStroops = (amount: string): bigint => {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) throw new Error('Invalid amount');
  return BigInt(Math.floor(num * 10_000_000)); // 7 decimals = 10^7
};

interface CreatePoolRoomParams {
  roomId: string;
  hostAddress: string;
  currency: string; // 'XLM', 'USDC', 'GLOUSD'
  entryFee: string; // Human readable: "1.5"
  hostFeePct?: number; // 0-5
  prizePoolPct: number; // 0-40
  charityName?: string; // For charity memo
  prizeSplits?: {
    first: number; // percentage of prize pool
    second?: number;
    third?: number;
  };
}

interface CreateAssetRoomParams {
  roomId: string;
  hostAddress: string;
  currency: string; // 'XLM', 'USDC', 'GLOUSD'
  entryFee: string; // Human readable: "1.5"
  hostFeePct?: number; // 0-5
  charityName?: string; // For charity memo
  expectedPrizes: Array<{
    tokenAddress: string;
    amount: string; // Human readable amount
  }>;
}

interface JoinRoomParams {
  roomId: string;
  playerAddress: string;
  extrasAmount?: string; // Human readable: "0.5" for half a token worth of extras
}

interface JoinRoomResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

interface RoomConfigResult {
  success: boolean;
  config?: any;
  error?: string;
}

interface DepositPrizeAssetParams {
  roomId: string;
  prizeIndex: number; // 0 for 1st place, 1 for 2nd, 2 for 3rd
}

interface DepositPrizeAssetResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export const useQuizContract = () => {
  const stellarWallet = useStellarWallet();

 

// src/chains/stellar/useQuizContract.ts - Fixed createPoolRoom function with proper Option handling

const createPoolRoom = useCallback(async (params: CreatePoolRoomParams) => {
  if (!stellarWallet.isConnected || !stellarWallet.address || !stellarWallet.walletKit) {
    throw new Error('Wallet not connected');
  }

  const network = stellarWallet.currentNetwork;
  
  // Get the token address
  const tokenAddresses = APPROVED_TOKENS[network];
  const feeTokenAddress = tokenAddresses[params.currency as keyof typeof tokenAddresses];
  
  if (!feeTokenAddress) {
    throw new Error(`Token ${params.currency} not supported on ${network}`);
  }

  // Convert entry fee to stroops
  const entryFeeStroops = toStroops(params.entryFee);

  // Convert percentages to proper u32 types - CRITICAL: ensure these are integers
  const prizePoolPctInt = Math.round(params.prizePoolPct) as u32;
  const firstPlacePctInt = Math.round(params.prizeSplits?.first || 100) as u32;

  // Use charity name as memo, fallback to default
  const charityMemo = params.charityName || 'Quiz room payout';

  // CRITICAL FIX: Handle Option<u32> types properly
  // Based on Stellar SDK documentation, Option types can be undefined or the value
  const hostFeePctOption: Option<u32> = (params.hostFeePct && params.hostFeePct > 0) 
    ? (Math.round(params.hostFeePct) as u32)
    : undefined;

  const secondPlacePctOption: Option<u32> = (params.prizeSplits?.second && params.prizeSplits.second > 0)
    ? (Math.round(params.prizeSplits.second) as u32)
    : undefined;

  const thirdPlacePctOption: Option<u32> = (params.prizeSplits?.third && params.prizeSplits.third > 0)
    ? (Math.round(params.prizeSplits.third) as u32)
    : undefined;
  
  console.log('=== CONTRACT CALL DEBUG ===');
  console.log('Input Parameters:', {
    roomId: params.roomId,
    hostAddress: params.hostAddress,
    currency: params.currency,
    entryFee: params.entryFee,
    hostFeePct: params.hostFeePct,
    prizePoolPct: params.prizePoolPct,
    charityName: params.charityName,
    prizeSplits: params.prizeSplits
  });

  console.log('Converted Contract Parameters:', {
    room_id: params.roomId,
    host: params.hostAddress,
    fee_token: feeTokenAddress,
    entry_fee: entryFeeStroops.toString(),
    entry_fee_human: params.entryFee,
    prize_pool_pct: prizePoolPctInt,
    first_place_pct: firstPlacePctInt,
    host_fee_pct_option: hostFeePctOption,
    second_place_pct_option: secondPlacePctOption,
    third_place_pct_option: thirdPlacePctOption,
    charity_memo: charityMemo,
    network: network,
    contract_id: CONTRACT_ID
  });

  // Calculate total allocation for validation
  const totalAllocation = (params.hostFeePct || 0) + prizePoolPctInt + 20; // 20% platform fee
  console.log('Total allocation check:', {
    host: params.hostFeePct || 0,
    prizes: prizePoolPctInt,
    platform: 20,
    charity: 100 - totalAllocation,
    total: totalAllocation
  });

  if (totalAllocation > 100) {
    throw new Error(`Total allocation exceeds 100%: ${totalAllocation}%. Reduce host fee or prize pool percentage.`);
  }

  try {
    // Create contract client with correct configuration
    const contract = new Client({
      contractId: CONTRACT_ID,
      networkPassphrase: networks.testnet.networkPassphrase,
      rpcUrl: 'https://soroban-testnet.stellar.org',
      publicKey: stellarWallet.address,
      signTransaction: async (xdr: string) => {
        console.log('Signing transaction XDR length:', xdr.length);
        const result = await stellarWallet.walletKit!.signTransaction(xdr);
        console.log('Transaction signed successfully');
        return result;
      }
    });

    console.log('Contract client created, calling init_pool_room...');

    // CRITICAL FIX: Pass ALL parameters as the generated client expects them
    // The error shows second_place_pct is required even if Option<u32>
    // This suggests the generated client requires all fields to be explicitly passed
    
    const contractParams = {
      room_id: params.roomId,
      host: params.hostAddress,
      fee_token: feeTokenAddress,
      entry_fee: entryFeeStroops,
      host_fee_pct: hostFeePctOption,
      prize_pool_pct: prizePoolPctInt,
      first_place_pct: firstPlacePctInt,
      second_place_pct: secondPlacePctOption,
      third_place_pct: thirdPlacePctOption,
      charity_memo: charityMemo
    };

    console.log('Final contract parameters with proper Option types:', contractParams);

    // Compare with working CLI call
    console.log('Working CLI reference:');
    console.log('CLI: entry_fee=100000, host_fee_pct=5, prize_pool_pct=35');
    console.log('CLI: first_place_pct=100, second_place_pct=null, third_place_pct=null');
    console.log('Current: entry_fee=' + entryFeeStroops + ', host_fee_pct=' + hostFeePctOption);
    console.log('Current: prize_pool_pct=' + prizePoolPctInt + ', first_place_pct=' + firstPlacePctInt);
    console.log('Current: second_place_pct=' + secondPlacePctOption + ', third_place_pct=' + thirdPlacePctOption);

    const transaction = await contract.init_pool_room(contractParams);

    console.log('Transaction prepared, signing and sending...');

    // Sign and send the transaction
    const result = await transaction.signAndSend();
    console.log('Transaction result:', result);
    
    // Extract transaction hash from Stellar SDK result
    let txHash = 'transaction-submitted';
    
    try {
      if (result && result.sendTransactionResponse && result.sendTransactionResponse.hash) {
        txHash = result.sendTransactionResponse.hash;
        console.log('Found hash in sendTransactionResponse:', txHash);
      }
      else if (result && result.getTransactionResponse && result.getTransactionResponse.txHash) {
        txHash = result.getTransactionResponse.txHash;
        console.log('Found hash in getTransactionResponse:', txHash);
      }
      
      console.log('Final transaction hash:', txHash);
    } catch (e) {
      console.warn('Error extracting transaction hash:', e);
    }
    
    console.log('=== CONTRACT CALL SUCCESS ===');
    
    return {
      success: true,
      contractAddress: CONTRACT_ID,
      txHash: txHash,
      roomId: params.roomId
    };

  } catch (error: any) {
    console.error('=== CONTRACT CALL FAILED ===');
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Handle specific contract errors
    if (error.message?.includes('TokenNotApproved') || error.message?.includes('#43')) {
      throw new Error(`Token ${params.currency} is not approved for this contract`);
    }
    if (error.message?.includes('InvalidHostFee') || error.message?.includes('#1')) {
      throw new Error('Host fee must be between 0-5%');
    }
    if (error.message?.includes('RoomAlreadyExists') || error.message?.includes('#11')) {
      throw new Error(`Room ID "${params.roomId}" already exists. Try a different ID.`);
    }
    if (error.message?.includes('InvalidPrizePoolPct') || error.message?.includes('#5')) {
      throw new Error('Prize pool percentage must be between 0-40%');
    }
    
    throw new Error(`Contract deployment failed: ${error.message}`);
  }
}, [stellarWallet]);

  const joinRoom = useCallback(async (params: JoinRoomParams): Promise<JoinRoomResult> => {
    if (!stellarWallet.isConnected || !stellarWallet.address || !stellarWallet.walletKit) {
      throw new Error('Wallet not connected');
    }

    console.log('=== JOIN ROOM DEBUG ===');
    console.log('Input Parameters:', {
      roomId: params.roomId,
      playerAddress: params.playerAddress,
      extrasAmount: params.extrasAmount
    });

    try {
      // Convert extras amount to stroops (default to 0)
      const extrasAmountStroops = params.extrasAmount ? toStroops(params.extrasAmount) : BigInt(0);
      
      console.log('Converted Contract Parameters:', {
        room_id: params.roomId,
        player: params.playerAddress,
        extras_amount: extrasAmountStroops.toString(),
        contract_id: CONTRACT_ID
      });

      // Create contract client (same pattern as createPoolRoom)
      const contract = new Client({
        contractId: CONTRACT_ID,
        networkPassphrase: networks.testnet.networkPassphrase,
        rpcUrl: 'https://soroban-testnet.stellar.org',
        publicKey: stellarWallet.address,
        signTransaction: async (xdr: string) => {
          console.log('Signing join room transaction...');
          const result = await stellarWallet.walletKit!.signTransaction(xdr);
          console.log('Transaction signed successfully');
          return result;
        }
      });

      console.log('Contract client created, calling join_room...');

      // Call the contract method
      const transaction = await contract.join_room({
        room_id: params.roomId,
        player: params.playerAddress,
        extras_amount: extrasAmountStroops
      });

      console.log('Transaction prepared, signing and sending...');

      // Sign and send the transaction
      const result = await transaction.signAndSend();
      console.log('Join room transaction result:', result);
      
      // Extract transaction hash
      let txHash = 'transaction-submitted';
      
      try {
        if (result && result.sendTransactionResponse && result.sendTransactionResponse.hash) {
          txHash = result.sendTransactionResponse.hash;
          console.log('Found hash in sendTransactionResponse:', txHash);
        }
        else if (result && result.getTransactionResponse && result.getTransactionResponse.txHash) {
          txHash = result.getTransactionResponse.txHash;
          console.log('Found hash in getTransactionResponse:', txHash);
        }
        
        console.log('Final transaction hash:', txHash);
      } catch (e) {
        console.warn('Error extracting transaction hash:', e);
      }
      
      console.log('=== JOIN ROOM SUCCESS ===');
      
      return {
        success: true,
        txHash: txHash
      };

    } catch (error: any) {
      console.error('=== JOIN ROOM FAILED ===');
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Handle specific contract errors with user-friendly messages
      if (error.message?.includes('TokenNotApproved') || error.message?.includes('#43')) {
        return {
          success: false,
          error: 'The token used for this room is not approved for payments'
        };
      }
      if (error.message?.includes('RoomNotFound') || error.message?.includes('#12')) {
        return {
          success: false,
          error: 'Room not found. Please check the room ID.'
        };
      }
      if (error.message?.includes('PlayerAlreadyJoined') || error.message?.includes('#16')) {
        return {
          success: false,
          error: 'You have already joined this room'
        };
      }
      if (error.message?.includes('InsufficientPayment') || error.message?.includes('#17')) {
        return {
          success: false,
          error: 'Insufficient payment. Check your wallet balance and the required entry fee.'
        };
      }
      if (error.message?.includes('RoomNotReady') || error.message?.includes('#50')) {
        return {
          success: false,
          error: 'Room is not ready for players yet. The host may need to complete setup.'
        };
      }
      if (error.message?.includes('InsufficientBalance') || error.message?.includes('#29')) {
        return {
          success: false,
          error: 'Insufficient token balance to pay entry fee and extras'
        };
      }
      
      // Generic error fallback
      return {
        success: false,
        error: `Failed to join room: ${error.message}`
      };
    }
  }, [stellarWallet]);

  const getRoomConfig = useCallback(async (roomId: string): Promise<RoomConfigResult> => {
    if (!stellarWallet.isConnected || !stellarWallet.address || !stellarWallet.walletKit) {
      throw new Error('Wallet not connected');
    }

    try {
      const contract = new Client({
        contractId: CONTRACT_ID,
        networkPassphrase: networks.testnet.networkPassphrase,
        rpcUrl: 'https://soroban-testnet.stellar.org',
        publicKey: stellarWallet.address,
        signTransaction: async (xdr: string) => {
          const result = await stellarWallet.walletKit!.signTransaction(xdr);
          return result;
        }
      });

      console.log('Querying room config for:', roomId);
      
      // This is a read-only call, so no signing needed
      const result = await contract.get_room_config({ room_id: roomId });
      
      if (result.result) {
        console.log('Room config retrieved:', result.result);
        return {
          success: true,
          config: result.result
        };
      } else {
        console.log('No room config found for:', roomId);
        return {
          success: false,
          error: 'Room not found'
        };
      }
    } catch (error: any) {
      console.error('Failed to get room config:', error);
      return {
        success: false,
        error: error.message || 'Failed to query room configuration'
      };
    }
  }, [stellarWallet]);

// Add this function to your useQuizContract.ts:

const endRoom = useCallback(async (params: {
  roomId: string;
  winners: string[];
}): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  if (!stellarWallet.isConnected || !stellarWallet.address || !stellarWallet.walletKit) {
    throw new Error('Wallet not connected');
  }

  console.log('=== END ROOM CONTRACT CALL ===');
  console.log('Parameters:', {
    roomId: params.roomId,
    winners: params.winners,
    winnersCount: params.winners.length
  });

  try {
    const contract = new Client({
      contractId: CONTRACT_ID,
      networkPassphrase: networks.testnet.networkPassphrase,
      rpcUrl: 'https://soroban-testnet.stellar.org',
      publicKey: stellarWallet.address,
      signTransaction: async (xdr: string) => {
        console.log('Signing end room transaction...');
        const result = await stellarWallet.walletKit!.signTransaction(xdr);
        console.log('Transaction signed successfully');
        return result;
      }
    });

    console.log('Contract client created, calling end_room...');

    const transaction = await contract.end_room({
      room_id: params.roomId,
      winners: params.winners
    });

    console.log('Transaction prepared, signing and sending...');
    const result = await transaction.signAndSend();
    console.log('End room transaction result:', result);

    // Extract transaction hash
    let txHash = 'transaction-submitted';
    try {
      if (result && result.sendTransactionResponse && result.sendTransactionResponse.hash) {
        txHash = result.sendTransactionResponse.hash;
      } else if (result && result.getTransactionResponse && result.getTransactionResponse.txHash) {
        txHash = result.getTransactionResponse.txHash;
      }
    } catch (e) {
      console.warn('Error extracting transaction hash:', e);
    }

    console.log('=== END ROOM SUCCESS ===');
    console.log('Transaction hash:', txHash);

    return {
      success: true,
      txHash: txHash
    };

  } catch (error: any) {
    console.error('=== END ROOM FAILED ===');
    console.error('Error details:', error);

    // Handle specific contract errors
    let errorMessage = error.message || 'Unknown error occurred';
    
    if (error.message?.includes('RoomNotFound') || error.message?.includes('#12')) {
      errorMessage = 'Room not found on blockchain';
    } else if (error.message?.includes('Unauthorized') || error.message?.includes('#18')) {
      errorMessage = 'Only the room host can end the game';
    } else if (error.message?.includes('InvalidWinners') || error.message?.includes('#19')) {
      errorMessage = 'Invalid winner selection. Winners must be actual players.';
    } else if (error.message?.includes('RoomAlreadyEnded') || error.message?.includes('#15')) {
      errorMessage = 'This room has already been ended';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}, [stellarWallet]);

const createAssetRoom = useCallback(async (params: CreateAssetRoomParams) => {
  if (!stellarWallet.isConnected || !stellarWallet.address || !stellarWallet.walletKit) {
    throw new Error('Wallet not connected');
  }

  const network = stellarWallet.currentNetwork;
  
  // Get the token address
  const tokenAddresses = APPROVED_TOKENS[network];
  const feeTokenAddress = tokenAddresses[params.currency as keyof typeof tokenAddresses];
  
  if (!feeTokenAddress) {
    throw new Error(`Token ${params.currency} not supported on ${network}`);
  }

  // Convert entry fee to stroops
  const entryFeeStroops = toStroops(params.entryFee);

  // Handle optional host fee properly as Option<u32>
  const hostFeePctOption: Option<u32> = (params.hostFeePct && params.hostFeePct > 0) 
    ? (Math.round(params.hostFeePct) as u32)
    : undefined;

  // Convert expected prizes to contract format with proper logging
  const expectedPrizesContract = params.expectedPrizes.map(prize => ({
    token_address: prize.tokenAddress,
    amount: toStroops(prize.amount)
  }));

  // Use charity name as memo, fallback to default
  const charityMemo = params.charityName || 'Quiz asset room payout';

  // Detailed parameter logging to match init_pool_room pattern
  console.log('=== ASSET ROOM CONTRACT CALL DEBUG ===');
  console.log('Input Parameters:', {
    roomId: params.roomId,
    hostAddress: params.hostAddress,
    currency: params.currency,
    entryFee: params.entryFee,
    hostFeePct: params.hostFeePct,
    charityName: params.charityName,
    expectedPrizes: params.expectedPrizes
  });

  console.log('Converted Contract Parameters:', {
    room_id: params.roomId,
    host: params.hostAddress,
    fee_token: feeTokenAddress,
    entry_fee: entryFeeStroops.toString(),
    entry_fee_human: params.entryFee,
    host_fee_pct_option: hostFeePctOption,
    expected_prizes: expectedPrizesContract,
    charity_memo: charityMemo,
    network: network,
    contract_id: CONTRACT_ID
  });

  // Log expected prizes conversion details
  console.log('=== PRIZE CONVERSION DEBUG ===');
  console.log('Original expectedPrizes:', params.expectedPrizes);
  console.log('Converted expectedPrizesContract:', expectedPrizesContract);
  params.expectedPrizes.forEach((prize, index) => {
    console.log(`Prize ${index + 1}: ${prize.amount} -> ${toStroops(prize.amount)} stroops`);
  });

  // Compare with working CLI call
  console.log('Working CLI reference:');
  console.log('CLI: entry_fee=100000, host_fee_pct=5');
  console.log('CLI: expected_prizes=[{"token_address":"CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC","amount":"200"}]');
  console.log('CLI: charity_memo="charity26"');
  
  console.log('Current call will use:');
  console.log(`entry_fee=${entryFeeStroops}, host_fee_pct=${hostFeePctOption || 'UNDEFINED'}`);
  console.log('expected_prizes:', expectedPrizesContract);
  console.log(`charity_memo="${charityMemo}"`);

  // Validation checks
  if (expectedPrizesContract.length === 0) {
    throw new Error('No valid prizes found for asset room. At least one prize with token address and amount is required.');
  }

  try {
    // Create contract client with correct configuration
    const contract = new Client({
      contractId: CONTRACT_ID,
      networkPassphrase: networks.testnet.networkPassphrase,
      rpcUrl: 'https://soroban-testnet.stellar.org',
      publicKey: stellarWallet.address,
      signTransaction: async (xdr: string) => {
        console.log('Signing asset room transaction XDR length:', xdr.length);
        const result = await stellarWallet.walletKit!.signTransaction(xdr);
        console.log('Asset room transaction signed successfully');
        return result;
      }
    });

    console.log('Contract client created, calling init_asset_room...');

    // Build contract parameters with proper Option type handling
    const assetContractParams = {
      room_id: params.roomId,
      host: params.hostAddress,
      fee_token: feeTokenAddress,
      entry_fee: entryFeeStroops,
      host_fee_pct: hostFeePctOption, // Pass as Option<u32> (undefined for null)
      expected_prizes: expectedPrizesContract,
      charity_memo: charityMemo
    };

    console.log('Final asset contract parameters:', assetContractParams);
    console.log('Parameter types check:', {
      room_id: typeof assetContractParams.room_id,
      host: typeof assetContractParams.host,
      fee_token: typeof assetContractParams.fee_token,
      entry_fee: typeof assetContractParams.entry_fee,
      host_fee_pct: typeof assetContractParams.host_fee_pct,
      expected_prizes: `Array[${assetContractParams.expected_prizes.length}]`,
      charity_memo: typeof assetContractParams.charity_memo
    });

    const transaction = await contract.init_asset_room(assetContractParams);

    console.log('Asset room transaction prepared, signing and sending...');

    // Sign and send the transaction
    const result = await transaction.signAndSend();
    console.log('Asset room transaction result:', result);
    
    // Extract transaction hash from Stellar SDK result
    let txHash = 'asset-room-transaction-submitted';
    
    try {
      if (result && result.sendTransactionResponse && result.sendTransactionResponse.hash) {
        txHash = result.sendTransactionResponse.hash;
        console.log('Found hash in sendTransactionResponse:', txHash);
      }
      else if (result && result.getTransactionResponse && result.getTransactionResponse.txHash) {
        txHash = result.getTransactionResponse.txHash;
        console.log('Found hash in getTransactionResponse:', txHash);
      }
      
      console.log('Final asset room transaction hash:', txHash);
    } catch (e) {
      console.warn('Error extracting asset room transaction hash:', e);
    }
    
    console.log('=== ASSET ROOM CONTRACT CALL SUCCESS ===');
    
    return {
      success: true,
      contractAddress: CONTRACT_ID,
      txHash: txHash,
      roomId: params.roomId
    };

  } catch (error: any) {
    console.error('=== ASSET ROOM CONTRACT CALL FAILED ===');
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Handle specific contract errors for asset rooms
    if (error.message?.includes('TokenNotApproved') || error.message?.includes('#43')) {
      throw new Error(`Token ${params.currency} is not approved for this contract`);
    }
    if (error.message?.includes('InvalidHostFee') || error.message?.includes('#1')) {
      throw new Error('Host fee must be between 0-5%');
    }
    if (error.message?.includes('RoomAlreadyExists') || error.message?.includes('#11')) {
      throw new Error(`Room ID "${params.roomId}" already exists. Try a different ID.`);
    }
    if (error.message?.includes('MissingPrizeAssets') || error.message?.includes('#7')) {
      throw new Error('At least one prize asset is required for asset rooms');
    }
    if (error.message?.includes('InvalidPrizeAssets') || error.message?.includes('#8')) {
      throw new Error('Invalid prize asset configuration. Check token addresses and amounts.');
    }
    
    throw new Error(`Asset room deployment failed: ${error.message}`);
  }
}, [stellarWallet])

const depositPrizeAsset = useCallback(async (params: DepositPrizeAssetParams): Promise<DepositPrizeAssetResult> => {
  if (!stellarWallet.isConnected || !stellarWallet.address || !stellarWallet.walletKit) {
    throw new Error('Wallet not connected');
  }

  console.log('=== DEPOSIT PRIZE ASSET CONTRACT CALL DEBUG ===');
  console.log('Input Parameters:', {
    roomId: params.roomId,
    prizeIndex: params.prizeIndex
  });

  console.log('Wallet State Check:', {
    isConnected: stellarWallet.isConnected,
    hasAddress: !!stellarWallet.address,
    address: stellarWallet.address,
    hasWalletKit: !!stellarWallet.walletKit,
    currentNetwork: stellarWallet.currentNetwork
  });

  console.log('Contract Configuration:', {
    contract_id: CONTRACT_ID,
    network: stellarWallet.currentNetwork,
    rpcUrl: 'https://soroban-testnet.stellar.org'
  });

  // Compare with working CLI call
  console.log('Working CLI reference:');
  console.log('CLI: deposit_prize_asset --room_id "assetroom01" --prize_index "0"');
  console.log('Current call will use:');
  console.log(`room_id="${params.roomId}", prize_index=${params.prizeIndex}`);

  try {
    // Create contract client (same pattern as other functions)
    const contract = new Client({
      contractId: CONTRACT_ID,
      networkPassphrase: networks.testnet.networkPassphrase,
      rpcUrl: 'https://soroban-testnet.stellar.org',
      publicKey: stellarWallet.address,
      signTransaction: async (xdr: string) => {
        console.log('Signing deposit prize asset transaction...');
        console.log('XDR length:', xdr.length);
        const result = await stellarWallet.walletKit!.signTransaction(xdr);
        console.log('Transaction signed successfully');
        return result;
      }
    });

    console.log('Contract client created successfully');

    // Build contract parameters - simple for this function
    const contractParams = {
      room_id: params.roomId,
      prize_index: params.prizeIndex as u32
    };

    console.log('Final contract parameters:', contractParams);
    console.log('Parameter types check:', {
      room_id: typeof contractParams.room_id,
      prize_index: typeof contractParams.prize_index,
      prize_index_value: contractParams.prize_index
    });

    console.log('About to call deposit_prize_asset...');

    // Call the contract method - simple parameters, no Option types
    const transaction = await contract.deposit_prize_asset(contractParams);

    console.log('Transaction prepared successfully');
    console.log('Transaction prepared, signing and sending...');

    // Sign and send the transaction
    const result = await transaction.signAndSend();
    console.log('Deposit prize asset transaction result:', result);
    
    // Extract transaction hash (same pattern as other functions)
    let txHash = 'prize-deposit-transaction-submitted';
    
    try {
      if (result && result.sendTransactionResponse && result.sendTransactionResponse.hash) {
        txHash = result.sendTransactionResponse.hash;
        console.log('Found hash in sendTransactionResponse:', txHash);
      }
      else if (result && result.getTransactionResponse && result.getTransactionResponse.txHash) {
        txHash = result.getTransactionResponse.txHash;
        console.log('Found hash in getTransactionResponse:', txHash);
      }
      
      console.log('Final transaction hash:', txHash);
    } catch (e) {
      console.warn('Error extracting transaction hash:', e);
    }
    
    console.log('=== DEPOSIT PRIZE ASSET SUCCESS ===');
    
    return {
      success: true,
      txHash: txHash
    };

  } catch (error: any) {
    console.error('=== DEPOSIT PRIZE ASSET FAILED ===');
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Handle specific contract errors with user-friendly messages
    if (error.message?.includes('RoomNotFound') || error.message?.includes('#12')) {
      return {
        success: false,
        error: 'Room not found. Please check the room ID.'
      };
    }
    if (error.message?.includes('Unauthorized') || error.message?.includes('#18')) {
      return {
        success: false,
        error: 'Only the room host can deposit prize assets'
      };
    }
    if (error.message?.includes('InvalidPrizeIndex') || error.message?.includes('#52')) {
      return {
        success: false,
        error: 'Invalid prize index. This prize slot may not exist.'
      };
    }
    if (error.message?.includes('PrizeAlreadyFunded') || error.message?.includes('#51')) {
      return {
        success: false,
        error: 'This prize has already been deposited'
      };
    }
    if (error.message?.includes('InsufficientBalance') || error.message?.includes('#29')) {
      return {
        success: false,
        error: 'Insufficient balance to deposit this prize asset'
      };
    }
    if (error.message?.includes('PrizeNotMatching') || error.message?.includes('#53')) {
      return {
        success: false,
        error: 'Prize asset does not match what was configured for this room'
      };
    }
    
    // Generic error fallback
    return {
      success: false,
      error: `Failed to deposit prize asset: ${error.message}`
    };
  }
}, [stellarWallet]);

// Add to the return object:
return {
  createPoolRoom,
  createAssetRoom,
  joinRoom,
  getRoomConfig,
  endRoom,
  depositPrizeAsset, // ADD THIS LINE
  isReady: stellarWallet.isConnected && stellarWallet.walletKit,
  walletAddress: stellarWallet.address,
  currentNetwork: stellarWallet.currentNetwork,
  contractAddress: CONTRACT_ID 
};


};
