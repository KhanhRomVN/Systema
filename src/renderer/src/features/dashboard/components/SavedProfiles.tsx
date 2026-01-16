import { useState, useEffect } from 'react';
import { loadProfiles, deleteProfile, InspectorProfile } from '../../inspector/utils/profiles';
import { Trash2, FolderOpen, Clock, Database } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';

interface SavedProfilesProps {
  onLoadProfile: (profile: InspectorProfile) => void;
  appName?: string;
  appId?: string;
}

export function SavedProfiles({ onLoadProfile, appName, appId }: SavedProfilesProps) {
  const [profiles, setProfiles] = useState<InspectorProfile[]>([]);

  useEffect(() => {
    loadData();
  }, [appName, appId]);

  const loadData = () => {
    let all = loadProfiles();
    if (appId) {
      // Prefer filtering by appId
      all = all.filter((p) => (p.appId ? p.appId === appId : p.appName === appName));
    } else if (appName) {
      all = all.filter((p) => p.appName === appName);
    }
    setProfiles(all);
  };

  const handleDelete = (profileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this profile?')) {
      deleteProfile(profileId);
      loadData();
    }
  };

  if (profiles.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No saved profiles yet{appName ? ` for ${appName}` : ''}</p>
        <p className="text-sm mt-1">Save inspector sessions from the toolbar</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Database className="w-5 h-5" />
        Saved Profiles ({profiles.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            onClick={() => onLoadProfile(profile)}
            className="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 rounded-lg p-4 cursor-pointer transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white truncate">{profile.name}</h4>
                <p className="text-xs text-gray-400 truncate">{profile.appName}</p>
              </div>
              <button
                onClick={(e) => handleDelete(profile.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <span>{new Date(profile.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-4">
                <span>{profile.metadata.totalRequests} requests</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded',
                    profile.metadata.platform === 'web' && 'bg-blue-500/20 text-blue-400',
                    profile.metadata.platform === 'pc' && 'bg-purple-500/20 text-purple-400',
                    profile.metadata.platform === 'android' && 'bg-green-500/20 text-green-400',
                  )}
                >
                  {profile.metadata.platform || 'web'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
