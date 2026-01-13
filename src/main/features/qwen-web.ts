import { BrowserWindow } from 'electron';
import { CloudflareBypasser } from '../utils/cloudflare-bypass';

const QWEN_URL = 'https://chat.qwen.ai/';
let qwenWindow: BrowserWindow | null = null;

/**
 * Get Qwen Web window ID
 */
export function getQwenWebWindowId(): number | null {
  return qwenWindow && !qwenWindow.isDestroyed() ? qwenWindow.id : null;
}

/**
 * Create or focus Qwen Web window
 */
export async function createQwenWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (qwenWindow && !qwenWindow.isDestroyed()) {
    qwenWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  qwenWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Qwen (Web)',
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
      partition: 'persist:qwen-web', // Separate session for Qwen
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = qwenWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[Qwen Web] Session data cleared');
  } catch (e) {
    console.error('[Qwen Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[Qwen Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[Qwen Web] Failed to set proxy:', error);
    qwenWindow.close();
    return false;
  }

  // Set user agent to avoid detection (similar to stealth techniques)
  // Using the same UA as Claude Web for consistency, as it simulates a standard Mac Chrome
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  qwenWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept, -2 = reject, -3 = use default verification
  });

  console.log(
    '[Qwen Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load Qwen URL
  qwenWindow.loadURL(QWEN_URL);

  // Initialize Cloudflare Bypass
  const bypasser = new CloudflareBypasser(qwenWindow);
  bypasser.start().then((success) => {
    if (success) {
      console.log('[Qwen Web] Cloudflare bypass reported success!');
    } else {
      console.log('[Qwen Web] Cloudflare bypass finished (failed or not needed).');
    }
  });

  // Handle window close
  qwenWindow.on('closed', () => {
    qwenWindow = null;
    console.log('[Qwen Web] Window closed');
  });

  // Log navigation for debugging
  qwenWindow.webContents.on('did-finish-load', () => {
    console.log('[Qwen Web] Page loaded:', qwenWindow?.webContents.getURL());
  });

  qwenWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Qwen Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close Qwen Web window
 */
export function closeQwenWebWindow(): void {
  if (qwenWindow && !qwenWindow.isDestroyed()) {
    qwenWindow.close();
    qwenWindow = null;
  }
}

/**
 * Get Qwen Web window instance
 */
export function getQwenWebWindow(): BrowserWindow | null {
  return qwenWindow && !qwenWindow.isDestroyed() ? qwenWindow : null;
}
