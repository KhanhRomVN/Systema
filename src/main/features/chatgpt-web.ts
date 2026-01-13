import { BrowserWindow } from 'electron';
import { CloudflareBypasser } from '../utils/cloudflare-bypass';

const CHATGPT_URL = 'https://chatgpt.com';
let chatgptWindow: BrowserWindow | null = null;

/**
 * Get ChatGPT Web window ID
 */
export function getChatGPTWebWindowId(): number | null {
  return chatgptWindow && !chatgptWindow.isDestroyed() ? chatgptWindow.id : null;
}

/**
 * Create or focus ChatGPT Web window
 */
export async function createChatGPTWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (chatgptWindow && !chatgptWindow.isDestroyed()) {
    chatgptWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  chatgptWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'ChatGPT (Web)',
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
      partition: 'persist:chatgpt-web', // Separate session for ChatGPT
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = chatgptWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[ChatGPT Web] Session data cleared');
  } catch (e) {
    console.error('[ChatGPT Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[ChatGPT Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[ChatGPT Web] Failed to set proxy:', error);
    chatgptWindow.close();
    return false;
  }

  // Set user agent to avoid detection (similar to stealth techniques)
  // Using the same UA as Claude Web for consistency, as it simulates a standard Mac Chrome
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  chatgptWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((request, callback) => {
    // console.log('[ChatGPT Web] VerifyProc for:', request.hostname); // Log if needed
    callback(0); // 0 = accept
  });

  // Explicitly handle certificate errors for this window
  chatgptWindow.webContents.on('certificate-error', (event, url, error, _certificate, callback) => {
    console.log(`[ChatGPT Web] Certificate error for ${url}: ${error}. Trusting...`);
    event.preventDefault();
    callback(true);
  });

  console.log(
    '[ChatGPT Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load ChatGPT URL
  chatgptWindow.loadURL(CHATGPT_URL);

  // Initialize Cloudflare Bypass
  const bypasser = new CloudflareBypasser(chatgptWindow);
  bypasser.start().then((success) => {
    if (success) {
      console.log('[ChatGPT Web] Cloudflare bypass reported success!');
    } else {
      console.log('[ChatGPT Web] Cloudflare bypass finished (failed or not needed).');
    }
  });

  // Handle window close
  chatgptWindow.on('closed', () => {
    chatgptWindow = null;
    console.log('[ChatGPT Web] Window closed');
  });

  // Log navigation for debugging
  chatgptWindow.webContents.on('did-finish-load', () => {
    console.log('[ChatGPT Web] Page loaded:', chatgptWindow?.webContents.getURL());
  });

  chatgptWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[ChatGPT Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close ChatGPT Web window
 */
export function closeChatGPTWebWindow(): void {
  if (chatgptWindow && !chatgptWindow.isDestroyed()) {
    chatgptWindow.close();
    chatgptWindow = null;
  }
}

/**
 * Get ChatGPT Web window instance
 */
export function getChatGPTWebWindow(): BrowserWindow | null {
  return chatgptWindow && !chatgptWindow.isDestroyed() ? chatgptWindow : null;
}
