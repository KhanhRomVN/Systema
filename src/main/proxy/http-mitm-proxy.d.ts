declare module 'http-mitm-proxy' {
  import { IncomingMessage, ServerResponse } from 'http';
  import { Buffer } from 'buffer';

  interface RequestContext {
    clientToProxyRequest: IncomingMessage;
    proxyToClientResponse: ServerResponse;
    serverToProxyResponse?: IncomingMessage;
    isSSL: boolean;
    onRequestData: (
      fn: (ctx: RequestContext, chunk: Buffer, callback: (err: any, chunk: Buffer) => void) => void,
    ) => void;
    onResponseData: (
      fn: (ctx: RequestContext, chunk: Buffer, callback: (err: any, chunk: Buffer) => void) => void,
    ) => void;
  }

  interface ProxyOptions {
    port?: number;
    sslCaDir?: string;
  }

  interface Proxy {
    onError: (fn: (ctx: RequestContext | null, err: Error, errorKind: string) => void) => void;
    onRequest: (fn: (ctx: RequestContext, callback: (err?: any) => void) => void) => void;
    onResponse: (fn: (ctx: RequestContext, callback: (err?: any) => void) => void) => void;
    listen: (options: ProxyOptions, callback?: () => void) => void;
    close: () => void;
  }

  function createProxy(): Proxy;
  export { createProxy as Proxy };
  export const Proxy: any; // Fallback
}
