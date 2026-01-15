import { BrowserWindow, session } from 'electron';
import { CloudflareBypasser } from '../utils/cloudflare-bypass';

export interface GenericWebWindowOptions {
  title?: string;
  width?: number;
  height?: number;
  clearSession?: boolean;
  useCloudflareBypass?: boolean;
  userAgent?: string;
  partition?: string;
  backgroundColor?: string;
}

// Keep track of windows by ID or Partition to prevent duplicates if needed
// For now, simpler to just store active windows in a map if we want named singleton behavior
const activeWindows: Map<string, BrowserWindow> = new Map();

/**
 * Create or focus a Generic Web Window
 */
export async function createGenericWebWindow(
  id: string,
  url: string,
  proxyUrl: string,
  options: GenericWebWindowOptions = {},
): Promise<BrowserWindow | null> {
  // Check if window exists
  const existingWindow = activeWindows.get(id);
  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.focus();
    return existingWindow;
  }

  const isMac = process.platform === 'darwin';
  const partition = options.partition || `persist:${id}`;
  const userAgent =
    options.userAgent ||
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const window = new BrowserWindow({
    width: options.width || 1200,
    height: options.height || 800,
    title: options.title || id,
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
          backgroundColor: options.backgroundColor || '#1a1a1a',
          autoHideMenuBar: true,
          titleBarStyle: 'hidden',
        }),
    webPreferences: {
      partition,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Disable web security for MITM proxy
      allowRunningInsecureContent: true, // Allow insecure content for proxy
    },
  });

  // Store reference
  activeWindows.set(id, window);

  const ses = window.webContents.session;

  // Clear session data if requested
  if (options.clearSession) {
    try {
      await ses.clearCache();
      await ses.clearStorageData();
    } catch (e) {
      console.error(`[GenericWebWindow:${id}] Failed to clear session data:`, e);
    }
  }

  // Set proxy
  try {
    await ses.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: '<-loopback>',
    });
  } catch (error) {
    console.error(`[GenericWebWindow:${id}] Failed to set proxy:`, error);
    window.close();
    return null;
  }

  // Set User Agent
  window.webContents.setUserAgent(userAgent);

  // Ignore certificate errors
  ses.setCertificateVerifyProc((_request, callback) => {
    callback(0); // Accept
  });

  // Load URL
  window.loadURL(url);

  // Cloudflare Bypass
  if (options.useCloudflareBypass) {
    const bypasser = new CloudflareBypasser(window);
    bypasser.start().then(() => {});
  }

  // Event Handlers
  window.on('closed', () => {
    activeWindows.delete(id);
  });

  window.webContents.on('did-finish-load', () => {});

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[GenericWebWindow:${id}] Failed to load:`, errorCode, errorDescription);
  });

  return window;
}

export function closeGenericWebWindow(id: string) {
  const window = activeWindows.get(id);
  if (window && !window.isDestroyed()) {
    window.close();
  }
  activeWindows.delete(id);
}

export function closeAllGenericWebWindows() {
  for (const [id, window] of activeWindows.entries()) {
    if (!window.isDestroyed()) {
      window.close();
    }
  }
  activeWindows.clear();
}
