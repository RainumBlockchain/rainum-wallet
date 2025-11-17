/**
 * Extension Bridge
 * Handles communication between web app and browser extension
 */

export interface ExtensionMessage {
  type: string;
  source: string;
  data?: any;
}

export interface ExtensionInfo {
  version?: string;
  isEnabled: boolean;
  walletAddress?: string;
}

// Extension store URLs
export const EXTENSION_STORES = {
  chrome: 'https://chrome.google.com/webstore/detail/rainum-wallet/[EXTENSION_ID]',
  firefox: 'https://addons.mozilla.org/firefox/addon/rainum-wallet/',
  edge: 'https://microsoftedge.microsoft.com/addons/detail/rainum-wallet/[EXTENSION_ID]',
};

/**
 * Detect browser type
 */
export function getBrowserType(): 'chrome' | 'firefox' | 'edge' {
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('firefox')) return 'firefox';
  if (ua.includes('chrome')) return 'chrome';

  return 'chrome'; // Default
}

/**
 * Get extension download URL for current browser
 */
export function getExtensionDownloadUrl(): string {
  const browser = getBrowserType();
  return EXTENSION_STORES[browser];
}

/**
 * Check if Rainum extension is installed
 * Extension should inject window.rainum object
 */
export function isExtensionInstalled(): boolean {
  return typeof window !== 'undefined' && 'rainum' in window;
}

/**
 * Check if extension is enabled and responding
 */
export async function isExtensionEnabled(): Promise<boolean> {
  if (!isExtensionInstalled()) {
    return false;
  }

  try {
    // Send ping message
    return await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 1000);

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'RAINUM_PONG' && event.data?.source === 'rainum-extension') {
          clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
          resolve(true);
        }
      };

      window.addEventListener('message', handleMessage);

      window.postMessage({
        type: 'RAINUM_PING',
        source: 'rainum-webapp',
      }, '*');
    });
  } catch (error) {
    console.error('Extension ping failed:', error);
    return false;
  }
}

/**
 * Get extension info
 */
export async function getExtensionInfo(): Promise<ExtensionInfo | null> {
  if (!isExtensionInstalled()) {
    return null;
  }

  try {
    return await new Promise<ExtensionInfo | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 2000);

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'RAINUM_INFO_RESPONSE' && event.data?.source === 'rainum-extension') {
          clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
          resolve(event.data.data);
        }
      };

      window.addEventListener('message', handleMessage);

      window.postMessage({
        type: 'RAINUM_GET_INFO',
        source: 'rainum-webapp',
      }, '*');
    });
  } catch (error) {
    console.error('Failed to get extension info:', error);
    return null;
  }
}

/**
 * Request wallet connection from extension
 */
export async function requestWalletConnection(): Promise<{ success: boolean; address?: string; error?: string }> {
  if (!isExtensionInstalled()) {
    return { success: false, error: 'Extension not installed' };
  }

  try {
    return await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Connection timeout' });
      }, 10000); // 10s timeout for user interaction

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'RAINUM_CONNECTION_RESPONSE' && event.data?.source === 'rainum-extension') {
          clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
          resolve(event.data.data);
        }
      };

      window.addEventListener('message', handleMessage);

      window.postMessage({
        type: 'RAINUM_REQUEST_CONNECTION',
        source: 'rainum-webapp',
      }, '*');
    });
  } catch (error) {
    console.error('Connection request failed:', error);
    return { success: false, error: 'Failed to request connection' };
  }
}

/**
 * Subscribe to extension events
 */
export function subscribeToExtensionEvents(
  onConnect: (address: string) => void,
  onDisconnect: () => void,
  onAccountChange: (address: string) => void
): () => void {
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.source !== 'rainum-extension') return;

    switch (event.data.type) {
      case 'RAINUM_CONNECTED':
        onConnect(event.data.data.address);
        break;
      case 'RAINUM_DISCONNECTED':
        onDisconnect();
        break;
      case 'RAINUM_ACCOUNT_CHANGED':
        onAccountChange(event.data.data.address);
        break;
    }
  };

  window.addEventListener('message', handleMessage);

  // Return cleanup function
  return () => {
    window.removeEventListener('message', handleMessage);
  };
}

/**
 * Disconnect from extension
 */
export function disconnectExtension(): void {
  if (isExtensionInstalled()) {
    window.postMessage({
      type: 'RAINUM_DISCONNECT',
      source: 'rainum-webapp',
    }, '*');
  }
}

/**
 * Open browser extensions page
 */
export function openExtensionsPage(): void {
  const browser = getBrowserType();

  let url = 'chrome://extensions';
  if (browser === 'firefox') url = 'about:addons';
  if (browser === 'edge') url = 'edge://extensions';

  // Try to open, fallback to alert
  try {
    window.open(url, '_blank');
  } catch (error) {
    alert(`Please enable the Rainum extension in your browser settings:\n${url}`);
  }
}
