import { app, BrowserWindow, ipcMain } from 'electron';
import { electronApp, optimizer } from '@electron-toolkit/utils';
import { windowManager } from './core/window';
import { setupEventHandlers } from './core/events';
import { ProxyServer } from './proxy/ProxyServer';
import { SingletonWSManager } from './server/SingletonWSManager';
import { spawn, ChildProcess, exec, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
    proxyServer.setWindow(window);
    wsManager.setWindow(window);
  });

  // Setup IPC event handlers
  setupEventHandlers();

  // Proxy IPC
  ipcMain.handle('proxy:start', async (_, port: number) => {
    proxyServer.start(port);
    return true;
  });

  ipcMain.handle('proxy:stop', async () => {
    proxyServer.stop();
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
    if (appName === 'deepseek-web') {
      activeProxyUrl = proxyUrl;
      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'systema-browser-'));

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
          '--disable-blink-features=AutomationControlled',
          '--no-first-run',
          '--no-default-browser-check',
          `--user-data-dir=${userDataDir}`,
          'https://chat.deepseek.com',
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
          try {
            fs.rmSync(userDataDir, { recursive: true, force: true });
          } catch (e) {
            console.error('Failed to cleanup tmp dir', e);
          }
        }
      });

      child.unref();
      return true;
    }
    if (appName === 'open-claude') {
      activeProxyUrl = proxyUrl;
      const openClaudePath = path.join(process.cwd(), 'open-claude');

      // Ensure dependencies are installed and built (optional, but good for dev)
      // For speed, assuming user has done this or we just run start.
      // npm start in open-claude runs: npm run build && electron .

      // Use local electron binary to ensure we can pass arguments correctly
      const electronPath = path.join(openClaudePath, 'node_modules', '.bin', 'electron');

      console.log('[Systema] Launching Open Claude from:', openClaudePath);
      console.log('[Systema] Electron path:', electronPath);
      console.log('[Systema] Proxy URL:', proxyUrl);

      const child = spawn(
        electronPath,
        [
          '.',
          '--proxy-server=' + proxyUrl,
          '--ignore-certificate-errors', // Essential for MITM proxy
          '--no-default-browser-check',
        ],
        {
          cwd: openClaudePath,
          shell: true,
          env: {
            ...process.env,
            http_proxy: proxyUrl,
            https_proxy: proxyUrl,
            HTTP_PROXY: proxyUrl,
            HTTPS_PROXY: proxyUrl,
          },
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout/stderr manually
        },
      );
      activeChildProcess = child;

      // Pipe output to main process console
      child.stdout?.on('data', (data) => console.log(`[OpenClaude stdout]: ${data}`));
      child.stderr?.on('data', (data) => console.error(`[OpenClaude stderr]: ${data}`));

      child.on('exit', (code) => {
        console.log(`[OpenClaude] Exited with code ${code}`);
        if (activeChildProcess === child) {
          activeChildProcess = null;
          activeProxyUrl = null;
        }
      });

      child.unref();
      return true;
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
