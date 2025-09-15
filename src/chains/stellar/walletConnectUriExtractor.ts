// src/chains/stellar/walletConnectUriExtractor.ts
// Methods to extract WalletConnect URI from StellarWalletsKit

import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';

export class WalletConnectUriExtractor {
  private stellarWalletKit: StellarWalletsKit;
  private extractedUri: string | null = null;

  constructor(stellarWalletKit: StellarWalletsKit) {
    this.stellarWalletKit = stellarWalletKit;
  }

  // Method 1: Intercept the QR code modal to extract URI
  public async getUriFromModal(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      try {
        // Create a hidden container to capture the modal
        const hiddenContainer = document.createElement('div');
        hiddenContainer.style.display = 'none';
        hiddenContainer.id = 'walletconnect-uri-extractor';
        document.body.appendChild(hiddenContainer);

        // Override the modal to extract URI
        this.stellarWalletKit.openModal({
          onWalletSelected: () => {
            // This won't be called, we just need the modal to generate
          },
          onClosed: () => {
            // Clean up when closed
            document.body.removeChild(hiddenContainer);
          }
        });

        // Look for QR code elements or data attributes
        const checkForUri = () => {
          // Method 1: Check for QR code images with data URLs
          const qrImages = hiddenContainer.querySelectorAll('img[src*="data:image"]');
          for (const img of qrImages) {
            const src = img.getAttribute('src');
            if (src && src.includes('wc:')) {
              // Try to extract URI from QR code data
              try {
                // QR codes often have the URI encoded in the data URL
                const uri = this.decodeQRFromDataUrl(src);
                if (uri) {
                  document.body.removeChild(hiddenContainer);
                  resolve(uri);
                  return;
                }
              } catch (error) {
                console.warn('Failed to decode QR code:', error);
              }
            }
          }

          // Method 2: Look for text content containing wc:
          const textElements = hiddenContainer.querySelectorAll('*');
          for (const element of textElements) {
            const text = element.textContent || '';
            if (text.includes('wc:')) {
              const wcMatch = text.match(/wc:[a-zA-Z0-9\-@?&=%.]+/);
              if (wcMatch) {
                document.body.removeChild(hiddenContainer);
                resolve(wcMatch[0]);
                return;
              }
            }
          }

          // Method 3: Check for data attributes
          const dataElements = hiddenContainer.querySelectorAll('[data-uri], [data-walletconnect-uri]');
          for (const element of dataElements) {
            const uri = element.getAttribute('data-uri') || element.getAttribute('data-walletconnect-uri');
            if (uri && uri.startsWith('wc:')) {
              document.body.removeChild(hiddenContainer);
              resolve(uri);
              return;
            }
          }

          // Continue checking if no URI found yet
          setTimeout(checkForUri, 100);
        };

        // Start checking after a brief delay
        setTimeout(checkForUri, 500);

        // Timeout after 10 seconds
        setTimeout(() => {
          if (document.body.contains(hiddenContainer)) {
            document.body.removeChild(hiddenContainer);
          }
          resolve(null);
        }, 10000);

      } catch (error) {
        console.error('Failed to extract URI from modal:', error);
        reject(error);
      }
    });
  }

  // Method 2: Use WalletConnect events (if available)
  public async getUriFromEvents(): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        let resolved = false;

        // Listen for WalletConnect display_uri events
        const handleDisplayUri = (event: CustomEvent | Event) => {
          if (resolved) return;
          
          const uri = (event as CustomEvent).detail?.uri || (event as any).uri;
          if (uri && uri.startsWith('wc:')) {
            resolved = true;
            resolve(uri);
            // Clean up event listeners
            window.removeEventListener('walletconnect_display_uri', handleDisplayUri);
            window.removeEventListener('display_uri', handleDisplayUri);
          }
        };

        // Listen for various WalletConnect event patterns
        window.addEventListener('walletconnect_display_uri', handleDisplayUri);
        window.addEventListener('display_uri', handleDisplayUri);

        // Try to trigger WalletConnect initialization
        // This approach depends on the internal WalletConnect implementation
        try {
          // Attempt to access internal WalletConnect instance
          const walletConnectInstance = (this.stellarWalletKit as any).walletConnect || 
                                       (this.stellarWalletKit as any).connector ||
                                       (this.stellarWalletKit as any).wcClient;

          if (walletConnectInstance) {
            // Try to get URI directly from instance
            const uri = walletConnectInstance.uri || 
                       walletConnectInstance.connector?.uri ||
                       walletConnectInstance.client?.core?.pairing?.getAll()?.[0]?.uri;
            
            if (uri && uri.startsWith('wc:')) {
              resolved = true;
              resolve(uri);
              return;
            }

            // Try to trigger connection to generate URI
            if (walletConnectInstance.connect && !resolved) {
              walletConnectInstance.connect().catch(() => {
                // We expect this to fail, we just want the URI
              });
            }
          }
        } catch (error) {
          console.warn('Could not access WalletConnect instance directly:', error);
        }

        // Timeout after 15 seconds
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener('walletconnect_display_uri', handleDisplayUri);
            window.removeEventListener('display_uri', handleDisplayUri);
            resolve(null);
          }
        }, 15000);

      } catch (error) {
        console.error('Failed to get URI from events:', error);
        resolve(null);
      }
    });
  }

  // Method 3: DOM mutation observer to catch dynamically added QR codes
  public async getUriFromDOMObserver(): Promise<string | null> {
    return new Promise((resolve) => {
      let resolved = false;
      const observer = new MutationObserver((mutations) => {
        if (resolved) return;

        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check for QR code images
              const qrImages = element.querySelectorAll('img[src*="data:image"]');
              qrImages.forEach((img) => {
                const src = img.getAttribute('src');
                if (src && !resolved) {
                  try {
                    const uri = this.decodeQRFromDataUrl(src);
                    if (uri && uri.startsWith('wc:')) {
                      resolved = true;
                      observer.disconnect();
                      resolve(uri);
                    }
                  } catch (error) {
                    // Continue checking other elements
                  }
                }
              });

              // Check for text content with WC URI
              if (element.textContent && element.textContent.includes('wc:') && !resolved) {
                const wcMatch = element.textContent.match(/wc:[a-zA-Z0-9\-@?&=%.]+/);
                if (wcMatch) {
                  resolved = true;
                  observer.disconnect();
                  resolve(wcMatch[0]);
                }
              }
            }
          });
        });
      });

      // Start observing DOM changes
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Trigger modal opening to generate QR code
      try {
        this.stellarWalletKit.openModal({
          onWalletSelected: () => {},
          onClosed: () => {
            if (!resolved) {
              resolved = true;
              observer.disconnect();
              resolve(null);
            }
          }
        });
      } catch (error) {
        console.error('Failed to open modal for URI extraction:', error);
        resolved = true;
        observer.disconnect();
        resolve(null);
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          observer.disconnect();
          resolve(null);
        }
      }, 10000);
    });
  }

  // Helper method to decode QR code from data URL (simplified)
  private decodeQRFromDataUrl(dataUrl: string): string | null {
    try {
      // This is a simplified approach - in a real implementation,
      // you might want to use a proper QR code decoder library
      
      // For now, we'll check if the data URL contains WC URI patterns
      // This is a fallback that might work in some cases
      
      // Try to extract from data URL if it's text-based
      if (dataUrl.includes('data:text')) {
        const base64 = dataUrl.split(',')[1];
        if (base64) {
          try {
            const decoded = atob(base64);
            if (decoded.startsWith('wc:')) {
              return decoded;
            }
          } catch {
            // Not base64 text
          }
        }
      }

      // For image-based QR codes, we'd need a QR decoder library
      // For now, return null and rely on other methods
      return null;
      
    } catch (error) {
      console.error('Failed to decode QR from data URL:', error);
      return null;
    }
  }

  // Main method that tries all approaches
  public async extractWalletConnectUri(): Promise<string | null> {
    console.log('Attempting to extract WalletConnect URI...');

    try {
      // Try Method 1: Events first (fastest)
      console.log('Trying WalletConnect events...');
      const eventUri = await this.getUriFromEvents();
      if (eventUri) {
        console.log('✅ Got URI from events:', eventUri.substring(0, 20) + '...');
        return eventUri;
      }

      // Try Method 2: DOM observer
      console.log('Trying DOM observer...');
      const domUri = await this.getUriFromDOMObserver();
      if (domUri) {
        console.log('✅ Got URI from DOM observer:', domUri.substring(0, 20) + '...');
        return domUri;
      }

      // Try Method 3: Modal interception (last resort)
      console.log('Trying modal interception...');
      const modalUri = await this.getUriFromModal();
      if (modalUri) {
        console.log('✅ Got URI from modal:', modalUri.substring(0, 20) + '...');
        return modalUri;
      }

      console.warn('❌ Could not extract WalletConnect URI using any method');
      return null;

    } catch (error) {
      console.error('❌ WalletConnect URI extraction failed:', error);
      return null;
    }
  }
}

// Usage example:
export const extractWalletConnectUri = async (stellarWalletKit: StellarWalletsKit): Promise<string | null> => {
  const extractor = new WalletConnectUriExtractor(stellarWalletKit);
  return await extractor.extractWalletConnectUri();
};