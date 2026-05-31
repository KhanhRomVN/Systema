import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserApp, AppPlatform, MobileEmulator } from '../../../../../types/apps';
import { Plus, Globe, Monitor, Smartphone, Search, Trash2, Square, Terminal, History, FolderOpen, Crosshair, Pencil, Zap, X } from 'lucide-react';
import { cn } from '../../../../../shared/lib/utils';
import { loadProfiles, InspectorProfile, deleteProfilesByAppId } from '../../../../../utils/profiles';
import { AddTargetDrawer } from './AddTargetDrawer';
import { ConfirmDeleteDrawer } from './ConfirmDeleteDrawer';
import { useI18n } from '../../../../../i18n/i18nContext';

export interface TargetSelectorProps {
  activeAppId: string;
  activeAppName: string;
  onSelectApp: (appName: string, proxyUrl: string, customUrl?: string, mode?: 'browser' | 'electron' | 'native') => Promise<void>;
  onStopSession: () => Promise<void>;
  onLoadProfile: (profile: InspectorProfile) => void;
  platform?: 'web' | 'pc' | 'android';
  // Stop confirmation drawer
  onOpenStopConfirm?: () => void;
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
  onOpenStopConfirm,
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
  
  // Delete confirmation drawer
  const [deleteDrawerOpen, setDeleteDrawerOpen] = useState(false);
  const [deleteAppId, setDeleteAppId] = useState<string | null>(null);
  const [deleteAppName, setDeleteAppName] = useState<string>('');

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ appId: string; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

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
    try { await window.api.invoke('apps:delete', id); deleteProfilesByAppId(id); fetchApps(); }
    catch (e) { console.error(e); }
    setContextMenu(null);
    setDeleteDrawerOpen(false);
    setDeleteAppId(null);
    setDeleteAppName('');
  };

  const openDeleteDrawer = (id: string, name: string) => {
    setDeleteAppId(id);
    setDeleteAppName(name);
    setDeleteDrawerOpen(true);
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
    if (isLaunching) {
      console.log('[TargetSelector] Already launching, ignoring duplicate click');
      return;
    }
    console.log(`[TargetSelector] handleLaunchApp: app="${app.name}", mode="${mode}"`);
    setIsLaunching(true);
    recordUsage(app.id);
    try {
      console.log('[TargetSelector] Calling onSelectApp...');
      await onSelectApp(app.id, 'http://127.0.0.1:8081', app.url, mode);
      console.log('[TargetSelector] onSelectApp completed');
    }
    catch (e) {
      console.error('[TargetSelector] Error in handleLaunchApp:', e);
    } finally {
      console.log('[TargetSelector] Resetting isLaunching');
      setIsLaunching(false);
    }
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

  // Breakpoint rules
  const [bpRules, setBpRules] = useState<{ id: string; urlPattern: string; methods: string[]; phase: 'request' | 'response' | 'both'; enabled: boolean }[]>(() => {
    try { return JSON.parse(localStorage.getItem('systema-bp-rules') || '[]'); } catch { return []; }
  });
  const [bpExpanded, setBpExpanded] = useState(false);
  const [bpPattern, setBpPattern] = useState('');
  const [bpPhase, setBpPhase] = useState<'request' | 'response' | 'both'>('both');

  useEffect(() => {
    localStorage.setItem('systema-bp-rules', JSON.stringify(bpRules));
    window.api.invoke('proxy:set-breakpoint-rules', bpRules);
  }, [bpRules]);

  const addBpRule = () => {
    if (!bpPattern.trim()) return;
    setBpRules(prev => [...prev, { id: crypto.randomUUID(), urlPattern: bpPattern.trim(), methods: [], phase: bpPhase, enabled: true }]);
    setBpPattern('');
  };

  const toggleBpRule = (id: string) => setBpRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  const deleteBpRule = (id: string) => setBpRules(prev => prev.filter(r => r.id !== id));

  const contextMenuApp = contextMenu ? apps.find(a => a.id === contextMenu.appId) : null;
  const activePlatform = PLATFORM_TABS.find(t => t.id === activeTab)!;

  // Recently used tracking
  const [lastUsedTimestamps, setLastUsedTimestamps] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('systema-last-used') || '{}'); } catch { return {}; }
  });

  const recordUsage = (appId: string) => {
    setLastUsedTimestamps(prev => {
      const updated = { ...prev, [appId]: Date.now() };
      localStorage.setItem('systema-last-used', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="flex flex-col h-full bg-table-bodyBg overflow-hidden relative">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-primary/15 border border-primary/25 shrink-0">
          <Crosshair className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold text-text-primary">{t.target.selectTarget}</h2>
          <p className="text-xs text-text-secondary mt-0.5">{t.target.chooseApp}</p>
        </div>
      </div>

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
          <input type="text" placeholder={t.target.search.replace('{platform}', activePlatform.label)} value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 bg-input-background border border-input-border-default rounded-lg pl-8 pr-3 text-sm text-text-primary focus:border-primary/50 outline-none" />
        </div>
        <button onClick={openAddDrawer}
          className="flex items-center justify-center w-11 h-11 bg-secondary hover:bg-primary/20 hover:text-primary text-text-secondary rounded-lg border border-divider hover:border-primary/30 transition-all active:scale-95 shrink-0"
          title={t.target.addTarget}>
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* App list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {/* All Websites card - always at top for web platform */}
        {activeTab === 'web' && (
          <div
            onClick={(e) => {
              if (activeAppId === '__all_websites__') return;
              setContextMenu({ appId: '__all_websites__', x: e.clientX, y: e.clientY });
            }}
            onContextMenu={(e) => {
              if (activeAppId === '__all_websites__') return;
              e.preventDefault();
              setContextMenu({ appId: '__all_websites__', x: e.clientX, y: e.clientY });
            }}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
              activeAppId === '__all_websites__'
                ? "bg-sky-500/5 border-2 border-sky-500/40 hover:border-sky-500/60 hover:scale-[1.01]"
                : "bg-table-headerBg border border-dashed border-sky-400/40 hover:bg-sky-500/5 hover:border-sky-400/60 hover:scale-[1.01]"
            )}
          >
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-text-primary">{t.target.allWebsites}</div>
              <div className="text-xs text-text-secondary mt-0.5">{t.target.allWebsitesDesc}</div>
            </div>
            {activeAppId === '__all_websites__' && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (onOpenStopConfirm) {
                    onOpenStopConfirm();
                  } else {
                    if (confirm('Stop the current tracking session?')) await onStopSession();
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-all active:scale-95 shrink-0"
              >
                <Square className="w-3 h-3 fill-current" /> {t.target.stop}
              </button>
            )}
          </div>
        )}

        {(() => {
          const sortedApps = [...filteredApps].sort((a, b) => {
            const aTime = lastUsedTimestamps[a.id] || 0;
            const bTime = lastUsedTimestamps[b.id] || 0;
            return bTime - aTime; // most recent first
          });
          const activeIndex = sortedApps.findIndex(app => app.id === activeAppId);
          if (activeIndex !== -1) {
            const [activeApp] = sortedApps.splice(activeIndex, 1);
            sortedApps.unshift(activeApp);
          }
          return sortedApps;
        })().map((app) => {
          const favicon = getFaviconUrl(app.url);
          const isActive = app.id === activeAppId;
          return (
            <div
              key={app.id}
              onClick={(e) => {
                if (isActive) return;
                setContextMenu({ appId: app.id, x: e.clientX, y: e.clientY });
              }}
              onContextMenu={(e) => {
                if (isActive) return;
                e.preventDefault();
                setContextMenu({ appId: app.id, x: e.clientX, y: e.clientY });
              }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
                isActive 
                  ? "bg-emerald-500/5 border-2 border-emerald-500/30 hover:border-emerald-500/50 hover:scale-[1.01]" 
                  : "bg-table-headerBg border border-divider/40 hover:bg-sidebar-itemHover/60 hover:border-primary/30 hover:scale-[1.01]"
              )}
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
              {isActive && (
                <button
                  onClick={async (e) => { 
                    e.stopPropagation(); 
                    if (onOpenStopConfirm) {
                      onOpenStopConfirm();
                    } else {
                      if (confirm('Stop the current tracking session?')) await onStopSession();
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-all active:scale-95 shrink-0"
                >
                  <Square className="w-3 h-3 fill-current" /> Stop
                </button>
              )}
            </div>
          );
        })}
        {filteredApps.length === 0 && (
          <div className="text-center text-text-secondary py-12 text-sm">
            {t.target.noTargets.replace('{platform}', activePlatform.label)}<br /><span className="text-xs">{t.target.clickToAdd}</span>
          </div>
        )}
      </div>

      {/* Context menu (left click or right click) */}
      {contextMenu && (contextMenuApp || contextMenu.appId === '__all_websites__') && (
        <div ref={contextMenuRef}
          className="fixed z-50 bg-dialog-background border border-divider rounded-xl shadow-2xl py-1.5 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}>
          {/* App info */}
          {contextMenu.appId === '__all_websites__' ? (
            <div className="px-4 py-2 border-b border-divider mb-1">
              <div className="text-sm font-semibold text-text-primary truncate">{t.target.allWebsites}</div>
              <div className="text-xs text-text-secondary truncate mt-0.5">{t.target.allWebsitesDesc}</div>
            </div>
          ) : (
            <div className="px-4 py-2 border-b border-divider mb-1">
              <div className="text-sm font-semibold text-text-primary truncate">{contextMenuApp!.name}</div>
              <div className="text-xs text-text-secondary truncate mt-0.5">{contextMenuApp!.url || contextMenuApp!.platform}</div>
            </div>
          )}

          {/* Launch actions */}
          {contextMenu.appId === '__all_websites__' ? (
            <button onClick={() => { recordUsage('__all_websites__'); onSelectApp('__all_websites__', 'http://127.0.0.1:8081', undefined, 'browser'); setContextMenu(null); }} disabled={isLaunching}
              className="w-full px-4 py-2 text-sm text-left hover:bg-sidebar-itemHover/50 flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-sky-400" />{t.target.launchBrowserAll}
            </button>
          ) : contextMenuApp!.platform === 'web' && (
            <button onClick={() => handleLaunchApp(contextMenuApp!, 'browser')} disabled={isLaunching}
              className="w-full px-4 py-2 text-sm text-left hover:bg-sidebar-itemHover/50 flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-sky-400" />{t.target.launchBrowser}
            </button>
          )}
          {contextMenuApp && contextMenuApp.platform === 'pc' && (
            <button onClick={() => handleLaunchApp(contextMenuApp, 'electron')} disabled={isLaunching}
              className="w-full px-4 py-2 text-sm text-left hover:bg-sidebar-itemHover/50 flex items-center gap-2.5">
              <Monitor className="w-4 h-4 text-violet-400" />{t.target.launchApp}
            </button>
          )}
          {contextMenuApp && contextMenuApp.platform === 'android' && (
            <button onClick={() => handleLaunchApp(contextMenuApp, 'electron')} disabled={isLaunching}
              className="w-full px-4 py-2 text-sm text-left hover:bg-sidebar-itemHover/50 flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-emerald-400" />{t.target.connectInspect}
            </button>
          )}
          {contextMenuApp && contextMenuApp.platform === 'cli' && (
            <button onClick={() => handleLaunchApp(contextMenuApp, 'native')} disabled={isLaunching}
              className="w-full px-4 py-2 text-sm text-left hover:bg-sidebar-itemHover/50 flex items-center gap-2.5">
              <Terminal className="w-4 h-4 text-amber-400" />{t.target.runTerminal}
            </button>
          )}

          {/* Profile restore */}
          {contextMenuApp && (() => {
            const profile = getAppProfile(contextMenuApp.id, contextMenuApp.name);
            if (!profile) return null;
            return (
              <button onClick={() => { onLoadProfile(profile); alert(`Restored ${profile.metadata.totalRequests} requests!`); setContextMenu(null); }}
                className="w-full px-4 py-2 text-sm text-left hover:bg-sidebar-itemHover/50 flex items-center gap-2.5">
                <FolderOpen className="w-4 h-4 text-primary" />{t.target.restoreSession}
                <span className="ml-auto text-[10px] text-primary font-bold">{profile.metadata.totalRequests} {t.target.reqs}</span>
              </button>
            );
          })()}

          {contextMenuApp && (
            <div className="border-t border-divider mt-1 pt-1">
              <button onClick={() => openEditDrawer(contextMenuApp)}
                className="w-full px-4 py-2 text-sm text-left hover:bg-sidebar-itemHover/50 flex items-center gap-2.5">
                <Pencil className="w-4 h-4 text-text-secondary" />{t.target.editTarget}
              </button>
              <button onClick={() => openDeleteDrawer(contextMenuApp.id, contextMenuApp.name)}
                className="w-full px-4 py-2 text-sm text-left hover:bg-red-500/10 text-red-400 flex items-center gap-2.5">
                <Trash2 className="w-4 h-4" />{t.target.deleteTarget}
              </button>
            </div>
          )}
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
        existingApps={apps}
      />
      
      {/* Delete Confirmation Drawer */}
      <ConfirmDeleteDrawer
        isOpen={deleteDrawerOpen}
        onClose={() => { setDeleteDrawerOpen(false); setDeleteAppId(null); setDeleteAppName(''); }}
        onConfirm={() => deleteAppId && handleDeleteApp(deleteAppId)}
        appName={deleteAppName}
      />

      {/* Breakpoint Rules */}
      <div className="border-t border-divider shrink-0">
        <button
          onClick={() => setBpExpanded(v => !v)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="flex-1 text-left">{t.target.breakpoints}</span>
          {bpRules.filter(r => r.enabled).length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
              {bpRules.filter(r => r.enabled).length} {t.target.active}
            </span>
          )}
          <span className="text-[10px]">{bpExpanded ? '▲' : '▼'}</span>
        </button>

        {bpExpanded && (
          <div className="px-3 pb-3 flex flex-col gap-2">
            {/* Add rule */}
            <div className="flex gap-1.5">
              <input
                value={bpPattern}
                onChange={e => setBpPattern(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addBpRule()}
                placeholder={t.target.addBreakpoint}
                className="flex-1 h-8 bg-input-background border border-input-border-default rounded-lg px-2.5 text-xs text-text-primary focus:border-amber-500/50 outline-none"
              />
              <select
                value={bpPhase}
                onChange={e => setBpPhase(e.target.value as any)}
                className="h-8 bg-input-background border border-input-border-default rounded-lg px-2 text-xs text-text-primary outline-none"
              >
                <option value="both">{t.target.phase.both}</option>
                <option value="request">{t.target.phase.request}</option>
                <option value="response">{t.target.phase.response}</option>
              </select>
              <button
                onClick={addBpRule}
                className="h-8 px-2.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Rule list */}
            {bpRules.map(rule => (
              <div key={rule.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-divider bg-muted/10">
                <button onClick={() => toggleBpRule(rule.id)} className={`w-3.5 h-3.5 rounded-sm border shrink-0 transition-colors ${rule.enabled ? 'bg-amber-500 border-amber-500' : 'border-divider'}`} />
                <span className="flex-1 text-xs text-text-primary truncate font-mono">{rule.urlPattern}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${rule.phase === 'request' ? 'bg-blue-500/15 text-blue-400' : rule.phase === 'response' ? 'bg-orange-500/15 text-orange-400' : 'bg-purple-500/15 text-purple-400'}`}>
                  {rule.phase}
                </span>
                <button onClick={() => deleteBpRule(rule.id)} className="p-0.5 rounded hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-colors shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {bpRules.length === 0 && (
              <p className="text-xs text-text-secondary text-center py-2">{t.target.noBreakpoints}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
