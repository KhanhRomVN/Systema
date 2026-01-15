import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

export interface UserApp {
  id: string;
  name: string;
  url?: string; // For web apps
  executablePath?: string; // For PC apps (future)
  mode: 'browser' | 'electron';
  platform: 'web' | 'pc' | 'android';
  icon?: string;
  category?: string;
  tags?: string[];
  description?: string;
  createdAt: number;
}

const DEFAULT_APPS: UserApp[] = [
  // PC Apps
  {
    id: 'vscode',
    name: 'VS Code',
    description: 'Launches VS Code with proxy settings configured.',
    mode: 'electron', // Acts as native/electron
    platform: 'pc',
    createdAt: Date.now(),
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    description: 'Launches Antigravity IDE with proxy settings configured.',
    mode: 'electron',
    platform: 'pc',
    createdAt: Date.now(),
  },
  // Web Apps
  {
    id: 'deepseek-browser',
    name: 'DeepSeek (Real Browser)',
    description: 'Launches an external Chrome browser pointing to DeepSeek.',
    platform: 'web',
    mode: 'browser',
    url: 'https://chat.deepseek.com',
    createdAt: Date.now(),
  },
  {
    id: 'deepseek-electron',
    name: 'DeepSeek (Electron Window)',
    description: 'Launches an internal Electron window pointing to DeepSeek.',
    platform: 'web',
    mode: 'electron',
    url: 'https://chat.deepseek.com',
    createdAt: Date.now(),
  },
  {
    id: 'claude-web',
    name: 'Claude (Web)',
    description: 'Launches a trusted browser pointing to Claude.',
    platform: 'web',
    mode: 'electron',
    url: 'https://claude.ai',
    createdAt: Date.now(),
  },
  {
    id: 'chatgpt-browser',
    name: 'ChatGPT (Real Browser)',
    description: 'Launches an external Chrome browser pointing to ChatGPT.',
    platform: 'web',
    mode: 'browser',
    url: 'https://chatgpt.com',
    createdAt: Date.now(),
  },
  {
    id: 'chatgpt-electron',
    name: 'ChatGPT (Electron Window)',
    description: 'Launches an internal Electron window pointing to ChatGPT.',
    platform: 'web',
    mode: 'electron',
    url: 'https://chatgpt.com',
    createdAt: Date.now(),
  },
  {
    id: 'google-aistudio',
    name: 'Google AI Studio',
    description: 'Launches a trusted browser pointing to Google AI Studio.',
    platform: 'web',
    mode: 'browser',
    url: 'https://aistudio.google.com/prompts/new_chat',
    createdAt: Date.now(),
  },
  {
    id: 'gemini-browser',
    name: 'Gemini (Real Browser)',
    description: 'Launches an external Chrome browser pointing to Gemini.',
    platform: 'web',
    mode: 'browser',
    url: 'https://gemini.google.com/app?hl=vi',
    createdAt: Date.now(),
  },
  {
    id: 'gemini-electron',
    name: 'Gemini (Electron Window)',
    description: 'Launches an internal Electron window pointing to Gemini.',
    platform: 'web',
    mode: 'electron',
    url: 'https://gemini.google.com/app?hl=vi',
    createdAt: Date.now(),
  },
  {
    id: 'lmarena-browser',
    name: 'LMArena (Real Browser)',
    description: 'Launches an external Chrome browser pointing to LMArena.',
    platform: 'web',
    mode: 'browser',
    url: 'https://lmarena.ai/vi/c/new?mode=direct',
    createdAt: Date.now(),
  },
  {
    id: 'lmarena-electron',
    name: 'LMArena (Electron Window)',
    description: 'Launches an internal Electron window pointing to LMArena.',
    platform: 'web',
    mode: 'electron',
    url: 'https://lmarena.ai/vi/c/new?mode=direct',
    createdAt: Date.now(),
  },
];

class UserAppStore {
  private path: string;
  private apps: UserApp[] = [];

  constructor() {
    this.path = path.join(app.getPath('userData'), 'user-apps.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.path)) {
        const data = fs.readFileSync(this.path, 'utf8');
        this.apps = JSON.parse(data);
      } else {
        // Seed default apps if file doesn't exist
        this.apps = DEFAULT_APPS;
        this.save();
      }
    } catch (error) {
      console.error('[UserAppStore] Failed to load apps:', error);
      this.apps = [];
    }
  }

  private save() {
    try {
      const dir = path.dirname(this.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.path, JSON.stringify(this.apps, null, 2));
    } catch (error) {
      console.error('[UserAppStore] Failed to save apps:', error);
    }
  }

  public getAllApps(): UserApp[] {
    return this.apps;
  }

  public getAppById(id: string): UserApp | undefined {
    return this.apps.find((app) => app.id === id);
  }

  public addApp(appData: Omit<UserApp, 'id' | 'createdAt'>): UserApp {
    const newApp: UserApp = {
      ...appData,
      id: randomUUID(),
      createdAt: Date.now(),
    };
    this.apps.push(newApp);
    this.save();
    return newApp;
  }

  public updateApp(id: string, updates: Partial<UserApp>): UserApp | null {
    const index = this.apps.findIndex((app) => app.id === id);
    if (index === -1) return null;

    this.apps[index] = { ...this.apps[index], ...updates };
    this.save();
    return this.apps[index];
  }

  public deleteApp(id: string): boolean {
    const initialLength = this.apps.length;
    this.apps = this.apps.filter((app) => app.id !== id);
    if (this.apps.length !== initialLength) {
      this.save();
      return true;
    }
    return false;
  }
}

export const userAppStore = new UserAppStore();
