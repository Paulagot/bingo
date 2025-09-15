// src/chains/stellar/useStellarWallet.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWalletStore } from '../../stores/walletStore';
import { 
  createStellarWalletsKit, 
  createHorizonServer,
  getCurrentNetworkConfig,
  stellarStorageKeys,
  stellarPollingConfig,
  stellarErrorMessages,
  walletConnectionOptions,
  getSupportedAssets,
  getExplorerUrl,
  isValidStellarAddress,
  isValidAmount,
  defaultStellarNetwork
} from './config';
import type { 
  StellarWalletConnection,
  StellarNetwork,
  StellarBalance,
  StellarPaymentParams,
  StellarWalletType 
} from '../types/stellar-types';
import type { 
  WalletConnectionResult, 
  TransactionResult, 
  WalletError
} from '../types';
import { WalletErrorCode } from '../types';
import { StellarWalletsKit, type ISupportedWallet } from '@creit.tech/stellar-wallets-kit';
import { Horizon, Asset, Operation, TransactionBuilder, Networks } from '@stellar/stellar-sdk';

export const useStellarWallet = () => {
  // ===================================================================
  // STATE MANAGEMENT
  // ===================================================================
  
  const { 
    stellar: stellarState, 
    updateStellarWallet, 
    resetWallet,
    setActiveChain 
  } = useWalletStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<StellarNetwork>(defaultStellarNetwork);
  const [balances, setBalances] = useState<StellarBalance[]>([]);
  
  // Refs for managing instances and preventing race conditions
  const walletKitRef = useRef<StellarWalletsKit | null>(null);
  const horizonServerRef = useRef<Horizon.Server | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const popupLockRef = useRef(false);
  const mountedRef = useRef(true);

  // ===================================================================
  // UTILITY FUNCTIONS (DECLARED FIRST)
  // ===================================================================

  const createWalletError = (
    code: WalletErrorCode, 
    message: string, 
    details?: any
  ): WalletError => ({
    code,
    message,
    details,
    timestamp: new Date()
  });

  // ===================================================================
  // POLLING FUNCTIONS (DECLARED BEFORE USE)
  // ===================================================================

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  // ===================================================================
  // BALANCE MANAGEMENT (DECLARED BEFORE USE)
  // ===================================================================

  const fetchBalances = useCallback(async (address?: string): Promise<string> => {
    const targetAddress = address || stellarState.address;
    
    if (!targetAddress || !horizonServerRef.current) {
      return '0';
    }

    try {
      const account = await horizonServerRef.current.accounts().accountId(targetAddress).call();
      const stellarBalances: StellarBalance[] = account.balances.map((balance: any) => ({
        asset: {
          code: balance.asset_type === 'native' ? 'XLM' : balance.asset_code,
          issuer: balance.asset_type === 'native' ? undefined : balance.asset_issuer,
          isNative: balance.asset_type === 'native',
        },
        balance: balance.balance,
        limit: balance.limit,
        buyingLiabilities: balance.buying_liabilities,
        sellingLiabilities: balance.selling_liabilities,
      }));
      
      setBalances(stellarBalances);
      
      // Update main balance (XLM)
      const xlmBalance = stellarBalances.find(b => b.asset.isNative)?.balance || '0';
      updateStellarWallet({ balance: xlmBalance });
      
      return xlmBalance;
    } catch (error) {
      console.error('❌ Failed to fetch balances:', error);
      return '0';
    }
  }, [stellarState.address, updateStellarWallet]);

  // ===================================================================
  // POLLING FOR WALLET STATE
  // ===================================================================

  const startPolling = useCallback(() => {
    if (pollingTimerRef.current) return; // Already polling
    
    const pollWalletState = async () => {
      if (!mountedRef.current || !stellarState.isConnected) return;
      
      try {
        // Check if wallet is still connected and refresh balances
        const savedWalletId = localStorage.getItem(stellarStorageKeys.WALLET_ID);
        if (savedWalletId && walletKitRef.current) {
          // Simple balance refresh - disconnect detection will be added later
          if (stellarState.address && horizonServerRef.current) {
            try {
              const account = await horizonServerRef.current.accounts().accountId(stellarState.address).call();
              const stellarBalances: StellarBalance[] = account.balances.map((balance: any) => ({
                asset: {
                  code: balance.asset_type === 'native' ? 'XLM' : balance.asset_code,
                  issuer: balance.asset_type === 'native' ? undefined : balance.asset_issuer,
                  isNative: balance.asset_type === 'native',
                },
                balance: balance.balance,
                limit: balance.limit,
                buyingLiabilities: balance.buying_liabilities,
                sellingLiabilities: balance.selling_liabilities,
              }));
              
              setBalances(stellarBalances);
              
              // Update main balance (XLM)
              const xlmBalance = stellarBalances.find(b => b.asset.isNative)?.balance || '0';
              updateStellarWallet({ balance: xlmBalance });
            } catch (balanceError) {
              console.error('❌ Failed to fetch balances during polling:', balanceError);
            }
          }
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
      
      // Schedule next poll
      if (mountedRef.current) {
        pollingTimerRef.current = setTimeout(pollWalletState, stellarPollingConfig.WALLET_STATE_INTERVAL);
      }
    };
    
    // Start polling
    pollingTimerRef.current = setTimeout(pollWalletState, stellarPollingConfig.WALLET_STATE_INTERVAL);
  }, [stellarState.isConnected, stellarState.address, updateStellarWallet]);

  // ===================================================================
  // WALLET DISCONNECTION
  // ===================================================================

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      updateStellarWallet({ isDisconnecting: true });
      
      // Stop polling first
      stopPolling();
      
      // Disconnect from wallet kit
      if (walletKitRef.current) {
        try {
          await walletKitRef.current.disconnect();
        } catch (error) {
          // Don't fail if wallet disconnect fails
          console.warn('Wallet disconnect warning:', error);
        }
      }
      
      // Clear storage
      localStorage.removeItem(stellarStorageKeys.WALLET_ID);
      localStorage.removeItem(stellarStorageKeys.AUTO_CONNECT);
      localStorage.removeItem(stellarStorageKeys.LAST_ADDRESS);
      
      // Reset state
      resetWallet('stellar');
      setBalances([]);
      
      console.log('✅ Stellar wallet disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect Stellar wallet:', error);
      updateStellarWallet({
        error: createWalletError(WalletErrorCode.UNKNOWN_ERROR, 'Failed to disconnect wallet', error)
      });
    } finally {
      updateStellarWallet({ isDisconnecting: false });
    }
  }, [updateStellarWallet, resetWallet, stopPolling]);

  // ===================================================================
  // WALLET RECONNECTION
  // ===================================================================

  const reconnectWallet = useCallback(async (walletId: string) => {
    if (!walletKitRef.current || popupLockRef.current) return;
    
    try {
      popupLockRef.current = true;
      walletKitRef.current.setWallet(walletId);
      
      const [addressResult, networkResult] = await Promise.all([
        walletKitRef.current.getAddress(),
        walletKitRef.current.getNetwork(),
      ]);
      
      if (addressResult.address) {
        const connectionData: Partial<StellarWalletConnection> = {
          address: addressResult.address,
          isConnected: true,
          publicKey: addressResult.address,
          networkPassphrase: networkResult.networkPassphrase,
          walletType: walletId as StellarWalletType,
          error: null,
        };
        
        updateStellarWallet(connectionData);
        setActiveChain('stellar');
        
        // Fetch balances
        await fetchBalances(addressResult.address);
        
        // Start polling
        startPolling();
      } else {
        // Invalid connection, clean up
        localStorage.removeItem(stellarStorageKeys.WALLET_ID);
        resetWallet('stellar');
      }
    } catch (error) {
      console.error('❌ Wallet reconnection failed:', error);
      localStorage.removeItem(stellarStorageKeys.WALLET_ID);
      resetWallet('stellar');
    } finally {
      popupLockRef.current = false;
    }
  }, [updateStellarWallet, setActiveChain, resetWallet, fetchBalances, startPolling]);

  // ===================================================================
  // INITIALIZATION
  // ===================================================================

  const initializeStellar = useCallback(async () => {
    try {
      // Create wallet kit instance
      walletKitRef.current = createStellarWalletsKit(currentNetwork);
      horizonServerRef.current = createHorizonServer(currentNetwork);
      
      setIsInitialized(true);
      
      // Check for existing wallet connection
      const savedWalletId = localStorage.getItem(stellarStorageKeys.WALLET_ID);
      const autoConnect = localStorage.getItem(stellarStorageKeys.AUTO_CONNECT) === 'true';
      
      if (savedWalletId && autoConnect) {
        await reconnectWallet(savedWalletId);
      }
      
      console.log('✅ Stellar wallet initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Stellar wallet:', error);
      updateStellarWallet({
        error: createWalletError(WalletErrorCode.CONNECTION_FAILED, 'Failed to initialize Stellar wallet', error)
      });
    }
  }, [currentNetwork, updateStellarWallet, reconnectWallet]);

  // ===================================================================
  // WALLET CONNECTION
  // ===================================================================

 // Add this to your useStellarWallet.ts - replace the connect function

