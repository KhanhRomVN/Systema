import { Proxy } from 'http-mitm-proxy';
import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';

export class ProxyServer extends EventEmitter {
  private proxy: any;
  private isRunning: boolean = false;
  private window: BrowserWindow | null = null;
  private zstd: any = null;

  constructor() {
    super();
    const { Proxy } = require('http-mitm-proxy');
    this.proxy = new Proxy();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    try {
      this.zstd = require('@mongodb-js/zstd');
    } catch (e) {
      console.warn('[ProxyServer] Failed to load @mongodb-js/zstd', e);
    }

    // HACK: Monkey-patch http-mitm-proxy to suppress excessive logging of expected network errors.
    // The library unconditionally logs 'ECONNRESET' and 'socket hang up' which are common with VS Code.

    // 1. Override _onError to suppress generic "HTTPS_CLIENT_ERROR" and similar.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.proxy._onError = (kind: string, ctx: any, err: any) => {
      const isSocketHangUp = err?.code === 'ECONNRESET' || err?.message === 'socket hang up';
      if (!isSocketHangUp) {
        console.error(kind);
        console.error(err);
      }

      // Replicate original logic from http-mitm-proxy
      // Accessing private onErrorHandlers via any cast
      const onErrorHandlers = (this.proxy as any).onErrorHandlers || [];
      onErrorHandlers.forEach((handler: any) => handler(ctx, err, kind));

      if (ctx) {
        const ctxOnErrorHandlers = ctx.onErrorHandlers || [];
        ctxOnErrorHandlers.forEach((handler: any) => handler(ctx, err, kind));

        if (ctx.proxyToClientResponse && !ctx.proxyToClientResponse.headersSent) {
          ctx.proxyToClientResponse.writeHead(504, 'Proxy Error');
        }
        if (ctx.proxyToClientResponse && !ctx.proxyToClientResponse.finished) {
          ctx.proxyToClientResponse.end(`${kind}: ${err}`, 'utf8');
        }
      }
    };

    // 2. Override _onSocketError to suppress "Got ECONNRESET on ..." logs.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.proxy._onSocketError = (socketDescription: string, err: any) => {
      const isSocketHangUp =
        err?.errno === -54 || err?.code === 'ECONNRESET' || err?.message === 'socket hang up';
      if (!isSocketHangUp) {
        this.proxy._onError(`${socketDescription}_ERROR`, null, err);
      }
    };

    // 3. Override _onHttpServerConnectData to intercept and suppress "Socket error:" logs.
    // This method attaches an anonymous error listener that logs aggressively. We intercept socket.on to wrap it.
    const originalOnHttpServerConnectData = this.proxy._onHttpServerConnectData;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.proxy._onHttpServerConnectData = (req: any, socket: any, head: any) => {
      const originalSocketOn = socket.on;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.on = function (event: string, listener: (...args: any[]) => void) {
        if (event === 'error') {
          const listenerStr = listener.toString();
          // Identify the specific anonymous listener by its content
          if (listenerStr.includes('Socket error:') && listenerStr.includes('console.error')) {
            const wrappedListener = (err: any) => {
              const isSocketHangUp =
                err?.code === 'ECONNRESET' || err?.message === 'socket hang up';
              if (!isSocketHangUp) {
                listener(err);
              }
            };
            // @ts-ignore
            return originalSocketOn.call(this, event, wrappedListener);
          }
        }
        // @ts-ignore
        // eslint-disable-next-line prefer-rest-params
        return originalSocketOn.apply(this, arguments);
      };

      return originalOnHttpServerConnectData.call(this.proxy, req, socket, head);
    };
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

  private setupListeners() {
    this.proxy.onError((err: any) => {
      const code = err?.code;

      // Suppress common network errors that are usually just noise
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

      this.sendToRenderer('proxy:request', {
        id: requestId,
        method,
        url,
        headers: req.headers,
        timestamp: Date.now(),
      });
      console.log(`[ProxyServer] Intercepted REQUEST: ${method} ${url}`);

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
      ctx.onResponseData((ctx: any, chunk: any, callback: any) => {
        responseChunks.push(chunk);
        return callback(null, chunk);
      });

      ctx.onResponseEnd(async (ctx: any, callback: any) => {
        const buffer = Buffer.concat(responseChunks);
        // Calculate size from chunks
        const size = responseChunks.reduce((acc, chunk) => acc + chunk.length, 0);
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
      // console.log(`[ProxyServer] Sending IO to renderer: ${channel}`);
      this.window.webContents.send(channel, data);
    } else {
      console.warn('[ProxyServer] Cannot send to renderer (window destroyed or null)');
    }
  }
}
