import { app, BrowserWindow, ipcMain } from 'electron';
import { electronApp, optimizer } from '@electron-toolkit/utils';
import { windowManager } from './core/window';
import { setupEventHandlers } from './core/events';
import { ProxyServer } from './proxy/ProxyServer';
import { SingletonWSManager } from './server/SingletonWSManager';
import { createClaudeWebWindow, closeClaudeWebWindow } from './features/claude-web';
import { createMistralWebWindow, closeMistralWebWindow } from './features/mistral-web';
import { createKimiWebWindow, closeKimiWebWindow } from './features/kimi-web';
import { createChatGPTWebWindow, closeChatGPTWebWindow } from './features/chatgpt-web';
import { createQwenWebWindow, closeQwenWebWindow } from './features/qwen-web';
import { createGrokWebWindow, closeGrokWebWindow } from './features/grok-web';
import { createGroqWebWindow, closeGroqWebWindow } from './features/groq-web';
import { createCohereWebWindow, closeCohereWebWindow } from './features/cohere-web';
import { createPerplexityWebWindow, closePerplexityWebWindow } from './features/perplexity-web';
import { createPhindWebWindow, closePhindWebWindow } from './features/phind-web';
import { createGeminiWebWindow, closeGeminiWebWindow } from './features/gemini-web';
import { createDeepSeekWebWindow, closeDeepSeekWebWindow } from './features/deepseek-web';
import { spawn, ChildProcess, exec, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dns from 'dns';

// Fix EAI_AGAIN DNS errors by preferring IPv4
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  console.error('[Main] Failed to set DNS order:', e);
}

// Ignore all certificate errors globally (fixes Proxy CA issues)
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');

// Global certificate error handler
app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  // On certificate error we disable default behaviour (stop loading the page)
  // and we then say "it is all fine - true" to the callback
  event.preventDefault();
  callback(true);
});

