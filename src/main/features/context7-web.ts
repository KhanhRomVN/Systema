import { BrowserWindow } from 'electron';

const CONTEXT7_URL = 'https://context7.com/chat';
let context7Window: BrowserWindow | null = null;

/**
 * Get Context7 Web window ID
 */
export function getContext7WebWindowId(): number | null {
  return context7Window && !context7Window.isDestroyed() ? context7Window.id : null;
}

/**
 * Create or focus Context7 Web window
 */
export async function createContext7WebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (context7Window && !context7Window.isDestroyed()) {
    context7Window.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  context7Window = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Context7 (Web)',
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
      partition: 'persist:context7-web', // Separate session for Context7
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = context7Window.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[Context7 Web] Session data cleared');
  } catch (e) {
    console.error('[Context7 Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[Context7 Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[Context7 Web] Failed to set proxy:', error);
    context7Window.close();
    return false;
  }

  // Set user agent to avoid detection
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  context7Window.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept
  });

  console.log(
    '[Context7 Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load Context7 URL
  context7Window.loadURL(CONTEXT7_URL);

  // Handle window close
  context7Window.on('closed', () => {
    context7Window = null;
    console.log('[Context7 Web] Window closed');
  });

  // Log navigation for debugging
  context7Window.webContents.on('did-finish-load', () => {
    console.log('[Context7 Web] Page loaded:', context7Window?.webContents.getURL());
  });

  context7Window.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Context7 Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close Context7 Web window
 */
export function closeContext7WebWindow(): void {
  if (context7Window && !context7Window.isDestroyed()) {
    context7Window.close();
    context7Window = null;
  }
}

/**
 * Get Context7 Web window instance
 */
export function getContext7WebWindow(): BrowserWindow | null {
  return context7Window && !context7Window.isDestroyed() ? context7Window : null;
}
