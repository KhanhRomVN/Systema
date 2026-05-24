import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserApp, AppPlatform, MobileEmulator } from '../../../../../types/apps';
import { Plus, Globe, Monitor, Smartphone, Search, Trash2, Square, Terminal, History, FolderOpen, Crosshair, Pencil } from 'lucide-react';
import { cn } from '../../../../../shared/lib/utils';
import { loadProfiles, InspectorProfile, deleteProfilesByAppId } from '../../../../../utils/profiles';
import { AddTargetDrawer } from './AddTargetDrawer';

export interface TargetSelectorProps {
  activeAppId: string;
  activeAppName: string;
  onSelectApp: (appName: string, proxyUrl: string, customUrl?: string, mode?: 'browser' | 'electron' | 'native') => Promise<void>;
  onStopSession: () => Promise<void>;
  onLoadProfile: (profile: InspectorProfile) => void;
  platform?: 'web' | 'pc' | 'android';
}

const getFaviconUrl = (url?: string) => {
  if (!url) return null;
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`; }
  catch { return null; }
};

const PLATFORM_TABS: { id: AppPlatform; icon: React.ElementType; label: string; activeColor: string }[] = [
  { id: 'web',     icon: Globe,      label: 'Web',     activeColor: 'border-sky-400 text-sky-400 bg-sky-400/10' },
  { id: 'pc',      icon: Monitor,    label: 'PC',      activeColor: 'border-violet-400 text-violet-400 bg-violet-400/10' },
  { id: 'android', icon: Smartphone, label: 'Android', activeColor: 'border-emerald-400 text-emerald-400 bg-emerald-400/10' },
  { id: 'cli',     icon: Terminal,   label: 'CLI',     activeColor: 'border-amber-400 text-amber-400 bg-amber-400/10' },
];

export const TargetSelector: React.FC<TargetSelectorProps> = ({
  activeAppId, activeAppName, onSelectApp, onStopSession, onLoadProfile,
  platform: activeSessionPlatform,
}) => {
  const [activeTab, setActiveTab] = useState<AppPlatform>('web');
  const [apps, setApps] = useState<UserApp[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [_connectedDevices, setConnectedDevices] = useState<MobileEmulator[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPlatform, setDrawerPlatform] = useState<AppPlatform>('web');
  const [editApp, setEditApp] = useState<{ id: string; name: string; url?: string; executablePath?: string } | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ appId: string; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const fetchApps = async () => {
    try { setApps(await window.api.invoke('apps:get-all')); }
    catch (e) { console.error(e); }
  };
  const fetchConnectedDevices = async () => {
    try { setConnectedDevices(await window.api.invoke('mobile:detect-emulators')); }
    catch (e) { console.error(e); }
  };

  useEffect(() => { fetchApps(); fetchConnectedDevices(); }, []);
  useEffect(() => {
    const interval = setInterval(fetchConnectedDevices, 5000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node))
        setContextMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  const profiles = useMemo(() => loadProfiles(), [isLaunching]);
  const getAppProfile = (appId: string, appName: string) =>
    profiles.find((p) => p.appId === appId || p.appName === appName) || null;

  const handleAddApp = async (app: any) => {
    try { await window.api.invoke('apps:create', { ...app, category: 'Development', tags: [] }); await fetchApps(); }
    catch (e) { console.error(e); }
  };

  const handleEditApp = async (id: string, data: { name: string; url?: string; executablePath?: string }) => {
    try { await window.api.invoke('apps:update', id, data); await fetchApps(); }
    catch (e) { console.error(e); }
  };

  const handleDeleteApp = async (id: string) => {
    if (!confirm('Delete this target?')) return;
    try { await window.api.invoke('apps:delete', id); deleteProfilesByAppId(id); fetchApps(); }
    catch (e) { console.error(e); }
    setContextMenu(null);
  };

  const appsByPlatform = useMemo(() => {
    const map: Record<AppPlatform, UserApp[]> = { web: [], pc: [], android: [], cli: [] };
    apps.forEach(app => { if (map[app.platform]) map[app.platform].push(app); });
    return map;
  }, [apps]);

  const filteredApps = useMemo(() =>
    (appsByPlatform[activeTab] || []).filter(app =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [appsByPlatform, activeTab, searchQuery]);

  const handleLaunchApp = async (app: UserApp, mode?: 'browser' | 'electron' | 'native') => {
    setIsLaunching(true);
    try { await onSelectApp(app.id, 'http://127.0.0.1:8081', app.url, mode); }
    catch (e) { console.error(e); } finally { setIsLaunching(false); }
    setContextMenu(null);
  };

  const openAddDrawer = () => {
    setEditApp(null);
    setDrawerPlatform(activeTab);
    setDrawerOpen(true);
    setContextMenu(null);
  };

  const openEditDrawer = (app: UserApp) => {
    setEditApp({ id: app.id, name: app.name, url: app.url, executablePath: app.executablePath });
    setDrawerPlatform(app.platform);
    setDrawerOpen(true);
    setContextMenu(null);
  };

  const contextMenuApp = contextMenu ? apps.find(a => a.id === contextMenu.appId) : null;
  const activePlatform = PLATFORM_TABS.find(t => t.id === activeTab)!;

  return (
    <div className="flex flex-col h-full bg-table-bodyBg overflow-hidden relative">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-primary/15 border border-primary/25 shrink-0">
          <Crosshair className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold text-text-primary">Select Target</h2>
          <p className="text-xs text-text-secondary mt-0.5">Choose an app or website to inspect traffic</p>
        </div>
      </div>

      {/* Active session */}
      {activeAppId && (
        <div className="px-3 py-2.5 border-b border-divider bg-emerald-500/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div>
              <div className="text-xs font-semibold text-emerald-400 truncate max-w-[140px]">{activeAppName}</div>
              <div className="text-[10px] text-text-secondary capitalize">{activeSessionPlatform || 'Unknown'}</div>
            </div>
          </div>
          <button
            onClick={async () => { if (confirm('Stop the current tracking session?')) await onStopSession(); }}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-md transition-all active:scale-95"
          >
            <Square className="w-3 h-3 fill-current" />Stop
          </button>
        </div>
      )}

      {/* Platform tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-2 border-b border-divider shrink-0">
        {PLATFORM_TABS.map(({ id, icon: Icon, label, activeColor }) => {
          const count = appsByPlatform[id]?.length ?? 0;
          const isActive = activeTab === id;
          return (
            <button key={id} onClick={() => { setActiveTab(id); }}
              className={cn('flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-[11px] font-bold transition-all',
                isActive ? activeColor + ' border-current/40' : 'border-divider/40 text-text-secondary hover:bg-sidebar-itemHover/40')}>
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{label}</span>
              {count > 0 && (
                <span className={cn('text-[9px] font-bold px-1 rounded-full shrink-0', isActive ? 'bg-current/20' : 'bg-divider/60 text-text-secondary')}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Add */}
      <div className="px-3 py-2 border-b border-divider flex gap-2 items-center shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input type="text" placeholder={`Search ${activePlatform.label}...`} value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-input-background border border-input-border-default rounded-lg pl-8 pr-3 text-xs text-text-primary focus:border-primary/50 outline-none" />
        </div>
        <button onClick={openAddDrawer}
          className="flex items-center justify-center w-10 h-10 bg-secondary hover:bg-primary/20 hover:text-primary text-text-secondary rounded-lg border border-divider hover:border-primary/30 transition-all active:scale-95 shrink-0"
          title="Add target">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* App list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {filteredApps.map((app) => {
          const favicon = getFaviconUrl(app.url);
          return (
            <div
              key={app.id}
              onClick={(e) => setContextMenu({ appId: app.id, x: e.clientX, y: e.clientY })}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ appId: app.id, x: e.clientX, y: e.clientY }); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-table-headerBg hover:bg-sidebar-itemHover/60 cursor-pointer transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                {app.platform === 'web' && favicon ? (
                  <img src={favicon} alt={app.name} className="w-full h-full object-cover p-1.5" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : app.icon && app.platform === 'pc' ? (
                  <img src={`media://${app.icon}`} alt={app.name} className="w-full h-full object-contain p-1.5" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <span className="text-text-secondary text-sm">{app.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text-primary truncate">{app.name}</div>
                <div className="text-xs text-text-secondary truncate mt-0.5">
                  {app.url || (app.platform === 'cli' ? 'CLI Command' : 'Native App')}
                </div>
              </div>
            </div>
          );
        })}
        {filteredApps.length === 0 && (
          <div className="text-center text-text-secondary py-12 text-sm">
            No {activePlatform.label} targets.<br /><span className="text-xs">Click + to add one.</span>
          </div>
        )}
      </div>

      {/* Context menu (left click or right click) */}
      {contextMenu && contextMenuApp && (
        <div ref={contextMenuRef}
          className="fixed z-50 bg-dialog-background border border-divider rounded-xl shadow-2xl py-1.5 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}>
          {/* App info */}
          <div className="px-4 py-2 border-b border-divider mb-1">
            <div className="text-sm font-semibold text-text-primary truncate">{contextMenuApp.name}</div>
            <div className="text-xs text-text-secondary truncate mt-0.5">{contextMenuApp.url || contextMenuApp.platform}</div>
          </div>

          {/* Launch actions */}
          {contextMenuApp.platform === 'web' && (
            <button onClick={() => handleLaunchApp(contextMenuApp, 'browser')} disabled={isLaunching}
              className="w-full px-4 py-2 text-sm text-left hover:bg-sidebar-itemHover/50 flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-sky-400" />Launch Browser
            </button>
          )}
          {contextMenuApp.platform === 'pc' && (
            <button onClick={() => handleLaunchApp(contextMenuApp, 'electron')} disabled={isLaunching}
              className="w-full px-4 py-2 text-sm text-left hover:bg-sidebar-itemHover/50 flex items-center gap-2.5">
              <Monitor className="w-4 h-4 text-violet-400" />Launch App
            </button>
          )}
          {contextMenuApp.platform === 'android' && (
            <button onClick={() => handleLaunchApp(contextMenuApp, 'electron')} disabled={isLaunching}
              className="w-full px-4 py-2 text-sm text-left hover:bg-sidebar-itemHover/50 flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-emerald-400" />Connect & Inspect
            </button>
          )}
          {contextMenuApp.platform === 'cli' && (
            <button onClick={() => handleLaunchApp(contextMenuApp, 'native')} disabled={isLaunching}
              className="w-full px-4 py-2 text-sm text-left hover:bg-sidebar-itemHover/50 flex items-center gap-2.5">
              <Terminal className="w-4 h-4 text-amber-400" />Run in Terminal
            </button>
          )}

          {/* Profile restore */}
          {(() => {
            const profile = getAppProfile(contextMenuApp.id, contextMenuApp.name);
            if (!profile) return null;
            return (
              <button onClick={() => { onLoadProfile(profile); alert(`Restored ${profile.metadata.totalRequests} requests!`); setContextMenu(null); }}
                className="w-full px-4 py-2 text-sm text-left hover:bg-sidebar-itemHover/50 flex items-center gap-2.5">
                <FolderOpen className="w-4 h-4 text-primary" />Restore Last Session
                <span className="ml-auto text-[10px] text-primary font-bold">{profile.metadata.totalRequests} reqs</span>
              </button>
            );
          })()}

          <div className="border-t border-divider mt-1 pt-1">
            <button onClick={() => openEditDrawer(contextMenuApp)}
              className="w-full px-4 py-2 text-sm text-left hover:bg-sidebar-itemHover/50 flex items-center gap-2.5">
              <Pencil className="w-4 h-4 text-text-secondary" />Edit Target
            </button>
            <button onClick={() => handleDeleteApp(contextMenuApp.id)}
              className="w-full px-4 py-2 text-sm text-left hover:bg-red-500/10 text-red-400 flex items-center gap-2.5">
              <Trash2 className="w-4 h-4" />Delete Target
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Drawer */}
      <AddTargetDrawer
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditApp(null); }}
        platform={drawerPlatform}
        onAdd={handleAddApp}
        onEdit={handleEditApp}
        editApp={editApp}
        existingApps={apps.filter(a => a.platform === 'android')}
      />
    </div>
  );
};
