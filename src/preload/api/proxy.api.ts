import { ipcRenderer } from 'electron';

export const proxyAPI = {
  testProxy: (config: { url: string; type: string }) => ipcRenderer.invoke('proxy:test', config),
  setProxy: (config: { url: string; type: string }) => ipcRenderer.invoke('proxy:set', config),
  clearProxy: () => ipcRenderer.invoke('proxy:clear'),
};
