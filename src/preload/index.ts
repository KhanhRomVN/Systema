import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { appAPI } from './api';

const api = {
  app: appAPI,
  invoke: (channel, ...args) => electronAPI.ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => electronAPI.ipcRenderer.on(channel, listener),
  off: (channel, listener) => electronAPI.ipcRenderer.removeListener(channel, listener),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-expect-error (define in d.ts)
  window.electron = electronAPI;
  // @ts-expect-error (api is defined in d.ts)
  window.api = api;
}
