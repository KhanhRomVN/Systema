import { ipcMain } from 'electron';
import { testProxyConnection, setGlobalProxy, clearGlobalProxy } from './proxy.handlers';
import { startTracking, stopTracking, getTrackedRequests } from './tracking.handlers';

export function setupEventHandlers() {
 ipcMain.handle('ping', () => 'pong');
 
 // Proxy handlers
 ipcMain.handle('proxy:test', async (_, config) => {
 return await testProxyConnection(config);
 });
 
 ipcMain.handle('proxy:set', async (_, config) => {
 return await setGlobalProxy(config);
 });
 
 ipcMain.handle('proxy:clear', () => {
 return clearGlobalProxy();
 });
 
 // Tracking handlers
 ipcMain.handle('tracking:start', async (_, config) => {
 return await startTracking(config);
 });
 
 ipcMain.handle('tracking:stop', () => {
 return stopTracking();
 });
 
 ipcMain.handle('tracking:getRequests', () => {
 return getTrackedRequests();
 });
}