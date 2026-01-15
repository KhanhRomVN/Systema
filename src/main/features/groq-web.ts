import { BrowserWindow } from 'electron';
import { CloudflareBypasser } from '../utils/cloudflare-bypass';

const GROQ_URL = 'https://console.groq.com/playground';
let groqWindow: BrowserWindow | null = null;

/**
 * Get Groq Web window ID
 */
export function getGroqWebWindowId(): number | null {
  return groqWindow && !groqWindow.isDestroyed() ? groqWindow.id : null;
}

/**
 * Create or focus Groq Web window
 */
export async function createGroqWebWindow(proxyUrl: string, customUrl?: string): Promise<boolean> {
  // If window already exists, focus it
  if (groqWindow && !groqWindow.isDestroyed()) {
    groqWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  groqWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Groq (Web)',
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
      partition: 'persist:groq-web', // Separate session for Groq
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = groqWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[Groq Web] Session data cleared');
  } catch (e) {
    console.error('[Groq Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[Groq Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[Groq Web] Failed to set proxy:', error);
    groqWindow.close();
    return false;
  }

  // Set user agent to avoid detection (similar to stealth techniques)
  // Using the same UA as Claude Web for consistency, as it simulates a standard Mac Chrome
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  groqWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept, -2 = reject, -3 = use default verification
  });

  console.log(
    '[Groq Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load Groq URL
  const targetUrl = customUrl || GROQ_URL;
  groqWindow.loadURL(targetUrl);

  // Initialize Cloudflare Bypass
  const bypasser = new CloudflareBypasser(groqWindow);
  bypasser.start().then((success) => {
    if (success) {
      console.log('[Groq Web] Cloudflare bypass reported success!');
    } else {
      console.log('[Groq Web] Cloudflare bypass finished (failed or not needed).');
    }
  });

  // Handle window close
  groqWindow.on('closed', () => {
    groqWindow = null;
    console.log('[Groq Web] Window closed');
  });

  // Log navigation for debugging
  groqWindow.webContents.on('did-finish-load', () => {
    console.log('[Groq Web] Page loaded:', groqWindow?.webContents.getURL());
  });

  groqWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Groq Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close Groq Web window
 */
export function closeGroqWebWindow(): void {
  if (groqWindow && !groqWindow.isDestroyed()) {
    groqWindow.close();
    groqWindow = null;
  }
}

/**
 * Get Groq Web window instance
 */
export function getGroqWebWindow(): BrowserWindow | null {
  return groqWindow && !groqWindow.isDestroyed() ? groqWindow : null;
}
