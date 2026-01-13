import { BrowserWindow } from 'electron';
import { CloudflareBypasser } from '../utils/cloudflare-bypass';

const PHIND_URL = 'https://www.phind.com/';
let phindWindow: BrowserWindow | null = null;

/**
 * Get Phind Web window ID
 */
export function getPhindWebWindowId(): number | null {
  return phindWindow && !phindWindow.isDestroyed() ? phindWindow.id : null;
}

/**
 * Create or focus Phind Web window
 */
export async function createPhindWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (phindWindow && !phindWindow.isDestroyed()) {
    phindWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  phindWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Phind (Web)',
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
      partition: 'persist:phind-web', // Separate session for Phind
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = phindWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[Phind Web] Session data cleared');
  } catch (e) {
    console.error('[Phind Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[Phind Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[Phind Web] Failed to set proxy:', error);
    phindWindow.close();
    return false;
  }

  // Set user agent to avoid detection (similar to stealth techniques)
  // Using the same UA as Claude Web for consistency, as it simulates a standard Mac Chrome
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  phindWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept, -2 = reject, -3 = use default verification
  });

  console.log(
    '[Phind Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load Phind URL
  phindWindow.loadURL(PHIND_URL);

  // Initialize Cloudflare Bypass
  const bypasser = new CloudflareBypasser(phindWindow);
  bypasser.start().then((success) => {
    if (success) {
      console.log('[Phind Web] Cloudflare bypass reported success!');
    } else {
      console.log('[Phind Web] Cloudflare bypass finished (failed or not needed).');
    }
  });

  // Handle window close
  phindWindow.on('closed', () => {
    phindWindow = null;
    console.log('[Phind Web] Window closed');
  });

  // Log navigation for debugging
  phindWindow.webContents.on('did-finish-load', () => {
    console.log('[Phind Web] Page loaded:', phindWindow?.webContents.getURL());
  });

  phindWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Phind Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close Phind Web window
 */
export function closePhindWebWindow(): void {
  if (phindWindow && !phindWindow.isDestroyed()) {
    phindWindow.close();
    phindWindow = null;
  }
}

/**
 * Get Phind Web window instance
 */
export function getPhindWebWindow(): BrowserWindow | null {
  return phindWindow && !phindWindow.isDestroyed() ? phindWindow : null;
}
