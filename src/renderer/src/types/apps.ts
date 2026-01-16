export type AppMode = 'browser' | 'electron' | 'native';
export type AppPlatform = 'web' | 'pc' | 'android';
export type EmulatorType = 'genymotion' | 'waydroid';

export interface MobileEmulator {
  type: EmulatorType;
  serial: string;
  name: string;
  ip: string;
  adbPort: number;
  androidVersion: string;
  architecture: string;
  status: 'running' | 'offline' | 'booting';
}

export interface GenymotionProfile {
  id: string;
  name: string;
  description: string;
  vmName: string;
  androidVersion: string;
  architecture: string;
  screenSize: string;
  deviceModel: string;
  autoProxy: boolean;
  autoFrida: boolean;
  customSettings: {
    dpi: number;
    ram: number;
    diskSize: number;
  };
  createdAt: number;
  updatedAt: number;
}

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
  // Mobile-specific fields
  packageName?: string; // Android package name
  emulatorSerial?: string; // Assigned emulator
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
