import { BrowserWindow } from 'electron';
import { CloudflareBypasser } from '../utils/cloudflare-bypass';

const GEMINI_URL = 'https://gemini.google.com/app?hl=vi';
let geminiWindow: BrowserWindow | null = null;

/**
 * Get Gemini Web window ID
 */
export function getGeminiWebWindowId(): number | null {
  return geminiWindow && !geminiWindow.isDestroyed() ? geminiWindow.id : null;
}

/**
 * Create or focus Gemini Web window
 */
export async function createGeminiWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (geminiWindow && !geminiWindow.isDestroyed()) {
    geminiWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  geminiWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Gemini (Web)',
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
      partition: 'persist:gemini-web', // Separate session for Gemini
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = geminiWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[Gemini Web] Session data cleared');
  } catch (e) {
    console.error('[Gemini Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[Gemini Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[Gemini Web] Failed to set proxy:', error);
    geminiWindow.close();
    return false;
  }

  // Set user agent to avoid detection (similar to stealth techniques)
  // Using the same UA as Claude Web for consistency, as it simulates a standard Mac Chrome
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  geminiWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept, -2 = reject, -3 = use default verification
  });

  console.log(
    '[Gemini Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load Gemini URL
  geminiWindow.loadURL(GEMINI_URL);

  // Initialize Cloudflare Bypass
  const bypasser = new CloudflareBypasser(geminiWindow);
  bypasser.start().then((success) => {
    if (success) {
      console.log('[Gemini Web] Cloudflare bypass reported success!');
    } else {
      console.log('[Gemini Web] Cloudflare bypass finished (failed or not needed).');
    }
  });

  // Handle window close
  geminiWindow.on('closed', () => {
    geminiWindow = null;
    console.log('[Gemini Web] Window closed');
  });

  // Log navigation for debugging
  geminiWindow.webContents.on('did-finish-load', () => {
    console.log('[Gemini Web] Page loaded:', geminiWindow?.webContents.getURL());
  });

  geminiWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Gemini Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close Gemini Web window
 */
export function closeGeminiWebWindow(): void {
  if (geminiWindow && !geminiWindow.isDestroyed()) {
    geminiWindow.close();
    geminiWindow = null;
  }
}

/**
 * Get Gemini Web window instance
 */
export function getGeminiWebWindow(): BrowserWindow | null {
  return geminiWindow && !geminiWindow.isDestroyed() ? geminiWindow : null;
}
