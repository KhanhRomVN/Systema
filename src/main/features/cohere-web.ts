import { BrowserWindow } from 'electron';
import { CloudflareBypasser } from '../utils/cloudflare-bypass';

const COHERE_URL = 'https://dashboard.cohere.com/playground/chat';
let cohereWindow: BrowserWindow | null = null;

/**
 * Get Cohere Web window ID
 */
export function getCohereWebWindowId(): number | null {
  return cohereWindow && !cohereWindow.isDestroyed() ? cohereWindow.id : null;
}

/**
 * Create or focus Cohere Web window
 */
export async function createCohereWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (cohereWindow && !cohereWindow.isDestroyed()) {
    cohereWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  cohereWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Cohere (Web)',
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
      partition: 'persist:cohere-web', // Separate session for Cohere
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = cohereWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[Cohere Web] Session data cleared');
  } catch (e) {
    console.error('[Cohere Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[Cohere Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[Cohere Web] Failed to set proxy:', error);
    cohereWindow.close();
    return false;
  }

  // Set user agent to avoid detection (similar to stealth techniques)
  // Using the same UA as Claude Web for consistency, as it simulates a standard Mac Chrome
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  cohereWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept, -2 = reject, -3 = use default verification
  });

  console.log(
    '[Cohere Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load Cohere URL
  cohereWindow.loadURL(COHERE_URL);

  // Initialize Cloudflare Bypass
  const bypasser = new CloudflareBypasser(cohereWindow);
  bypasser.start().then((success) => {
    if (success) {
      console.log('[Cohere Web] Cloudflare bypass reported success!');
    } else {
      console.log('[Cohere Web] Cloudflare bypass finished (failed or not needed).');
    }
  });

  // Handle window close
  cohereWindow.on('closed', () => {
    cohereWindow = null;
    console.log('[Cohere Web] Window closed');
  });

  // Log navigation for debugging
  cohereWindow.webContents.on('did-finish-load', () => {
    console.log('[Cohere Web] Page loaded:', cohereWindow?.webContents.getURL());
  });

  cohereWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Cohere Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close Cohere Web window
 */
export function closeCohereWebWindow(): void {
  if (cohereWindow && !cohereWindow.isDestroyed()) {
    cohereWindow.close();
    cohereWindow = null;
  }
}

/**
 * Get Cohere Web window instance
 */
export function getCohereWebWindow(): BrowserWindow | null {
  return cohereWindow && !cohereWindow.isDestroyed() ? cohereWindow : null;
}
