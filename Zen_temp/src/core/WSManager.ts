import * as http from "http";
import * as WebSocket from "ws";
import type { WebSocket as WSWebSocket } from "ws";
import { PortManager } from "./PortManager";

/**
 * WSManager - WebSocket server manager (per-window, not singleton)
 * Each VS Code window creates its own instance with a unique port
 */
export class WSManager {
  private _wsServer?: WebSocket.Server;
  private _httpServer?: http.Server;
  private _clients: Set<WSWebSocket> = new Set();
  private _port: number;

  constructor(port: number) {
    this._port = port;
  }

  /**
   * Get the port this server is running on
   */
  public getPort(): number {
    return this._port;
  }

  /**
   * Initialize and start the WebSocket server
   */
  public async initialize(): Promise<void> {
    try {
      await this.startServer();
    } catch (error) {
      console.error(`[WSManager] ❌ Failed to start server:`, error);
      throw error;
    }
  }

  /**
   * Start the WebSocket server
   */
  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server
        this._httpServer = http.createServer();

        // Create WebSocket server
        this._wsServer = new WebSocket.Server({
          server: this._httpServer,
          path: "/ws",
        });

        // Setup connection handler
        this._wsServer.on("connection", (ws: WSWebSocket) => {
          this.handleConnection(ws);
        });

        // Start listening
        this._httpServer.listen(this._port, () => {
          resolve();
        });

        this._httpServer.on("error", (error) => {
          console.error(`[WSManager] HTTP server error:`, error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WSWebSocket): void {
    this._clients.add(ws);

    // Send connection-established message
    setTimeout(() => {
      if (ws.readyState === ws.OPEN) {
        const message = {
          type: "connection-established",
          port: this._port,
          timestamp: Date.now(),
        };

        ws.send(JSON.stringify(message));
      }
    }, 50);

    // Setup ping mechanism
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

    // Handle incoming messages
    ws.on("message", (message: string) => {
      this.handleMessage(message.toString(), ws);
    });

    // Handle disconnection
    ws.on("close", () => {
      this._clients.delete(ws);
      clearInterval(pingInterval);
    });

    // Handle errors
    ws.on("error", (error: Error) => {
      console.error("[WSManager] Client error:", error);
      clearInterval(pingInterval);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string, ws: WSWebSocket): void {
    try {
      const message = JSON.parse(data);

      // Handle different message types
      if (message.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      } else if (message.type === "pong") {
        // Do nothing
      } else if (message.type === "requestFocusedTabs") {
        this.sendToAll({
          type: "requestFocusedTabs",
          timestamp: Date.now(),
        });
      } else if (message.type === "sendPrompt") {
        this.sendToAll(message);
      } else if (message.type === "promptResponse") {
        this.sendToAll(message);
      } else if (message.type === "focusedTabsUpdate") {
        this.sendToAll(message);
      } else if (message.type === "conversationPing") {
        this.sendToAll(message);
      } else if (message.type === "conversationPong") {
        this.sendToAll(message);
      } else {
      }
    } catch (error) {
      console.error("[WSManager] ❌ Error handling message:", error);
    }
  }

  /**
   * Send message to all connected clients
   */
  private sendToAll(data: any): void {
    const message = JSON.stringify(data);

    let sentCount = 0;
    let skippedCount = 0;

    this._clients.forEach((client, index) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          console.error(
            `[WSManager] ❌ Failed to send to client ${index}:`,
            error
          );
        }
      } else {
        skippedCount++;
      }
    });
  }

  /**
   * Stop the WebSocket server
   */
  public async stop(): Promise<void> {
    // Close all client connections
    this._clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    this._clients.clear();

    // Close WebSocket server
    if (this._wsServer) {
      await new Promise<void>((resolve) => {
        this._wsServer!.close(() => {
          resolve();
        });
      });
      this._wsServer = undefined;
    }

    // Close HTTP server
    if (this._httpServer) {
      await new Promise<void>((resolve) => {
        this._httpServer!.close(() => {
          resolve();
        });
      });
      this._httpServer = undefined;
    }
  }
}
