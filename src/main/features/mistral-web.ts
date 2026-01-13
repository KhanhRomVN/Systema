import { BrowserWindow } from 'electron';
import { CloudflareBypasser } from '../utils/cloudflare-bypass';

const MISTRAL_URL = 'https://console.mistral.ai/build/playground';
let mistralWindow: BrowserWindow | null = null;

/**
 * Get Mistral Web window ID
 */
export function getMistralWebWindowId(): number | null {
  return mistralWindow && !mistralWindow.isDestroyed() ? mistralWindow.id : null;
}

/**
 * Create or focus Mistral Web window
 */
export async function createMistralWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (mistralWindow && !mistralWindow.isDestroyed()) {
    mistralWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  mistralWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Mistral (Web)',
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
      partition: 'persist:mistral-web', // Separate session for Mistral
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = mistralWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[Mistral Web] Session data cleared');
  } catch (e) {
    console.error('[Mistral Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[Mistral Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[Mistral Web] Failed to set proxy:', error);
    mistralWindow.close();
    return false;
  }

  // Set user agent to avoid detection (similar to stealth techniques)
  // Using the same UA as Claude Web for consistency, as it simulates a standard Mac Chrome
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  mistralWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept, -2 = reject, -3 = use default verification
  });

  console.log(
    '[Mistral Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load Mistral URL
  mistralWindow.loadURL(MISTRAL_URL);

  // Initialize Cloudflare Bypass
  const bypasser = new CloudflareBypasser(mistralWindow);
  bypasser.start().then((success) => {
    if (success) {
      console.log('[Mistral Web] Cloudflare bypass reported success!');
    } else {
      console.log('[Mistral Web] Cloudflare bypass finished (failed or not needed).');
    }
  });

  // Handle window close
  mistralWindow.on('closed', () => {
    mistralWindow = null;
    console.log('[Mistral Web] Window closed');
  });

  // Log navigation for debugging
  mistralWindow.webContents.on('did-finish-load', () => {
    console.log('[Mistral Web] Page loaded:', mistralWindow?.webContents.getURL());
  });

  mistralWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Mistral Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close Mistral Web window
 */
export function closeMistralWebWindow(): void {
  if (mistralWindow && !mistralWindow.isDestroyed()) {
    mistralWindow.close();
    mistralWindow = null;
  }
}

/**
 * Get Mistral Web window instance
 */
export function getMistralWebWindow(): BrowserWindow | null {
  return mistralWindow && !mistralWindow.isDestroyed() ? mistralWindow : null;
}
