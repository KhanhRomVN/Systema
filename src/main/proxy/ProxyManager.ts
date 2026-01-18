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
    for (const session of this.sessions.values()) {
      session.server.setWindow(window);
    }
  }

  async createSession(id: string): Promise<number> {
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
    }
  }

  stopAll() {
    for (const [id, session] of this.sessions) {
      session.server.stop();
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

  async forwardRequest(requestId: string): Promise<boolean> {
    for (const session of this.sessions.values()) {
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
