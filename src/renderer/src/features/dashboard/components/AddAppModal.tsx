import React, { useState, useEffect, useMemo } from 'react';
import { AppPlatform, AppMode } from '../../../types/apps';
import { Search, X, Loader2, Smartphone, Check } from 'lucide-react';
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
    emulatorSerial?: string;
    packageName?: string;
  }) => void;
}

export const AddAppModal: React.FC<AddAppModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Genymotion State
  const [genymotionVMs, setGenymotionVMs] = useState<string[]>([]);
  const [selectedVM, setSelectedVM] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadGenymotionVMs();
    }
  }, [isOpen]);

  const loadGenymotionVMs = async () => {
    setIsLoading(true);
    try {
      const vms = await window.api.invoke('mobile:list-genymotion-vms');
      setGenymotionVMs(vms);
    } catch (e) {
      console.error('Failed to list Genymotion VMs', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMobile = () => {
    if (!selectedVM) return;
    onAdd({
      name: selectedVM,
      platform: 'android',
      mode: 'native',
      // Store VM name in emulatorSerial so we know which VM to launch
      emulatorSerial: selectedVM,
      // No package name means it's a "Launch Emulator" app
    });
    onClose();
  };

  const filteredVMs = useMemo(() => {
    if (!searchQuery) return genymotionVMs;
    const lower = searchQuery.toLowerCase();
    return genymotionVMs.filter((vm) => vm.toLowerCase().includes(lower));
  }, [genymotionVMs, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl flex flex-col max-h-[85vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-900 sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold text-white">Add Application</h3>
            <p className="text-sm text-gray-400 mt-1">Add a mobile emulator to your dashboard.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-gray-950/50">
          <div className="flex flex-col h-full">
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-800 relative bg-gray-900/30">
              <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search Genymotion VMs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-600"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-3 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p>Loading VMs...</p>
                </div>
              ) : filteredVMs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500 space-y-2">
                  <Smartphone className="w-10 h-10 opacity-20" />
                  <p>No Genymotion VMs found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {filteredVMs.map((vm) => (
                    <button
                      key={vm}
                      onClick={() => setSelectedVM(vm)}
                      className={cn(
                        'flex items-center p-3 rounded-lg border text-left transition-all',
                        selectedVM === vm
                          ? 'bg-blue-600/10 border-blue-500/50'
                          : 'bg-gray-800/20 border-gray-800 hover:bg-gray-800/50',
                      )}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center mr-4 text-gray-400">
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className={cn(
                            'font-medium truncate',
                            selectedVM === vm ? 'text-blue-300' : 'text-gray-300',
                          )}
                        >
                          {vm}
                        </h4>
                        <p className="text-xs text-gray-500 truncate font-mono">Genymotion VM</p>
                      </div>
                      {selectedVM === vm && <Check className="w-5 h-5 text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-900 flex justify-end">
              <button
                onClick={handleAddMobile}
                disabled={!selectedVM}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
              >
                Add Emulator
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
