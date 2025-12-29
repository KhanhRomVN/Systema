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
  }

  public setWindow(window: BrowserWindow) {
    this.window = window;
  }

  public start(port: number = 8081) {
    if (this.isRunning) return;

    this.setupListeners();

    this.proxy.listen({ port }, () => {
      console.log(`Proxy server listening on port ${port}`);
      this.isRunning = true;
      this.emit('started', port);
    });
  }

  public stop() {
    if (!this.isRunning) return;
    this.proxy.close();
    this.isRunning = false;
    console.log('Proxy server stopped');
  }

  private setupListeners() {
    this.proxy.onError((ctx: any, err: any, errorKind: string) => {
      const url = ctx && ctx.clientToProxyRequest ? ctx.clientToProxyRequest.url : '';
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
