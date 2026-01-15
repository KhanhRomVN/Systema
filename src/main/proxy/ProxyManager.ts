import { ProxyServer } from './ProxyServer';
import { findAvailablePort } from '../utils/net';
import { BrowserWindow } from 'electron';

interface ProxySession {
  id: string; // usually appId
  port: number;
  server: ProxyServer;
}

export class ProxyManager {
  private sessions: Map<string, ProxySession> = new Map();
  private mainWindow: BrowserWindow | null = null;

  constructor() {}

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
    // Update existing proxies if any (though usually this is called early)
    for (const session of this.sessions.values()) {
      session.server.setWindow(window);
    }
  }

  async createSession(id: string): Promise<number> {
    // If session exists, return existing port
    if (this.sessions.has(id)) {
      return this.sessions.get(id)!.port;
    }

    const port = await findAvailablePort(8081);
    const server = new ProxyServer();

    if (this.mainWindow) {
      server.setWindow(this.mainWindow);
    }

    await server.start(port);

    this.sessions.set(id, {
      id,
      port,
      server,
    });

    console.log(`[ProxyManager] Created session ${id} on port ${port}`);
    return port;
  }

  getSession(id: string): ProxySession | undefined {
    return this.sessions.get(id);
  }

  async stopSession(id: string) {
    const session = this.sessions.get(id);
    if (session) {
      session.server.stop();
      this.sessions.delete(id);
      console.log(`[ProxyManager] Stopped session ${id}`);
    }
  }

  stopAll() {
    for (const [id, session] of this.sessions) {
      session.server.stop();
      console.log(`[ProxyManager] Stopped session ${id}`);
    }
    this.sessions.clear();
  }

  // Forward methods to specific session
  setIntercept(id: string, enabled: boolean) {
    const session = this.sessions.get(id);
    if (session) {
      session.server.setIntercept(enabled);
      return true;
    }
    return false;
  }

  // Forward/Drop requests usually come with a requestId that might need
  // to imply which session it belongs to.
  // However, currently the ProxyServer emits events to the main window.
  // The inspector likely needs to know which proxy emitted the event.
  // For now, let's assume the request ID is unique enough or the frontend knows.
  // Actually, we probably need to iterate all proxies to find the request?
  // OR, the frontend sends the proxyId/appId along with the action.

  // For simplicity MVP, let's just try to apply the action to ALL proxies
  // or find which one has the request pending.
  // Since `forwardRequest` returns a promise/boolean, we can try them.

  async forwardRequest(requestId: string): Promise<boolean> {
    for (const session of this.sessions.values()) {
      // We'd ideally check if this session has this request,
      // but ProxyServer doesn't expose a "hasRequest" method easily without modification.
      // But calling forwardRequest on a non-existent ID usually just does nothing or returns false.
      const result = await session.server.forwardRequest(requestId);
      if (result) return true;
    }
    return false;
  }

  async dropRequest(requestId: string): Promise<boolean> {
    for (const session of this.sessions.values()) {
      const result = await session.server.dropRequest(requestId);
      if (result) return true;
    }
    return false;
  }
}
