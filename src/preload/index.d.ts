import { ElectronAPI } from '@electron-toolkit/preload';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface API {
  invoke(channel: string, ...args: any[]): Promise<any>;
  on(channel: string, func: (...args: any[]) => void): void;
  off(channel: string, func: (...args: any[]) => void): void;
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ElectronIpcRenderer {}

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: ElectronIpcRenderer;
    };
    api: API;
    electronAPI: API;
  }
}
