import * as http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { BrowserWindow } from 'electron';
import { findAvailablePort } from '../utils/net';

export class SingletonWSManager {
  private static DEFAULT_PORT = 6742;
  private static instance: SingletonWSManager | null = null;

  private _wsServer?: WebSocketServer;
  private _httpServer?: http.Server;
  private _clients: Set<WebSocket> = new Set();
  private _window: BrowserWindow | null = null;
  private _currentPort: number = 0;

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
      this._currentPort = await this.startServer();
      console.log(`[SingletonWSManager] Server started on port ${this._currentPort}`);
      return this._currentPort;
    } catch (error) {
      console.error('[SingletonWSManager] ❌ Failed to start server:', error);
      throw error;
    }
  }

  private async startServer(): Promise<number> {
    return new Promise(async (resolve, reject) => {
      try {
        const port = await findAvailablePort(SingletonWSManager.DEFAULT_PORT);
        this._httpServer = http.createServer();

        this._httpServer.on('error', (error: any) => {
          console.error('[SingletonWSManager] HTTP Server Error:', error);
          reject(error);
        });

        this._wsServer = new WebSocketServer({ server: this._httpServer });

        this._wsServer.on('connection', (ws: WebSocket) => {
          this._clients.add(ws);
          this.broadcastToRenderer('client-connected', { count: this._clients.size });

          // Zen-compatible: Send connection-established
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: 'connection-established',
                  port: this._currentPort,
                  connectionStats: {
                    total: this._clients.size,
                  },
                }),
              );
            }
          }, 50);

          // Zen-compatible: JSON Ping to keep connection alive (traffic generation)
          const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: 'ping',
                  timestamp: Date.now(),
                }),
              );
            } else {
              clearInterval(pingInterval);
            }
          }, 30000); // 30s interval (Zen uses 45s, 30s is safe)

          ws.on('message', (message: any) => {
            const msgString = message.toString();
            try {
              const parsed = JSON.parse(msgString);

              // Handle Pong (Keep-alive)
              if (parsed.type === 'pong') {
                // Received pong, connection is healthy.
                // Zen doesn't do anything specific here, just lets traffic flow.
                return;
              }

              this.broadcastToRenderer('message', parsed);
            } catch (e) {
              this.broadcastToRenderer('message-raw', msgString);
            }
          });

          ws.on('close', () => {
            this._clients.delete(ws);
            clearInterval(pingInterval);
            this.broadcastToRenderer('client-disconnected', { count: this._clients.size });
          });

          ws.on('error', (e: Error) => {
            console.error('[SingletonWSManager] WS Client Error:', e);
            clearInterval(pingInterval);
          });
        });

        this._httpServer.listen(port, () => {
          resolve(port);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  // private startHeartbeat() { ... } // Removed in favor of per-socket JSON ping

  public getPort(): number {
    return this._currentPort;
  }

  public sendToClients(message: any): void {
    const msgString = JSON.stringify(message);
    this._clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msgString);
      }
    });
  }

  public stop(): void {
    // interval is per-socket now, cleared on close
    this._wsServer?.close();
    this._httpServer?.close();
  }
}
