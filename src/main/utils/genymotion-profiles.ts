import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { randomUUID } from 'crypto';

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

const PROFILES_FILE = 'genymotion-profiles.json';

interface ProfilesData {
  version: string;
  profiles: GenymotionProfile[];
}

/**
 * Get path to profiles storage file
 */
function getProfilesPath(): string {
  const profilesDir = path.join(app.getPath('userData'), 'profiles');
  fs.mkdirSync(profilesDir, { recursive: true });
  return path.join(profilesDir, PROFILES_FILE);
}

/**
 * Load profiles from storage
 */
export function loadProfiles(): GenymotionProfile[] {
  const profilesPath = getProfilesPath();

  if (!fs.existsSync(profilesPath)) {
    // Create with default profiles
    const defaultProfiles = getDefaultProfiles();
    saveProfiles(defaultProfiles);
    return defaultProfiles;
  }

  try {
    const data = fs.readFileSync(profilesPath, 'utf-8');
    const profilesData: ProfilesData = JSON.parse(data);
    return profilesData.profiles || [];
  } catch (error) {
    console.error('Failed to load profiles:', error);
    return [];
  }
}

/**
 * Save profiles to storage
 */
export function saveProfiles(profiles: GenymotionProfile[]): boolean {
  const profilesPath = getProfilesPath();

  const profilesData: ProfilesData = {
    version: '1.0',
    profiles,
  };

  try {
    fs.writeFileSync(profilesPath, JSON.stringify(profilesData, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to save profiles:', error);
    return false;
  }
}

/**
 * Get default pre-configured profiles
 */
export function getDefaultProfiles(): GenymotionProfile[] {
  return [
    {
      id: randomUUID(),
      name: 'Android 11 - Proxy Ready',
      description: 'Pre-configured profile with proxy and Frida ready for HTTPS tracking',
      vmName: 'Systema_Android11_Default',
      androidVersion: '11.0',
      architecture: 'x86_64',
      screenSize: '1080x1920',
      deviceModel: 'Google Pixel 5',
      autoProxy: true,
      autoFrida: true,
      customSettings: {
        dpi: 420,
        ram: 2048,
        diskSize: 8192,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: randomUUID(),
      name: 'Android 13 - Security Testing',
      description: 'Advanced profile for security testing with all tools pre-installed',
      vmName: 'Systema_Android13_Security',
      androidVersion: '13.0',
      architecture: 'x86_64',
      screenSize: '1080x2400',
      deviceModel: 'Google Pixel 7',
      autoProxy: true,
      autoFrida: true,
      customSettings: {
        dpi: 440,
        ram: 4096,
        diskSize: 16384,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: randomUUID(),
      name: 'Android 9 - Compatibility',
      description: 'Older Android version for compatibility testing',
      vmName: 'Systema_Android9_Compat',
      androidVersion: '9.0',
      architecture: 'x86',
      screenSize: '720x1280',
      deviceModel: 'Generic Device',
      autoProxy: false,
      autoFrida: false,
      customSettings: {
        dpi: 320,
        ram: 1024,
        diskSize: 4096,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
}

/**
 * Get profile by ID
 */
export function getProfileById(profileId: string): GenymotionProfile | null {
  const profiles = loadProfiles();
  return profiles.find((p) => p.id === profileId) || null;
}

/**
 * Create new profile
 */
export function createProfile(
  profileData: Omit<GenymotionProfile, 'id' | 'createdAt' | 'updatedAt'>,
): GenymotionProfile {
  const profiles = loadProfiles();

  const newProfile: GenymotionProfile = {
    ...profileData,
    id: randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  profiles.push(newProfile);
  saveProfiles(profiles);

  return newProfile;
}

/**
 * Update existing profile
 */
export function updateProfile(
  profileId: string,
  updates: Partial<Omit<GenymotionProfile, 'id' | 'createdAt'>>,
): GenymotionProfile | null {
  const profiles = loadProfiles();
  const index = profiles.findIndex((p) => p.id === profileId);

  if (index === -1) {
    return null;
  }

  profiles[index] = {
    ...profiles[index],
    ...updates,
    updatedAt: Date.now(),
  };

  saveProfiles(profiles);
  return profiles[index];
}

/**
 * Delete profile
 */
export function deleteProfile(profileId: string): boolean {
  const profiles = loadProfiles();
  const filteredProfiles = profiles.filter((p) => p.id !== profileId);

  if (filteredProfiles.length === profiles.length) {
    return false; // Profile not found
  }

  saveProfiles(filteredProfiles);
  return true;
}

/**
 * Get all profiles
 */
export function getAllProfiles(): GenymotionProfile[] {
  return loadProfiles();
}

/**
 * Validate profile data
 */
export function validateProfile(profile: Partial<GenymotionProfile>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!profile.name || profile.name.trim().length === 0) {
    errors.push('Profile name is required');
  }

  if (!profile.vmName || profile.vmName.trim().length === 0) {
    errors.push('VM name is required');
  }

  if (!profile.androidVersion) {
    errors.push('Android version is required');
  }

  if (!profile.architecture) {
    errors.push('Architecture is required');
  } else if (!['x86', 'x86_64', 'arm', 'arm64'].includes(profile.architecture)) {
    errors.push('Invalid architecture. Must be x86, x86_64, arm, or arm64');
  }

  if (profile.customSettings) {
    if (profile.customSettings.ram && profile.customSettings.ram < 512) {
      errors.push('RAM must be at least 512MB');
    }

    if (profile.customSettings.diskSize && profile.customSettings.diskSize < 2048) {
      errors.push('Disk size must be at least 2GB');
    }

    if (
      profile.customSettings.dpi &&
      (profile.customSettings.dpi < 120 || profile.customSettings.dpi > 640)
    ) {
      errors.push('DPI must be between 120 and 640');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Export profile to JSON file
 */
export function exportProfile(profileId: string, exportPath: string): boolean {
  const profile = getProfileById(profileId);
  if (!profile) {
    return false;
  }

  try {
    fs.writeFileSync(exportPath, JSON.stringify(profile, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to export profile:', error);
    return false;
  }
}

/**
 * Import profile from JSON file
 */
export function importProfile(importPath: string): GenymotionProfile | null {
  try {
    const data = fs.readFileSync(importPath, 'utf-8');
    const profileData = JSON.parse(data);

    // Validate imported data
    const validation = validateProfile(profileData);
    if (!validation.valid) {
      console.error('Invalid profile data:', validation.errors);
      return null;
    }

    // Create new profile with imported data (generate new ID)
    const newProfile = createProfile({
      name: profileData.name,
      description: profileData.description || '',
      vmName: profileData.vmName,
      androidVersion: profileData.androidVersion,
      architecture: profileData.architecture,
      screenSize: profileData.screenSize,
      deviceModel: profileData.deviceModel,
      autoProxy: profileData.autoProxy ?? false,
      autoFrida: profileData.autoFrida ?? false,
      customSettings: profileData.customSettings || {
        dpi: 420,
        ram: 2048,
        diskSize: 8192,
      },
    });

    return newProfile;
  } catch (error) {
    console.error('Failed to import profile:', error);
    return null;
  }
}
