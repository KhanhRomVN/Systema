import React, { useState, useEffect, useRef } from 'react';
import { UserApp, AppPlatform, AppMode, MobileEmulator } from '../../types/apps'; // Updated import path
import { AddAppModal } from './components/AddAppModal';
import { Plus, Globe, Monitor, Smartphone, Search, Trash2, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SavedProfiles } from './components/SavedProfiles';
import { InspectorProfile, deleteProfilesByAppId } from '../inspector/utils/profiles';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface DashboardProps {
  onSelect: (
    appName: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron',
  ) => void;
  onLoadProfile?: (profile: InspectorProfile) => void;
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

const Dashboard: React.FC<DashboardProps> = ({ onSelect, onLoadProfile }) => {
  const [activeTab, setActiveTab] = useState<AppPlatform>('web');
  const [activeAppId, setActiveAppId] = useState<string>('');
  const [apps, setApps] = useState<UserApp[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPcAddModal, setShowPcAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Device State
  const [connectedDevices, setConnectedDevices] = useState<MobileEmulator[]>([]);

  // Track previous tab to prevent infinite loops
  const prevTabRef = useRef<AppPlatform>(activeTab);

  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');

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
    fetchApps();
    fetchConnectedDevices();

    // Poll for devices every 5 seconds
    const interval = setInterval(fetchConnectedDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const appsInTab = apps.filter((app) => app.platform === activeTab);
    const currentAppValid = appsInTab.find((app) => app.id === activeAppId);

    if (!currentAppValid && appsInTab.length > 0) {
      setActiveAppId(appsInTab[0].id);
    } else if (appsInTab.length === 0) {
      setActiveAppId('');
    }

    prevTabRef.current = activeTab;
  }, [activeTab, apps]); // Removed activeAppId from dependencies to prevent infinite loop

  const handleAddCustomApp = async () => {
    if (!newItemName || !newItemUrl) return;

    try {
      const newApp = await window.api.invoke('apps:create', {
        name: newItemName,
        url: newItemUrl,
        mode: 'browser',
        platform: 'web',
        category: '',
        tags: [],
      });
      setShowAddModal(false);
      // Reset form
      setNewItemName('');
      setNewItemUrl('');
      await fetchApps();
      if (newApp && newApp.id) {
        setActiveAppId(newApp.id);
      }
    } catch (e) {
      console.error('Failed to create app', e);
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
      setShowPcAddModal(false);
      fetchApps();
    } catch (e) {
      console.error('Failed to create app', e);
    }
  };

  const handleDeleteApp = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this custom app?')) {
      try {
        await window.api.invoke('apps:delete', id);
        // Cascade delete profiles
        deleteProfilesByAppId(id);
        fetchApps();
      } catch (e) {
        console.error('Failed to delete app', e);
      }
    }
  };

  const filteredApps = apps.filter((app) => {
    const matchesTab = app.platform === activeTab;
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const selectedApp = apps.find((app) => app.id === activeAppId);

  const handleLaunch = (mode?: 'browser' | 'electron') => {
    if (!selectedApp) return;
    onSelect(selectedApp.id, 'http://127.0.0.1:8081', selectedApp.url, mode);
  };

  const handleAndroidConnect = async () => {
    if (!selectedApp || selectedApp.platform !== 'android') return;

    try {
      // Just check if it's running
      // If it's a physical device (no "launch" needed), just connect?
      // Actually standard logic: launch app implies ensure it's inspected.

      const vmName = selectedApp.emulatorSerial;

      // Check if running
      const emulators = await window.api.invoke('mobile:detect-emulators');
      const isRunning = emulators.some((e: any) => {
        // Logic same as backend fuzzy match
        const storedName = (vmName || '').toLowerCase();
        const runningName = (e.name || '').toLowerCase();
        const runningSerial = (e.serial || '').toLowerCase();

        if (runningName === storedName || runningSerial === storedName) return true;
        if (storedName && runningName.includes(storedName)) return true; // Loose match
        return false;
      });

      if (isRunning || !vmName) {
        handleLaunch('electron');
      } else {
        // If it has a vmName but not running, maybe it's a Genymotion VM we can launch?
        // The backend handles launching if we call 'app:launch' (native launch logic)
        // But here we want to warn user?
        // Actually `onSelect` update `DashboardContainer` which uses `useAppLauncher` to call `app:launch`.
        // So just calling `handleLaunch` is enough, backend will try to launch VM if needed.
        handleLaunch('electron');
      }
    } catch (e) {
      console.error('Failed to check emulator status', e);
    }
  };

  return (
    <div className="flex h-full w-full bg-gray-950 text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-96 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Header/Tabs */}
        <div className="p-4 border-b border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Systema
            </h2>
            <div className="text-xs text-gray-500 px-2 py-1 rounded bg-gray-800">v0.1.0</div>
          </div>

          <div className="flex p-1 bg-gray-800 rounded-lg">
            {(['web', 'pc', 'android'] as AppPlatform[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 flex items-center justify-center py-2 rounded-md text-sm font-medium transition-all duration-200',
                  activeTab === tab
                    ? 'bg-gray-700 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50',
                )}
              >
                {tab === 'web' && <Globe className="w-4 h-4 mr-1.5" />}
                {tab === 'pc' && <Monitor className="w-4 h-4 mr-1.5" />}
                {tab === 'android' && <Smartphone className="w-4 h-4 mr-1.5" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {activeTab === 'web' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full flex items-center justify-center space-x-2 p-3 rounded-lg border border-dashed border-gray-700 text-gray-400 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5 transition-all duration-200 group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Add Website</span>
            </button>
          )}

          {activeTab === 'pc' && (
            <button
              onClick={() => setShowPcAddModal(true)}
              className="w-full flex items-center justify-center space-x-2 p-3 rounded-lg border border-dashed border-gray-700 text-gray-400 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5 transition-all duration-200 group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Add Application</span>
            </button>
          )}

          {activeTab === 'android' && (
            <button
              onClick={() => setShowPcAddModal(true)}
              className="w-full flex items-center justify-center space-x-2 p-3 rounded-lg border border-dashed border-gray-700 text-gray-400 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5 transition-all duration-200 group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Add Mobile App or Device</span>
            </button>
          )}

          {filteredApps.map((app) => {
            const faviconUrl = getFaviconUrl(app.url);
            const initials = app.name.slice(0, 2).toUpperCase();

            // Check formatted device mapping
            const connectedDevice =
              app.platform === 'android'
                ? connectedDevices.find((d) => {
                    const stored = (app.emulatorSerial || '').toLowerCase();
                    if (!stored) return false;

                    // Check name or serial
                    if (d.name.toLowerCase() === stored) return true;
                    if (d.serial.toLowerCase() === stored) return true;
                    if (d.name.toLowerCase().includes(stored)) return true; // Loose match
                    return false;
                  })
                : null;

            return (
              <div
                key={app.id}
                onClick={() => setActiveAppId(app.id)}
                className={cn(
                  'group flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border border-transparent relative',
                  activeAppId === app.id
                    ? 'bg-gray-800 border-gray-700 shadow-lg'
                    : 'hover:bg-gray-800/50',
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-inner overflow-hidden relative bg-gray-600 text-white',
                  )}
                >
                  {faviconUrl ? (
                    <>
                      <img
                        src={faviconUrl}
                        alt={app.name}
                        className="w-full h-full object-cover p-1"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-inherit -z-10">
                        {initials}
                      </span>
                    </>
                  ) : app.icon && app.platform === 'pc' ? (
                    <img
                      src={`media://${app.icon}`}
                      alt={app.name}
                      className="w-full h-full object-contain p-1"
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
                    <div className="font-medium truncate text-gray-200">{app.name}</div>
                    {/* Allow deleting custom apps (simpler - assume anything not seeded is custom for now, 
                        BUT better to check existence in default list if we cared, 
                        or user can delete anything they want since it's just local config now) */}
                    <button
                      onClick={(e) => handleDeleteApp(app.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="text-xs text-gray-500 truncate">
                      {app.mode === 'browser'
                        ? 'Real Browser'
                        : app.mode === 'electron'
                          ? 'Electron Window'
                          : app.platform === 'android'
                            ? 'Mobile App'
                            : 'Native App'}
                    </div>

                    {/* Device Badge */}
                    {app.platform === 'android' && connectedDevice && (
                      <div
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1',
                          connectedDevice.type === 'physical'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : connectedDevice.type === 'waydroid'
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : 'bg-pink-500/20 text-pink-400 border border-pink-500/30', // Genymotion
                        )}
                      >
                        {connectedDevice.type === 'physical' && <Smartphone className="w-2 h-2" />}
                        {connectedDevice.type === 'waydroid' && <Monitor className="w-2 h-2" />}
                        {connectedDevice.type === 'genymotion' && <Zap className="w-2 h-2" />}
                        {connectedDevice.type === 'physical'
                          ? 'Real Device'
                          : connectedDevice.type === 'waydroid'
                            ? 'Waydroid'
                            : 'Genymotion'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredApps.length === 0 && (
            <div className="text-center text-gray-500 py-8 text-sm">No apps found</div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative bg-gradient-to-br from-gray-900 to-gray-950 overflow-y-auto">
        {selectedApp ? (
          <div className="flex-1 flex flex-col items-center justify-start p-12 animate-in fade-in duration-500 pt-20">
            <div className="max-w-4xl w-full text-center">
              <div className="relative inline-block mb-8 group">
                <div
                  className={cn(
                    'w-32 h-32 rounded-3xl flex items-center justify-center text-5xl font-bold shadow-2xl transition-transform duration-300 group-hover:scale-105 overflow-hidden bg-gray-800 text-white',
                  )}
                >
                  {getFaviconUrl(selectedApp.url) ? (
                    <img
                      src={getFaviconUrl(selectedApp.url)!}
                      alt={selectedApp.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : selectedApp.icon && selectedApp.platform === 'pc' ? (
                    <img
                      src={`media://${selectedApp.icon}`}
                      alt={selectedApp.name}
                      className="w-full h-full object-contain p-4"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : selectedApp.icon && selectedApp.platform === 'pc' ? (
                    <img
                      src={`media://${selectedApp.icon}`}
                      alt={selectedApp.name}
                      className="w-full h-full object-contain p-4"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    selectedApp.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-gray-800 text-gray-400 p-2 rounded-full border border-gray-700 shadow-xl">
                  {selectedApp.platform === 'web' && <Globe className="w-5 h-5" />}
                  {selectedApp.platform === 'pc' && <Monitor className="w-5 h-5" />}
                  {selectedApp.platform === 'android' && <Smartphone className="w-5 h-5" />}
                </div>
              </div>

              <h1 className="text-4xl font-bold mb-4 text-white tracking-tight">
                {selectedApp.name}
              </h1>
              <p className="text-lg text-gray-400 mb-10 leading-relaxed max-w-lg mx-auto">
                {selectedApp.description || `Launch ${selectedApp.name}`}
              </p>

              <div className="flex flex-col items-center space-y-6">
                {/* Proxy Status Indicator */}
                <div className="flex items-center space-x-3 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50 backdrop-blur-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-sm font-medium text-gray-300">Proxy Ready: :8081</span>
                </div>

                <div className="flex items-center space-x-4">
                  {selectedApp.platform === 'android' ? (
                    <button
                      onClick={handleAndroidConnect}
                      className="group relative inline-flex items-center justify-center px-6 py-4 text-lg font-bold text-white transition-all duration-200 bg-emerald-600 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 hover:bg-emerald-500 hover:scale-105 hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                    >
                      Connect & Inspect
                      <Smartphone className="w-5 h-5 ml-2 transition-transform group-hover:scale-110" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleLaunch('browser')}
                        className={cn(
                          'group relative inline-flex items-center justify-center px-6 py-4 text-lg font-bold text-white transition-all duration-200 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 hover:scale-105',
                          'bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]',
                        )}
                      >
                        Launch Browser
                        <Globe className="w-5 h-5 ml-2 transition-transform group-hover:scale-110" />
                      </button>
                      <button
                        onClick={() => handleLaunch('electron')}
                        className="group relative inline-flex items-center justify-center px-6 py-4 text-lg font-bold text-white transition-all duration-200 bg-indigo-600 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 hover:bg-indigo-500 hover:scale-105 hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                      >
                        Launch App
                        <Monitor className="w-5 h-5 ml-2 transition-transform group-hover:scale-110" />
                      </button>
                    </>
                  )}
                </div>

                {selectedApp.url && (
                  <div className="text-sm text-gray-600 font-mono bg-gray-900/50 px-3 py-1 rounded">
                    {selectedApp.url}
                  </div>
                )}
              </div>

              {/* Profiles Section */}
              <div className="mt-16 border-t border-gray-800/50 pt-8 w-full text-left">
                <SavedProfiles
                  appName={selectedApp.name}
                  appId={selectedApp.id}
                  onLoadProfile={(profile) => onLoadProfile && onLoadProfile(profile)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
            <Search className="w-16 h-16 mb-4 opacity-20" />
            <p>Select an application to start</p>
          </div>
        )}
      </div>

      {/* Add Website Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold">Add Custom Website</h3>
              <p className="text-sm text-gray-400 mt-1">Configure a new website to track.</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. My Dashboard"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">URL</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newItemUrl}
                    onChange={(e) => setNewItemUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-10 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                  />
                  {getFaviconUrl(newItemUrl) && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded overflow-hidden bg-gray-700">
                      <img
                        src={getFaviconUrl(newItemUrl)!}
                        alt="icon"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex justify-end space-x-3 bg-gray-900/50">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomApp}
                disabled={!newItemName || !newItemUrl}
                className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
              >
                Add Website
              </button>
            </div>
          </div>
        </div>
      )}

      <AddAppModal
        isOpen={showPcAddModal}
        onClose={() => setShowPcAddModal(false)}
        onAdd={handleAddPcApp}
      />
    </div>
  );
};

export default Dashboard;
