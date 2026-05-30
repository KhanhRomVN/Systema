import { ProxyServer, BreakpointRule, PendingBreakpoint } from './ProxyServer';
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
    console.log(`[ProxyManager] createSession called for id="${id}", existing sessions: [${[...this.sessions.keys()].join(',')}]`);
    if (this.sessions.has(id)) {
      const existingPort = this.sessions.get(id)!.port;
      console.log(`[ProxyManager] Session already exists for "${id}", returning port ${existingPort}`);
      return existingPort;
    }

    const maxRetries = 5;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const startPort = 8081 + attempt * 10; // Spread out retry ranges
      try {
        const port = await findAvailablePort(startPort);
        console.log(`[ProxyManager] Attempt ${attempt + 1}: Found available port: ${port} for "${id}"`);
        const server = new ProxyServer();

        if (this.mainWindow) {
          server.setWindow(this.mainWindow);
        }

        await server.start(port);
        console.log(`[ProxyManager] Server started on port ${port} for "${id}"`);

        this.sessions.set(id, {
          id,
          port,
          server,
        });

        return port;
      } catch (err: any) {
        lastError = err;
        console.error(`[ProxyManager] Attempt ${attempt + 1} failed:`, err.message);
        // If it's not EADDRINUSE, don't retry
        if (!err.message?.includes('EADDRINUSE')) {
          throw err;
        }
        // Otherwise try next port range
      }
    }

    throw lastError || new Error('Failed to create session after max retries');
  }

  getSession(id: string): ProxySession | undefined {
    return this.sessions.get(id);
  }

  async stopSession(id: string) {
    console.log(`[ProxyManager] stopSession called for "${id}"`);
    const session = this.sessions.get(id);
    if (session) {
      console.log(`[ProxyManager] Stopping server on port ${session.port} for "${id}"`);
      await session.server.stop();
      this.sessions.delete(id);
      console.log(`[ProxyManager] Session "${id}" stopped and removed`);
    } else {
      console.log(`[ProxyManager] No session found for "${id}"`);
    }
  }

  async stopAll() {
    console.log(`[ProxyManager] stopAll called, sessions: [${[...this.sessions.keys()].join(',')}]`);
    const stopPromises: Promise<void>[] = [];
    for (const [id, session] of this.sessions) {
      stopPromises.push(
        session.server.stop().catch((err) => {
          console.error(`[ProxyManager] Error stopping session ${id}:`, err);
        })
      );
    }
    await Promise.all(stopPromises);
    this.sessions.clear();
    console.log('[ProxyManager] stopAll completed, all sessions cleared');
  }

  // Forward methods to specific session
  setIntercept(id: string, enabled: boolean) {
    const session = this.sessions.get(id);
    console.log(`[ProxyManager] setIntercept id="${id}" enabled=${enabled} found=${!!session} sessions=[${[...this.sessions.keys()].join(',')}]`);
    if (session) {
      session.server.setIntercept(enabled);
      return true;
    }
    return false;
  }

  setInterceptAll(enabled: boolean) {
    console.log(`[ProxyManager] setInterceptAll enabled=${enabled} sessions=[${[...this.sessions.keys()].join(',')}]`);
    for (const session of this.sessions.values()) {
      session.server.setIntercept(enabled);
    }
    return true;
  }

  setBreakpointRules(rules: BreakpointRule[]) {
    for (const session of this.sessions.values()) {
      session.server.setBreakpointRules(rules);
    }
  }

  resolveBreakpoint(requestId: string, edited: PendingBreakpoint | null): boolean {
    for (const session of this.sessions.values()) {
      if (session.server.resolveBreakpoint(requestId, edited)) return true;
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
