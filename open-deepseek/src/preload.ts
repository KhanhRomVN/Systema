import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Accounts
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  getCurrentAccountId: () => ipcRenderer.invoke('get-current-account-id'),
  switchAccount: (id: string) => ipcRenderer.invoke('switch-account', id),
  removeAccount: (id: string) => ipcRenderer.invoke('remove-account', id),

  // Auth & Chat
  openAuthWindow: () => ipcRenderer.invoke('open-auth-window'),
  sendMessage: (payload: any) => ipcRenderer.invoke('send-message', payload),

  // Events
  onMessageStream: (callback: (chunk: string) => void) =>
    ipcRenderer.on('message-stream', (_event, chunk) => callback(chunk)),
  onMessageThinking: (callback: (chunk: string) => void) =>
    ipcRenderer.on('message-thinking', (_event, chunk) => callback(chunk)),
  onMessageComplete: (callback: () => void) => ipcRenderer.on('message-complete', () => callback()),
  onError: (callback: (error: string) => void) =>
    ipcRenderer.on('error', (_event, error) => callback(error)),
  onAuthSuccess: (callback: () => void) => ipcRenderer.on('auth-success', () => callback()),
  onAccountsUpdated: (callback: (accounts: any[]) => void) =>
    ipcRenderer.on('accounts-updated', (_event, accounts) => callback(accounts)),
});
