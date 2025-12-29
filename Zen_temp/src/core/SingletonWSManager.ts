import * as http from "http";
import * as WebSocket from "ws";
import type { WebSocket as WSWebSocket } from "ws";
import { GlobalStateManager, GlobalServerState } from "./GlobalStateManager";

export class SingletonWSManager {
  private static FIXED_PORT = 3000;
  private static instance: SingletonWSManager | null = null;

  private _wsServer?: WebSocket.Server;
  private _httpServer?: http.Server;
  private _clients: Set<WSWebSocket> = new Set();
  private _clientIsWebview: Map<WSWebSocket, boolean> = new Map();
  private _isServerOwner: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): SingletonWSManager {
    if (!SingletonWSManager.instance) {
      SingletonWSManager.instance = new SingletonWSManager();
    }
    return SingletonWSManager.instance;
  }

  /**
   * Initialize WebSocket server (singleton)
   */
  public async initialize(): Promise<number> {
    // Check if server already running
    const existingState = GlobalStateManager.readState();

    if (existingState) {
      // Increment instance count
      GlobalStateManager.incrementInstanceCount();
      this._isServerOwner = false;
      return existingState.port;
    }

    try {
      await this.startServer();
      this._isServerOwner = true;

      // Save state
      const state: GlobalServerState = {
        port: SingletonWSManager.FIXED_PORT,
        pid: process.pid,
        timestamp: Date.now(),
        instanceCount: 1,
      };
      GlobalStateManager.writeState(state);

      return SingletonWSManager.FIXED_PORT;
    } catch (error) {
      console.error("[SingletonWSManager] ❌ Failed to start server:", error);
      throw error;
    }
  }

  /**
   * Start WebSocket server
   */
  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._httpServer = http.createServer();

      this._httpServer.on("error", (error: any) => {
        if (error.code === "EADDRINUSE") {
          reject(new Error(`Port ${SingletonWSManager.FIXED_PORT} in use`));
        } else {
          reject(error);
        }
      });

      this._wsServer = new WebSocket.Server({ server: this._httpServer });

      this._wsServer.on("connection", (ws: WebSocket) => {
        this._clients.add(ws);

        // 🆕 Parse URL for clientType
        let isWebviewClient = false;
        let req: http.IncomingMessage | undefined;
        try {
          // req comes from the upgrade request
          req = arguments[1] as http.IncomingMessage; // ws.on('connection', (socket, req) => ...)
          // Note: ws library passes request as second argument
          if (req && req.url) {
            const url = new URL(
              req.url,
              `http://localhost:${SingletonWSManager.FIXED_PORT}`
            );
            const clientType = url.searchParams.get("clientType");

            if (clientType === "webview") {
              isWebviewClient = true;
            } else if (clientType === "external") {
              isWebviewClient = false;
            } else {
              // Fallback to legacy logic
              isWebviewClient = this._clients.size === 1;
            }
          } else {
            isWebviewClient = this._clients.size === 1;
          }
        } catch (e) {
          console.error("[SingletonWSManager] Error parsing clientType:", e);
          isWebviewClient = this._clients.size === 1;
        }

        this._clientIsWebview.set(ws, isWebviewClient);

        // 🔍 DEBUG: Log connection statistics
        const webviewCount = Array.from(this._clientIsWebview.values()).filter(
          (isWebview) => isWebview
        ).length;
        const externalCount = Array.from(this._clientIsWebview.values()).filter(
          (isWebview) => !isWebview
        ).length;

        console.error(
          `[SingletonWSManager] 🔌 New ${
            isWebviewClient ? "WEBVIEW" : "EXTERNAL"
          } client connected`
        );
        console.error(
          `[SingletonWSManager] 📊 Total clients: ${this._clients.size} (webview: ${webviewCount}, external: ${externalCount})`
        );

        // Send connection-established
        setTimeout(() => {
          if (ws.readyState === ws.OPEN) {
            // Calculate current connection stats
            const currentWebviewCount = Array.from(
              this._clientIsWebview.values()
            ).filter((isWebview) => isWebview).length;
            const currentExternalCount = Array.from(
              this._clientIsWebview.values()
            ).filter((isWebview) => !isWebview).length;

            const connectionStats = {
              total: this._clients.size,
              webview: currentWebviewCount,
              external: currentExternalCount,
            };

            ws.send(
              JSON.stringify({
                type: "connection-established",
                port: SingletonWSManager.FIXED_PORT,
                connectionStats: connectionStats,
              })
            );

            // Broadcast connection stats update to all external clients (ZenTab)
            this.broadcastToExternalClients({
              type: "connectionStatsUpdate",
              stats: connectionStats,
              timestamp: Date.now(),
            });
          }
        }, 50);

        // PING mechanism
        const pingInterval = setInterval(() => {
          if (ws.readyState === ws.OPEN) {
            ws.send(
              JSON.stringify({
                type: "ping",
                timestamp: Date.now(),
              })
            );
          } else {
            clearInterval(pingInterval);
          }
        }, 45000);

        ws.on("message", (message: string) => {
          this.handleMessage(message.toString(), ws, isWebviewClient);
        });

        ws.on("close", () => {
          const wasWebviewClient = this._clientIsWebview.get(ws) || false;

          this._clients.delete(ws);
          this._clientIsWebview.delete(ws);
          clearInterval(pingInterval);

          // Broadcast updated connection stats after disconnect
          if (wasWebviewClient) {
            // Calculate remaining webview count
            const webviewCount = Array.from(
              this._clientIsWebview.values()
            ).filter((isWebview) => isWebview).length;

            const connectionStats = {
              total: this._clients.size,
              webview: webviewCount,
              external: this._clients.size - webviewCount,
            };

            // Broadcast to ZenTab
            this.broadcastToExternalClients({
              type: "connectionStatsUpdate",
              stats: connectionStats,
              timestamp: Date.now(),
            });
          }

          if (!wasWebviewClient) {
            console.error(
              "[SingletonWSManager] 🔌 External client disconnected. Broadcasting empty tabs to webviews."
            );
            this.broadcastToWebviews({
              type: "focusedTabsUpdate",
              data: [],
              timestamp: Date.now(),
            });
          }
        });

        ws.on("error", (error: Error) => {
          console.error("[SingletonWSManager] Client error:", error);
          clearInterval(pingInterval);
        });
      });

      this._httpServer.on("request", (req, res) => {
        const headers = {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        };

        if (req.method === "OPTIONS") {
          res.writeHead(204, headers);
          res.end();
          return;
        }

        if (req.url === "/health") {
          res.writeHead(200, headers);
          res.end(
            JSON.stringify({
              status: "ok",
              port: SingletonWSManager.FIXED_PORT,
            })
          );
        } else {
          res.writeHead(404, headers);
          res.end();
        }
      });

      this._httpServer.listen(SingletonWSManager.FIXED_PORT, () => {
        resolve();
      });
    });
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(
    message: string,
    ws: WebSocket,
    isWebviewClient: boolean
  ): void {
    try {
      const data = JSON.parse(message);

      console.error(
        `[SingletonWSManager] 📨 Message from ${
          isWebviewClient ? "WEBVIEW" : "EXTERNAL"
        }: ${data.type}`
      );

      if (data.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      } else if (data.type === "pong") {
        // Do nothing
      } else if (data.type === "requestFocusedTabs") {
        console.error(
          "[SingletonWSManager] 🔄 Forwarding requestFocusedTabs to external clients"
        );
        this.broadcastToExternalClients({
          type: "requestFocusedTabs",
          timestamp: Date.now(),
        });
      } else if (data.type === "sendPrompt") {
        // Count external clients
        const externalClientCount = Array.from(
          this._clientIsWebview.values()
        ).filter((isWebview) => !isWebview).length;
        this.broadcastToExternalClients(data);
      } else if (data.type === "promptResponse" && !isWebviewClient) {
        const webviewCount = Array.from(this._clientIsWebview.values()).filter(
          (isWebview) => isWebview
        ).length;
        // Broadcast to all webview clients
        this.broadcastToWebviews(data);
      } else if (data.type === "focusedTabsUpdate" && !isWebviewClient) {
        const webviewCount = Array.from(this._clientIsWebview.values()).filter(
          (isWebview) => isWebview
        ).length;
        // Only broadcast to webview clients (Zen UI), not back to ZenTab
        this.broadcastToWebviews(data);
      } else if (data.type === "conversationPing" && !isWebviewClient) {
        // Forward conversationPing from ZenTab to Zen webview
        this.broadcastToWebviews(data);
      } else if (data.type === "conversationPong" && isWebviewClient) {
        // Forward conversationPong from Zen webview to ZenTab
        this.broadcastToExternalClients(data);
      }
    } catch (error) {
      console.error("[SingletonWSManager] Error handling message:", error);
    }
  }

  /**
   * Broadcast to all clients
   */
  private broadcastToAll(data: any): void {
    const message = JSON.stringify(data);
    this._clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Broadcast to webview clients only
   */
  private broadcastToWebviews(data: any): void {
    const message = JSON.stringify(data);
    let sentCount = 0;

    this._clients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        this._clientIsWebview.get(client)
      ) {
        client.send(message);
        sentCount++;
      }
    });
  }

  /**
   * Broadcast to external clients (ZenTab) only
   */
  private broadcastToExternalClients(data: any): void {
    const message = JSON.stringify(data);
    let sentCount = 0;
    let skippedCount = 0;

    this._clients.forEach((client, index) => {
      const isWebview = this._clientIsWebview.get(client);
      const readyState = client.readyState;

      if (
        client.readyState === WebSocket.OPEN &&
        !this._clientIsWebview.get(client)
      ) {
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          console.error(
            `[SingletonWSManager] ❌ Failed to send to client #${index}:`,
            error
          );
        }
      } else {
        skippedCount++;
      }
    });

    console.error(
      `[SingletonWSManager] ✅ Sent to ${sentCount} external clients`
    );
  }

  /**
   * Stop WebSocket server
   */
  public async stop(): Promise<void> {
    // Decrement instance count
    const remainingInstances = GlobalStateManager.decrementInstanceCount();

    // Only stop server if this is the owner AND no more instances
    if (this._isServerOwner && remainingInstances === 0) {
      return new Promise((resolve) => {
        let wsServerClosed = false;
        let httpServerClosed = false;
        let resolved = false;

        const checkBothClosed = () => {
          if (wsServerClosed && httpServerClosed && !resolved) {
            resolved = true;
            GlobalStateManager.clearState();
            setTimeout(() => resolve(), 200);
          }
        };

        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            GlobalStateManager.clearState();
            resolve();
          }
        }, 2000);

        if (this._wsServer) {
          this._wsServer.clients.forEach((client) => {
            this._clients.delete(client);
            client.close();
          });

          this._wsServer.close(() => {
            wsServerClosed = true;
            checkBothClosed();
          });
          this._wsServer = undefined;
        } else {
          wsServerClosed = true;
        }

        if (this._httpServer) {
          this._httpServer.close(() => {
            httpServerClosed = true;
            checkBothClosed();
          });
          this._httpServer = undefined;
        } else {
          httpServerClosed = true;
        }

        checkBothClosed();
      });
    }
  }

  /**
   * Get current port
   */
  public getPort(): number {
    return SingletonWSManager.FIXED_PORT;
  }
}
