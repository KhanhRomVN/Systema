import { BrowserWindow, session } from 'electron';

const CLAUDE_URL = 'https://claude.ai';
let claudeWindow: BrowserWindow | null = null;

/**
 * Get Claude window ID (for checking in browser-window-created event)
 */
export function getClaudeWebWindowId(): number | null {
  return claudeWindow && !claudeWindow.isDestroyed() ? claudeWindow.id : null;
}

/**
 * Create or focus Claude Web window (similar to OpenClaude)
 * This creates a native Electron window instead of spawning Chrome
 */
export async function createClaudeWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (claudeWindow && !claudeWindow.isDestroyed()) {
    claudeWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  claudeWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Claude (Web)',
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
      partition: 'persist:claude-web', // Separate session for Claude
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = claudeWindow.webContents.session;

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[Claude Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[Claude Web] Failed to set proxy:', error);
    claudeWindow.close();
    return false;
  }

  // Set user agent to avoid detection (similar to stealth techniques)
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  claudeWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((request, callback) => {
    callback(0); // 0 = accept, -2 = reject, -3 = use default verification
  });

  // NOTE: Do NOT register Claude window with ProxyServer!
  // ProxyServer should send events to Systema Inspector window, not Claude window.
  // The main window is already registered in index.ts via browser-window-created event.
  console.log(
    '[Claude Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load Claude.ai
  claudeWindow.loadURL(CLAUDE_URL);

  // Handle window close
  claudeWindow.on('closed', () => {
    claudeWindow = null;
    console.log('[Claude Web] Window closed');
  });

  // Log navigation for debugging
  claudeWindow.webContents.on('did-finish-load', () => {
    console.log('[Claude Web] Page loaded:', claudeWindow?.webContents.getURL());
  });

  claudeWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Claude Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close Claude Web window
 */
export function closeClaudeWebWindow(): void {
  if (claudeWindow && !claudeWindow.isDestroyed()) {
    claudeWindow.close();
    claudeWindow = null;
  }
}

/**
 * Get Claude Web window instance
 */
export function getClaudeWebWindow(): BrowserWindow | null {
  return claudeWindow && !claudeWindow.isDestroyed() ? claudeWindow : null;
}
