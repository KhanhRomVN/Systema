import { ipcMain } from 'electron';
import { setupConversationHandlers } from './conversation';

export function setupEventHandlers() {
  ipcMain.handle('ping', () => 'pong');
  setupConversationHandlers();
}
