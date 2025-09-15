// src/chains/stellar/practicalMobileConnect.ts
// A practical mobile solution that extracts real WalletConnect URIs

import { StellarWalletsKit, ISupportedWallet, LOBSTR_ID } from '@creit.tech/stellar-wallets-kit';
import { extractWalletConnectUri } from './walletConnectUriExtractor';

// Mobile detection
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const isAndroid = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

// Create practical mobile connection
export const createPracticalMobileConnection = async (
  stellarWalletKit: StellarWalletsKit,
  onWalletSelected: (wallet: ISupportedWallet) => Promise<void>,
  onError: (error: any) => void,
  onClosed?: () => void
): Promise<void> => {
  
  // Desktop: use standard modal
  if (!isMobileDevice()) {
    try {
      await stellarWalletKit.openModal({
        onWalletSelected,
        onClosed: (error) => {
          if (onClosed) onClosed();
          if (error) onError(error);
        },
      });
    } catch (error) {
      onError(error);
    }
    return;
  }

  // Mobile: show enhanced modal with LOBSTR deep link option
  showPracticalMobileModal(stellarWalletKit, onWalletSelected, onError, onClosed);
};

// Show practical mobile modal
const showPracticalMobileModal = (
  stellarWalletKit: StellarWalletsKit,
  onWalletSelected: (wallet: ISupportedWallet) => Promise<void>,
  onError: (error: any) => void,
  onClosed?: () => void
): void => {
  
  const modalHtml = `
    <div id="practical-stellar-modal" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    ">
      <div style="
        background: white;
        border-radius: 16px;
        width: 100%;
        max-width: 400px;
        padding: 24px;
        text-align: center;
      ">
        <h3 style="margin: 0 0 16px 0; font-size: 20px; color: #1f2937;">
          Connect Your Stellar Wallet
        </h3>
        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px;">
          Choose how you'd like to connect
        </p>
        
        <div style="margin-bottom: 20px;">
          <button id="lobstr-connect-button" style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 16px 20px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            background: white;
            cursor: pointer;
            margin-bottom: 12px;
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
          ">
            <span>📱 LOBSTR Wallet</span>
            <span style="font-size: 12px; color: #6b7280;">Tap to open</span>
          </button>
          
          <button id="practical-qr-button" style="
            width: 100%;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            background: #f9fafb;
            cursor: pointer;
            font-size: 14px;
            color: #374151;
          ">
            Show QR Code Instead
          </button>
        </div>
        
        <div id="loading-indicator" style="
          display: none;
          margin: 16px 0;
          color: #6b7280;
          font-size: 14px;
        ">
          Getting connection details...
        </div>
        
        <button id="close-practical-modal" style="
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #9ca3af;
        ">×</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modal = document.getElementById('practical-stellar-modal');
  const lobstrButton = document.getElementById('lobstr-connect-button');
  const qrButton = document.getElementById('practical-qr-button');
  const closeButton = document.getElementById('close-practical-modal');
  const loadingIndicator = document.getElementById('loading-indicator');

  // LOBSTR connection with real WalletConnect URI
  lobstrButton?.addEventListener('click', async () => {
    try {
      // Show loading
      if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
        loadingIndicator.textContent = 'Getting connection details...';
      }
      
      // Disable button during loading
      if (lobstrButton) {
        (lobstrButton as HTMLButtonElement).disabled = true;
        lobstrButton.style.opacity = '0.6';
      }

      // Extract WalletConnect URI
      const walletConnectUri = await extractWalletConnectUri(stellarWalletKit);
      
      if (walletConnectUri) {
        console.log('Successfully extracted WalletConnect URI');
        
        // Update loading message
        if (loadingIndicator) {
          loadingIndicator.textContent = 'Opening LOBSTR...';
        }
        
        // Close modal and attempt LOBSTR connection
        modal?.remove();
        await attemptLobstrWithUri(walletConnectUri, stellarWalletKit, onWalletSelected, onError);
        
      } else {
        console.warn('Could not extract WalletConnect URI, falling back to QR code');
        
        // Update loading message
        if (loadingIndicator) {
          loadingIndicator.textContent = 'Could not get connection details. Showing QR code...';
        }
        
        // Fallback to QR code after brief delay
        setTimeout(() => {
          modal?.remove();
          stellarWalletKit.openModal({
            onWalletSelected,
            onClosed: (error) => {
              if (onClosed) onClosed();
              if (error) onError(error);
            },
          });
        }, 1500);
      }
      
    } catch (error) {
      console.error('LOBSTR connection preparation failed:', error);
      modal?.remove();
      onError(error);
    }
  });

  // Direct QR code option
  qrButton?.addEventListener('click', () => {
    modal?.remove();
    stellarWalletKit.openModal({
      onWalletSelected,
      onClosed: (error) => {
        if (onClosed) onClosed();
        if (error) onError(error);
      },
    });
  });

  // Close modal
  closeButton?.addEventListener('click', () => {
    modal?.remove();
    if (onClosed) onClosed();
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      if (onClosed) onClosed();
    }
  });
};

// Attempt LOBSTR connection with actual WalletConnect URI
const attemptLobstrWithUri = async (
  walletConnectUri: string,
  stellarWalletKit: StellarWalletsKit,
  onWalletSelected: (wallet: ISupportedWallet) => Promise<void>,
  onError: (error: any) => void
): Promise<void> => {
  
  try {
    // Create the proper LOBSTR deep link with WalletConnect URI
    const encodedUri = encodeURIComponent(walletConnectUri);
    const lobstrDeepLink = `lobstr://wc?uri=${encodedUri}`;
    
    console.log('Attempting LOBSTR deep link:', lobstrDeepLink.substring(0, 50) + '...');
    
    // Track user activity to detect if LOBSTR opened
    let userLeftPage = false;
    let connectionChecked = false;
    const startTime = Date.now();
    
    const visibilityHandler = () => {
      if (document.hidden && !userLeftPage) {
        userLeftPage = true;
        console.log('User left page - LOBSTR likely opened');
      } else if (userLeftPage && !document.hidden && !connectionChecked) {
        connectionChecked = true;
        console.log('User returned - checking connection status');
        
        // Wait a moment for wallet connection to process
        setTimeout(() => {
          checkLobstrConnectionStatus(stellarWalletKit, onWalletSelected, onError);
        }, 1500);
        
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
    };

    document.addEventListener('visibilitychange', visibilityHandler);

    // Attempt to open LOBSTR with the WalletConnect URI
    window.location.href = lobstrDeepLink;

    // Fallback: If user hasn't left page after 4 seconds, LOBSTR probably not installed
    setTimeout(() => {
      if (Date.now() - startTime > 3500 && !userLeftPage && !connectionChecked) {
        document.removeEventListener('visibilitychange', visibilityHandler);
        connectionChecked = true;
        
        console.log('LOBSTR does not appear to be installed');
        showLobstrDownloadPrompt(stellarWalletKit, onWalletSelected, onError);
      }
    }, 4000);

    // Ultimate cleanup after 30 seconds
    setTimeout(() => {
      document.removeEventListener('visibilitychange', visibilityHandler);
    }, 30000);

  } catch (error) {
    console.error('LOBSTR deep link attempt failed:', error);
    onError(error);
  }
};

