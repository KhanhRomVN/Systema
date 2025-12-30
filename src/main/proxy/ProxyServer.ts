import { Proxy } from 'http-mitm-proxy';
import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';

export class ProxyServer extends EventEmitter {
  private proxy: any;
  private isRunning: boolean = false;
  private window: BrowserWindow | null = null;

  constructor() {
    super();
    const { Proxy } = require('http-mitm-proxy');
    this.proxy = new Proxy();

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
    this.proxy.onError((ctx: any, err: any, errorKind: string) => {
      const url = ctx && ctx.clientToProxyRequest ? ctx.clientToProxyRequest.url : '';
      const code = err?.code;

      // Suppress common network errors that are usually just noise
      if (code === 'ECONNRESET' || err?.message === 'socket hang up') {
        return;
      }

      console.error(`[ERROR] ${errorKind} on ${url}:`, err);
    });

    this.proxy.onRequest((ctx: any, callback: any) => {
      const req = ctx.clientToProxyRequest;
      const method = req.method;
      const url = (ctx.isSSL ? 'https://' : 'http://') + req.headers.host + req.url;

      this.sendToRenderer('proxy:request', {
        id: Date.now().toString() + Math.random(), // Simple ID
        method,
        url,
        headers: req.headers,
        timestamp: Date.now(),
      });

      ctx.onRequestData((ctx: any, chunk: any, callback: any) => {
        // chunk logic if needed, simplify for now to avoid huge IPC
        return callback(null, chunk);
      });

      return callback();
    });

    this.proxy.onResponse((ctx: any, callback: any) => {
      const req = ctx.clientToProxyRequest;
      const res = ctx.serverToProxyResponse;
      const url = (ctx.isSSL ? 'https://' : 'http://') + req.headers.host + req.url;

      this.sendToRenderer('proxy:response', {
        url,
        statusCode: res ? res.statusCode : 0,
        headers: res ? res.headers : {},
        timestamp: Date.now(),
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
