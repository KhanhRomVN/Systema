import { BrowserWindow } from 'electron';
import { CloudflareBypasser } from '../utils/cloudflare-bypass';

const DUCKDUCKGO_URL = 'https://duckduckgo.com/?q=DuckDuckGo+AI+Chat&ia=chat&duckai=1';
let duckDuckGoWindow: BrowserWindow | null = null;

/**
 * Get DuckDuckGo Web window ID
 */
export function getDuckDuckGoWebWindowId(): number | null {
  return duckDuckGoWindow && !duckDuckGoWindow.isDestroyed() ? duckDuckGoWindow.id : null;
}

/**
 * Create or focus DuckDuckGo Web window
 */
export async function createDuckDuckGoWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (duckDuckGoWindow && !duckDuckGoWindow.isDestroyed()) {
    duckDuckGoWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  duckDuckGoWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'DuckDuckGo AI (Web)',
    ...(isMac
      ? {
          transparent: true,
          vibrancy: 'under-window',
          visualEffectState: 'active',
          backgroundColor: '#00000000',
          titleBarStyle: 'hiddenInset',
          trafficLightPosition: { x: 16, y: 16 },
        }
      : {
          backgroundColor: '#1a1a1a',
          autoHideMenuBar: true,
          titleBarStyle: 'hidden',
        }),
    webPreferences: {
      partition: 'persist:duckduckgo-web', // Separate session for DuckDuckGo
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = duckDuckGoWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[DuckDuckGo Web] Session data cleared');
  } catch (e) {
    console.error('[DuckDuckGo Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[DuckDuckGo Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[DuckDuckGo Web] Failed to set proxy:', error);
    duckDuckGoWindow.close();
    return false;
  }

  // Set user agent to avoid detection (similar to stealth techniques)
  // Using the same UA as Claude Web for consistency, as it simulates a standard Mac Chrome
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  duckDuckGoWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept, -2 = reject, -3 = use default verification
  });

  console.log(
    '[DuckDuckGo Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load DuckDuckGo URL
  duckDuckGoWindow.loadURL(DUCKDUCKGO_URL);

  // Initialize Cloudflare Bypass
  const bypasser = new CloudflareBypasser(duckDuckGoWindow);
  bypasser.start().then((success) => {
    if (success) {
      console.log('[DuckDuckGo Web] Cloudflare bypass reported success!');
    } else {
      console.log('[DuckDuckGo Web] Cloudflare bypass finished (failed or not needed).');
    }
  });

  // Handle window close
  duckDuckGoWindow.on('closed', () => {
    duckDuckGoWindow = null;
    console.log('[DuckDuckGo Web] Window closed');
  });

  // Log navigation for debugging
  duckDuckGoWindow.webContents.on('did-finish-load', () => {
    console.log('[DuckDuckGo Web] Page loaded:', duckDuckGoWindow?.webContents.getURL());
  });

  duckDuckGoWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[DuckDuckGo Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close DuckDuckGo Web window
 */
export function closeDuckDuckGoWebWindow(): void {
  if (duckDuckGoWindow && !duckDuckGoWindow.isDestroyed()) {
    duckDuckGoWindow.close();
    duckDuckGoWindow = null;
  }
}

/**
 * Get DuckDuckGo Web window instance
 */
export function getDuckDuckGoWebWindow(): BrowserWindow | null {
  return duckDuckGoWindow && !duckDuckGoWindow.isDestroyed() ? duckDuckGoWindow : null;
}
