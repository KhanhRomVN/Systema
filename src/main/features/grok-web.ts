import { BrowserWindow } from 'electron';
import { CloudflareBypasser } from '../utils/cloudflare-bypass';

const GROK_URL = 'https://grok.com/';
let grokWindow: BrowserWindow | null = null;

/**
 * Get Grok Web window ID
 */
export function getGrokWebWindowId(): number | null {
  return grokWindow && !grokWindow.isDestroyed() ? grokWindow.id : null;
}

/**
 * Create or focus Grok Web window
 */
export async function createGrokWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (grokWindow && !grokWindow.isDestroyed()) {
    grokWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  grokWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Grok (Web)',
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
      partition: 'persist:grok-web', // Separate session for Grok
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = grokWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[Grok Web] Session data cleared');
  } catch (e) {
    console.error('[Grok Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[Grok Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[Grok Web] Failed to set proxy:', error);
    grokWindow.close();
    return false;
  }

  // Set user agent to avoid detection (similar to stealth techniques)
  // Using the same UA as Claude Web for consistency, as it simulates a standard Mac Chrome
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  grokWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept, -2 = reject, -3 = use default verification
  });

  console.log(
    '[Grok Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load Grok URL
  grokWindow.loadURL(GROK_URL);

  // Initialize Cloudflare Bypass
  const bypasser = new CloudflareBypasser(grokWindow);
  bypasser.start().then((success) => {
    if (success) {
      console.log('[Grok Web] Cloudflare bypass reported success!');
    } else {
      console.log('[Grok Web] Cloudflare bypass finished (failed or not needed).');
    }
  });

  // Handle window close
  grokWindow.on('closed', () => {
    grokWindow = null;
    console.log('[Grok Web] Window closed');
  });

  // Log navigation for debugging
  grokWindow.webContents.on('did-finish-load', () => {
    console.log('[Grok Web] Page loaded:', grokWindow?.webContents.getURL());
  });

  grokWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Grok Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close Grok Web window
 */
export function closeGrokWebWindow(): void {
  if (grokWindow && !grokWindow.isDestroyed()) {
    grokWindow.close();
    grokWindow = null;
  }
}

/**
 * Get Grok Web window instance
 */
export function getGrokWebWindow(): BrowserWindow | null {
  return grokWindow && !grokWindow.isDestroyed() ? grokWindow : null;
}
