import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';

const store = new Store();
// @ts-ignore
const safeStore = store as any;

let mainWindow: BrowserWindow | null = null;
let authWindow: BrowserWindow | null = null;

interface Account {
  id: string;
  token: string;
  name: string;
  userAgent: string;
  isMain?: boolean;
}

const USER_AGENTS = [
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Store Helpers
function getAccounts(): Account[] {
  return (safeStore.get('accounts') as Account[]) || [];
}

function setAccounts(accounts: Account[]) {
  safeStore.set('accounts', accounts);
}

function getCurrentAccountId(): string | undefined {
  return safeStore.get('currentAccountId') as string;
}

function setCurrentAccountId(id: string | undefined) {
  if (!id) {
    safeStore.delete('currentAccountId');
  } else {
    safeStore.set('currentAccountId', id);
  }
}

function getCurrentAccount(): Account | undefined {
  const accounts = getAccounts();
  const id = getCurrentAccountId();
  return accounts.find((a) => a.id === id);
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

async function createAuthWindow() {
  if (authWindow) {
    authWindow.focus();
    return;
  }

  // Rotate User Agent
  const userAgent = getRandomUserAgent();
  safeStore.set('tempUserAgent', userAgent); // Temporary storage for this auth session
  console.log('Using User-Agent:', userAgent);

  // Clear Session Data to ensure clean login
  console.log('[Auth] Clearing session data for fresh login...');
  await session.defaultSession.clearStorageData({
    storages: ['cookies', 'localstorage', 'indexdb', 'cachestorage', 'shadercache'],
  });

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
      // 1. Check for Token
      // Try to capture token from localStorage
      const localStorageData = await authWindow.webContents.executeJavaScript(
        'JSON.stringify(localStorage)',
      );
      const data = JSON.parse(localStorageData);

      if (data.userToken) {
        try {
          const tokenObj = JSON.parse(data.userToken);
          if (tokenObj && tokenObj.value) {
            const bearerToken = `Bearer ${tokenObj.value}`;

            // Handle Account Saving
            const accounts = getAccounts();

            // Check if token exists
            const existingAccount = accounts.find((a) => a.token === bearerToken);

            if (!existingAccount) {
              console.log('[Auth] New Token captured successfully.');

              const newAccount: Account = {
                id: uuidv4(),
                token: bearerToken,
                name: `Account ${accounts.length + 1}`,
                userAgent: safeStore.get('tempUserAgent') || userAgent,
              };

              accounts.push(newAccount);
              setAccounts(accounts);
              setCurrentAccountId(newAccount.id);

              if (mainWindow) {
                mainWindow.webContents.send('auth-success');
                mainWindow.webContents.send('accounts-updated', accounts);
              }

              win.close();
            } else {
              // Token exists, ensure it's selected?
              // For now, do nothing or switch to it
              if (getCurrentAccountId() !== existingAccount.id) {
                setCurrentAccountId(existingAccount.id);
                if (mainWindow) mainWindow.webContents.send('accounts-updated', accounts);
              }
              win.close();
            }
          }
        } catch (err) {}
      }

      // Also try to capture from global state if needed...

      // 2. INJECT HUNTER SCRIPT
      await authWindow.webContents.executeJavaScript(`
        if (!window.hasInjectedPoWHunter) {
          window.hasInjectedPoWHunter = true;
          console.log('[Hunter] Starting search for PoW algorithm...');
        }
      `);
    } catch (e) {
      // Silent catch
    }
  }, 2000);

  // Sniff Network Traffic
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.deepseek.com/*'] },
    (details, callback) => {
      // Filter for chat/completion
      if (details.method === 'POST' && details.url.includes('completion')) {
        console.log('\n\n************************************************');
        console.log('[Network Debug] CAPTURED outgoing request:', details.url);
        const powResponse =
          details.requestHeaders['x-ds-pow-response'] ||
          details.requestHeaders['X-Ds-Pow-Response'];
        if (powResponse) {
          console.log('[PoW] Found valid PoW Response (Base64):', powResponse);
        }
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

// Sniff Authorization Header (Legacy / Global fallback)
app.whenReady().then(() => {
  createWindow();

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
ipcMain.handle('get-accounts', () => {
  return getAccounts();
});

ipcMain.handle('get-current-account-id', () => {
  return getCurrentAccountId();
});

ipcMain.handle('switch-account', (_event, id: string) => {
  const accounts = getAccounts();
  if (accounts.find((a) => a.id === id)) {
    setCurrentAccountId(id);
    return true;
  }
  return false;
});

ipcMain.handle('remove-account', (_event, id: string) => {
  let accounts = getAccounts();
  const currentId = getCurrentAccountId();

  accounts = accounts.filter((a) => a.id !== id);
  setAccounts(accounts);

  if (currentId === id) {
    // Switch to first available or undefined
    const nextId = accounts.length > 0 ? accounts[0].id : undefined;
    setCurrentAccountId(nextId);
  }

  return getAccounts();
});

ipcMain.handle('open-auth-window', async () => {
  await createAuthWindow();
});

ipcMain.handle('send-message', async (event, payload: any) => {
  const account = getCurrentAccount();

  if (!account) {
    event.sender.send('error', 'No active account selected. Please Login.');
    return;
  }

  // Use dynamic require or import
  const { chatCompletionStream } = require('./api/client');

  chatCompletionStream(account.token, payload, account.userAgent, {
    // Pass userAgent from account
    onContent: (content: string) => event.sender.send('message-stream', content),
    onThinking: (content: string) => event.sender.send('message-thinking', content),
    onDone: () => event.sender.send('message-complete'),
    onError: (error: Error) => event.sender.send('error', error.message),
  });
});
