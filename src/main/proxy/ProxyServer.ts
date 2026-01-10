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
    console.log('[ProxyServer] Constructor called');
    try {
      // Fix: Destructure Proxy and use new keyword
      const { Proxy } = require('http-mitm-proxy');
      console.log('[ProxyServer] http-mitm-proxy required:', typeof Proxy);
      this.proxy = new Proxy();
      console.log('[ProxyServer] this.proxy initialized:', !!this.proxy);

      // Initialize zstd
      try {
        const { ZstdInit } = require('@oneidentity/zstd-js');
        ZstdInit()
          .then(({ ZstdSimple }: any) => {
            this.zstd = ZstdSimple;
            console.log('[ProxyServer] Zstd loaded successfully');
          })
          .catch((err: any) => {
            console.error('[ProxyServer] Zstd init failed:', err);
          });
      } catch (e) {
        console.error(
          '[ProxyServer] Failed to require zstd-js (Normal if not installed yet, but required for DeepSeek):',
          e,
        );
      }

      this.proxy.use(Proxy.gunzip);
    } catch (e) {
      console.error('[ProxyServer] CRITICAL CONSTRUCTOR ERROR:', e);
    }
  }

  public setWindow(window: BrowserWindow) {
    this.window = window;
  }

  public start(port: number = 8081) {
    if (this.isRunning) return;

    this.setupListeners();

    this.proxy.listen({ port }, () => {
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
    this.proxy.onError((err: any) => {
      const code = err?.code;
      if (code === 'ECONNRESET' || err?.message === 'socket hang up') {
        return;
      }
    });

    this.proxy.onRequest((ctx: any, callback: any) => {
      const req = ctx.clientToProxyRequest;
      const method = req.method;
      const url = (ctx.isSSL ? 'https://' : 'http://') + req.headers.host + req.url;
      const requestId = Date.now().toString() + Math.random();
      ctx.requestId = requestId;

      if (url.includes('deepseek.com')) {
        console.log(`[Proxy] Request to ${url}`);
        console.log('[Proxy] Headers:', JSON.stringify(req.headers, null, 2));
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
        console.log('[Proxy] Stripped CSP for:', url);
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

            // Inject Script just before <head> or <body>
            // Simple injection: Append to <head>
            if (body.includes('<head>')) {
              body = body.replace('<head>', `<head><script>${INJECT_SCRIPT}</script>`);
              console.log('[Proxy] Injected script into <head> for:', url);
            } else {
              // Fallback
              body = `<script>${INJECT_SCRIPT}</script>` + body;
              console.log('[Proxy] Injected script (fallback) for:', url);
            }

            // Re-compress? For simplicity, we send uncompressed and update headers
            // Removing content-encoding header ensures browser treats it as plain/identity
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
      // Log only request events to avoid spam (response has same ID)
      if (channel === 'proxy:request') {
        console.log(
          `[ProxyServer] 📤 Sending ${channel} to window ID: ${this.window.id}, Title: "${this.window.getTitle()}"`,
        );
      }
      this.window.webContents.send(channel, data);
    } else {
      console.error(`[ProxyServer] ❌ Cannot send event - window unavailable: ${channel}`);
    }
  }
}
