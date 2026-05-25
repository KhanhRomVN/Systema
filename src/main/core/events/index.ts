import { ipcMain } from 'electron';
import { setupConversationHandlers } from './conversation';
import * as fs from 'fs';
import * as path from 'path';

export function setupEventHandlers() {
  ipcMain.handle('ping', () => 'pong');
  setupConversationHandlers();

  ipcMain.handle('collection:save-response', async (event, { appId, request, response }) => {
    try {
      const userDataPath = (await import('electron')).app.getPath('userData');
      const collectionDir = path.join(userDataPath, 'collections', appId);
      if (!fs.existsSync(collectionDir)) {
        fs.mkdirSync(collectionDir, { recursive: true });
      }
      
      const timestamp = Date.now();
      const filename = `response-${timestamp}.json`;
      const filePath = path.join(collectionDir, filename);
      
      const data = {
        savedAt: timestamp,
        request,
        response,
      };
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      return { success: true, filePath };
    } catch (error) {
      console.error('Failed to save response:', error);
      return { success: false, error: String(error) };
    }
  });
}
