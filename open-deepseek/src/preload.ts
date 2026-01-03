import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  saveApiKey: (key: string) => ipcRenderer.invoke('save-api-key', key),
  openAuthWindow: () => ipcRenderer.invoke('open-auth-window'),
  sendMessage: (payload: any) => ipcRenderer.invoke('send-message', payload),
  onMessageStream: (callback: (chunk: string) => void) =>
    ipcRenderer.on('message-stream', (_event, chunk) => callback(chunk)),
  onMessageThinking: (callback: (chunk: string) => void) =>
    ipcRenderer.on('message-thinking', (_event, chunk) => callback(chunk)),
  onMessageComplete: (callback: () => void) => ipcRenderer.on('message-complete', () => callback()),
  onError: (callback: (error: string) => void) =>
    ipcRenderer.on('error', (_event, error) => callback(error)),
  onAuthSuccess: (callback: () => void) => ipcRenderer.on('auth-success', () => callback()),
});
