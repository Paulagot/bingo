// src/chains/stellar/simpleMobileConnect.ts
// A working, simplified approach for mobile Stellar wallet connections

import { StellarWalletsKit, ISupportedWallet, LOBSTR_ID } from '@creit.tech/stellar-wallets-kit';

// Mobile detection utilities
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isAndroid = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

// Mobile wallet configurations (simplified)
interface SimpleMobileWallet {
  id: string;
  name: string;
  deepLinkScheme: string;
  downloadUrl: {
    ios?: string;
    android?: string;
  };
}

const MOBILE_WALLETS: SimpleMobileWallet[] = [
  {
    id: LOBSTR_ID,
    name: 'LOBSTR',
    deepLinkScheme: 'lobstr://',
    downloadUrl: {
      ios: 'https://apps.apple.com/app/lobstr-stellar-lumens-wallet/id1404357892',
      android: 'https://play.google.com/store/apps/details?id=com.lobstr.client',
    },
  },
];

// Simplified mobile connection handler
export const createSimpleMobileConnection = async (
  stellarWalletKit: StellarWalletsKit,
  onWalletSelected: (wallet: ISupportedWallet) => Promise<void>,
  onError: (error: any) => void,
  onClosed?: () => void
): Promise<void> => {
  
  // For desktop, use standard modal
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

  // For mobile, show simplified modal with LOBSTR option + QR fallback
  showSimpleMobileModal(stellarWalletKit, onWalletSelected, onError, onClosed);
};

// Show simplified mobile modal
const showSimpleMobileModal = (
  stellarWalletKit: StellarWalletsKit,
  onWalletSelected: (wallet: ISupportedWallet) => Promise<void>,
  onError: (error: any) => void,
  onClosed?: () => void
): void => {
  
  // Create simple mobile modal
  const modalHtml = `
    <div id="simple-stellar-modal" style="
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
        
        <div style="margin-bottom: 20px;">
          <button id="lobstr-button" style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 16px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            background: white;
            cursor: pointer;
            margin-bottom: 12px;
            font-size: 16px;
            font-weight: 600;
          ">
            📱 Open LOBSTR Wallet
          </button>
          
          <button id="qr-button" style="
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
        
        <button id="close-simple-modal" style="
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #9ca3af;
        ">&times;</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modal = document.getElementById('simple-stellar-modal');
  const lobstrButton = document.getElementById('lobstr-button');
  const qrButton = document.getElementById('qr-button');
  const closeButton = document.getElementById('close-simple-modal');

  // LOBSTR button - attempt deep link
  lobstrButton?.addEventListener('click', () => {
    modal?.remove();
    attemptLobstrConnection(stellarWalletKit, onWalletSelected, onError);
  });

  // QR code fallback
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

  // Close on background click
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      if (onClosed) onClosed();
    }
  });
};

// Attempt LOBSTR connection via deep link
const attemptLobstrConnection = async (
  stellarWalletKit: StellarWalletsKit,
  onWalletSelected: (wallet: ISupportedWallet) => Promise<void>,
  onError: (error: any) => void
): Promise<void> => {
  
  try {
    // First, try to open LOBSTR directly
    const lobstrDeepLink = 'lobstr://';
    
    // Track if user left the page (indicating app opened)
    let userLeftPage = false;
    const startTime = Date.now();
    
    const visibilityHandler = () => {
      if (document.hidden) {
        userLeftPage = true;
      } else if (userLeftPage && !document.hidden) {
        // User returned - check if LOBSTR connection worked
        setTimeout(() => {
          checkLobstrConnection(stellarWalletKit, onWalletSelected, onError);
        }, 1000);
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
    };

    document.addEventListener('visibilitychange', visibilityHandler);

    // Attempt to open LOBSTR
    window.location.href = lobstrDeepLink;

    // Fallback: If still here after 3 seconds, LOBSTR probably not installed
    setTimeout(() => {
      if (Date.now() - startTime > 2500 && !userLeftPage) {
        document.removeEventListener('visibilitychange', visibilityHandler);
        
        // Offer to download LOBSTR or show QR code
        showLobstrNotInstalledDialog(stellarWalletKit, onWalletSelected, onError);
      }
    }, 3000);

  } catch (error) {
    console.error('LOBSTR connection attempt failed:', error);
    onError(error);
  }
};

// Check if LOBSTR connection was successful
const checkLobstrConnection = async (
  stellarWalletKit: StellarWalletsKit,
  onWalletSelected: (wallet: ISupportedWallet) => Promise<void>,
  onError: (error: any) => void
): Promise<void> => {
  
  try {
    // Set wallet to LOBSTR and try to get address
    stellarWalletKit.setWallet(LOBSTR_ID);
    
    // Try to connect - this will work if user approved in LOBSTR
    const result = await stellarWalletKit.getAddress();
    
    if (result.address) {
      // Success! Find LOBSTR wallet and call selection handler
      const supportedWallets = await stellarWalletKit.getSupportedWallets();
      const lobstrWallet = supportedWallets.find((w: ISupportedWallet) => w.id === LOBSTR_ID);
      
      if (lobstrWallet) {
        await onWalletSelected(lobstrWallet);
        return;
      }
    }
    
    // If we get here, connection didn't work
    throw new Error('LOBSTR connection was not completed');
    
  } catch (error) {
    console.warn('LOBSTR connection check failed:', error);
    // Show QR code as fallback
    stellarWalletKit.openModal({
      onWalletSelected,
      onClosed: () => {
        console.log('QR modal closed');
      },
    });
  }
};

// Show dialog when LOBSTR is not installed
const showLobstrNotInstalledDialog = (
  stellarWalletKit: StellarWalletsKit,
  onWalletSelected: (wallet: ISupportedWallet) => Promise<void>,
  onError: (error: any) => void
): void => {
  
  const downloadUrl = isIOS() 
    ? 'https://apps.apple.com/app/lobstr-stellar-lumens-wallet/id1404357892'
    : 'https://play.google.com/store/apps/details?id=com.lobstr.client';

  const confirmed = confirm(
    'LOBSTR wallet is not installed. Would you like to download it, or connect using QR code instead?'
  );

  if (confirmed) {
    // Open download link
    window.open(downloadUrl, '_blank');
    
    // Also show QR code as alternative
    setTimeout(() => {
      stellarWalletKit.openModal({
        onWalletSelected,
        onClosed: () => {
          console.log('QR modal closed after download prompt');
        },
      });
    }, 1000);
  } else {
    // Show QR code directly
    stellarWalletKit.openModal({
      onWalletSelected,
      onClosed: () => {
        console.log('QR modal closed');
      },
    });
  }
};