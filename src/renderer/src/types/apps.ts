export type AppMode = 'browser' | 'electron';
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
