import React, { useState, useEffect, useMemo } from 'react';
import { DiscoveredApp, AppPlatform, AppMode } from '../../../types/apps';
import { Search, X, FolderOpen, Terminal, Check, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface AddAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (app: {
    name: string;
    url?: string;
    executablePath?: string;
    mode: AppMode;
    platform: AppPlatform;
    icon?: string;
  }) => void;
}

export const AddAppModal: React.FC<AddAppModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [activeTab, setActiveTab] = useState<'discovered' | 'manual'>('discovered');
  const [discoveredApps, setDiscoveredApps] = useState<DiscoveredApp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<DiscoveredApp | null>(null);

  // Manual Form State
  const [manualName, setManualName] = useState('');
  const [manualExec, setManualExec] = useState('');

  useEffect(() => {
    if (isOpen && activeTab === 'discovered' && discoveredApps.length === 0) {
      loadApps();
    }
  }, [isOpen, activeTab]);

  const loadApps = async () => {
    setIsLoading(true);
    try {
      const apps = await window.api.invoke('apps:scan-pc');
      setDiscoveredApps(apps);
    } catch (e) {
      console.error('Failed to scan apps', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredApps = useMemo(() => {
    if (!searchQuery) return discoveredApps;
    const lower = searchQuery.toLowerCase();
    return discoveredApps.filter(
      (app) =>
        app.name.toLowerCase().includes(lower) ||
        app.exec.toLowerCase().includes(lower) ||
        (app.description && app.description.toLowerCase().includes(lower)),
    );
  }, [discoveredApps, searchQuery]);

  const handleAddDiscovered = () => {
    if (!selectedApp) return;
    onAdd({
      name: selectedApp.name,
      executablePath: selectedApp.exec,
      mode: 'native',
      platform: 'pc',
      icon: selectedApp.icon,
    });
    onClose();
  };

  const handleAddManual = () => {
    if (!manualName || !manualExec) return;
    onAdd({
      name: manualName,
      executablePath: manualExec,
      mode: 'native',
      platform: 'pc',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl flex flex-col max-h-[85vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-900 sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold text-white">Add Application</h3>
            <p className="text-sm text-gray-400 mt-1">Add a local application to your dashboard.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-900/50">
          <button
            onClick={() => setActiveTab('discovered')}
            className={cn(
              'flex-1 py-3 text-sm font-medium border-b-2 transition-all',
              activeTab === 'discovered'
                ? 'border-blue-500 text-blue-400 bg-gray-800/20'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/10',
            )}
          >
            Discovered Apps
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={cn(
              'flex-1 py-3 text-sm font-medium border-b-2 transition-all',
              activeTab === 'manual'
                ? 'border-blue-500 text-blue-400 bg-gray-800/20'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/10',
            )}
          >
            Manual Entry
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-gray-950/50">
          {activeTab === 'discovered' ? (
            <>
              {/* Search Bar */}
              <div className="p-4 border-b border-gray-800 relative">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search installed applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-600"
                  autoFocus
                />
              </div>

              {/* App List */}
              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 space-y-3 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p>Scanning applications...</p>
                  </div>
                ) : filteredApps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-500 space-y-2">
                    <FolderOpen className="w-10 h-10 opacity-20" />
                    <p>No applications found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1">
                    {filteredApps.map((app) => (
                      <button
                        key={app.path + app.name} // path + name for uniqueness
                        onClick={() => setSelectedApp(app)}
                        className={cn(
                          'flex items-center space-x-4 p-3 rounded-lg transition-all text-left group',
                          selectedApp === app
                            ? 'bg-blue-600/10 border border-blue-500/50'
                            : 'hover:bg-gray-800/50 border border-transparent',
                        )}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-lg font-bold text-gray-400 flex-shrink-0 overflow-hidden">
                          {app.icon ? (
                            <img
                              src={`media://${app.icon}`}
                              alt={app.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            app.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4
                            className={cn(
                              'font-medium truncate',
                              selectedApp === app ? 'text-blue-200' : 'text-gray-200',
                            )}
                          >
                            {app.name}
                          </h4>
                          <p className="text-xs text-gray-500 truncate font-mono mt-0.5">
                            {app.exec}
                          </p>
                        </div>
                        {selectedApp === app && (
                          <div className="text-blue-400">
                            <Check className="w-5 h-5" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-800 bg-gray-900 flex justify-end">
                <button
                  onClick={handleAddDiscovered}
                  disabled={!selectedApp}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
                >
                  Add Selected
                </button>
              </div>
            </>
          ) : (
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Application Name
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. VS Code"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Executable Path
                </label>
                <div className="relative">
                  <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={manualExec}
                    onChange={(e) => setManualExec(e.target.value)}
                    placeholder="/usr/bin/code"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter the absolute path to the executable file. You can find this using `which
                  appname` in a terminal.
                </p>
              </div>

              <div className="flex-1" />

              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleAddManual}
                  disabled={!manualName || !manualExec}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
                >
                  Add Application
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
