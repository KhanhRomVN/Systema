export type AppMode = 'browser' | 'electron' | 'native';
export type AppPlatform = 'web' | 'pc' | 'android';

export interface UserApp {
  id: string;
  name: string;
  url?: string;
  executablePath?: string;
  mode: AppMode;
  platform: AppPlatform;
  icon?: string;
  category?: string;
  tags?: string[];
  description?: string;
  createdAt: number;
}

export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  initials: string;
  color: string; // Tailwind bg color class
  proxyPort: string;
  platform: AppPlatform;
  mode?: AppMode;
  url?: string;
  isCustom?: boolean;
}

export interface DiscoveredApp {
  name: string;
  exec: string;
  icon?: string;
  description?: string;
  path: string;
}
