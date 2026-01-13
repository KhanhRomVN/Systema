import { BrowserWindow } from 'electron';
import { CloudflareBypasser } from '../utils/cloudflare-bypass';

const DEEPSEEK_URL = 'https://chat.deepseek.com';
let deepseekWindow: BrowserWindow | null = null;

/**
 * Get DeepSeek Web window ID
 */
export function getDeepSeekWebWindowId(): number | null {
  return deepseekWindow && !deepseekWindow.isDestroyed() ? deepseekWindow.id : null;
}

/**
 * Create or focus DeepSeek Web window
 */
export async function createDeepSeekWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (deepseekWindow && !deepseekWindow.isDestroyed()) {
    deepseekWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  deepseekWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'DeepSeek (Web)',
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
      partition: 'persist:deepseek-web', // Separate session for DeepSeek
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = deepseekWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[DeepSeek Web] Session data cleared');
  } catch (e) {
    console.error('[DeepSeek Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[DeepSeek Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[DeepSeek Web] Failed to set proxy:', error);
    deepseekWindow.close();
    return false;
  }

  // Set user agent to avoid detection
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  deepseekWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept
  });

  console.log(
    '[DeepSeek Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load DeepSeek URL
  deepseekWindow.loadURL(DEEPSEEK_URL);

  // Initialize Cloudflare Bypass
  const bypasser = new CloudflareBypasser(deepseekWindow);

  // Start bypass check loop in background
  bypasser.start().then((success) => {
    if (success) {
      console.log('[DeepSeek Web] Cloudflare bypass reported success!');
    } else {
      console.log('[DeepSeek Web] Cloudflare bypass finished (failed or not needed).');
    }
  });

  // Handle window close
  deepseekWindow.on('closed', () => {
    deepseekWindow = null;
    console.log('[DeepSeek Web] Window closed');
  });

  // Log navigation for debugging
  deepseekWindow.webContents.on('did-finish-load', () => {
    console.log('[DeepSeek Web] Page loaded:', deepseekWindow?.webContents.getURL());
  });

  deepseekWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[DeepSeek Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close DeepSeek Web window
 */
export function closeDeepSeekWebWindow(): void {
  if (deepseekWindow && !deepseekWindow.isDestroyed()) {
    deepseekWindow.close();
    deepseekWindow = null;
  }
}

/**
 * Get DeepSeek Web window instance
 */
export function getDeepSeekWebWindow(): BrowserWindow | null {
  return deepseekWindow && !deepseekWindow.isDestroyed() ? deepseekWindow : null;
}
