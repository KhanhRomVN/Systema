import React, { useState, useEffect, useMemo } from 'react';
import { AppPlatform, AppMode, DiscoveredApp } from '../../../types/apps';
import { Search, X, Loader2, Monitor, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface AddPcAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (app: {
    name: string;
    executablePath?: string;
    mode: AppMode;
    platform: AppPlatform;
    icon?: string;
  }) => void;
}

export const AddPcAppModal: React.FC<AddPcAppModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveredApps, setDiscoveredApps] = useState<DiscoveredApp[]>([]);
  const [selectedApp, setSelectedApp] = useState<DiscoveredApp | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadApps();
      setSearchQuery('');
      setSelectedApp(null);
    }
  }, [isOpen]);

  const loadApps = async () => {
    setIsLoading(true);
    try {
      const apps = await window.api.invoke('apps:scan-pc');
      setDiscoveredApps(apps);
    } catch (e) {
      console.error('Failed to scan PC apps', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddApp = () => {
    if (!selectedApp) return;

    onAdd({
      name: selectedApp.name,
      executablePath: selectedApp.exec,
      platform: 'pc',
      mode: 'native',
      icon: selectedApp.icon,
    });
    onClose();
  };

  const filteredApps = useMemo(() => {
    if (!searchQuery) return discoveredApps;
    const lower = searchQuery.toLowerCase();
    return discoveredApps.filter(
      (app) =>
        app.name.toLowerCase().includes(lower) ||
        (app.description && app.description.toLowerCase().includes(lower)),
    );
  }, [discoveredApps, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-dialog-background border border-divider rounded-xl w-full max-w-2xl flex flex-col shadow-dialogShadow overflow-hidden h-[70vh]">
        <div className="px-4 py-3 border-b border-divider flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" />
            Add PC Application
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-sidebar-itemHover rounded-lg">
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col bg-background/50">
          <div className="flex flex-col h-full">
            <div className="p-3 border-b border-divider bg-sidebar-background/30 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search installed applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-input-background border border-input-border-default rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:border-primary/50 outline-none"
                />
              </div>
              <button
                onClick={loadApps}
                className="p-2 bg-sidebar-itemHover hover:bg-sidebar-itemFocus border border-divider rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                title="Refresh application list"
              >
                <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {isLoading && discoveredApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                  <p className="text-sm text-text-secondary">Scanning system applications...</p>
                </div>
              ) : filteredApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Monitor className="w-8 h-8 opacity-20 text-text-secondary mb-2" />
                  <p className="text-sm text-text-secondary">
                    {discoveredApps.length > 0
                      ? 'No matching applications found.'
                      : 'No applications found on your system.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredApps.map((app) => {
                    const isSelected =
                      selectedApp?.exec === app.exec && selectedApp?.name === app.name;
                    return (
                      <button
                        key={`${app.name}-${app.exec}`}
                        onClick={() => setSelectedApp(app)}
                        className={cn(
                          'relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all group',
                          isSelected
                            ? 'bg-primary/20 border-primary/50'
                            : 'bg-sidebar-itemHover/40 border-divider hover:bg-sidebar-itemHover/80 hover:border-divider',
                        )}
                      >
                        <div className="w-10 h-10 rounded-lg bg-sidebar-background flex items-center justify-center flex-shrink-0 overflow-hidden border border-divider">
                          {app.icon ? (
                            <img
                              src={`media://${app.icon}`}
                              alt={app.name}
                              className="w-8 h-8 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add(
                                  'bg-sidebar-itemHover',
                                );
                              }}
                            />
                          ) : (
                            <Monitor className="w-5 h-5 text-text-secondary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4
                            className={cn(
                              'font-medium truncate text-sm',
                              isSelected ? 'text-primary' : 'text-text-primary',
                            )}
                          >
                            {app.name}
                          </h4>
                          <p className="text-[10px] text-text-secondary truncate mt-0.5">
                            {app.description || 'System Application'}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(54,134,255,0.5)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-divider bg-dialog-background flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddApp}
                disabled={!selectedApp}
                className="px-5 py-2 rounded-lg text-sm font-bold text-button-text bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                Add Application
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
