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
      // Step 1: Fetch list of all debuggable targets (pages, workers, etc.)
      const targetsResponse = await fetch(`http://127.0.0.1:${port}/json`);
      if (!targetsResponse.ok) throw new Error(`HTTP ${targetsResponse.status}`);

      const targets = (await targetsResponse.json()) as any[];
      console.log(`[CDP] Found ${targets.length} debuggable targets`);

      // Step 2: Find a "page" target (not background_page, worker, etc.)
      let pageTarget = targets.find(
        (t: any) => t.type === 'page' && t.url && !t.url.startsWith('devtools://')
      );

      // If no page with a real URL, fall back to any page target
      if (!pageTarget) {
        pageTarget = targets.find((t: any) => t.type === 'page');
      }

      if (!pageTarget) {
        console.log('[CDP] No page target found, will connect to browser level and create a page');
        // Connect to browser WebSocket and create a target
        const versionResponse = await fetch(`http://127.0.0.1:${port}/json/version`);
        if (!versionResponse.ok) throw new Error(`HTTP ${versionResponse.status}`);
        const versionData = (await versionResponse.json()) as any;
        const browserWsUrl = versionData.webSocketDebuggerUrl;
        if (!browserWsUrl) throw new Error('No webSocketDebuggerUrl found');

        return await this.connectToBrowserAndCreatePage(browserWsUrl);
      }

      const wsUrl = pageTarget.webSocketDebuggerUrl;
      console.log(`[CDP] Connecting to page: ${pageTarget.url} (${wsUrl})`);

      return await this.connectToPage(wsUrl);
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

  private async connectToPage(wsUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', async () => {
        console.log('[CDP] Connected to page WebSocket');
        this.isConnected = true;
        try {
          await this.initializeNetwork();
        } catch (e: any) {
          console.error('[CDP] Failed to initialize Network domain:', e?.message || e);
        }
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
  }

  private async connectToBrowserAndCreatePage(browserWsUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      const browserWs = new WebSocket(browserWsUrl);
      let targetAttached = false;

      browserWs.on('open', () => {
        console.log('[CDP] Connected to browser WebSocket, creating target...');
        // Send Target.createTarget to open a new page (the browser already has one, 
        // but let's just attach to the first available by listing targets via CDP)
        const createTargetMsg = JSON.stringify({
          id: 1,
          method: 'Target.getTargets',
        });
        browserWs.send(createTargetMsg);
      });

      browserWs.on('message', (data: any) => {
        try {
          const msg = JSON.parse(data.toString());
          
          if (msg.id === 1 && msg.result?.targetInfos) {
            const pageTarget = msg.result.targetInfos.find(
              (t: any) => t.type === 'page' && t.attached === false
            );
            if (pageTarget) {
              console.log(`[CDP] Found page target: ${pageTarget.url}, attaching...`);
              targetAttached = true;
              const attachMsg = JSON.stringify({
                id: 2,
                method: 'Target.attachToTarget',
                params: { targetId: pageTarget.targetId, flatten: true },
              });
              browserWs.send(attachMsg);
            } else {
              // All pages already attached or none exist
              browserWs.close();
              resolve(false);
            }
          } else if (msg.id === 2) {
            if (msg.result?.sessionId) {
              console.log(`[CDP] Attached to target, sessionId: ${msg.result.sessionId}`);
              // We're attached via flatten mode, events will arrive on browser WebSocket
              // with sessionId. But for simplicity, let's close and re-connect directly to the page.
              // Actually, with flatten=true, Network events come directly on this connection!
              this.ws = browserWs;
              this.isConnected = true;
              try {
                // Enable Network on the attached target
                const enableMsg = JSON.stringify({
                  id: 3,
                  method: 'Network.enable',
                  params: {
                    maxTotalBufferSize: 10000000,
                    maxResourceBufferSize: 5000000,
                    maxPostDataSize: 5000000,
                  },
                  sessionId: msg.result.sessionId,
                });
                browserWs.send(enableMsg);
              } catch (e: any) {
                console.error('[CDP] Failed to enable Network:', e?.message || e);
              }
              console.log('[CDP] Network domain enabled via Target.attachToTarget');
              resolve(true);
            } else if (msg.error) {
              console.error('[CDP] Failed to attach to target:', msg.error);
              browserWs.close();
              resolve(false);
            }
          } else if (msg.id === 3) {
            if (msg.error) {
              console.error('[CDP] Network.enable failed:', msg.error);
            } else {
              console.log('[CDP] Network domain enabled on attached target');
            }
          } else if (msg.method === 'Network.requestWillBeSent' || 
                     msg.method === 'Network.responseReceived' ||
                     msg.method === 'Network.loadingFinished' ||
                     msg.method === 'Network.loadingFailed') {
            // Flattened events come directly
            this.handleNetworkEvent(msg.method, msg.params);
          } else if (msg.method === 'Target.attachedToTarget') {
            console.log(`[CDP] Target attached: ${msg.params.targetInfo?.url}`);
          }
        } catch (e) {
          // Ignore parse errors
        }
      });

      browserWs.on('error', (err) => {
        console.error('[CDP] Browser WebSocket error:', err);
        if (!targetAttached) resolve(false);
      });

      browserWs.on('close', () => {
        console.log('[CDP] Browser WebSocket closed');
        this.isConnected = false;
        if (this.ws === browserWs) this.ws = null;
        if (!targetAttached) resolve(false);
      });
    });
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
        body: body,
        isBinary: base64Encoded,
        size: encodedDataLength,
      });
    } catch (e: any) {
      // Silently ignore - body was already discarded by browser (redirect, preflight, etc.)
      const msg = e?.message || '';
      if (msg.includes('No resource') || msg.includes('No data found')) {
        return;
      }
      console.error(`[CDP] Failed to get body for ${requestId}:`, msg || e);
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
