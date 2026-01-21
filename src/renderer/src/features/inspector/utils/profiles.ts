import { InspectorFilter } from '../../inspector/components/Network/NetworkFilter';
import { NetworkRequest } from '../../inspector/types';

export interface InspectorProfile {
  id: string;
  name: string;
  appId?: string;
  appName: string;
  timestamp: number;
  requests: NetworkRequest[];
  filters: InspectorFilter;
  selectedRequestId: string | null;
  metadata: {
    totalRequests: number;
    httpsCount: number;
    platform?: 'web' | 'pc' | 'android';
  };
}

const STORAGE_KEY = 'systema-inspector-profiles';

export function loadProfiles(): InspectorProfile[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load profiles:', error);
    return [];
  }
}

export function saveProfiles(profiles: InspectorProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch (error) {
    console.error('Failed to save profiles:', error);
  }
}

export function createProfile(
  name: string,
  appName: string,
  appId: string | undefined,
  requests: NetworkRequest[],
  filters: InspectorFilter,
  selectedRequestId: string | null,
  platform?: 'web' | 'pc' | 'android',
): InspectorProfile {
  const profile: InspectorProfile = {
    id: Date.now().toString(),
    name,
    appName,
    appId,
    timestamp: Date.now(),
    requests,
    filters,
    selectedRequestId,
    metadata: {
      totalRequests: requests.length,
      httpsCount: requests.filter((r) => r.protocol === 'https').length,
      platform,
    },
  };

  const profiles = loadProfiles();
  profiles.unshift(profile); // Add to beginning
  saveProfiles(profiles);

  return profile;
}

export function deleteProfile(profileId: string): void {
  const profiles = loadProfiles();
  const filtered = profiles.filter((p) => p.id !== profileId);
  saveProfiles(filtered);
}

export function renameProfile(profileId: string, newName: string): void {
  const profiles = loadProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  if (profile) {
    profile.name = newName;
    saveProfiles(profiles);
  }
}

export function loadProfile(profileId: string): InspectorProfile | null {
  const profiles = loadProfiles();
  return profiles.find((p) => p.id === profileId) || null;
}

export function deleteProfilesByAppId(appId: string): void {
  const profiles = loadProfiles();
  const filtered = profiles.filter((p) => p.appId !== appId);
  saveProfiles(filtered);
}
