import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import { INJECT_SCRIPT } from './injection';
import * as zlib from 'zlib';
import { cacheHeaders } from './headerCache';
import { mediaCache } from './mediaCache';
import * as path from 'path';
import * as fs from 'fs';
import { Proxy } from 'http-mitm-proxy';
import { decompress } from '@mongodb-js/zstd';
import * as net from 'net';
import * as http from 'http';
import { WebSocketServer, WebSocket as WS } from 'ws';

export interface BreakpointRule {
  id: string;
  urlPattern: string; // substring or regex string
  methods: string[]; // empty = all
  phase: 'request' | 'response' | 'both';
  enabled: boolean;
}

export interface PendingBreakpoint {
  id: string; // requestId
  phase: 'request' | 'response';
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  statusCode?: number;
}

export class ProxyServer extends EventEmitter {
  private proxy: any;
  private isRunning: boolean = false;
  private port: number = 8081;
  private wsPort: number = 0;
  private wss: WebSocketServer | null = null;
  private window: BrowserWindow | null = null;
  private isIntercepting: boolean = false;
  private breakpointRules: BreakpointRule[] = [];
  private pendingBreakpoints: Map<string, (edited: PendingBreakpoint | null) => void> = new Map();
  private pendingRequests: Map<string, { proceed: () => void; drop: () => void }> = new Map();
  zstd: any;

  constructor() {
    super();
    try {
      // Fix: Destructure Proxy and use new keyword
      this.proxy = new Proxy();
      this.proxy.use(Proxy.gunzip);
    } catch (e) {
      // Ignore errors
    }
  }

  public setWindow(window: BrowserWindow) {
    this.window = window;
  }

  private startWss(wsPort: number): Promise<void> {
    return new Promise((resolve) => {
      const server = http.createServer();
      this.wss = new WebSocketServer({ server });
      this.wss.on('connection', (ws) => {
        ws.send(JSON.stringify({ intercepting: this.isIntercepting }));
      });
      server.listen(wsPort, '0.0.0.0', () => {
        this.wsPort = wsPort;
        resolve();
      });
    });
  }