const proxyServer = new ProxyServer();
const wsManager = SingletonWSManager.getInstance();
let activeChildProcess: ChildProcess | null = null;
let activeProxyUrl: string | null = null;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Initialize WS Server
  await wsManager.initialize();

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);

    // CRITICAL: Only set window for Systema Inspector (main window)
    // The main window is always the FIRST window created
    // Do NOT set for Claude Web or other target app windows!
    const allWindows = BrowserWindow.getAllWindows();
    const isMainWindow = allWindows.length === 1;

    if (isMainWindow) {
      console.log(
        '[Main] ✅ Setting ProxyServer window for window ID:',
        window.id,
        'Title:',
        window.getTitle(),
      );
      proxyServer.setWindow(window);
      wsManager.setWindow(window);
    } else {
      console.log(
        '[Main] ⏭️ Skipping ProxyServer.setWindow for window ID:',
        window.id,
        'Title:',
        window.getTitle(),
      );
    }
  });

  // Setup IPC event handlers
  setupEventHandlers();

  // Proxy IPC
  ipcMain.handle('proxy:start', async (_, port: number) => {
    proxyServer.start(port);
    return true;
  });

  ipcMain.handle('proxy:set-intercept', async (_, enabled: boolean) => {
    proxyServer.setIntercept(enabled);
    return true;
  });

  ipcMain.handle('proxy:forward-request', async (_, id: string) => {
    return proxyServer.forwardRequest(id);
  });

  ipcMain.handle('proxy:drop-request', async (_, id: string) => {
    return proxyServer.dropRequest(id);
  });

  ipcMain.handle('proxy:stop', async () => {
    proxyServer.stop();
    closeClaudeWebWindow(); // Close Claude Web window if open
    closeMistralWebWindow(); // Close Mistral Web window if open
    closeKimiWebWindow(); // Close Kimi Web window if open
    closeChatGPTWebWindow();
    closeQwenWebWindow();
    closeGrokWebWindow();
    closeGroqWebWindow();
    closeCohereWebWindow();
    closePerplexityWebWindow();
    closePhindWebWindow();
    closeGeminiWebWindow();
    closeDeepSeekWebWindow();
    if (activeChildProcess) {
      activeChildProcess.kill();
      activeChildProcess = null;
    }
    if (activeProxyUrl) {
      exec(`pkill -f -- "--proxy-server=${activeProxyUrl}"`);
      activeProxyUrl = null;
    }
    return true;
  });

  ipcMain.handle('app:terminate', async () => {
    closeClaudeWebWindow(); // Close Claude Web window if open
    closeMistralWebWindow(); // Close Mistral Web window if open
    closeKimiWebWindow(); // Close Kimi Web window if open
    closeChatGPTWebWindow();
    closeQwenWebWindow();
    closeGrokWebWindow();
    closeGroqWebWindow();
    closeCohereWebWindow();
    closePerplexityWebWindow();
    closePhindWebWindow();
    closeGeminiWebWindow();
    closeDeepSeekWebWindow();
    if (activeChildProcess) {
      activeChildProcess.kill();
      activeChildProcess = null;
    }
    if (activeProxyUrl) {
      exec(`pkill -f -- "--proxy-server=${activeProxyUrl}"`);
      activeProxyUrl = null;
    }
    return true;
  });

  // Helper to launch browser
  const launchBrowser = (url: string, profileName: string, proxyUrl: string) => {
    activeProxyUrl = proxyUrl;
    const userDataDir = path.join(app.getPath('userData'), 'profiles', profileName);
    fs.mkdirSync(userDataDir, { recursive: true });

    // Find browser (Linux)
    const browsers = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
    let executable = '';
    for (const b of browsers) {
      try {
        execSync(`which ${b}`);
        executable = b;
        break;
      } catch {
        continue;
      }
    }

    if (!executable) {
      return false;
    }

    const child = spawn(
      executable,
      [
        '--proxy-server=' + proxyUrl,
        '--ignore-certificate-errors',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-http2',
        '--disable-quic',
        `--user-data-dir=${userDataDir}`,
        url,
      ],
      {
        detached: true,
        stdio: 'ignore',
      },
    );
    activeChildProcess = child;

    child.on('exit', () => {
      if (activeChildProcess === child) {
        activeChildProcess = null;
        activeProxyUrl = null;
      }
    });

    child.unref();
    return true;
  };

  // App Launcher IPC
  ipcMain.handle('app:launch', async (_, appName: string, proxyUrl: string) => {
    if (appName === 'vscode') {
      activeProxyUrl = proxyUrl;
      // Using 'code' command assuming it's in PATH
      const child = spawn(
        'code',
        [
          '--wait',
          '--new-window',
          '--proxy-server=' + proxyUrl,
          '--ignore-certificate-errors',
          '.',
        ],
        {
          detached: true,
          stdio: 'ignore',
          shell: true, // For Windows/Linux compatibility with command resolution
        },
      );
      activeChildProcess = child;

      child.on('exit', () => {
        if (activeChildProcess === child) {
          activeChildProcess = null;
          // Don't clear activeProxyUrl here immediately, as we might want to ensure cleanup on explicit stop
          // But effectively if it exits, it's gone.
          activeProxyUrl = null;
        }
      });

      child.unref();
      return true;
    }

    if (appName === 'claude-web') {
      // Use Electron BrowserWindow instead of spawning Chrome (like OpenClaude)
      activeProxyUrl = proxyUrl;
      const success = await createClaudeWebWindow(proxyUrl);

      if (!success) {
        console.error('[Systema] Failed to create Claude Web window');
        activeProxyUrl = null;
        return false;
      }

      console.log('[Systema] Claude Web window created successfully');
      return true;
    }

    if (appName === 'antigravity') {
      activeProxyUrl = proxyUrl;
      // Using 'antigravity' command assuming it's in PATH
      const child = spawn(
        'antigravity',
        [
          '--wait',
          '--new-window',
          '--proxy-server=' + proxyUrl,
          '--ignore-certificate-errors',
          '.',
        ],
        {
          detached: true,
          stdio: 'ignore',
          shell: true, // For Windows/Linux compatibility with command resolution
        },
      );
      activeChildProcess = child;

      child.on('exit', () => {
        if (activeChildProcess === child) {
          activeChildProcess = null;
          // Don't clear activeProxyUrl here immediately, as we might want to ensure cleanup on explicit stop
          // But effectively if it exits, it's gone.
          activeProxyUrl = null;
        }
      });

      child.unref();
      return true;
    }

    if (appName === 'deepseek-electron') {
      activeProxyUrl = proxyUrl;
      const success = await createDeepSeekWebWindow(proxyUrl);
      if (!success) {
        console.error('[Systema] Failed to create DeepSeek Web window');
        activeProxyUrl = null;
        return false;
      }
      return true;
    }

    if (appName === 'mistral-electron') {
      activeProxyUrl = proxyUrl;
      const success = await createMistralWebWindow(proxyUrl);

      if (!success) {
        console.error('[Systema] Failed to create Mistral Web window');
        activeProxyUrl = null;
        return false;
      }

      console.log('[Systema] Mistral Web window created successfully');
      return true;
    }

    if (appName === 'kimi-electron') {
      activeProxyUrl = proxyUrl;
      const success = await createKimiWebWindow(proxyUrl);

      if (!success) {
        console.error('[Systema] Failed to create Kimi Web window');
        activeProxyUrl = null;
        return false;
      }

      console.log('[Systema] Kimi Web window created successfully');
      return true;
    }

    if (appName === 'chatgpt-electron') {
      activeProxyUrl = proxyUrl;
      const success = await createChatGPTWebWindow(proxyUrl);
      if (!success) {
        console.error('[Systema] Failed to create ChatGPT Web window');
        activeProxyUrl = null;
        return false;
      }
      return true;
    }

    if (appName === 'qwen-electron') {
      activeProxyUrl = proxyUrl;
      const success = await createQwenWebWindow(proxyUrl);
      if (!success) {
        console.error('[Systema] Failed to create Qwen Web window');
        activeProxyUrl = null;
        return false;
      }
      return true;
    }

    if (appName === 'grok-electron') {
      activeProxyUrl = proxyUrl;
      const success = await createGrokWebWindow(proxyUrl);
      if (!success) {
        console.error('[Systema] Failed to create Grok Web window');
        activeProxyUrl = null;
        return false;
      }
      return true;
    }

    if (appName === 'groq-electron') {
      activeProxyUrl = proxyUrl;
      const success = await createGroqWebWindow(proxyUrl);
      if (!success) {
        console.error('[Systema] Failed to create Groq Web window');
        activeProxyUrl = null;
        return false;
      }
      return true;
    }

    if (appName === 'cohere-electron') {
      activeProxyUrl = proxyUrl;
      const success = await createCohereWebWindow(proxyUrl);
      if (!success) {
        console.error('[Systema] Failed to create Cohere Web window');
        activeProxyUrl = null;
        return false;
      }
      return true;
    }

    if (appName === 'perplexity-electron') {
      activeProxyUrl = proxyUrl;
      const success = await createPerplexityWebWindow(proxyUrl);
      if (!success) {
        console.error('[Systema] Failed to create Perplexity Web window');
        activeProxyUrl = null;
        return false;
      }
      return true;
    }

    if (appName === 'phind-electron') {
      activeProxyUrl = proxyUrl;
      const success = await createPhindWebWindow(proxyUrl);
      if (!success) {
        console.error('[Systema] Failed to create Phind Web window');
        activeProxyUrl = null;
        return false;
      }
      return true;
    }

    if (appName === 'gemini-electron') {
      activeProxyUrl = proxyUrl;
      const success = await createGeminiWebWindow(proxyUrl);
      if (!success) {
        console.error('[Systema] Failed to create Gemini Web window');
        return false;
      }
      return true;
    }

    // Web Apps
    const webApps: Record<string, string> = {
      'deepseek-browser': 'https://chat.deepseek.com',
      'chatgpt-browser': 'https://chatgpt.com',
      'google-aistudio': 'https://aistudio.google.com/prompts/new_chat',
      'gemini-browser': 'https://gemini.google.com/app?hl=vi',
      'kimi-browser': 'https://www.kimi.com/',
      duckduckgo: 'https://duckduckgo.com/?q=DuckDuckGo+AI+Chat&ia=chat&duckai=1',
      'qwen-browser': 'https://chat.qwen.ai/',
      'groq-browser': 'https://console.groq.com/playground',
      'grok-browser': 'https://grok.com/',
      'cohere-browser': 'https://dashboard.cohere.com/playground/chat',
      'mistral-browser': 'https://console.mistral.ai/build/playground',
      'perplexity-browser': 'https://www.perplexity.ai/',
      'phind-browser': 'https://www.phind.com/',
    };

    if (webApps[appName]) {
      return launchBrowser(webApps[appName], appName, proxyUrl);
    }

    return false;
  });

  // WebSocket Port IPC
  ipcMain.handle('ws:get-port', () => {
    return wsManager.getPort();
  });

  ipcMain.handle('ws:send', (_, message: any) => {
    wsManager.sendToClients(message);
    return true;
  });

  // Create main window
  windowManager.createMainWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
const cleanup = () => {
  proxyServer.stop();
  closeClaudeWebWindow(); // Close Claude Web window if open
  closeMistralWebWindow(); // Close Mistral Web window if open
  closeKimiWebWindow(); // Close Kimi Web window if open
  closeChatGPTWebWindow();
  closeQwenWebWindow();
  closeGrokWebWindow();
  closeGroqWebWindow();
  closeCohereWebWindow();
  closePerplexityWebWindow();
  closePhindWebWindow();
  closeGeminiWebWindow();
  closeDeepSeekWebWindow();
  if (activeChildProcess) {
    activeChildProcess.kill();
    activeChildProcess = null;
  }
  if (activeProxyUrl) {
    // Attempt to kill VS Code launched with this specific proxy
    try {
      execSync(`pkill -f -- "--proxy-server=${activeProxyUrl}"`);
    } catch (e) {
      console.error('Failed to pkill VS Code during cleanup:', e);
    }
    activeProxyUrl = null;
  }
};

app.on('before-quit', () => {
  cleanup();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
