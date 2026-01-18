import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import { INJECT_SCRIPT } from './injection';
import * as zlib from 'zlib'; // Ensure zlib is imported for decompression

export class ProxyServer extends EventEmitter {
  private proxy: any;
  private isRunning: boolean = false;
  private window: BrowserWindow | null = null;
  private zstd: any = null;
  private isIntercepting: boolean = false;
  // Map of requestId -> callback to resume request
  private pendingRequests: Map<string, () => void> = new Map();

  constructor() {
    super();
    try {
      // Fix: Destructure Proxy and use new keyword
      const { Proxy } = require('http-mitm-proxy');
      this.proxy = new Proxy();

      // Initialize zstd
      try {
        const { ZstdInit } = require('@oneidentity/zstd-js');
        ZstdInit()
          .then(({ ZstdSimple }: any) => {
            this.zstd = ZstdSimple;
          })
          .catch(() => {});
      } catch (e) {}

      this.proxy.use(Proxy.gunzip);
    } catch (e) {}
  }

  public setWindow(window: BrowserWindow) {
    this.window = window;
  }

  public start(port: number = 8081) {
    if (this.isRunning) return;

    this.setupListeners();

    this.proxy.listen({ port, host: '0.0.0.0' }, () => {
      this.isRunning = true;
      this.emit('started', port);
    });
  }

  public stop() {
    if (!this.isRunning) return;
    this.proxy.close();
    this.isRunning = false;
  }

  public setIntercept(enabled: boolean) {
    this.isIntercepting = enabled;
    if (!enabled) {
      this.pendingRequests.forEach((resume) => resume());
      this.pendingRequests.clear();
    }
  }

  public forwardRequest(id: string) {
    const resume = this.pendingRequests.get(id);
    if (resume) {
      resume();
      this.pendingRequests.delete(id);
      return true;
    }
    return false;
  }

  public dropRequest(id: string) {
    const resume = this.pendingRequests.get(id);
    if (resume) {
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
      if (code === 'ECONNRESET' || error?.message === 'socket hang up') {
        return;
      }
      console.error('[ProxyServer Error]', error);
    });

    this.proxy.onRequest((ctx: any, callback: any) => {
      const req = ctx.clientToProxyRequest;
      const method = req.method;
      const url = (ctx.isSSL ? 'https://' : 'http://') + req.headers.host + req.url;
      const requestId = Date.now().toString() + Math.random();
      ctx.requestId = requestId;

      // Setup Page Logic
      if (!ctx.isSSL && req.url && (req.url === '/ssl' || req.url.startsWith('/ssl/'))) {
        const path = require('path');
        const fs = require('fs');

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
        } catch (e) {}
      }

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

      const proceed = () => {
        const requestChunks: any[] = [];
        ctx.onRequestData((ctx: any, chunk: any, callback: any) => {
          requestChunks.push(chunk);
          return callback(null, chunk);
        });

        ctx.onRequestEnd((ctx: any, callback: any) => {
          try {
            const body = Buffer.concat(requestChunks).toString('utf8');
            if (body) {
              this.sendToRenderer('proxy:request-body', {
                id: requestId,
                body,
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
        // Store the proceed function
        this.pendingRequests.set(requestId, proceed);

        // Notify renderer that this specific request is waiting for action
        // (Actually 'proxy:request' with isIntercepted=true is enough for now)
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

      ctx.onResponseData((ctx: any, chunk: any, callback: any) => {
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
              // @oneidentity/zstd-js decompression
              body = Buffer.from(this.zstd.decompress(buffer)).toString('utf8');
            } else {
              body = buffer.toString('utf8');
            }

            if (res.headers['content-encoding']) {
              delete res.headers['content-encoding'];
            }
            // Update Content-Length
            const newBuffer = Buffer.from(body, 'utf8');
            res.headers['content-length'] = newBuffer.length;

            // Write modified data to client
            ctx.proxyToClientResponse.write(newBuffer);
          } catch (e) {
            console.error('[Proxy] Injection failed:', e);
            // Fallback: send original buffer
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
          const zlib = require('zlib');

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
}
