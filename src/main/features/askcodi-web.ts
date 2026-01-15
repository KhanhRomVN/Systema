import { BrowserWindow } from 'electron';

const ASKCODI_URL = 'https://www.askcodi.com/chat';
let askcodiWindow: BrowserWindow | null = null;

/**
 * Get AskCodi Web window ID
 */
export function getAskCodiWebWindowId(): number | null {
  return askcodiWindow && !askcodiWindow.isDestroyed() ? askcodiWindow.id : null;
}

/**
 * Create or focus AskCodi Web window
 */
export async function createAskCodiWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (askcodiWindow && !askcodiWindow.isDestroyed()) {
    askcodiWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  askcodiWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'AskCodi (Web)',
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
      partition: 'persist:askcodi-web', // Separate session for AskCodi
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = askcodiWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[AskCodi Web] Session data cleared');
  } catch (e) {
    console.error('[AskCodi Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[AskCodi Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[AskCodi Web] Failed to set proxy:', error);
    askcodiWindow.close();
    return false;
  }

  // Set user agent to avoid detection
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  askcodiWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept
  });

  console.log(
    '[AskCodi Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load AskCodi URL
  askcodiWindow.loadURL(ASKCODI_URL);

  // Handle window close
  askcodiWindow.on('closed', () => {
    askcodiWindow = null;
    console.log('[AskCodi Web] Window closed');
  });

  // Log navigation for debugging
  askcodiWindow.webContents.on('did-finish-load', () => {
    console.log('[AskCodi Web] Page loaded:', askcodiWindow?.webContents.getURL());
  });

  askcodiWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[AskCodi Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close AskCodi Web window
 */
export function closeAskCodiWebWindow(): void {
  if (askcodiWindow && !askcodiWindow.isDestroyed()) {
    askcodiWindow.close();
    askcodiWindow = null;
  }
}

/**
 * Get AskCodi Web window instance
 */
export function getAskCodiWebWindow(): BrowserWindow | null {
  return askcodiWindow && !askcodiWindow.isDestroyed() ? askcodiWindow : null;
}
