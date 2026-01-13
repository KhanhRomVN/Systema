import { BrowserWindow } from 'electron';
import { CloudflareBypasser } from '../utils/cloudflare-bypass';

const KIMI_URL = 'https://www.kimi.com/';
let kimiWindow: BrowserWindow | null = null;

/**
 * Get Kimi Web window ID
 */
export function getKimiWebWindowId(): number | null {
  return kimiWindow && !kimiWindow.isDestroyed() ? kimiWindow.id : null;
}

/**
 * Create or focus Kimi Web window
 */
export async function createKimiWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (kimiWindow && !kimiWindow.isDestroyed()) {
    kimiWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  kimiWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Kimi (Web)',
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
      partition: 'persist:kimi-web', // Separate session for Kimi
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = kimiWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[Kimi Web] Session data cleared');
  } catch (e) {
    console.error('[Kimi Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[Kimi Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[Kimi Web] Failed to set proxy:', error);
    kimiWindow.close();
    return false;
  }

  // Set user agent to avoid detection (similar to stealth techniques)
  // Using the same UA as Claude Web for consistency, as it simulates a standard Mac Chrome
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  kimiWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept, -2 = reject, -3 = use default verification
  });

  console.log(
    '[Kimi Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load Kimi URL
  kimiWindow.loadURL(KIMI_URL);

  // Initialize Cloudflare Bypass
  const bypasser = new CloudflareBypasser(kimiWindow);
  bypasser.start().then((success) => {
    if (success) {
      console.log('[Kimi Web] Cloudflare bypass reported success!');
    } else {
      console.log('[Kimi Web] Cloudflare bypass finished (failed or not needed).');
    }
  });

  // Handle window close
  kimiWindow.on('closed', () => {
    kimiWindow = null;
    console.log('[Kimi Web] Window closed');
  });

  // Log navigation for debugging
  kimiWindow.webContents.on('did-finish-load', () => {
    console.log('[Kimi Web] Page loaded:', kimiWindow?.webContents.getURL());
  });

  kimiWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Kimi Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close Kimi Web window
 */
export function closeKimiWebWindow(): void {
  if (kimiWindow && !kimiWindow.isDestroyed()) {
    kimiWindow.close();
    kimiWindow = null;
  }
}

/**
 * Get Kimi Web window instance
 */
export function getKimiWebWindow(): BrowserWindow | null {
  return kimiWindow && !kimiWindow.isDestroyed() ? kimiWindow : null;
}