  private broadcastIntercept() {
    if (!this.wss) return;
    const msg = JSON.stringify({ intercepting: this.isIntercepting });
    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WS.OPEN) ws.send(msg);
    });
  }

  public start(port: number = 8081): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.isRunning) {
        console.log(`[ProxyServer] Already running, resolving start()`);
        resolve();
        return;
      }
      this.port = port;
      console.log(`[ProxyServer] Starting WSS on port ${port + 1}...`);
      await this.startWss(port + 1);
      console.log(`[ProxyServer] WSS started, setting up listeners...`);
      this.setupListeners();
      console.log(`[ProxyServer] Starting proxy on port ${port}...`);
      this.proxy.listen({ port, host: '0.0.0.0' }, () => {
        this.isRunning = true;
        console.log(`[ProxyServer] Proxy listening on port ${port}`);
        this.emit('started', port);
        resolve();
      });
      this.proxy.on('error', (err: any) => {
        console.error(`[ProxyServer] Error on proxy:`, err);
        reject(err);
      });
    });
  }

  public async stop(): Promise<void> {
    console.log(`[ProxyServer] stop() called, isRunning=${this.isRunning}, port=${this.port}`);
    if (!this.isRunning) {
      console.log('[ProxyServer] Already stopped, returning');
      return;
    }
    this.isRunning = false;

    // Close WebSocket server first
    if (this.wss) {
      console.log('[ProxyServer] Closing WSS...');
      try {
        await new Promise<void>((resolve) => {
          this.wss!.close(() => {
            console.log('[ProxyServer] WSS closed');
            resolve();
          });
        });
      } catch (e) {
        console.error('[ProxyServer] Error closing WSS:', e);
      }
      this.wss = null;
    }

    // Close proxy server and wait for it to fully release the port
    // Use a timeout to prevent hanging if the callback is never called
    console.log('[ProxyServer] Closing proxy server on port', this.port);
    try {
      await new Promise<void>((resolve) => {
        let resolved = false;
        const done = () => {
          if (!resolved) {
            resolved = true;
            console.log('[ProxyServer] Proxy close done (port released)');
            resolve();
          }
        };

        // Set a timeout to prevent hanging indefinitely
        const timeout = setTimeout(() => {
          console.warn('[ProxyServer] close() timed out after 3s, forcing resolve');
          done();
        }, 3000);

        try {
          this.proxy.close(() => {
            clearTimeout(timeout);
            console.log('[ProxyServer] proxy.close() callback fired');
            done();
          });
        } catch (e) {
          clearTimeout(timeout);
          console.error('[ProxyServer] Error calling proxy.close():', e);
          done();
        }
      });
    } catch (e) {
      console.error('[ProxyServer] Error during stop:', e);
    }
    console.log('[ProxyServer] stop() completed');
  }

  public setBreakpointRules(rules: BreakpointRule[]) {
    this.breakpointRules = rules;
  }

  public resolveBreakpoint(requestId: string, edited: PendingBreakpoint | null) {
    const resolve = this.pendingBreakpoints.get(requestId);
    if (resolve) {
      this.pendingBreakpoints.delete(requestId);
      resolve(edited);
      return true;
    }
    return false;
  }

  private matchesBreakpoint(
    url: string,
    method: string,
    phase: 'request' | 'response',
  ): BreakpointRule | undefined {
    return this.breakpointRules.find((rule) => {
      if (!rule.enabled) return false;
      if (rule.phase !== 'both' && rule.phase !== phase) return false;
      if (rule.methods.length > 0 && !rule.methods.includes(method.toUpperCase())) return false;
      try {
        return new RegExp(rule.urlPattern, 'i').test(url);
      } catch {
        return url.includes(rule.urlPattern);
      }
    });
  }

  private waitForBreakpointResolution(
    pending: PendingBreakpoint,
  ): Promise<PendingBreakpoint | null> {
    return new Promise((resolve) => {
      this.pendingBreakpoints.set(pending.id, resolve);
      this.sendToRenderer('proxy:breakpoint-hit', pending);
    });
  }

  public setIntercept(enabled: boolean) {
    console.log(
      `[Intercept] setIntercept(${enabled}), pending=${this.pendingRequests.size}, wsClients=${this.wss?.clients.size ?? 0}`,
    );
    this.isIntercepting = enabled;
    this.broadcastIntercept();
    if (!enabled) {
      console.log(`[Intercept] Resuming ${this.pendingRequests.size} held requests`);
      this.pendingRequests.forEach(({ proceed }) => proceed());
      this.pendingRequests.clear();
    }
  }

  public forwardRequest(id: string) {
    const entry = this.pendingRequests.get(id);
    if (entry) {
      entry.proceed();
      this.pendingRequests.delete(id);
      return true;
    }
    return false;
  }

  public dropRequest(id: string) {
    const entry = this.pendingRequests.get(id);
    if (entry) {
      entry.drop();
      this.pendingRequests.delete(id);
      return true;
    }
    return false;
  }

  private setupListeners() {
    this.proxy.onError((ctxOrErr: any, err?: any) => {
      // http-mitm-proxy might pass (ctx, err) or just (err) depending on version/context
      const error = err || ctxOrErr;
      const code = error?.code;
      if (
        code === 'ECONNRESET' ||
        code === 'HPE_INVALID_METHOD' ||
        code === 'HPE_INVALID_CONSTANT' ||
        error?.message === 'socket hang up'
      ) {
        return;
      }
      console.error('[ProxyServer Error]', error);
      if (ctxOrErr && ctxOrErr.clientToProxyRequest) {
        console.error(`[ProxyServer Error] URL: ${ctxOrErr.clientToProxyRequest.url}`);
      }
    });

    this.proxy.onConnect((req: any, socket: any, _head: any, callback: any) => {
      const hostUrl = req.url || '';
      console.log(`[ProxyServer Connect] ${hostUrl} (Host: ${req.headers.host})`);

      if (!hostUrl) {
        return callback();
      }

      const host = hostUrl.split(':')[0];
      const port = parseInt(hostUrl.split(':')[1]) || 443;

      // Check if this is a WebSocket upgrade request
      const isWebSocket = req.headers?.upgrade?.toLowerCase() === 'websocket';

      if (isWebSocket) {
        console.log(`[ProxyServer WS] WebSocket upgrade: ${hostUrl}`);
        const wsId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const wsUrl = `wss://${host}${req.url || ''}`;
        const wsPath = req.url || '/';

        // Send connection info to renderer
        this.sendToRenderer('ws:connect', {
          id: wsId,
          url: wsUrl,
          host: host,
          path: wsPath,
          status: 'connecting',
          startTime: Date.now(),
          messages: [],
          totalMessages: 0,
          clientBytesSent: 0,
          serverBytesSent: 0,
          requestHeaders: req.headers || {},
          responseHeaders: {},
        });

        const conn = net.connect({ port, host, allowHalfOpen: true }, () => {
          // Forward the CONNECT success to client
          socket.write('HTTP/1.1 200 Connection Established\r\n\r\n', 'utf-8', () => {
            // Now client will send WebSocket upgrade, forward everything

            let clientBuffer = Buffer.alloc(0);
            let serverBuffer = Buffer.alloc(0);

            // Capture server response headers (first response from server)
            let responseHeadersCaptured = false;
            let serverHeaderBuffer = '';

            conn.on('data', (data: Buffer) => {
              // Capture WebSocket frames
              const frameInfo = this.parseWebSocketFrame(data, 'server');
              if (frameInfo) {
                this.sendToRenderer('ws:message', {
                  id: `ws-msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                  connectionId: wsId,
                  direction: 'server',
                  data: frameInfo.isBinary
                    ? data.toString('base64')
                    : frameInfo.payload || data.toString('utf8'),
                  dataType: frameInfo.isBinary ? 'binary' : 'text',
                  size: data.length,
                  timestamp: Date.now(),
                });

                // Update connection stats
                this.sendToRenderer('ws:update', {
                  id: wsId,
                  totalMessages: frameInfo.isControl ? undefined : 1, // increment handled by renderer
                  serverBytesSent: data.length,
                });
              }

              if (!responseHeadersCaptured) {
                serverHeaderBuffer += data.toString('utf8');
                const headerEnd = serverHeaderBuffer.indexOf('\r\n\r\n');
                if (headerEnd !== -1) {
                  responseHeadersCaptured = true;
                  const headerStr = serverHeaderBuffer.substring(0, headerEnd);
                  const headers: Record<string, string> = {};
                  headerStr.split('\r\n').forEach((line) => {
                    const colonIdx = line.indexOf(':');
                    if (colonIdx > 0) {
                      headers[line.substring(0, colonIdx).trim().toLowerCase()] = line
                        .substring(colonIdx + 1)
                        .trim();
                    } else if (line.startsWith('HTTP/')) {
                      headers[':status'] = line.split(' ')[1] || '101';
                    }
                  });
                  this.sendToRenderer('ws:update', {
                    id: wsId,
                    status: 'connected',
                    responseHeaders: headers,
                  });
                }
              }

              socket.write(data);
            });

            socket.on('data', (data: Buffer) => {
              // Capture WebSocket frames
              const frameInfo = this.parseWebSocketFrame(data, 'client');
              if (frameInfo) {
                this.sendToRenderer('ws:message', {
                  id: `ws-msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                  connectionId: wsId,
                  direction: 'client',
                  data: frameInfo.isBinary
                    ? data.toString('base64')
                    : frameInfo.payload || data.toString('utf8'),
                  dataType: frameInfo.isBinary ? 'binary' : 'text',
                  size: data.length,
                  timestamp: Date.now(),
                });

                this.sendToRenderer('ws:update', {
                  id: wsId,
                  totalMessages: frameInfo.isControl ? undefined : 1,
                  clientBytesSent: data.length,
                });
              }

              conn.write(data);
            });

            conn.on('close', () => {
              this.sendToRenderer('ws:close', {
                id: wsId,
                endTime: Date.now(),
                status: 'closed',
              });
              socket.end();
            });

            socket.on('close', () => {
              this.sendToRenderer('ws:close', {
                id: wsId,
                endTime: Date.now(),
                status: 'closed',
              });
              conn.end();
            });

            conn.on('error', (err: any) => {
              if (err.code !== 'ECONNRESET') {
                console.error(`[ProxyServer WS] Server error:`, err);
              }
            });

            socket.on('error', (err: any) => {
              if (err.code !== 'ECONNRESET') {
                console.error(`[ProxyServer WS] Client error:`, err);
              }
            });
          });
        });

        conn.on('error', (err: any) => {
          if (err.code !== 'ECONNRESET') {
            console.error(`[ProxyServer WS] Connection error:`, err);
          }
          this.sendToRenderer('ws:close', {
            id: wsId,
            endTime: Date.now(),
            status: 'closed',
          });
          socket.destroy();
        });

        return; // Don't call callback(), we handle it manually
      }

      // Danh sách các domain bỏ qua giải mã SSL (bypassed domains)
      const bypassList = [
        'cloudflare.com',
        'challenges.cloudflare.com',
        'ai.cloudflare.com',
        'hcaptcha.com',
        'recaptcha.net',
        'google.com/recaptcha',
        'turnstile.cloudflare.com',
        'openai.com',
        'chatgpt.com',
        'google-analytics.com',
      ];

      const shouldBypass = bypassList.some(
        (domain) => host.endsWith(domain) || host.includes(domain),
      );

      if (shouldBypass) {
        console.log(`[ProxyServer Connect] Bypassing SSL decryption (tunneling) for: ${hostUrl}`);

        const conn = net.connect(
          {
            port,
            host,
            allowHalfOpen: true,
          },
          () => {
            conn.on('finish', () => {
              socket.destroy();
            });
            socket.on('close', () => {
              conn.end();
            });
            socket.write('HTTP/1.1 200 OK\r\n\r\n', 'utf-8', () => {
              conn.pipe(socket);
              socket.pipe(conn);
            });
          },
        );

        conn.on('error', (err: any) => {
          if (err.code !== 'ECONNRESET') {
            console.error(`[ProxyServer Connect Tunnel Error] Host: ${hostUrl}`, err);
          }
        });
        socket.on('error', (err: any) => {
          if (err.code !== 'ECONNRESET') {
            console.error(`[ProxyServer Connect Client Socket Error] Host: ${hostUrl}`, err);
          }
        });

        return; // Don't call callback(), we handle it via net tunnel
      }

      return callback();
    });

    this.proxy.onRequest(async (ctx: any, callback: any) => {
      const req = ctx.clientToProxyRequest;
      const method = req.method;
      const url = (ctx.isSSL ? 'https://' : 'http://') + req.headers.host + req.url;
      const requestId = Date.now().toString() + Math.random();
      ctx.requestId = requestId;

      // Systema intercept status endpoint
      if (!ctx.isSSL && req.url === '/systema-intercept-status') {
        ctx.proxyToClientResponse.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        });
        ctx.proxyToClientResponse.end(JSON.stringify({ intercepting: this.isIntercepting }));
        return;
      }

      // Setup Page Logic
      if (!ctx.isSSL && req.url && (req.url === '/ssl' || req.url.startsWith('/ssl/'))) {
        // CA Path (Default location for http-mitm-proxy)
        const caPath = path.join(process.cwd(), '.http-mitm-proxy', 'certs', 'ca.pem');

        if (req.url === '/ssl/download') {
          // Serve the file
          if (fs.existsSync(caPath)) {
            const cert = fs.readFileSync(caPath);
            ctx.proxyToClientResponse.writeHead(200, {
              'Content-Type': 'application/x-x509-ca-cert',
              'Content-Disposition': 'attachment; filename="systema-ca.pem"',
            });
            ctx.proxyToClientResponse.end(cert);
          } else {
            ctx.proxyToClientResponse.writeHead(404, { 'Content-Type': 'text/plain' });
            ctx.proxyToClientResponse.end('CA Certificate not found');
          }
          return callback();
        }

        // Get client IP for diagnostics
        const clientIP =
          req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';

        // Serve enhanced instructions page with diagnostics
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Systema Proxy Setup</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                  background: linear-gradient(135deg, #09090b 0%, #18181b 100%);
                  color: #fff; 
                  min-height: 100vh;
                  padding: 20px;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding-top: 40px;
                }
                h1 { 
                  font-size: 32px;
                  margin-bottom: 10px; 
                  color: #3b82f6;
                  text-align: center;
                }
                .subtitle {
                  text-align: center;
                  color: #a1a1aa;
                  margin-bottom: 30px;
                  font-size: 14px;
                }
                .success-badge {
                  background: #10b981;
                  color: white;
                  padding: 8px 16px;
                  border-radius: 20px;
                  font-size: 12px;
                  font-weight: bold;
                  display: inline-block;
                  margin-bottom: 30px;
                }
                .info-box {
                  background: #18181b;
                  border: 1px solid #27272a;
                  border-radius: 12px;
                  padding: 20px;
                  margin-bottom: 20px;
                }
                .info-box h3 {
                  color: #e4e4e7;
                  font-size: 16px;
                  margin-bottom: 12px;
                  display: flex;
                  align-items: center;
                }
                .info-box h3::before {
                  content: "✓";
                  background: #10b981;
                  color: white;
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  margin-right: 10px;
                  font-size: 14px;
                }
                .info-item {
                  display: flex;
                  justify-content: space-between;
                  padding: 8px 0;
                  border-bottom: 1px solid #27272a;
                  font-size: 14px;
                }
                .info-item:last-child {
                  border-bottom: none;
                }
                .info-item .label {
                  color: #a1a1aa;
                }
                .info-item .value {
                  color: #e4e4e7;
                  font-family: monospace;
                  font-weight: bold;
                }
                .step { 
                  background: #18181b;
                  padding: 20px;
                  border-radius: 12px;
                  border: 1px solid #27272a;
                  margin-bottom: 15px;
                }
                .step-number {
                  background: #3b82f6;
                  color: white;
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 14px;
                  margin-right: 10px;
                }
                .step strong { 
                  color: #e4e4e7;
                  font-size: 16px;
                  display: flex;
                  align-items: center;
                  margin-bottom: 10px;
                }
                .step p {
                  color: #a1a1aa;
                  line-height: 1.6;
                  margin-left: 38px;
                  font-size: 14px;
                }
                .btn { 
                  display: block;
                  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                  color: white;
                  padding: 16px 24px;
                  border-radius: 12px;
                  text-decoration: none;
                  font-weight: bold;
                  text-align: center;
                  transition: transform 0.2s, box-shadow 0.2s;
                  margin: 20px 0;
                  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }
                .btn:active { 
                  transform: scale(0.98);
                  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
                }
                .troubleshoot {
                  background: #27272a;
                  border-left: 4px solid #f59e0b;
                  padding: 15px;
                  border-radius: 8px;
                  margin-top: 20px;
                  font-size: 13px;
                  color: #d4d4d8;
                }
                .troubleshoot h4 {
                  color: #f59e0b;
                  margin-bottom: 8px;
                  font-size: 14px;
                }
                .troubleshoot ul {
                  margin-left: 20px;
                  line-height: 1.8;
                }
                .troubleshoot li {
                  color: #a1a1aa;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🎯 Systema Proxy</h1>
                <div class="subtitle">Mobile Device Setup</div>
                
                <center>
                  <span class="success-badge">✓ Connected Successfully</span>
                </center>

                <div class="info-box">
                  <h3>Connection Information</h3>
                  <div class="info-item">
                    <span class="label">Your IP Address:</span>
                    <span class="value">${clientIP}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Server:</span>
                    <span class="value">${req.headers.host}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Protocol:</span>
                    <span class="value">HTTP</span>
                  </div>
                </div>

                <div class="step">
                  <strong><span class="step-number">1</span>Download Certificate</strong>
                  <p>Click the button below to download the CA Certificate to your device.</p>
                </div>
                
                <a href="/ssl/download" class="btn">📥 Download CA Certificate</a>

                <div class="step">
                  <strong><span class="step-number">2</span>Install Certificate</strong>
                  <p><strong>Android:</strong> Settings → Security → Encryption & credentials → Install a certificate → CA certificate</p>
                  <p style="margin-top: 8px;"><strong>iOS:</strong> Settings → General → VPN & Device Management → Downloaded Profile → Install</p>
                </div>

                <div class="step">
                  <strong><span class="step-number">3</span>Configure Proxy</strong>
                  <p>Go to WiFi settings → Modify network → Proxy → Manual</p>
                  <p style="margin-top: 8px;">Hostname: <strong>${req.headers.host?.split(':')[0] || '192.168.101.189'}</strong></p>
                  <p>Port: <strong>8081</strong></p>
                </div>

                <div class="troubleshoot">
                  <h4>⚠️ Troubleshooting</h4>
                  <ul>
                    <li>Ensure both devices are on the same WiFi network</li>
                    <li>Check if router's AP Isolation is disabled</li>
                    <li>Try accessing in Incognito/Private browsing mode</li>
                    <li>Disable VPN on mobile device if enabled</li>
                  </ul>
                </div>
              </div>
            </body>
          </html>
        `;
        ctx.proxyToClientResponse.writeHead(200, { 'Content-Type': 'text/html' });
        ctx.proxyToClientResponse.end(html);
        return callback(); // Signal completion to http-mitm-proxy
      }

      const initiatorStackBase64 = req.headers['x-systema-initiator'];
      let initiator = null;
      if (initiatorStackBase64) {
        try {
          initiator = Buffer.from(initiatorStackBase64 as string, 'base64').toString('utf8');
          // Remove the header so the real server doesn't see it (though usually harmless)
          delete req.headers['x-systema-initiator'];
        } catch (e) {
          // Ignore errors
        }
      }

      cacheHeaders(requestId, req.headers);

      this.sendToRenderer('proxy:request', {
        id: requestId,
        method,
        url,
        headers: req.headers,
        timestamp: Date.now(),
        // Add flag so renderer knows this request is paused
        isIntercepted: this.isIntercepting,
        initiator: initiator, // Send initiator to renderer
      });

      const proceed = async () => {
        // Check request-phase breakpoint
        const reqRule = this.matchesBreakpoint(url, method, 'request');
        if (reqRule) {
          const pending: PendingBreakpoint = {
            id: requestId,
            phase: 'request',
            url,
            method,
            headers: req.headers as Record<string, string>,
          };
          const edited = await this.waitForBreakpointResolution(pending);
          if (edited === null) {
            // Drop
            ctx.proxyToClientResponse.writeHead(502, { 'Content-Type': 'text/plain' });
            ctx.proxyToClientResponse.end('Dropped by Systema breakpoint');
            return;
          }
          // Apply edits
          if (edited.headers) Object.assign(req.headers, edited.headers);
        }

        const requestChunks: any[] = [];
        ctx.onRequestData((_ctx: any, chunk: any, callback: any) => {
          requestChunks.push(chunk);
          return callback(null, chunk);
        });

        ctx.onRequestEnd(async (_ctx: any, callback: any) => {
          try {
            const buffer = Buffer.concat(requestChunks);
            const encodingHeader = req.headers['content-encoding'];
            const contentEncoding = (
              Array.isArray(encodingHeader) ? encodingHeader[0] : encodingHeader || ''
            ).toLowerCase();

            let body = '';
            let decompressionFailed = false;

            // Decompress request body if needed (same as response)
            if (contentEncoding === 'gzip') {
              try {
                body = zlib.gunzipSync(buffer).toString('utf8');
              } catch (e) {
                console.error('[Proxy] Failed to decompress gzip request:', e);
                decompressionFailed = true;
              }
            } else if (contentEncoding === 'br') {
              try {
                body = zlib.brotliDecompressSync(buffer).toString('utf8');
              } catch (e) {
                console.error('[Proxy] Failed to decompress brotli request:', e);
                decompressionFailed = true;
              }
            } else if (contentEncoding === 'deflate') {
              try {
                body = zlib.inflateSync(buffer).toString('utf8');
              } catch (e) {
                console.error('[Proxy] Failed to decompress deflate request:', e);
                decompressionFailed = true;
              }
            } else if (contentEncoding === 'zstd') {
              // Use @mongodb-js/zstd for decompression
              const firstBytes = buffer.slice(0, 16).toString('hex');
              console.log('[Proxy] ZSTD request debug:', {
                encoding: contentEncoding,
                size: buffer.length,
                firstBytes,
                contentType: req.headers['content-type'],
              });

              try {
                const decompressed = await decompress(buffer);
                body = Buffer.from(decompressed).toString('utf8');
                console.log(
                  '[Proxy] Successfully decompressed zstd request:',
                  body.length,
                  'bytes',
                );
                console.log('[Proxy] Decompressed content preview:', body.slice(0, 200));
              } catch (e) {
                console.error('[Proxy] ZSTD decompress failed:', e);
                decompressionFailed = true;
              }
            }

            // Fallback: try to decode as UTF-8 if decompression failed
            if (decompressionFailed) {
              // Try UTF-8 first
              try {
                body = buffer.toString('utf8');
                // Check if it looks like valid text
                if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/.test(body)) {
                  // Contains control characters, likely binary
                  // Show first 64 bytes as hex for debugging
                  const hexPreview =
                    buffer
                      .slice(0, 64)
                      .toString('hex')
                      .match(/.{1,2}/g)
                      ?.join(' ') || '';
                  body = `[Binary Content - ${buffer.length} bytes]\n\nFirst 64 bytes (hex):\n${hexPreview}\n\nContent-Type: ${req.headers['content-type'] || 'unknown'}`;
                }
              } catch {
                const hexPreview =
                  buffer
                    .slice(0, 64)
                    .toString('hex')
                    .match(/.{1,2}/g)
                    ?.join(' ') || '';
                body = `[Binary Content - ${buffer.length} bytes]\n\nFirst 64 bytes (hex):\n${hexPreview}`;
              }
            } else if (!body) {
              // No compression, try UTF-8
              try {
                body = buffer.toString('utf8');
                // Check if it looks like valid text
                if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/.test(body)) {
                  const hexPreview =
                    buffer
                      .slice(0, 64)
                      .toString('hex')
                      .match(/.{1,2}/g)
                      ?.join(' ') || '';
                  body = `[Binary Content - ${buffer.length} bytes]\n\nFirst 64 bytes (hex):\n${hexPreview}`;
                }
              } catch {
                const hexPreview =
                  buffer
                    .slice(0, 64)
                    .toString('hex')
                    .match(/.{1,2}/g)
                    ?.join(' ') || '';
                body = `[Binary Content - ${buffer.length} bytes]\n\nFirst 64 bytes (hex):\n${hexPreview}`;
              }
            }

            if (body) {
              this.sendToRenderer('proxy:request-body', {
                id: requestId,
                body,
                contentEncoding: contentEncoding || 'none',
              });
            }
          } catch (err) {
            console.error('Error processing request body:', err);
          }
          return callback();
        });

        return callback();
      };

      if (this.isIntercepting) {
        console.log(`[Intercept] Holding request ${requestId} ${method} ${url}`);
        await new Promise<void>((resolve, reject) => {
          this.pendingRequests.set(requestId, {
            proceed: resolve,
            drop: () => {
              ctx.proxyToClientResponse.writeHead(502, { 'Content-Type': 'text/plain' });
              ctx.proxyToClientResponse.end('Dropped by Systema intercept');
              reject(new Error('dropped'));
            },
          });
        })
          .then(() => {
            console.log(`[Intercept] Resuming request ${requestId}`);
            proceed();
          })
          .catch(() => {
            console.log(`[Intercept] Dropped request ${requestId}`);
          });
      } else {
        proceed();
      }
    });

    this.proxy.onResponse((ctx: any, callback: any) => {
      const req = ctx.clientToProxyRequest;
      const res = ctx.serverToProxyResponse;
      const url = (ctx.isSSL ? 'https://' : 'http://') + req.headers.host + req.url;

      this.sendToRenderer('proxy:response', {
        id: ctx.requestId,
        url,
        statusCode: res ? res.statusCode : 0,
        headers: res ? res.headers : {},
        timestamp: Date.now(),
      });

      const responseChunks: any[] = [];
      let isHtml = false;
      const contentType = res?.headers['content-type'] || '';
      if (contentType.toLowerCase().includes('text/html')) {
        isHtml = true;
        // Strip CSP headers to allow injection
        delete res.headers['content-security-policy'];
        delete res.headers['content-security-policy-report-only'];
      }

      ctx.onResponseData((_ctx: any, chunk: any, callback: any) => {
        if (isHtml) {
          // Buffer HTML to inject script
          responseChunks.push(chunk);
          return callback(null, null); // Don't send yet
        }
        responseChunks.push(chunk);
        return callback(null, chunk);
      });

      ctx.onResponseEnd(async (ctx: any, callback: any) => {
        const buffer = Buffer.concat(responseChunks);

        // --- Response-phase breakpoint ---
        const resRule = this.matchesBreakpoint(url, req.method, 'response');
        if (resRule) {
          const pending: PendingBreakpoint = {
            id: ctx.requestId + '_res',
            phase: 'response',
            url,
            method: req.method,
            headers: res?.headers as Record<string, string>,
            statusCode: res?.statusCode,
          };
          const edited = await this.waitForBreakpointResolution(pending);
          if (edited === null) {
            ctx.proxyToClientResponse.writeHead(502, { 'Content-Type': 'text/plain' });
            ctx.proxyToClientResponse.end('Dropped by Systema breakpoint');
            return callback();
          }
          if (edited.headers) Object.assign(res.headers, edited.headers);
          if (edited.statusCode) res.statusCode = edited.statusCode;
        }
        // ---------------------------------

        // --- Injection Logic for HTML ---
        if (isHtml) {
          try {
            const encodingHeader = res?.headers['content-encoding'];
            const contentEncoding = (
              Array.isArray(encodingHeader) ? encodingHeader[0] : encodingHeader || ''
            ).toLowerCase();

            let body = '';
            // Decompress if needed
            if (contentEncoding === 'gzip') {
              body = zlib.gunzipSync(buffer).toString('utf8');
            } else if (contentEncoding === 'br') {
              body = zlib.brotliDecompressSync(buffer).toString('utf8');
            } else if (contentEncoding === 'deflate') {
              body = zlib.inflateSync(buffer).toString('utf8');
            } else if (contentEncoding === 'zstd' && this.zstd) {
              body = Buffer.from(this.zstd.decompress(buffer)).toString('utf8');
            } else {
              body = buffer.toString('utf8');
            }

            if (res.headers['content-encoding']) {
              delete res.headers['content-encoding'];
            }

            // Inject Systema script
            const script = `<script>${INJECT_SCRIPT.replace('__PROXY_PORT__', String(this.port)).replace('__WS_PORT__', String(this.wsPort))}<\/script>`;
            const headIdx = body.indexOf('<head');
            const headEndIdx = headIdx !== -1 ? body.indexOf('>', headIdx) + 1 : -1;
            if (headEndIdx > 0) {
              body = body.slice(0, headEndIdx) + script + body.slice(headEndIdx);
            } else {
              body = script + body;
            }

            const newBuffer = Buffer.from(body, 'utf8');
            res.headers['content-length'] = newBuffer.length;
            ctx.proxyToClientResponse.write(newBuffer);
          } catch (e) {
            console.error('[Proxy] Injection failed:', e);
            ctx.proxyToClientResponse.write(buffer);
          }
        }
        // --------------------------------

        // Calculate size from chunks (approximate if modified, but we track original mostly)
        const size = buffer.length;
        const sizeStr = size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;

        try {
          const encodingHeader = res?.headers['content-encoding'];
          const contentEncoding = (
            Array.isArray(encodingHeader) ? encodingHeader[0] : encodingHeader || ''
          ).toLowerCase();

          let isBinaryResponse = false;
          let body = '';

          if (contentEncoding === 'gzip') {
            body = zlib.gunzipSync(buffer).toString('utf8');
          } else if (contentEncoding === 'br') {
            body = zlib.brotliDecompressSync(buffer).toString('utf8');
          } else if (contentEncoding === 'deflate') {
            body = zlib.inflateSync(buffer).toString('utf8');
          } else if (contentEncoding === 'zstd' && this.zstd) {
            try {
              body = (await this.zstd.decompress(buffer)).toString('utf8');
            } catch (e) {
              body = `[Systema Error] Failed to decompress zstd content: ${e instanceof Error ? e.message : String(e)}`;
            }
          } else if (!contentEncoding || contentEncoding === 'identity') {
            // Check for GZIP magic bytes (0x1f 0x8b) even if header is missing
            if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
              try {
                body = zlib.gunzipSync(buffer).toString('utf8');
              } catch (e) {
                body = `[Systema Error] Detected GZIP magic bytes but failed to decompress.\nError: ${e instanceof Error ? e.message : String(e)}`;
              }
            } else {
              // Binary detection: Check for NULL bytes in the first 1024 bytes
              const checkLen = Math.min(buffer.length, 1024);
              for (let i = 0; i < checkLen; i++) {
                if (buffer[i] === 0x00) {
                  isBinaryResponse = true;
                  break;
                }
              }

              if (isBinaryResponse) {
                // Return base64 encoded binary data
                body = buffer.toString('base64');
              } else {
                body = buffer.toString('utf8');
              }
            }
          } else {
            body = `[Systema Info] Content encoded with '${contentEncoding}' which is currently not supported for preview.`;
          }

          // --- AUTO-SAVE MEDIA ---
          const contentType = (res?.headers['content-type'] || '').toLowerCase();
          const isMedia =
            contentType.startsWith('image/') ||
            contentType.startsWith('video/') ||
            contentType.startsWith('audio/');

          if (isMedia && ctx.requestId) {
            const fileName = url.split('/').pop()?.split('?')[0] || 'media_file';
            mediaCache.save(ctx.requestId, buffer, contentType, fileName);
          }
          // ------------------------

          this.sendToRenderer('proxy:response-body', {
            id: ctx.requestId,
            body,
            size: sizeStr,
            isBinary: isBinaryResponse, // Map renamed variable
            contentType: res?.headers['content-type'] || '',
          });
        } catch (err) {
          console.error('Error processing response body:', err);
          // Return valid error message instead of raw binary
          const encodingHeader = res?.headers['content-encoding'];
          const contentEncoding = Array.isArray(encodingHeader)
            ? encodingHeader[0]
            : encodingHeader || 'unknown';

          this.sendToRenderer('proxy:response-body', {
            id: ctx.requestId,
            body: `[Systema Error] Failed to decode response body.\nEncoding: ${contentEncoding}\nError: ${err instanceof Error ? err.message : String(err)}`,
            size: sizeStr,
          });
        }
        return callback();
      });

      return callback();
    });
  }

  private sendToRenderer(channel: string, data: any) {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, data);
    }
  }

  /**
   * Parse a WebSocket frame and extract metadata
   * Returns null if the data doesn't look like a valid WebSocket frame
   */
  private parseWebSocketFrame(
    data: Buffer,
    _direction: 'client' | 'server',
  ): {
    isBinary: boolean;
    isControl: boolean;
    payload: string | null;
    opcode: number;
  } | null {
    try {
      if (data.length < 2) return null;

      const firstByte = data[0];
      const secondByte = data[1];

      // Check if this looks like a WebSocket frame (FIN + opcode in first byte)
      const fin = (firstByte & 0x80) !== 0;
      const opcode = firstByte & 0x0f;
      const masked = (secondByte & 0x80) !== 0;
      let payloadLength = secondByte & 0x7f;

      // Valid opcodes: 0=continuation, 1=text, 2=binary, 8=close, 9=ping, 10=pong
      const validOpcodes = [0, 1, 2, 8, 9, 10];
      if (!validOpcodes.includes(opcode)) return null;

      // If not FIN and not a valid continuation, might not be WebSocket
      if (!fin && opcode === 0 && data.length < 2) return null;

      let offset = 2;

      // Extended payload length
      if (payloadLength === 126) {
        if (data.length < 4) return null;
        payloadLength = data.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (data.length < 10) return null;
        // Read 64-bit, but cap to safe integer
        const hi = data.readUInt32BE(2);
        const lo = data.readUInt32BE(6);
        if (hi > 0) {
          // Payload too large, but still valid frame
          payloadLength = 65535; // cap it
        } else {
          payloadLength = lo;
        }
        offset = 10;
      }

      // Masking key (client frames are masked)
      let maskKey: Buffer | null = null;
      if (masked) {
        if (data.length < offset + 4) return null;
        maskKey = data.slice(offset, offset + 4);
        offset += 4;
      }

      // Extract payload
      const payloadEnd = Math.min(offset + payloadLength, data.length);
      let payload: Buffer;

      if (maskKey) {
        payload = Buffer.alloc(payloadEnd - offset);
        for (let i = offset; i < payloadEnd; i++) {
          payload[i - offset] = data[i] ^ maskKey[(i - offset) % 4];
        }
      } else {
        payload = data.slice(offset, payloadEnd);
      }

      const isBinary = opcode === 2;
      const isControl = opcode >= 8;

      let payloadStr: string | null = null;
      if (!isBinary && !isControl) {
        try {
          payloadStr = payload.toString('utf8');
        } catch {
          payloadStr = null;
        }
      } else if (isControl) {
        payloadStr = `[${['', '', '', '', '', '', '', '', 'CLOSE', 'PING', 'PONG'][opcode] || 'UNKNOWN'}]`;
        if (opcode === 8 && payload.length >= 2) {
          const code = payload.readUInt16BE(0);
          const reason = payload.length > 2 ? payload.slice(2).toString('utf8') : '';
          payloadStr = `[CLOSE ${code}${reason ? ': ' + reason : ''}]`;
        }
      }

      return { isBinary, isControl, payload: payloadStr, opcode };
    } catch {
      return null;
    }
  }
}
