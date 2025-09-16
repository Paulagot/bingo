// src/components/WalletDebugPanel.tsx
import React, { useState, useEffect } from 'react';
import { useStellarWallet } from '../chains/stellar/useStellarWallet';
import { stellarStorageKeys } from '../chains/stellar/config';

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
  };
}

export const WalletDebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const stellarWallet = useStellarWallet();

  const gatherDebugInfo = async (): Promise<DebugInfo> => {
    setIsLoading(true);
    
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
      }
    };

    // Try to get wallet kit info
    if (stellarWallet.walletKit) {
      try {
        info.walletKit.supportedWallets = await stellarWallet.walletKit.getSupportedWallets();
        info.walletKit.currentAddress = await stellarWallet.walletKit.getAddress();
        info.walletKit.currentNetwork = await stellarWallet.walletKit.getNetwork();
      } catch (error) {
        info.walletKit.error = error instanceof Error ? error.message : String(error);
      }
    }

    setIsLoading(false);
    return info;
  };

  const refreshDebugInfo = async () => {
    const info = await gatherDebugInfo();
    setDebugInfo(info);
  };

  const forceReconnect = async () => {
    alert('Force Reconnect button clicked!'); // Test if button works
    
    try {
      alert('Checking if stellarWallet.walletKit exists...');
      
      if (stellarWallet.walletKit) {
        alert('WalletKit exists, checking for walletId...');
        
        const walletId = localStorage.getItem(stellarStorageKeys.WALLET_ID);
        alert(`WalletId found: ${walletId}`);
        
        if (walletId) {
          alert(`Attempting reconnect with wallet: ${walletId}`);
          console.log('Force reconnecting with wallet:', walletId);
          
          stellarWallet.walletKit.setWallet(walletId);
          alert('setWallet called, now getting address...');
          
          const result = await stellarWallet.walletKit.getAddress();
          alert(`getAddress result: ${JSON.stringify(result)}`);
          console.log('Force reconnect result:', result);
          
          await refreshDebugInfo();
          alert('Debug info refreshed');
        } else {
          alert('No wallet ID found in localStorage');
        }
      } else {
        alert('No wallet kit available - stellarWallet.walletKit is null/undefined');
      }
    } catch (error) {
      console.error('Force reconnect failed:', error);
      alert(`Force reconnect error: ${error}`);
      await refreshDebugInfo();
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
        top: '20px',
        right: '20px',
        width: '400px',
        maxHeight: '80vh',
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
        <h3 style={{ margin: 0, fontSize: '16px' }}>Wallet Debug</h3>
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
      <div style={{ padding: '16px', maxHeight: 'calc(80vh - 60px)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={refreshDebugInfo}
            disabled={isLoading}
            style={{
              padding: '8px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={forceReconnect}
            style={{
              padding: '8px 12px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Force Reconnect
          </button>
        </div>

        {debugInfo && (
          <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            {/* React State */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>React State:</h4>
              <div style={{ backgroundColor: '#f9fafb', padding: '8px', borderRadius: '4px' }}>
                <div>Connected: <strong>{debugInfo.reactState.isConnected ? 'YES' : 'NO'}</strong></div>
                <div>Address: <strong>{debugInfo.reactState.address || 'None'}</strong></div>
                <div>Connecting: <strong>{debugInfo.reactState.isConnecting ? 'YES' : 'NO'}</strong></div>
                <div>Wallet Type: <strong>{debugInfo.reactState.walletType || 'None'}</strong></div>
                <div>Balance: <strong>{debugInfo.reactState.balance || 'None'}</strong></div>
              </div>
            </div>

            {/* LocalStorage */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>LocalStorage:</h4>
              <div style={{ backgroundColor: '#f0f9ff', padding: '8px', borderRadius: '4px' }}>
                <div>Wallet ID: <strong>{debugInfo.localStorage.walletId || 'None'}</strong></div>
                <div>Last Address: <strong>{debugInfo.localStorage.lastAddress || 'None'}</strong></div>
                <div>Auto Connect: <strong>{debugInfo.localStorage.autoConnect || 'None'}</strong></div>
              </div>
            </div>

            {/* WalletKit Info */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>StellarWalletsKit:</h4>
              <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '4px' }}>
                <div>Kit Exists: <strong>{debugInfo.walletKit.exists ? 'YES' : 'NO'}</strong></div>
                {debugInfo.walletKit.error && (
                  <div style={{ color: '#dc2626' }}>Error: <strong>{debugInfo.walletKit.error}</strong></div>
                )}
                {debugInfo.walletKit.currentAddress && (
                  <div>Kit Address: <strong>{debugInfo.walletKit.currentAddress.address || 'None'}</strong></div>
                )}
                {debugInfo.walletKit.currentNetwork && (
                  <div>Kit Network: <strong>{debugInfo.walletKit.currentNetwork.network || 'None'}</strong></div>
                )}
                <div>Supported Wallets: <strong>{debugInfo.walletKit.supportedWallets.length}</strong></div>
                {debugInfo.walletKit.supportedWallets.length > 0 && (
                  <div style={{ marginTop: '4px', fontSize: '10px' }}>
                    {debugInfo.walletKit.supportedWallets.map(w => w.name || w.id).join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Status Analysis */}
            <div>
              <h4 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Status:</h4>
              <div style={{ 
                backgroundColor: debugInfo.reactState.isConnected ? '#dcfce7' : '#fef2f2', 
                padding: '8px', 
                borderRadius: '4px' 
              }}>
                {debugInfo.reactState.isConnected ? (
                  <div style={{ color: '#166534' }}>✅ Wallet appears to be connected</div>
                ) : debugInfo.localStorage.walletId && debugInfo.walletKit.currentAddress?.address ? (
                  <div style={{ color: '#dc2626' }}>⚠️ Wallet connected to kit but React state not updated</div>
                ) : debugInfo.localStorage.walletId ? (
                  <div style={{ color: '#dc2626' }}>⚠️ Wallet ID stored but no active connection</div>
                ) : (
                  <div style={{ color: '#6b7280' }}>ℹ️ No wallet connection</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};