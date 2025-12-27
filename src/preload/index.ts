import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { appAPI, proxyAPI, trackingAPI } from './api';

const api = {
 app: appAPI,
 proxy: proxyAPI,
 tracking: trackingAPI,
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
