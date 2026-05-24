import React, { useState, useEffect, useMemo } from 'react';
import { UserApp, AppPlatform, AppMode, MobileEmulator } from '../../../types/apps';
import { AddAppModal } from '../modal/AddAppModal';
import { AddPcAppModal } from '../modal/AddPcAppModal';
import { AddCliModal } from '../modal/AddCliModal';
import {
  X,
  Plus,
  Globe,
  Monitor,
  Smartphone,
  Search,
  Trash2,
  Square,
  Terminal,
  History,
  FolderOpen,
} from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { loadProfiles, InspectorProfile, deleteProfilesByAppId } from '../../../utils/profiles';

interface TargetSelectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeAppId: string;
  activeAppName: string;
  onSelectApp: (
    appName: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron' | 'native',
  ) => Promise<void>;
  onStopSession: () => Promise<void>;
  onLoadProfile: (profile: InspectorProfile) => void;
  platform?: 'web' | 'pc' | 'android';
}

const getFaviconUrl = (url?: string) => {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch (e) {
    return null;
  }
};

export const TargetSelectorDrawer: React.FC<TargetSelectorDrawerProps> = ({
  isOpen,
  onClose,
  activeAppId,
  activeAppName,
  onSelectApp,
  onStopSession,
  onLoadProfile,
  platform: activeSessionPlatform,
}) => {
  const [activeTab, setActiveTab] = useState<AppPlatform>('web');
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [apps, setApps] = useState<UserApp[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showAddWebModal, setShowAddWebModal] = useState(false);
  const [showAddPcModal, setShowAddPcModal] = useState(false);
  const [showAddMobileModal, setShowAddMobileModal] = useState(false);
  const [showAddCliModal, setShowAddCliModal] = useState(false);
  
  // Web form states
  const [newWebName, setNewWebName] = useState('');
  const [newWebUrl, setNewWebUrl] = useState('');

  // Mobile/Devices
  const [_connectedDevices, setConnectedDevices] = useState<MobileEmulator[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);

  const fetchApps = async () => {
    try {
      const allApps = await window.api.invoke('apps:get-all');
      setApps(allApps);
    } catch (e) {
      console.error('Failed to fetch apps', e);
    }
  };

  const fetchConnectedDevices = async () => {
    try {
      const devices = await window.api.invoke('mobile:detect-emulators');
      setConnectedDevices(devices);
    } catch (e) {
      console.error('Failed to fetch connected devices', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchApps();
      fetchConnectedDevices();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(fetchConnectedDevices, 5000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isOpen]);

  // Profiles
  const profiles = useMemo(() => loadProfiles(), [isOpen, isLaunching]);
  
  const getAppProfile = (appId: string, appName: string) => {
    return profiles.find((p) => p.appId === appId || p.appName === appName) || null;
  };

  const handleAddCustomWeb = async () => {
    if (!newWebName || !newWebUrl) return;
    try {
      const newApp = await window.api.invoke('apps:create', {
        name: newWebName,
        url: newWebUrl,
        mode: 'browser',
        platform: 'web',
        category: '',
        tags: [],
      });
      setShowAddWebModal(false);
      setNewWebName('');
      setNewWebUrl('');
      await fetchApps();
      if (newApp && newApp.id) {
        setSelectedAppId(newApp.id);
      }
    } catch (e) {
      console.error('Failed to create web app', e);
    }
  };

  const handleAddPcApp = async (app: {
    name: string;
    url?: string;
    executablePath?: string;
    mode: AppMode;
    platform: AppPlatform;
    icon?: string;
  }) => {
    try {
      await window.api.invoke('apps:create', {
        ...app,
        category: 'Development',
        tags: [],
      });
      await fetchApps();
    } catch (e) {
      console.error('Failed to create app', e);
    }
  };

  const handleDeleteApp = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this custom target?')) {
      try {
        await window.api.invoke('apps:delete', id);
        deleteProfilesByAppId(id);
        if (selectedAppId === id) {
          setSelectedAppId('');
        }
        fetchApps();
      } catch (e) {
        console.error('Failed to delete app', e);
      }
    }
  };

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesTab = app.platform === activeTab;
      const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [apps, activeTab, searchQuery]);

  const selectedApp = useMemo(() => {
    return apps.find((app) => app.id === selectedAppId) || null;
  }, [apps, selectedAppId]);

  const handleLaunchApp = async (mode?: 'browser' | 'electron' | 'native') => {
    if (!selectedApp) return;
    setIsLaunching(true);
    try {
      await onSelectApp(selectedApp.id, 'http://127.0.0.1:8081', selectedApp.url, mode);
      onClose();
    } catch (e) {
      console.error('Failed to launch', e);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleAndroidConnect = async () => {
    if (!selectedApp || selectedApp.platform !== 'android') return;
    setIsLaunching(true);
    try {
      const vmName = selectedApp.emulatorSerial;
      const emulators = await window.api.invoke('mobile:detect-emulators');
      // Check if emulator is running
      emulators.some((e: any) => {
        const storedName = (vmName || '').toLowerCase();
        const runningName = (e.name || '').toLowerCase();
        const runningSerial = (e.serial || '').toLowerCase();
        return (
          runningName === storedName ||
          runningSerial === storedName ||
          (storedName && runningName.includes(storedName))
        );
      });

      await onSelectApp(selectedApp.id, 'http://127.0.0.1:8081', selectedApp.url, 'electron');
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLaunching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-in drawer container */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-[420px] bg-dialog-background border-l border-divider shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300',
        )}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-divider flex items-center justify-between bg-table-headerBg shrink-0">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Select Target
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-sidebar-itemHover rounded-lg transition-all"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Current Active Tracking Session Card */}
        {activeAppId && (
          <div className="p-4 border-b border-divider bg-emerald-500/5 flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-emerald-400">TRACKING ACTIVE</span>
              </div>
              <button
                onClick={async () => {
                  if (confirm('Stop the current tracking session?')) {
                    await onStopSession();
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 rounded-md transition-all active:scale-95"
              >
                <Square className="w-3 h-3 fill-current" />
                Stop
              </button>
            </div>
            <div className="flex items-center gap-2.5 bg-background/50 border border-divider/40 p-2.5 rounded-lg">
              <div className="w-9 h-9 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-sm font-bold shrink-0">
                {activeAppName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-text-primary truncate">{activeAppName}</div>
                <div className="text-[10px] text-text-secondary capitalize mt-0.5">
                  Platform: {activeSessionPlatform || 'Unknown'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Platform tabs */}
        <div className="grid grid-cols-4 border-b border-divider bg-table-headerBg/50 shrink-0">
          {(['web', 'pc', 'android', 'cli'] as AppPlatform[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedAppId('');
              }}
              className={cn(
                'flex flex-col items-center justify-center py-2.5 text-[11px] font-bold border-b-2 gap-1 transition-all',
                activeTab === tab
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover/20',
              )}
            >
              {tab === 'web' && <Globe className="w-4 h-4" />}
              {tab === 'pc' && <Monitor className="w-4 h-4" />}
              {tab === 'android' && <Smartphone className="w-4 h-4" />}
              {tab === 'cli' && <Terminal className="w-4 h-4" />}
              <span className="capitalize">{tab === 'web' ? 'Web' : tab}</span>
            </button>
          ))}
        </div>

        {/* Search & Actions Bar */}
        <div className="p-3 border-b border-divider bg-table-headerBg/20 flex gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search targets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input-background border border-input-border-default rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary focus:border-primary/50 outline-none"
            />
          </div>
          <button
            onClick={() => {
              if (activeTab === 'web') setShowAddWebModal(true);
              else if (activeTab === 'pc') setShowAddPcModal(true);
              else if (activeTab === 'android') setShowAddMobileModal(true);
              else if (activeTab === 'cli') setShowAddCliModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg border border-primary/20 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        {/* Scrollable list of targets */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {filteredApps.map((app) => {
            const initials = app.name.slice(0, 2).toUpperCase();
            const isSelected = selectedAppId === app.id;
            const profile = getAppProfile(app.id, app.name);

            return (
              <div key={app.id} className="flex flex-col gap-2">
                <button
                  onClick={() => setSelectedAppId(isSelected ? '' : app.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all relative group',
                    isSelected
                      ? 'bg-primary/5 border-primary/40'
                      : 'bg-sidebar-itemHover/20 border-divider/40 hover:bg-sidebar-itemHover/40',
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden border border-divider">
                    {app.platform === 'web' && getFaviconUrl(app.url) ? (
                      <img
                        src={getFaviconUrl(app.url)!}
                        alt={app.name}
                        className="w-full h-full object-cover p-1"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : app.icon && app.platform === 'pc' ? (
                      <img
                        src={`media://${app.icon}`}
                        alt={app.name}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-primary text-xs truncate">
                        {app.name}
                      </span>
                      <button
                        onClick={(e) => handleDeleteApp(app.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-text-secondary hover:text-red-400 transition-opacity"
                        title="Delete Target"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-[10px] text-text-secondary truncate mt-0.5">
                      {app.url || (app.platform === 'cli' ? 'CLI Command' : 'Native App')}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>

                {/* Selected target actions section */}
                {isSelected && (
                  <div className="p-3 bg-secondary/10 border border-divider/40 rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-200">
                    {/* Saved Profile Info */}
                    {profile && (
                      <div className="p-2.5 bg-background/50 rounded-lg border border-divider/50 space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary">
                          <History className="w-3.5 h-3.5 text-primary" />
                          LAST PROFILE SESSION
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-text-primary">
                          <span>Saved: {new Date(profile.timestamp).toLocaleString()}</span>
                          <span className="font-bold text-primary">{profile.metadata.totalRequests} reqs</span>
                        </div>
                        <button
                          onClick={() => {
                            onLoadProfile(profile);
                            alert(`Restored ${profile.metadata.totalRequests} requests from last session!`);
                          }}
                          className="w-full py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1 active:scale-95"
                        >
                          <FolderOpen className="w-3 h-3" />
                          Restore Last Session Data
                        </button>
                      </div>
                    )}

                    {/* Launch / Connect Action Button */}
                    <div className="flex gap-2">
                      {app.platform === 'android' ? (
                        <button
                          onClick={handleAndroidConnect}
                          disabled={isLaunching}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-button-text font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          Connect & Inspect Device
                        </button>
                      ) : app.platform === 'cli' ? (
                        <button
                          onClick={() => handleLaunchApp('native')}
                          disabled={isLaunching}
                          className="w-full py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-button-text font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          Run in Terminal
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleLaunchApp('browser')}
                            disabled={isLaunching}
                            className="flex-1 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-button-text font-bold text-xs rounded-lg flex items-center justify-center gap-1 shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            Launch Browser
                          </button>
                          <button
                            onClick={() => handleLaunchApp('electron')}
                            disabled={isLaunching}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-button-text font-bold text-xs rounded-lg flex items-center justify-center gap-1 shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                          >
                            <Monitor className="w-3.5 h-3.5" />
                            Launch App
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredApps.length === 0 && (
            <div className="text-center text-text-secondary py-12 text-xs">
              No targets found for {activeTab}. Add one to start.
            </div>
          )}
        </div>
      </div>

      {/* Add Web Site Custom Inline Modal */}
      {showAddWebModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-dialog-background border border-divider rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-divider">
              <h3 className="text-sm font-bold text-text-primary">Add Custom Website</h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-text-secondary mb-1">NAME</label>
                <input
                  type="text"
                  value={newWebName}
                  onChange={(e) => setNewWebName(e.target.value)}
                  placeholder="e.g. My API Server"
                  className="w-full bg-input-background border border-input-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-text-secondary mb-1">URL</label>
                <input
                  type="text"
                  value={newWebUrl}
                  onChange={(e) => setNewWebUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-input-background border border-input-border-default rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="p-3 border-t border-divider flex justify-end gap-2 bg-sidebar-itemHover/20">
              <button
                onClick={() => setShowAddWebModal(false)}
                className="px-3 py-1.5 rounded text-xs font-bold text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomWeb}
                disabled={!newWebName || !newWebUrl}
                className="px-4 py-1.5 rounded text-xs font-bold bg-primary text-button-text hover:bg-primary/95 disabled:opacity-50"
              >
                Add Website
              </button>
            </div>
          </div>
        </div>
      )}

      {/* External modals */}
      <AddPcAppModal
        isOpen={showAddPcModal}
        onClose={() => setShowAddPcModal(false)}
        onAdd={handleAddPcApp}
      />

      <AddAppModal
        isOpen={showAddMobileModal}
        onClose={() => setShowAddMobileModal(false)}
        onAdd={handleAddPcApp}
        existingApps={apps.filter((app) => app.platform === 'android')}
      />

      <AddCliModal
        isOpen={showAddCliModal}
        onClose={() => setShowAddCliModal(false)}
        onAdd={handleAddPcApp}
      />
    </>
  );
};