const connect = useCallback(async (): Promise<WalletConnectionResult> => {
  if (stellarState.isConnecting) {
    console.log('Connection already in progress, waiting...');
    return {
      success: false,
      address: null,
      error: createWalletError(WalletErrorCode.CONNECTION_FAILED, 'Connection already in progress')
    };
  }

  // CHECK IF ALREADY CONNECTED
  if (stellarState.isConnected && stellarState.address) {
    console.log('Already connected to wallet:', stellarState.address);
    return {
      success: true,
      address: stellarState.address,
      networkInfo: {
        chainId: currentNetwork,
        name: currentNetwork,
        isTestnet: currentNetwork === 'testnet',
        rpcUrl: getCurrentNetworkConfig(currentNetwork).horizonUrl,
        blockExplorer: getExplorerUrl('account', '', currentNetwork),
      }
    };
  }

  if (!walletKitRef.current) {
    throw new Error('Stellar wallet not initialized');
  }

  try {
    updateStellarWallet({ isConnecting: true, error: null });
    
    // Extended timeout for mobile connections (WalletConnect can be slow)
    const connectionTimeout = 60000; // 60 seconds
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        updateStellarWallet({ isConnecting: false });
        reject(new Error('Connection timeout - please try again'));
      }, connectionTimeout);

      const handleWalletSelection = async (option: ISupportedWallet) => {
        clearTimeout(timeoutId);
        try {
          const walletId = option.id;
          console.log('Wallet selected:', walletId, option);
          
          // Set the selected wallet in the kit
          walletKitRef.current!.setWallet(walletId);
          
          // Get address (this triggers the wallet's authorization flow)
          console.log('Getting wallet address...');
          const addressResult = await walletKitRef.current!.getAddress();
          console.log('Address result:', addressResult);
          
          if (addressResult.address) {
            // Store wallet preferences
            localStorage.setItem(stellarStorageKeys.WALLET_ID, walletId);
            localStorage.setItem(stellarStorageKeys.AUTO_CONNECT, 'true');
            localStorage.setItem(stellarStorageKeys.LAST_ADDRESS, addressResult.address);
            
            // Get network info
            console.log('Getting network info...');
            const networkResult = await walletKitRef.current!.getNetwork();
            console.log('Network result:', networkResult);
            
            // Update wallet state
            const connectionData: Partial<StellarWalletConnection> = {
              address: addressResult.address,
              isConnected: true,
              isConnecting: false,
              publicKey: addressResult.address,
              networkPassphrase: networkResult.networkPassphrase,
              walletType: walletId as StellarWalletType,
              error: null,
              lastConnected: new Date(),
            };
            
            updateStellarWallet(connectionData);
            setActiveChain('stellar');
            
            // Fetch initial balances
            await fetchBalances(addressResult.address);
            
            // Start polling for wallet state updates
            startPolling();
            
            const result: WalletConnectionResult = {
              success: true,
              address: addressResult.address,
              networkInfo: {
                chainId: networkResult.network,
                name: networkResult.network,
                isTestnet: currentNetwork === 'testnet',
                rpcUrl: getCurrentNetworkConfig(currentNetwork).horizonUrl,
                blockExplorer: getExplorerUrl('account', '', currentNetwork),
              }
            };
            
            console.log('Connection successful:', result);
            resolve(result);
          } else {
            // Connection failed - no address returned
            console.error('No address returned from wallet');
            localStorage.removeItem(stellarStorageKeys.WALLET_ID);
            const error = createWalletError(
              WalletErrorCode.CONNECTION_REJECTED, 
              stellarErrorMessages.CONNECTION_REJECTED
            );
            
            updateStellarWallet({ 
              isConnecting: false, 
              error 
            });
            
            resolve({
              success: false,
              address: null,
              error
            });
          }
        } catch (error) {
          console.error('Wallet selection failed:', error);
          
          // Determine error type
          let errorCode = WalletErrorCode.CONNECTION_FAILED;
          let errorMessage = stellarErrorMessages.CONNECTION_FAILED;
          
          if (error instanceof Error) {
            if (error.message.includes('rejected') || error.message.includes('denied')) {
              errorCode = WalletErrorCode.CONNECTION_REJECTED;
              errorMessage = stellarErrorMessages.CONNECTION_REJECTED;
            } else if (error.message.includes('timeout')) {
              errorCode = WalletErrorCode.TIMEOUT;
              errorMessage = stellarErrorMessages.TIMEOUT;
            }
          }
          
          const walletError = createWalletError(errorCode, errorMessage, error);
          
          updateStellarWallet({ 
            isConnecting: false, 
            error: walletError 
          });
          
          resolve({
            success: false,
            address: null,
            error: walletError
          });
        }
      };

      const handleConnectionError = (error: any) => {
        clearTimeout(timeoutId);
        console.error('Connection failed:', error);
        
        const walletError = createWalletError(
          WalletErrorCode.CONNECTION_FAILED, 
          'Failed to connect wallet', 
          error
        );
        
        updateStellarWallet({ 
          isConnecting: false, 
          error: walletError 
        });
        
        resolve({
          success: false,
          address: null,
          error: walletError
        });
      };

      const handleConnectionClosed = () => {
        clearTimeout(timeoutId);
        console.log('User closed connection modal');
        
        updateStellarWallet({ isConnecting: false });
        
        resolve({
          success: false,
          address: null,
          error: createWalletError(
            WalletErrorCode.CONNECTION_REJECTED, 
            'User closed wallet modal'
          )
        });
      };

      try {
        // Try to import and use the simplified mobile solution
        import('./simpleMobileConnect')
          .then(({ createSimpleMobileConnection }) => {
            createSimpleMobileConnection(
              walletKitRef.current!,
              handleWalletSelection,
              handleConnectionError,
              handleConnectionClosed
            );
          })
          .catch((importError) => {
            // Fallback to standard modal if mobile enhancement fails
            console.warn('Mobile enhancement failed, using standard modal:', importError);
            walletKitRef.current!.openModal({
              ...walletConnectionOptions,
              onWalletSelected: handleWalletSelection,
              onClosed: (error) => {
                if (error) {
                  handleConnectionError(error);
                } else {
                  handleConnectionClosed();
                }
              },
            });
          });
      } catch (modalError) {
        handleConnectionError(modalError);
      }
    });
  } catch (error) {
    const walletError = createWalletError(
      WalletErrorCode.CONNECTION_FAILED, 
      'Failed to initialize wallet connection', 
      error
    );
    
    updateStellarWallet({ 
      isConnecting: false, 
      error: walletError 
    });
    
    return {
      success: false,
      address: null,
      error: walletError
    };
  }
}, [
  stellarState.isConnecting, 
  stellarState.isConnected, 
  stellarState.address,
  currentNetwork,
  updateStellarWallet, 
  setActiveChain, 
  fetchBalances, 
  startPolling
]);

  // ===================================================================
  // TRANSACTION METHODS
  // ===================================================================

  const sendPayment = useCallback(async (params: StellarPaymentParams): Promise<TransactionResult> => {
    if (!walletKitRef.current || !stellarState.isConnected || !stellarState.address) {
      throw new Error('Wallet not connected');
    }

    // Validate inputs
    if (!isValidStellarAddress(params.to)) {
      return {
        success: false,
        error: createWalletError(WalletErrorCode.INVALID_ADDRESS, 'Invalid Stellar address')
      };
    }

    if (!isValidAmount(params.amount)) {
      return {
        success: false,
        error: createWalletError(WalletErrorCode.INVALID_AMOUNT, 'Invalid amount')
      };
    }

    try {
      // Get network configuration  
      const networkPassphrase = currentNetwork === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
      
      // Get source account
      const sourceAccount = await horizonServerRef.current!.loadAccount(stellarState.address);
      
      // Create asset (default to XLM if not specified)
      const asset = params.asset?.isNative ? Asset.native() : 
        new Asset(params.asset!.code, params.asset!.issuer!);
      
      // Build transaction
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100000', // 0.01 XLM
        networkPassphrase,
      })
        .addOperation(Operation.payment({
          destination: params.to,
          asset: asset,
          amount: params.amount,
        }))
        .setTimeout(30)
        .build();

      // Sign transaction using wallet kit
      const signedTx = await walletKitRef.current.signTransaction(transaction.toXDR());
      
      // Parse the signed transaction
      const signedTransaction = TransactionBuilder.fromXDR(signedTx.signedTxXdr, networkPassphrase);
      
      // Submit transaction
      const result = await horizonServerRef.current!.submitTransaction(signedTransaction);
      
      // Refresh balances after successful transaction
      await fetchBalances();
      
      return {
        success: true,
        transactionHash: result.hash,
        explorerUrl: getExplorerUrl('transaction', result.hash, currentNetwork)
      };
    } catch (error: any) {
      console.error('❌ Payment failed:', error);
      
      let errorCode: WalletErrorCode = WalletErrorCode.TRANSACTION_FAILED;
      let errorMessage = stellarErrorMessages.TRANSACTION_FAILED;
      
      if (error.message?.includes('insufficient')) {
        errorCode = WalletErrorCode.INSUFFICIENT_FUNDS;
        errorMessage = stellarErrorMessages.INSUFFICIENT_FUNDS;
      } else if (error.message?.includes('rejected')) {
        errorCode = WalletErrorCode.TRANSACTION_REJECTED;
        errorMessage = 'Transaction was rejected';
      }
      
      return {
        success: false,
        error: createWalletError(errorCode, errorMessage, error)
      };
    }
  }, [stellarState.isConnected, stellarState.address, currentNetwork, fetchBalances]);

  // ===================================================================
  // NETWORK MANAGEMENT
  // ===================================================================

  const switchNetwork = useCallback(async (network: StellarNetwork): Promise<boolean> => {
    try {
      setCurrentNetwork(network);
      localStorage.setItem(stellarStorageKeys.NETWORK, network);
      
      // Reinitialize with new network
      await initializeStellar();
      
      // If connected, reconnect to update network info
      if (stellarState.isConnected) {
        const savedWalletId = localStorage.getItem(stellarStorageKeys.WALLET_ID);
        if (savedWalletId) {
          await reconnectWallet(savedWalletId);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Network switch failed:', error);
      return false;
    }
  }, [stellarState.isConnected, initializeStellar, reconnectWallet]);

  // ===================================================================
  // ADDITIONAL UTILITY METHODS
  // ===================================================================

  const getBalance = useCallback(async (tokenAddress?: string): Promise<string> => {
    if (tokenAddress) {
      // Get specific token balance
      const tokenBalance = balances.find(b => 
        !b.asset.isNative && 
        (b.asset.issuer === tokenAddress || `${b.asset.code}:${b.asset.issuer}` === tokenAddress)
      );
      return tokenBalance?.balance || '0';
    }
    
    // Get XLM balance
    return stellarState.balance || '0';
  }, [balances, stellarState.balance]);

  // ===================================================================
  // LIFECYCLE MANAGEMENT
  // ===================================================================

  useEffect(() => {
    mountedRef.current = true;
    initializeStellar();
    
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [initializeStellar, stopPolling]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // ===================================================================
  // RETURN INTERFACE
  // ===================================================================

  return {
    // Connection state
    ...stellarState,
    isInitialized,
    currentNetwork,
    balances,
    
    // Connection methods
    connect,
    disconnect,
    reconnect: () => {
      const savedWalletId = localStorage.getItem(stellarStorageKeys.WALLET_ID);
      return savedWalletId ? reconnectWallet(savedWalletId) : Promise.resolve();
    },

     walletKit: walletKitRef.current,
    
    // Transaction methods
    sendPayment,
    getBalance,
    
    // Network methods
    switchNetwork,
    getSupportedAssets: () => getSupportedAssets(currentNetwork),
    
    // Utility methods
    formatAddress: (address: string) => address ? `${address.slice(0, 4)}...${address.slice(-4)}` : '',
    getExplorerUrl: (type: 'transaction' | 'account' | 'asset', identifier: string) => 
      getExplorerUrl(type, identifier, currentNetwork),
    
    // State helpers
    isWalletInstalled: () => !!walletKitRef.current,
    canConnect: isInitialized && !stellarState.isConnecting,
    canDisconnect: stellarState.isConnected && !stellarState.isDisconnecting,

    
  };
};