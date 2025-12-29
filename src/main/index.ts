import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { electronApp, optimizer } from '@electron-toolkit/utils';
import { windowManager } from './core/window';
import { setupEventHandlers } from './core/events';
import { ProxyServer } from './proxy/ProxyServer';
import { spawn, ChildProcess, exec } from 'child_process';

const proxyServer = new ProxyServer();
let activeChildProcess: ChildProcess | null = null;
let activeProxyUrl: string | null = null;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
    proxyServer.setWindow(window);
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
      console.log(`Terminating VS Code instance with proxy: ${activeProxyUrl}`);
      // Security note: activeProxyUrl is internally generated, but good to be aware of injection if user controlled.
      // Here it comes from our internal logic (localhost).
      exec(`pkill -f -- "--proxy-server=${activeProxyUrl}"`, (error) => {
        if (error) {
          console.error(`Failed to pkill VS Code: ${error.message}`);
        } else {
          console.log('Successfully terminated VS Code window via pkill');
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
    console.log('Terminated active child process');
    return true;
  });

  // App Launcher IPC
  ipcMain.handle('app:launch', async (_, appName: string, proxyUrl: string) => {
    if (appName === 'vscode') {
      console.log('Launching VS Code with proxy:', proxyUrl);
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
        console.log(`Child process exited with code ${code}`);
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
app.on('window-all-closed', () => {
  proxyServer.stop();
  if (activeChildProcess) {
    activeChildProcess.kill();
    activeChildProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
