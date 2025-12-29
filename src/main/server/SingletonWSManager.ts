import * as http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { BrowserWindow } from 'electron';

export class SingletonWSManager {
  private static FIXED_PORT = 6742;
  private static instance: SingletonWSManager | null = null;

  private _wsServer?: WebSocketServer;
  private _httpServer?: http.Server;
  private _clients: Set<WebSocket> = new Set();
  private _window: BrowserWindow | null = null;

  private constructor() {}

  public static getInstance(): SingletonWSManager {
    if (!SingletonWSManager.instance) {
      SingletonWSManager.instance = new SingletonWSManager();
    }
    return SingletonWSManager.instance;
  }

  public setWindow(window: BrowserWindow) {
    this._window = window;
  }

  private broadcastToRenderer(type: string, data: any) {
    if (this._window && !this._window.isDestroyed()) {
      this._window.webContents.send('ws:event', { type, data });
    }
  }

  public async initialize(): Promise<number> {
    try {
      await this.startServer();
      return SingletonWSManager.FIXED_PORT;
    } catch (error) {
      console.error('[SingletonWSManager] ❌ Failed to start server:', error);
      throw error;
    }
  }

  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._httpServer = http.createServer();

      this._httpServer.on('error', (error: any) => {
        console.error('[SingletonWSManager] HTTP Server Error:', error);
        reject(error);
      });

      this._wsServer = new WebSocketServer({ server: this._httpServer });

      this._wsServer.on('connection', (ws: WebSocket) => {
        this._clients.add(ws);
        console.log('[SingletonWSManager] Client connected');
        this.broadcastToRenderer('client-connected', { count: this._clients.size });

        ws.on('message', (message: any) => {
          const msgString = message.toString();
          console.log('[SingletonWSManager] Received:', msgString);

          try {
            const parsed = JSON.parse(msgString);
            this.broadcastToRenderer('message', parsed);
          } catch (e) {
            this.broadcastToRenderer('message-raw', msgString);
          }
        });

        ws.on('close', () => {
          this._clients.delete(ws);
          console.log('[SingletonWSManager] Client disconnected');
          this.broadcastToRenderer('client-disconnected', { count: this._clients.size });
        });

        ws.on('error', (e: Error) => console.error('[SingletonWSManager] WS Client Error:', e));
      });

      this._httpServer.listen(SingletonWSManager.FIXED_PORT, () => {
        console.log(
          `[SingletonWSManager] WS Server listening on port ${SingletonWSManager.FIXED_PORT}`,
        );
        resolve();
      });
    });
  }

  public getPort(): number {
    return SingletonWSManager.FIXED_PORT;
  }

  public stop(): void {
    this._wsServer?.close();
    this._httpServer?.close();
  }
}
