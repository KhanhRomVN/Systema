import { BrowserWindow } from 'electron';
import { CloudflareBypasser } from '../utils/cloudflare-bypass';

const ZAI_URL = 'https://chat.z.ai/';
let zaiWindow: BrowserWindow | null = null;

/**
 * Get Z.AI Web window ID
 */
export function getZaiWebWindowId(): number | null {
  return zaiWindow && !zaiWindow.isDestroyed() ? zaiWindow.id : null;
}

/**
 * Create or focus Z.AI Web window
 */
export async function createZaiWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (zaiWindow && !zaiWindow.isDestroyed()) {
    zaiWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  zaiWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Z.AI (Web)',
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
      partition: 'persist:zai-web', // Separate session for Z.AI
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = zaiWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[Z.AI Web] Session data cleared');
  } catch (e) {
    console.error('[Z.AI Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[Z.AI Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[Z.AI Web] Failed to set proxy:', error);
    zaiWindow.close();
    return false;
  }

  // Set user agent to avoid detection (similar to stealth techniques)
  // Using the same UA as Claude Web for consistency
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  zaiWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept, -2 = reject, -3 = use default verification
  });

  console.log(
    '[Z.AI Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load Z.AI URL
  zaiWindow.loadURL(ZAI_URL);

  // Initialize Cloudflare Bypass
  const bypasser = new CloudflareBypasser(zaiWindow);
  bypasser.start().then((success) => {
    if (success) {
      console.log('[Z.AI Web] Cloudflare bypass reported success!');
    } else {
      console.log('[Z.AI Web] Cloudflare bypass finished (failed or not needed).');
    }
  });

  // Handle window close
  zaiWindow.on('closed', () => {
    zaiWindow = null;
    console.log('[Z.AI Web] Window closed');
  });

  // Log navigation for debugging
  zaiWindow.webContents.on('did-finish-load', () => {
    console.log('[Z.AI Web] Page loaded:', zaiWindow?.webContents.getURL());
  });

  zaiWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Z.AI Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close Z.AI Web window
 */
export function closeZaiWebWindow(): void {
  if (zaiWindow && !zaiWindow.isDestroyed()) {
    zaiWindow.close();
    zaiWindow = null;
  }
}

/**
 * Get Z.AI Web window instance
 */
export function getZaiWebWindow(): BrowserWindow | null {
  return zaiWindow && !zaiWindow.isDestroyed() ? zaiWindow : null;
}