// Check if LOBSTR connection was successful
const checkLobstrConnectionStatus = async (
  stellarWalletKit: StellarWalletsKit,
  onWalletSelected: (wallet: ISupportedWallet) => Promise<void>,
  onError: (error: any) => void
): Promise<void> => {
  
  try {
    console.log('Checking LOBSTR connection status...');
    
    // Set wallet to LOBSTR
    stellarWalletKit.setWallet(LOBSTR_ID);
    
    // Try to get address - if successful, user approved connection in LOBSTR
    const result = await stellarWalletKit.getAddress();
    
    if (result.address) {
      console.log('LOBSTR connection successful:', result.address);
      
      // Find LOBSTR wallet and call selection handler
      const supportedWallets = await stellarWalletKit.getSupportedWallets();
      const lobstrWallet = supportedWallets.find((w: ISupportedWallet) => w.id === LOBSTR_ID);
      
      if (lobstrWallet) {
        await onWalletSelected(lobstrWallet);
        return;
      } else {
        throw new Error('LOBSTR wallet not found in supported wallets');
      }
    } else {
      throw new Error('No address returned from LOBSTR');
    }
    
  } catch (error) {
    console.warn('LOBSTR connection check failed:', error);
    
    // Show QR code as fallback
    stellarWalletKit.openModal({
      onWalletSelected,
      onClosed: () => {
        console.log('Fallback QR modal closed');
      },
    });
  }
};

// Show download prompt when LOBSTR is not installed
const showLobstrDownloadPrompt = (
  stellarWalletKit: StellarWalletsKit,
  onWalletSelected: (wallet: ISupportedWallet) => Promise<void>,
  onError: (error: any) => void
): void => {
  
  const downloadUrl = isIOS() 
    ? 'https://apps.apple.com/app/lobstr-stellar-lumens-wallet/id1404357892'
    : 'https://play.google.com/store/apps/details?id=com.lobstr.client';

  const message = `LOBSTR wallet doesn't seem to be installed. 

Would you like to:
• Download LOBSTR from the app store, or
• Connect using QR code instead?`;

  const shouldDownload = confirm(message);

  if (shouldDownload) {
    // Open app store
    window.open(downloadUrl, '_blank');
    
    // Also show QR code as backup after a delay
    setTimeout(() => {
      stellarWalletKit.openModal({
        onWalletSelected,
        onClosed: () => {
          console.log('QR modal closed after download prompt');
        },
      });
    }, 2000);
  } else {
    // Show QR code directly
    stellarWalletKit.openModal({
      onWalletSelected,
      onClosed: () => {
        console.log('QR modal closed - user declined download');
      },
    });
  }
};