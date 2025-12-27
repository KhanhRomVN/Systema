import { ipcRenderer } from 'electron';

export const trackingAPI = {
 startTracking: (config: { proxyUrl: string; proxyType: string }) =>
 ipcRenderer.invoke('tracking:start', config),
 stopTracking: () => ipcRenderer.invoke('tracking:stop'),
 getTrackedRequests: () => ipcRenderer.invoke('tracking:getRequests'),
 
 // Event listeners
 onRequestTracked: (callback: (request: any) => void) => {
 ipcRenderer.on('tracking:request-tracked', (_, request) => callback(request));
 },
 offRequestTracked: (callback: (request: any) => void) => {
 ipcRenderer.off('tracking:request-tracked', callback);
 },
};