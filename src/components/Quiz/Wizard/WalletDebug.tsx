import React from 'react';
import { useStellarWallet } from '../../../chains/stellar/useStellarWallet';

export const WalletDebug: React.FC = () => {
  const wallet = useStellarWallet();

  const testDirectConnection = async () => {
    try {
      console.log('Testing direct wallet connection...');
      const result = await wallet.connect();
      console.log('Connection result:', result);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const testDirectFreighterConnection = async () => {
  console.log('Testing direct Freighter connection...');
  
  // Check if Freighter is available
  if (typeof window !== 'undefined' && (window as any).freighter) {
    try {
      console.log('Freighter detected:', (window as any).freighter);
      
      // Try to get public key directly
      const publicKey = await (window as any).freighter.getPublicKey();
      console.log('Freighter public key:', publicKey);
      
      // Try to get network
      const network = await (window as any).freighter.getNetwork();
      console.log('Freighter network:', network);
      
    } catch (error) {
      console.error('Direct Freighter connection failed:', error);
    }
  } else {
    console.log('Freighter not detected on window object');
    console.log('Available on window:', Object.keys(window).filter(k => k.includes('freighter')));
  }
};

const testWindowState = () => {
  console.log('Window wallet objects:', {
    freighter: !!(window as any).freighter,
    rabet: !!(window as any).rabet,
    albedo: !!(window as any).albedo,
    xBullSDK: !!(window as any).xBullSDK,
  });
  
  // Check if there are multiple contexts
  console.log('Window keys containing wallet terms:', 
    Object.keys(window).filter(k => 
      k.toLowerCase().includes('stellar') || 
      k.toLowerCase().includes('freighter') ||
      k.toLowerCase().includes('wallet')
    )
  );
};

const waitForWalletInjection = async () => {
  console.log('Waiting for wallet injection...');
  
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const walletsDetected = {
      freighter: !!(window as any).freighter,
      rabet: !!(window as any).rabet,
      albedo: !!(window as any).albedo,
      xBullSDK: !!(window as any).xBullSDK,
    };
    
    console.log(`Attempt ${i + 1}:`, walletsDetected);
    
    if (walletsDetected.freighter) {
      console.log('Freighter detected after waiting!');
      return;
    }
  }
  
  console.log('No wallets detected after 10 seconds');
};

  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
      <h3 className="text-lg font-bold mb-4">Wallet Debug Panel</h3>
      
      <div className="space-y-2 text-sm mb-4">
        <div>Initialized: {wallet.isInitialized ? 'Yes' : 'No'}</div>
        <div>Connected: {wallet.isConnected ? 'Yes' : 'No'}</div>
        <div>Connecting: {wallet.isConnecting ? 'Yes' : 'No'}</div>
        <div>Address: {wallet.address || 'None'}</div>
        <div>Network: {wallet.currentNetwork}</div>
        <div>Balance: {wallet.balance || '0'}</div>
        <div>WalletKit Available: {wallet.walletKit ? 'Yes' : 'No'}</div>
        <div>Can Connect: {wallet.canConnect ? 'Yes' : 'No'}</div>
        <div>Error: {wallet.error?.message || 'None'}</div>
      </div>

      <button 
  onClick={testDirectFreighterConnection}
  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
>
  Test Direct Freighter
</button>

<button 
  onClick={testWindowState}
  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 mr-2"
>
  Test Window State
</button>

<button 
  onClick={waitForWalletInjection}
  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 mr-2"
>
  wallet injection wait
</button>

      <div className="space-x-2">
        <button 
          onClick={testDirectConnection}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={wallet.isConnecting}
        >
          Test Connection
        </button>
        
        <button 
          onClick={wallet.disconnect}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          disabled={!wallet.isConnected}
        >
          Disconnect
        </button>
      </div>

      {wallet.balances.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium">Balances:</h4>
          {wallet.balances.map((balance, idx) => (
            <div key={idx} className="text-xs">
              {balance.asset.code}: {balance.balance}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};