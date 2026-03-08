import WebSocket from 'ws';
import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';

interface CdpRequest {
  id: number;
  method: string;
  params?: any;
}

export class CdpManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();
  private mainWindow: BrowserWindow | null = null;
  private isConnected = false;

  constructor() {
    super();
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  public async connect(port: number, retries = 5, delay = 1000): Promise<boolean> {
    console.log(`[CDP] Connecting to localhost:${port}... (Retries left: ${retries})`);

    try {
      // Fetch the WebSocket debugger URL
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = (await response.json()) as any;
      const wsUrl = data.webSocketDebuggerUrl;

      if (!wsUrl) {
        throw new Error('No webSocketDebuggerUrl found');
      }

      console.log(`[CDP] WebSocket URL: ${wsUrl}`);

      return new Promise((resolve) => {
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', async () => {
          console.log('[CDP] Connected via WebSocket');
          this.isConnected = true;
          await this.initializeNetwork();
          resolve(true);
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('error', (err) => {
          console.error('[CDP] WebSocket error:', err);
          if (!this.isConnected) resolve(false);
        });

        this.ws.on('close', () => {
          console.log('[CDP] Disconnected');
          this.isConnected = false;
          this.ws = null;
        });
      });
    } catch (error) {
      if (retries > 0) {
        console.log(`[CDP] Connection failed, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        return this.connect(port, retries - 1, delay);
      }
      console.error('[CDP] Connection failed after retries:', error);
      return false;
    }
  }

  private async initializeNetwork() {
    await this.send('Network.enable', {
      maxTotalBufferSize: 10000000,
      maxResourceBufferSize: 5000000,
      maxPostDataSize: 5000000,
    });
    console.log('[CDP] Network domain enabled');
  }

  private send(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('WebSocket not connected'));
      }

      const id = ++this.requestId;
      this.pendingRequests.set(id, { resolve, reject });

      const request: CdpRequest = { id, method, params };
      this.ws.send(JSON.stringify(request));
    });
  }

  private handleMessage(message: string) {
    try {
      const data = JSON.parse(message);

      // Handle Command Response
      if (data.id && this.pendingRequests.has(data.id)) {
        const { resolve, reject } = this.pendingRequests.get(data.id)!;
        this.pendingRequests.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
        return;
      }

      // Handle Events
      if (data.method) {
        this.emit(data.method, data.params);
        this.handleNetworkEvent(data.method, data.params);
      }
    } catch (e) {
      console.error('[CDP] Error handling message:', e);
    }
  }

  private handleNetworkEvent(method: string, params: any) {
    if (!this.mainWindow) return;

    switch (method) {
      case 'Network.requestWillBeSent':
        this.handleRequestWillBeSent(params);
        break;
      case 'Network.responseReceived':
        this.handleResponseReceived(params);
        break;
      case 'Network.loadingFinished':
        this.handleLoadingFinished(params);
        break;
      case 'Network.loadingFailed':
        this.handleLoadingFailed(params);
        break;
    }
  }

  private handleRequestWillBeSent(params: any) {
    const { requestId, request, initiator } = params;

    // Normalize to Systema format
    this.sendToRenderer('cdp:request', {
      id: requestId, // CDP RequestId matches across events
      method: request.method,
      url: request.url,
      headers: request.headers,
      timestamp: Date.now(), // Approximate, strictly we should map monotonic time
      requestBody: request.postData || '',
      initiator: initiator?.type,
    });
  }

  private handleResponseReceived(params: any) {
    const { requestId, response } = params;

    this.sendToRenderer('cdp:response', {
      id: requestId,
      statusCode: response.status,
      headers: response.headers,
      mimeType: response.mimeType,
      timestamp: Date.now(),
    });
  }

  private async handleLoadingFinished(params: any) {
    const { requestId, encodedDataLength } = params;

    try {
      // Fetch body
      const result = await this.send('Network.getResponseBody', { requestId });
      const { body, base64Encoded } = result;

      this.sendToRenderer('cdp:response-body', {
        id: requestId,
        body: body, // Ensure frontend handles base64 if base64Encoded is true
        isBinary: base64Encoded,
        size: encodedDataLength, // Approximate
      });
    } catch (e) {
      console.error(`[CDP] Failed to get body for ${requestId}:`, e);
      // Could be because it's a redirect or empty?
    }
  }

  private handleLoadingFailed(params: any) {
    const { requestId, errorText } = params;
    this.sendToRenderer('cdp:error', { id: requestId, error: errorText });
  }

  private sendToRenderer(channel: string, data: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

export const cdpManager = new CdpManager();
