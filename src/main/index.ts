import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { electronApp, optimizer } from '@electron-toolkit/utils';
import { windowManager } from './core/window';
import { setupEventHandlers } from './core/events';
import { ProxyServer } from './proxy/ProxyServer';
import { SingletonWSManager } from './server/SingletonWSManager';
import { spawn, ChildProcess, exec, execSync } from 'child_process';

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
      // Security note: activeProxyUrl is internally generated, but good to be aware of injection if user controlled.
      // Here it comes from our internal logic (localhost).
      exec(`pkill -f -- "--proxy-server=${activeProxyUrl}"`, (error) => {
        if (error) {
          console.error(`Failed to pkill VS Code: ${error.message}`);
        } else {
        }
      });
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

      child.on('exit', (code) => {
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
