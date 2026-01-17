import React, { useState, useEffect, useMemo } from 'react';
import { AppPlatform, AppMode } from '../../../types/apps';
import {
  Search,
  X,
  Loader2,
  Smartphone,
  Check,
  Wifi,
  QrCode,
  Zap,
  Monitor,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'list' | 'connect'>('list');

  // Genymotion & Device State
  const [deviceList, setDeviceList] = useState<
    { name: string; type: 'vm' | 'physical' | 'running-vm'; serial?: string }[]
  >([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  // Connect Mode State
  const [activeTab, setActiveTab] = useState<'qrcode' | 'wireless'>('qrcode');
  const [qrData, setQrData] = useState<{ qrCode: string; setupUrl: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
      // Reset state
      setViewMode('list');
      setSearchQuery('');
      setSelectedDevice(null);
    }
  }, [isOpen]);

  // Load QR Code when switching to connect view
  useEffect(() => {
    if (viewMode === 'connect' && activeTab === 'qrcode' && !qrData) {
      loadQrCode();
    }
  }, [viewMode, activeTab, qrData]);

  const loadQrCode = async () => {
    try {
      const data = await window.api.invoke('mobile:get-qr-code');
      setQrData(data);
    } catch (e) {
      console.error('Failed to get QR Code', e);
    }
  };

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const [vms, connected] = await Promise.all([
        window.api.invoke('mobile:list-genymotion-vms'),
        window.api.invoke('mobile:detect-emulators'),
      ]);

      const list: { name: string; type: 'vm' | 'physical' | 'running-vm'; serial?: string }[] = [];

      // Add connected devices first
      connected.forEach((dev: any) => {
        list.push({
          name: dev.name || dev.serial,
          type: dev.type === 'physical' ? 'physical' : 'running-vm',
          serial: dev.serial,
        });
      });

      // Add available VMs
      vms.forEach((vm: string) => {
        const isRunning = connected.some((d: any) => d.name === vm || d.id === vm);
        if (!isRunning) {
          list.push({
            name: vm,
            type: 'vm',
            serial: vm,
          });
        }
      });

      setDeviceList(list);
    } catch (e) {
      console.error('Failed to list devices', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMobile = () => {
    if (!selectedDevice) return;
    const device = deviceList.find((d) => d.name === selectedDevice);
    if (!device) return;

    onAdd({
      name: device.name,
      platform: 'android',
      mode: 'native',
      emulatorSerial: device.serial || device.name,
    });
    onClose();
  };

  const filteredDevices = useMemo(() => {
    if (!searchQuery) return deviceList;
    const lower = searchQuery.toLowerCase();
    return deviceList.filter((d) => d.name.toLowerCase().includes(lower));
  }, [deviceList, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-white/5 rounded-xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden h-[70vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-900 sticky top-0 z-10 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {viewMode === 'connect' && (
                <button
                  onClick={() => setViewMode('list')}
                  className="hover:bg-gray-800 p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {viewMode === 'connect' ? 'Connect New Device' : 'Add Device'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-gray-950/50">
          {viewMode === 'list' && (
            <div className="flex flex-col h-full">
              {/* Search Bar */}
              <div className="p-3 border-b border-gray-800 bg-gray-900/30 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search devices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-600"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => setViewMode('connect')}
                  className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors"
                  title="Connect Wireless / QR"
                >
                  <Wifi className="w-4 h-4" />
                </button>
                <button
                  onClick={loadDevices}
                  className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors"
                  title="Refresh List"
                >
                  <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {isLoading && deviceList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-2 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <p className="text-sm">Scanning...</p>
                  </div>
                ) : filteredDevices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2">
                    <Smartphone className="w-8 h-8 opacity-20" />
                    <p className="text-sm">No devices found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredDevices.map((device) => (
                      <button
                        key={device.name}
                        onClick={() => setSelectedDevice(device.name)}
                        className={cn(
                          'relative flex flex-col p-3 rounded-xl border text-left transition-all group hover:shadow-lg',
                          selectedDevice === device.name
                            ? 'bg-blue-600/10 border-blue-500/50 shadow-blue-900/10'
                            : 'bg-gray-800/40 border-gray-800 hover:bg-gray-800/80',
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center',
                              device.type === 'physical'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : device.type === 'running-vm'
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : 'bg-gray-700/50 text-gray-400',
                            )}
                          >
                            {device.type === 'physical' ? (
                              <Smartphone className="w-4 h-4" />
                            ) : device.type === 'running-vm' ? (
                              <Zap className="w-4 h-4" />
                            ) : (
                              <Monitor className="w-4 h-4" />
                            )}
                          </div>
                          {selectedDevice === device.name && (
                            <Check className="w-4 h-4 text-blue-400" />
                          )}
                        </div>

                        <div className="min-w-0 w-full">
                          <h4
                            className={cn(
                              'font-medium truncate text-sm mb-0.5',
                              selectedDevice === device.name ? 'text-blue-100' : 'text-gray-200',
                            )}
                          >
                            {device.name}
                          </h4>
                          <p className="text-[10px] text-gray-500 truncate font-mono uppercase tracking-wide">
                            {device.type === 'physical'
                              ? 'Running • Physical'
                              : device.type === 'running-vm'
                                ? 'Running • VM'
                                : 'Stopped • VM'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-gray-800 bg-gray-900 shrink-0 flex justify-end">
                <button
                  onClick={handleAddMobile}
                  disabled={!selectedDevice}
                  className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
                >
                  Add to Dashboard
                </button>
              </div>
            </div>
          )}

          {viewMode === 'connect' && (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
              <div className="flex border-b border-gray-800 shrink-0">
                <button
                  onClick={() => setActiveTab('qrcode')}
                  className={cn(
                    'flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border-b-2',
                    activeTab === 'qrcode'
                      ? 'border-blue-500 text-blue-400 bg-gray-800/30'
                      : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/20',
                  )}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  QR Code
                </button>
                {/* Wireless ADB Manual connection removed as per user request */}
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
                {activeTab === 'qrcode' && (
                  <div className="text-center w-full max-w-lg space-y-6">
                    {!qrData ? (
                      <div className="py-8 flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                        <p className="text-sm text-gray-500">Generating...</p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-white p-4 rounded-2xl inline-block shadow-2xl">
                          <img src={qrData.qrCode} alt="QR Code" className="w-72 h-72" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-lg font-semibold text-white">Configure Proxy</h4>
                          <p className="text-sm text-gray-400">Scan to download CA Certificate</p>
                        </div>
                        <div className="bg-gray-950/50 rounded-xl px-5 py-4 border border-gray-800 text-base font-mono text-blue-400 break-all select-all shadow-inner">
                          {qrData.setupUrl}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
