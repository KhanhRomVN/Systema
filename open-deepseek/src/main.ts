import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';

const store = new Store();
// @ts-ignore
const safeStore = store as any;

let mainWindow: BrowserWindow | null = null;
let authWindow: BrowserWindow | null = null;

const USER_AGENTS = [
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
  });

  win.loadFile(path.join(__dirname, '../static/index.html'));

  // Open external links in browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow = win;
  return win;
}

function createAuthWindow() {
  if (authWindow) {
    authWindow.focus();
    return;
  }

  // Rotate User Agent
  const userAgent = getRandomUserAgent();
  safeStore.set('deepseekUserAgent', userAgent);
  console.log('Using User-Agent:', userAgent);

  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    title: 'DeepSeek Login',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Important to set UA here for the browser window
    },
  });

  win.webContents.setUserAgent(userAgent);
  win.loadURL('https://chat.deepseek.com/login');

  // Monitor LocalStorage and Cookies
  const checkStorage = setInterval(async () => {
    if (!authWindow || authWindow.isDestroyed()) {
      clearInterval(checkStorage);
      return;
    }

    try {
      const localStorageData = await authWindow.webContents.executeJavaScript(
        'JSON.stringify(localStorage)',
      );
      const data = JSON.parse(localStorageData);

      if (data.userToken) {
        try {
          const tokenObj = JSON.parse(data.userToken);
          if (tokenObj && tokenObj.value) {
            const bearerToken = `Bearer ${tokenObj.value}`;
            const current = safeStore.get('deepseekToken');
            if (current !== bearerToken) {
              console.log('[Auth] Token captured successfully.');
              safeStore.set('deepseekToken', bearerToken);

              if (mainWindow) {
                mainWindow.webContents.send('auth-success');
              }

              // Close Auth Window on success
              clearInterval(checkStorage);
              authWindow.close();
            }
          }
        } catch (err) {
          // Silent catch
        }
      }
    } catch (e) {
      // Silent catch
    }
  }, 2000);

  // Sniff Network Traffic for Chat Endpoint
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.deepseek.com/*'] },
    (details, callback) => {
      // Filter for chat/completion
      if (details.method === 'POST' && details.url.includes('completion')) {
        console.log('\n\n************************************************');
        console.log('[Network Debug] CAPTURED HEADERS for:', details.url);
        console.log(JSON.stringify(details.requestHeaders, null, 2));
        console.log('************************************************\n\n');
      }
      callback({});
    },
  );

  win.on('closed', () => {
    clearInterval(checkStorage);
    authWindow = null;
  });

  authWindow = win;
}

// Sniff Authorization Header
app.whenReady().then(() => {
  createWindow();

  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://chat.deepseek.com/*'] },
    (details, callback) => {
      const authHeader = details.requestHeaders['Authorization'];
      if (authHeader && authHeader.startsWith('Bearer')) {
        safeStore.set('deepseekToken', authHeader);

        if (mainWindow) {
          mainWindow.webContents.send('auth-success');
        }
      }
      callback({});
    },
  );

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-api-key', () => {
  return safeStore.get('deepseekToken');
});

ipcMain.handle('save-api-key', (_event, key: string) => {
  // Legacy or Manual override
  safeStore.set('deepseekToken', key);
  return true;
});

ipcMain.handle('open-auth-window', () => {
  createAuthWindow();
});

ipcMain.handle('send-message', async (event, payload: any) => {
  const token = safeStore.get('deepseekToken') as string;
  const userAgent = safeStore.get('deepseekUserAgent') as string;

  if (!token) {
    event.sender.send('error', 'Authentication Token missing. Please Login.');
    return;
  }

  // Use dynamic require or import
  const { chatCompletionStream } = require('./api/client');

  chatCompletionStream(token, payload, userAgent, {
    // Pass userAgent
    onContent: (content: string) => event.sender.send('message-stream', content),
    onThinking: (content: string) => event.sender.send('message-thinking', content),
    onDone: () => event.sender.send('message-complete'),
    onError: (error: Error) => event.sender.send('error', error.message),
  });
});
