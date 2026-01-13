import { BrowserWindow } from 'electron';
import { CloudflareBypasser } from '../utils/cloudflare-bypass';
import { attachNetworkDebugger } from './perplexity-cdp';

const PERPLEXITY_URL = 'https://www.perplexity.ai/';
let perplexityWindow: BrowserWindow | null = null;

/**
 * Get Perplexity Web window ID
 */
export function getPerplexityWebWindowId(): number | null {
  return perplexityWindow && !perplexityWindow.isDestroyed() ? perplexityWindow.id : null;
}

/**
 * Create or focus Perplexity Web window
 */
export async function createPerplexityWebWindow(proxyUrl: string): Promise<boolean> {
  // If window already exists, focus it
  if (perplexityWindow && !perplexityWindow.isDestroyed()) {
    perplexityWindow.focus();
    return true;
  }

  const isMac = process.platform === 'darwin';

  // Create new BrowserWindow
  perplexityWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Perplexity (Web)',
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
      partition: 'persist:perplexity-web', // Separate session for Perplexity
      contextIsolation: true,
      nodeIntegration: false,
      // webSecurity: false, // Re-enabled for better security/browser realism
      // allowRunningInsecureContent: true, // Re-enabled for better security/browser realism
    },
  });

  // Get the session for this window
  const ses = perplexityWindow.webContents.session;

  // Clear session data to ensure a fresh start as requested
  try {
    await ses.clearCache();
    await ses.clearStorageData();
    console.log('[Perplexity Web] Session data cleared');
  } catch (e) {
    console.error('[Perplexity Web] Failed to clear session data:', e);
  }

  // NOTE: Proxy settings REMOVED to avoid TLS fingerprinting issues.
  // We now use CDP (attachNetworkDebugger) to monitor traffic without intercepting it at the socket layer.
  // CRITICAL: We must EXPLICITLY set mode to 'direct' to overwrite any cached proxy settings from previous runs
  // because we are using a 'persist:' partition.
  try {
    await ses.setProxy({ mode: 'direct' });
    console.log('[Perplexity Web] Proxy explicitly reset to DIRECT connection');
  } catch (e) {
    console.error('[Perplexity Web] Failed to reset proxy:', e);
  }

  console.log('[Perplexity Web] Direct connection (No Proxy) - using CDP for monitoring');

  // Set user agent to avoid detection (similar to stealth techniques)
  // Using the same UA as Claude Web for consistency, as it simulates a standard Mac Chrome
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  perplexityWindow.webContents.setUserAgent(userAgent);

  // NOTE: Certificate verification bypass REMOVED as we are no longer doing MITM.

  console.log('[Perplexity Web] Window created');

  // Attach CDP Debugger for Network Monitoring
  await attachNetworkDebugger(perplexityWindow.webContents);

  // Load Perplexity URL
  perplexityWindow.loadURL(PERPLEXITY_URL);

  // Initialize Cloudflare Bypass (Mouse movements etc.)
  const bypasser = new CloudflareBypasser(perplexityWindow);
  bypasser.start().then((success) => {
    if (success) {
      console.log('[Perplexity Web] Cloudflare bypass reported success!');
    } else {
      console.log('[Perplexity Web] Cloudflare bypass finished (failed or not needed).');
    }
  });

  // Handle window close
  perplexityWindow.on('closed', () => {
    perplexityWindow = null;
    console.log('[Perplexity Web] Window closed');
  });

  // Log navigation for debugging
  perplexityWindow.webContents.on('did-finish-load', () => {
    console.log('[Perplexity Web] Page loaded:', perplexityWindow?.webContents.getURL());
  });

  perplexityWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Perplexity Web] Failed to load:', errorCode, errorDescription);
  });

  return true;
}

/**
 * Close Perplexity Web window
 */
export function closePerplexityWebWindow(): void {
  if (perplexityWindow && !perplexityWindow.isDestroyed()) {
    perplexityWindow.close();
    perplexityWindow = null;
  }
}

/**
 * Get Perplexity Web window instance
 */
export function getPerplexityWebWindow(): BrowserWindow | null {
  return perplexityWindow && !perplexityWindow.isDestroyed() ? perplexityWindow : null;
}
