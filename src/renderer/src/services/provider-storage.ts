// Provider Storage Service for persisting provider configurations

import { ProviderConfig } from '../features/inspector/types/provider-types';

const STORAGE_KEY_PREFIX = 'systema_provider_';
const LAST_USED_KEY = `${STORAGE_KEY_PREFIX}last_used`;
const PROFILES_KEY = `${STORAGE_KEY_PREFIX}profiles`;

export class ProviderStorage {
  /**
   * Save provider configuration
   */
  static saveConfig(config: ProviderConfig): void {
    try {
      localStorage.setItem(LAST_USED_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save provider config:', error);
    }
  }

  /**
   * Load last used provider configuration
   */
  static loadConfig(): ProviderConfig | null {
    try {
      const stored = localStorage.getItem(LAST_USED_KEY);
      if (stored) {
        return JSON.parse(stored) as ProviderConfig;
      }
    } catch (error) {
      console.error('Failed to load provider config:', error);
    }
    return null;
  }

  /**
   * Clear saved configuration
   */
  static clearConfig(): void {
    try {
      localStorage.removeItem(LAST_USED_KEY);
    } catch (error) {
      console.error('Failed to clear provider config:', error);
    }
  }

  /**
   * Save a named profile
   */
  static saveProfile(name: string, config: ProviderConfig): void {
    try {
      const profiles = this.loadProfiles();
      profiles[name] = config;
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  }

  /**
   * Load all saved profiles
   */
  static loadProfiles(): Record<string, ProviderConfig> {
    try {
      const stored = localStorage.getItem(PROFILES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
    return {};
  }

  /**
   * Delete a profile
   */
  static deleteProfile(name: string): void {
    try {
      const profiles = this.loadProfiles();
      delete profiles[name];
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  }

  /**
   * Load a specific profile
   */
  static loadProfile(name: string): ProviderConfig | null {
    const profiles = this.loadProfiles();
    return profiles[name] || null;
  }
}
