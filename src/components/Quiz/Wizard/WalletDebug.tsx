// src/components/WalletDebugPanel.tsx - Enhanced version with state sync fix
import React, { useState, useEffect } from 'react';
import { useStellarWallet } from '../../../chains/stellar/useStellarWallet';
import { stellarStorageKeys } from '../../../chains/stellar/config';
import { useWalletStore } from '../../../stores/walletStore'; // Add this import

interface DebugInfo {
  reactState: {
    isConnected: boolean;
    address: string | null;
    isConnecting: boolean;
    walletType: string | null;
    balance: string | null;
  };
  localStorage: {
    walletId: string | null;
    lastAddress: string | null;
    autoConnect: string | null;
  };
  walletKit: {
    exists: boolean;
    supportedWallets: any[];
    currentAddress: any;
    currentNetwork: any;
    error: string | null;
    directAddressCheck: any;
    wcSessionActive: boolean;
  };
  debugMessages: string[];
}

export const WalletDebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  
  const stellarWallet = useStellarWallet();
  const { updateStellarWallet, setActiveChain } = useWalletStore(); // Access store directly

  const addDebugMessage = (message: string) => {
    setDebugMessages(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const gatherDebugInfo = async (): Promise<DebugInfo> => {
    setIsLoading(true);
    const messages: string[] = [];
    
    const info: DebugInfo = {
      reactState: {
        isConnected: stellarWallet.isConnected,
        address: stellarWallet.address,
        isConnecting: stellarWallet.isConnecting,
        walletType: stellarWallet.walletType || null,
        balance: stellarWallet.balance || null,
      },
      localStorage: {
        walletId: localStorage.getItem(stellarStorageKeys.WALLET_ID),
        lastAddress: localStorage.getItem(stellarStorageKeys.LAST_ADDRESS),
        autoConnect: localStorage.getItem(stellarStorageKeys.AUTO_CONNECT),
      },
      walletKit: {
        exists: !!stellarWallet.walletKit,
        supportedWallets: [],
        currentAddress: null,
        currentNetwork: null,
        error: null,
        directAddressCheck: null,
        wcSessionActive: false,
      },
      debugMessages: debugMessages,
    };

    // Try to get wallet kit info
    if (stellarWallet.walletKit) {
      try {
        // Direct address check
        try {
          const directCheck = await stellarWallet.walletKit.getAddress();
          info.walletKit.directAddressCheck = directCheck;
          info.walletKit.wcSessionActive = !!directCheck?.address;
          messages.push(`Direct check result: ${JSON.stringify(directCheck)}`);
        } catch (directError) {
          messages.push(`Direct check failed: ${directError}`);
        }

        info.walletKit.supportedWallets = await stellarWallet.walletKit.getSupportedWallets();
        info.walletKit.currentNetwork = await stellarWallet.walletKit.getNetwork();
        
        messages.push(`Found ${info.walletKit.supportedWallets.length} supported wallets`);
      } catch (error) {
        info.walletKit.error = error instanceof Error ? error.message : String(error);
        messages.push(`WalletKit error: ${info.walletKit.error}`);
      }
    }

    setDebugMessages(prev => [...prev, ...messages]);
    setIsLoading(false);
    return info;
  };

  const refreshDebugInfo = async () => {
    const info = await gatherDebugInfo();
    setDebugInfo(info);
  };

  const syncReactState = async () => {
    addDebugMessage('🔄 Starting React state sync...');
    
    try {
      if (!stellarWallet.walletKit) {
        addDebugMessage('❌ No wallet kit available');
        return;
      }

      // Check for active WalletConnect session
      const directAddressCheck = await stellarWallet.walletKit.getAddress();
      addDebugMessage(`Direct address result: ${JSON.stringify(directAddressCheck)}`);
      
      if (directAddressCheck?.address) {
        addDebugMessage(`✅ Found active address: ${directAddressCheck.address}`);
        
        // Get network info
        let networkResult;
        try {
          networkResult = await stellarWallet.walletKit.getNetwork();
          addDebugMessage(`Network result: ${JSON.stringify(networkResult)}`);
        } catch (networkError) {
          addDebugMessage(`⚠️ Network fetch failed, using defaults: ${networkError}`);
          networkResult = { 
            networkPassphrase: 'Test SDF Network ; September 2015',
            network: 'testnet'
          };
        }
        
        // Get the wallet type from localStorage or default to walletConnect
        const savedWalletId = localStorage.getItem(stellarStorageKeys.WALLET_ID) || 'walletConnect';
        
        // Map wallet IDs to proper StellarWalletType
        const mapWalletIdToType = (walletId: string): 'freighter' | 'albedo' | 'rabet' | 'lobstr' | 'xbull' => {
          // Handle WalletConnect variations
          if (walletId.toLowerCase().includes('walletconnect') || walletId === 'walletConnect') {
            return 'lobstr'; // Default WalletConnect to LOBSTR
          }
          
          // Handle direct wallet types
          switch (walletId.toLowerCase()) {
            case 'freighter':
              return 'freighter';
            case 'albedo':
              return 'albedo';
            case 'rabet':
              return 'rabet';
            case 'lobstr':
              return 'lobstr';
            case 'xbull':
              return 'xbull';
            default:
              return 'lobstr'; // Default fallback
          }
        };
        
        // Update React state directly with proper error handling
        try {
          const connectionData = {
            address: directAddressCheck.address,
            isConnected: true,
            isConnecting: false,
            publicKey: directAddressCheck.address,
            networkPassphrase: networkResult.networkPassphrase,
            walletType: mapWalletIdToType(savedWalletId),
            error: null,
            lastConnected: new Date(),
          };
          
          addDebugMessage(`🔄 About to update state with: ${JSON.stringify(connectionData, null, 2)}`);
          
          // Call the store update function
          updateStellarWallet(connectionData);
          setActiveChain('stellar');
          
          addDebugMessage('🔄 Called updateStellarWallet successfully');
          
          // Store the connection info if not already stored
          localStorage.setItem(stellarStorageKeys.WALLET_ID, savedWalletId);
          localStorage.setItem(stellarStorageKeys.LAST_ADDRESS, directAddressCheck.address);
          localStorage.setItem(stellarStorageKeys.AUTO_CONNECT, 'true');
          
          addDebugMessage('✅ React state synced successfully!');
          
          // Wait a bit then refresh debug info to show the updated state
          setTimeout(async () => {
            await refreshDebugInfo();
          }, 500);
          
        } catch (stateUpdateError) {
          const errorMessage = stateUpdateError instanceof Error ? stateUpdateError.message : String(stateUpdateError);
          addDebugMessage(`❌ State update failed: ${errorMessage}`);
          console.error('State update error:', stateUpdateError);
        }
        
      } else {
        addDebugMessage('❌ No active address found');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDebugMessage(`❌ Sync failed: ${errorMessage}`);
      console.error('Full sync error:', error);
    }
  };

  const forceReconnect = async () => {
    addDebugMessage('🔄 Starting Force Reconnect...');
    
    try {
      if (!stellarWallet.walletKit) {
        addDebugMessage('❌ No wallet kit available');
        return;
      }

      // First, try to sync existing session
      await syncReactState();
      
      // If that didn't work, try full reconnection flow
      const currentInfo = await gatherDebugInfo();
      if (!currentInfo.reactState.isConnected) {
        addDebugMessage('🔄 No existing session found, starting full reconnect...');
        
        const supportedWallets = await stellarWallet.walletKit.getSupportedWallets();
        addDebugMessage(`Found ${supportedWallets.length} supported wallets`);
        
        // Look for WalletConnect wallet types
        const walletConnectWallets = supportedWallets.filter(w => 
          w.id?.toLowerCase().includes('walletconnect') || 
          w.name?.toLowerCase().includes('walletconnect') ||
          w.id === 'walletConnect'
        );
        
        addDebugMessage(`Found ${walletConnectWallets.length} WalletConnect wallets: ${walletConnectWallets.map(w => w.name || w.id).join(', ')}`);
        
        if (walletConnectWallets.length > 0) {
          const wcWallet = walletConnectWallets[0];
          addDebugMessage(`Trying to connect with: ${wcWallet.name || wcWallet.id}`);
          
          try {
            stellarWallet.walletKit.setWallet(wcWallet.id);
            
            // Poll for connection
            let attempts = 0;
            const maxAttempts = 15;
            
            const pollForConnection = async (): Promise<any> => {
              attempts++;
              addDebugMessage(`Polling attempt ${attempts}/${maxAttempts}`);
              
              try {
                const result = await stellarWallet.walletKit!.getAddress();
                
                if (result.address) {
                  addDebugMessage(`✅ Connection successful: ${result.address}`);
                  return result;
                } else if (attempts >= maxAttempts) {
                  throw new Error('Connection timeout');
                } else {
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  return pollForConnection();
                }
              } catch (error) {
                if (attempts >= maxAttempts) {
                  throw error;
                } else {
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  return pollForConnection();
                }
              }
            };
            
            const wcResult = await pollForConnection();
            
            if (wcResult?.address) {
              // Store connection info and sync state
              localStorage.setItem(stellarStorageKeys.WALLET_ID, wcWallet.id);
              localStorage.setItem(stellarStorageKeys.LAST_ADDRESS, wcResult.address);
              localStorage.setItem(stellarStorageKeys.AUTO_CONNECT, 'true');
              
              await syncReactState();
            }
          } catch (wcError) {
            addDebugMessage(`❌ WalletConnect connection failed: ${wcError}`);
          }
        } else {
          addDebugMessage('❌ No WalletConnect wallets found');
        }
      }

      await refreshDebugInfo();
      
    } catch (error) {
      addDebugMessage(`❌ Force reconnect error: ${error}`);
      await refreshDebugInfo();
    }
  };

  const clearDebugMessages = () => {
    setDebugMessages([]);
  };

  const testDirectConnection = async () => {
    addDebugMessage('🧪 Testing direct connection...');
    
    if (!stellarWallet.walletKit) {
      addDebugMessage('❌ No wallet kit');
      return;
    }

    try {
      const addressResult = await stellarWallet.walletKit.getAddress();
      addDebugMessage(`Address result: ${JSON.stringify(addressResult)}`);
      
      const networkResult = await stellarWallet.walletKit.getNetwork();
      addDebugMessage(`Network result: ${JSON.stringify(networkResult)}`);
      
      const supportedWallets = await stellarWallet.walletKit.getSupportedWallets();
      addDebugMessage(`Supported wallets: ${supportedWallets.length}`);
      
    } catch (error) {
      addDebugMessage(`❌ Test failed: ${error}`);
    }
  };

  useEffect(() => {
    if (isVisible && !debugInfo) {
      refreshDebugInfo();
    }
  }, [isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        🐛
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        right: '10px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: '#1f2937',
          color: 'white',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px' }}>Wallet Debug Enhanced</h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '16px', maxHeight: 'calc(90vh - 60px)', overflowY: 'auto' }}>
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={refreshDebugInfo}
            disabled={isLoading}
            style={{
              padding: '6px 10px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={syncReactState}
            style={{
              padding: '6px 10px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Sync State
          </button>
          <button
            onClick={forceReconnect}
            style={{
              padding: '6px 10px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Force Reconnect
          </button>
          <button
            onClick={testDirectConnection}
            style={{
              padding: '6px 10px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Test Direct
          </button>
        </div>

        {debugInfo && (
          <div style={{ fontSize: '11px', fontFamily: 'monospace' }}>
            {/* React State */}
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ margin: '0 0 6px 0', color: '#1f2937', fontSize: '12px' }}>React State:</h4>
              <div style={{ backgroundColor: '#f9fafb', padding: '8px', borderRadius: '4px' }}>
                <div>Connected: <strong>{debugInfo.reactState.isConnected ? 'YES' : 'NO'}</strong></div>
                <div>Address: <strong>{debugInfo.reactState.address ? `${debugInfo.reactState.address.slice(0, 8)}...${debugInfo.reactState.address.slice(-8)}` : 'None'}</strong></div>
                <div>Connecting: <strong>{debugInfo.reactState.isConnecting ? 'YES' : 'NO'}</strong></div>
                <div>Wallet Type: <strong>{debugInfo.reactState.walletType || 'None'}</strong></div>
                <div>Balance: <strong>{debugInfo.reactState.balance || 'None'}</strong></div>
              </div>
            </div>

            {/* LocalStorage */}
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ margin: '0 0 6px 0', color: '#1f2937', fontSize: '12px' }}>LocalStorage:</h4>
              <div style={{ backgroundColor: '#f0f9ff', padding: '8px', borderRadius: '4px' }}>
                <div>Wallet ID: <strong>{debugInfo.localStorage.walletId || 'None'}</strong></div>
                <div>Last Address: <strong>{debugInfo.localStorage.lastAddress ? `${debugInfo.localStorage.lastAddress.slice(0, 8)}...${debugInfo.localStorage.lastAddress.slice(-8)}` : 'None'}</strong></div>
                <div>Auto Connect: <strong>{debugInfo.localStorage.autoConnect || 'None'}</strong></div>
              </div>
            </div>

            {/* WalletKit Info */}
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ margin: '0 0 6px 0', color: '#1f2937', fontSize: '12px' }}>StellarWalletsKit:</h4>
              <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '4px' }}>
                <div>Kit Exists: <strong>{debugInfo.walletKit.exists ? 'YES' : 'NO'}</strong></div>
                <div>WC Session Active: <strong>{debugInfo.walletKit.wcSessionActive ? 'YES' : 'NO'}</strong></div>
                {debugInfo.walletKit.error && (
                  <div style={{ color: '#dc2626' }}>Error: <strong>{debugInfo.walletKit.error}</strong></div>
                )}
                {debugInfo.walletKit.directAddressCheck && (
                  <div>Direct Address: <strong>{debugInfo.walletKit.directAddressCheck.address ? `${debugInfo.walletKit.directAddressCheck.address.slice(0, 8)}...${debugInfo.walletKit.directAddressCheck.address.slice(-8)}` : 'None'}</strong></div>
                )}
                {debugInfo.walletKit.currentNetwork && (
                  <div>Kit Network: <strong>{debugInfo.walletKit.currentNetwork.network || 'None'}</strong></div>
                )}
                <div>Supported Wallets: <strong>{debugInfo.walletKit.supportedWallets.length}</strong></div>
                {debugInfo.walletKit.supportedWallets.length > 0 && (
                  <div style={{ marginTop: '4px', fontSize: '9px', wordBreak: 'break-all' }}>
                    {debugInfo.walletKit.supportedWallets.map(w => w.name || w.id).join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Status Analysis */}
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ margin: '0 0 6px 0', color: '#1f2937', fontSize: '12px' }}>Status Analysis:</h4>
              <div style={{ 
                backgroundColor: debugInfo.reactState.isConnected ? '#dcfce7' : '#fef2f2', 
                padding: '8px', 
                borderRadius: '4px' 
              }}>
                {debugInfo.reactState.isConnected ? (
                  <div style={{ color: '#166534' }}>✅ Wallet connected and synced</div>
                ) : debugInfo.walletKit.wcSessionActive ? (
                  <div style={{ color: '#dc2626' }}>⚠️ WalletConnect active but React state not synced - USE SYNC STATE BUTTON</div>
                ) : debugInfo.localStorage.walletId ? (
                  <div style={{ color: '#dc2626' }}>⚠️ Wallet ID stored but no active session</div>
                ) : (
                  <div style={{ color: '#6b7280' }}>ℹ️ No wallet connection</div>
                )}
              </div>
            </div>

            {/* Debug Messages */}
            <div>
              <h4 style={{ margin: '0 0 6px 0', color: '#1f2937', fontSize: '12px' }}>
                Debug Messages: 
                <button 
                  onClick={clearDebugMessages}
                  style={{
                    marginLeft: '8px',
                    padding: '2px 6px',
                    fontSize: '9px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              </h4>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '8px', 
                borderRadius: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                fontSize: '10px',
              }}>
                {debugMessages.length === 0 ? (
                  <div style={{ color: '#6b7280' }}>No debug messages yet...</div>
                ) : (
                  debugMessages.map((msg, idx) => (
                    <div key={idx} style={{ 
                      marginBottom: '2px', 
                      padding: '2px',
                      backgroundColor: msg.includes('❌') ? '#fee2e2' : 
                                     msg.includes('✅') ? '#dcfce7' : 
                                     msg.includes('🔄') ? '#dbeafe' : 'transparent'
                    }}>
                      {msg}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};