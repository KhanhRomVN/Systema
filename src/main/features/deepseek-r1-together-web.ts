import { BrowserWindow } from 'electron';

const DEEPSEEK_R1_TOGETHER_URL =
  'https://api.together.ai/playground/deepseek-ai/DeepSeek-R1-0528-tput';
let deepseekR1TogetherWindow: BrowserWindow | null = null;

/**
 * Get DeepSeek R1 (Together AI) Web window ID
 */
export function getDeepSeekR1TogetherWebWindowId(): number | null {
  return deepseekR1TogetherWindow && !deepseekR1TogetherWindow.isDestroyed()
    ? deepseekR1TogetherWindow.id
    : null;
}

/**
 * Create or focus DeepSeek R1 (Together AI) Web window
 */
export async function createDeepSeekR1TogetherWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (deepseekR1TogetherWindow && !deepseekR1TogetherWindow.isDestroyed()) {
    deepseekR1TogetherWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  deepseekR1TogetherWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'DeepSeek R1 (Together AI) (Web)',
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
      partition: 'persist:deepseek-r1-together-web', // Separate session
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Get the session for this window
  const ses = deepseekR1TogetherWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[DeepSeek R1 Together Web] Session data cleared');
  } catch (e) {
    console.error('[DeepSeek R1 Together Web] Failed to clear session data:', e);
  }

  // Set proxy for this session
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>', // Bypass proxy for localhost
    });
    console.log('[DeepSeek R1 Together Web] Proxy set to:', proxyUrl);
  } catch (error) {
    console.error('[DeepSeek R1 Together Web] Failed to set proxy:', error);
    deepseekR1TogetherWindow.close();
    return false;
  }

  // Set user agent to avoid detection
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  deepseekR1TogetherWindow.webContents.setUserAgent(userAgent);

  // Ignore certificate errors for MITM proxy
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept
  });

  console.log(
    '[DeepSeek R1 Together Web] Window created (NOT registered with ProxyServer - events go to Inspector)',
  );

  // Load DeepSeek R1 (Together AI) URL
  deepseekR1TogetherWindow.loadURL(DEEPSEEK_R1_TOGETHER_URL);

  // Handle window close
  deepseekR1TogetherWindow.on('closed', () => {
    deepseekR1TogetherWindow = null;
    console.log('[DeepSeek R1 Together Web] Window closed');
  });

  // Log navigation for debugging
  deepseekR1TogetherWindow.webContents.on('did-finish-load', () => {
    console.log(
      '[DeepSeek R1 Together Web] Page loaded:',
      deepseekR1TogetherWindow?.webContents.getURL(),
    );
  });

  deepseekR1TogetherWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription) => {
      console.error('[DeepSeek R1 Together Web] Failed to load:', errorCode, errorDescription);
    },
  );

  return true;
}

/**
 * Close DeepSeek R1 (Together AI) Web window
 */
export function closeDeepSeekR1TogetherWebWindow(): void {
  if (deepseekR1TogetherWindow && !deepseekR1TogetherWindow.isDestroyed()) {
    deepseekR1TogetherWindow.close();
    deepseekR1TogetherWindow = null;
  }
}

/**
 * Get DeepSeek R1 (Together AI) Web window instance
 */
export function getDeepSeekR1TogetherWebWindow(): BrowserWindow | null {
  return deepseekR1TogetherWindow && !deepseekR1TogetherWindow.isDestroyed()
    ? deepseekR1TogetherWindow
    : null;
}
