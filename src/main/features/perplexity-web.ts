import { BrowserWindow } from 'electron';
import { CloudflareBypasser } from '../utils/cloudflare-bypass';

const PERPLEXITY_URL = 'https://www.perplexity.ai/';
let perplexityWindow: BrowserWindow | null = null;

/**
 * Get Perplexity Web window ID
 */
export function getPerplexityWebWindowId(): number | null {
  return perplexityWindow && !perplexityWindow.isDestroyed() ? perplexityWindow.id : null;
}

/**
 * Create or focus Perplexity Web window
 */
export async function createPerplexityWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (perplexityWindow && !perplexityWindow.isDestroyed()) {
    perplexityWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  perplexityWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Perplexity (Web)',
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
      partition: 'persist:perplexity-web', // Separate session for Perplexity
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = perplexityWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[Perplexity Web] Session data cleared');
  } catch (e) {
    console.error('[Perplexity Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[Perplexity Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[Perplexity Web] Failed to set proxy:', error);
    perplexityWindow.close();
    return false;
  }

  // Set user agent to avoid detection (similar to stealth techniques)
  // Using the same UA as Claude Web for consistency, as it simulates a standard Mac Chrome
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  perplexityWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept, -2 = reject, -3 = use default verification
  });

  console.log(
    '[Perplexity Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load Perplexity URL
  perplexityWindow.loadURL(PERPLEXITY_URL);

  // Initialize Cloudflare Bypass
  const bypasser = new CloudflareBypasser(perplexityWindow);
  bypasser.start().then((success) => {
    if (success) {
      console.log('[Perplexity Web] Cloudflare bypass reported success!');
    } else {
      console.log('[Perplexity Web] Cloudflare bypass finished (failed or not needed).');
    }
  });

  // Handle window close
  perplexityWindow.on('closed', () => {
    perplexityWindow = null;
    console.log('[Perplexity Web] Window closed');
  });

  // Log navigation for debugging
  perplexityWindow.webContents.on('did-finish-load', () => {
    console.log('[Perplexity Web] Page loaded:', perplexityWindow?.webContents.getURL());
  });

  perplexityWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Perplexity Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close Perplexity Web window
 */
export function closePerplexityWebWindow(): void {
  if (perplexityWindow && !perplexityWindow.isDestroyed()) {
    perplexityWindow.close();
    perplexityWindow = null;
  }
}

/**
 * Get Perplexity Web window instance
 */
export function getPerplexityWebWindow(): BrowserWindow | null {
  return perplexityWindow && !perplexityWindow.isDestroyed() ? perplexityWindow : null;
}
