// src/hooks/useLazyWeb3.ts
import { useState, useCallback } from 'react';

export const useLazyWeb3 = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadSolanaWeb3 = useCallback(async () => {
    if (isLoaded || window.__SOLANA_WEB3__) return;
    
    setIsLoading(true);
    try {
      // Only load Solana when user clicks "Connect Solana Wallet"
      const [
        { Connection, PublicKey },
        { getAccount }
      ] = await Promise.all([
        import('@solana/web3.js'),
        import('@solana/spl-token')
      ]);
      
      // Store in global state
      window.__SOLANA_WEB3__ = { Connection, PublicKey, getAccount };
      setIsLoaded(true);
      
      console.log('✅ Solana Web3 libraries loaded');
    } catch (error) {
      console.error('❌ Failed to load Solana Web3:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded]);

  const loadEthereumWeb3 = useCallback(async () => {
    if (isLoaded || window.__ETHEREUM_WEB3__) return;
    
    setIsLoading(true);
    try {
      // Only load Ethereum when user clicks "Connect Ethereum Wallet"
      const [
        { createConfig },
        { getDefaultConfig }
      ] = await Promise.all([
        import('wagmi'),
        import('@rainbow-me/rainbowkit')
      ]);
      
      window.__ETHEREUM_WEB3__ = { createConfig, getDefaultConfig };
      setIsLoaded(true);
      
      console.log('✅ Ethereum Web3 libraries loaded');
    } catch (error) {
      console.error('❌ Failed to load Ethereum Web3:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded]);

  return {
    loadSolanaWeb3,
    loadEthereumWeb3,
    isLoading,
    isLoaded,
    // Helper to check if libraries are available
    isSolanaReady: !!window.__SOLANA_WEB3__,
    isEthereumReady: !!window.__ETHEREUM_WEB3__
  };
};