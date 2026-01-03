export interface IElectronAPI {
  getApiKey: () => Promise<string | undefined>;
  saveApiKey: (key: string) => Promise<boolean>;
  openAuthWindow: () => Promise<void>;
  sendMessage: (payload: any) => Promise<void>;
  onMessageStream: (callback: (chunk: string) => void) => void;
  onMessageThinking: (callback: (chunk: string) => void) => void;
  onMessageComplete: (callback: () => void) => void;
  onError: (callback: (error: string) => void) => void;
  onAuthSuccess: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
