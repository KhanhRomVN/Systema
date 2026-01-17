import React, { useState, useEffect, useMemo } from 'react';
import { AppPlatform, AppMode } from '../../../types/apps';
import {
  Search,
  X,
  Loader2,
  Smartphone,
  Check,
  Wifi,
  Zap,
  Monitor,
  AlertCircle,
  RefreshCw,
  Usb,
  Cloud,
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
  existingApps?: { emulatorSerial?: string }[];
}

export const AddAppModal: React.FC<AddAppModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingApps = [],
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'connect'>('list');

  // Device State
  const [deviceList, setDeviceList] = useState<
    { name: string; type: 'vm' | 'physical' | 'running-vm'; serial?: string }[]
  >([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null); // Now stores serial

  // Wireless Connection State
  const [wirelessIp, setWirelessIp] = useState('');
  const [wirelessPort, setWirelessPort] = useState('5555');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectStatus, setConnectStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Wireless ADB Enablement State (per device)
  const [enablingWireless, setEnablingWireless] = useState<Record<string, boolean>>({});
  const [wirelessStatus, setWirelessStatus] = useState<
    Record<string, { ip?: string; message?: string }>
  >({});

  useEffect(() => {
    if (isOpen) {
      loadDevices();
      setViewMode('list');
      setSearchQuery('');
      setSelectedDevice(null);
      setWirelessIp('');
      setWirelessPort('5555');
      setConnectStatus({ type: null, message: '' });
      setEnablingWireless({});
      setWirelessStatus({});
    }
  }, [isOpen]);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const [vms, connected] = await Promise.all([
        window.api.invoke('mobile:list-genymotion-vms'),
        window.api.invoke('mobile:detect-emulators'),
      ]);

      const list: { name: string; type: 'vm' | 'physical' | 'running-vm'; serial?: string }[] = [];

      connected.forEach((dev: any) => {
        list.push({
          name: dev.name || dev.serial,
          type: dev.type === 'physical' ? 'physical' : 'running-vm',
          serial: dev.serial,
        });
      });

      vms.forEach((vm: string) => {
        const isRunning = connected.some((d: any) => d.name === vm || d.id === vm);
        if (!isRunning) {
          list.push({ name: vm, type: 'vm', serial: vm });
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
    const device = deviceList.find((d) => (d.serial || d.name) === selectedDevice);
    if (!device) return;

    onAdd({
      name: device.name,
      platform: 'android',
      mode: 'native',
      emulatorSerial: device.serial || device.name,
    });
    onClose();
  };

  const handleEnableWireless = async (device: { name: string; serial?: string }) => {
    const serial = device.serial || device.name;
    setEnablingWireless((prev) => ({ ...prev, [serial]: true }));
    setWirelessStatus((prev) => ({ ...prev, [serial]: {} }));

    try {
      const result = await window.api.invoke('mobile:enable-wireless-adb', serial);

      if (result.success) {
        setWirelessStatus((prev) => ({
          ...prev,
          [serial]: { ip: result.ip, message: result.message },
        }));

        // Reload devices immediately to show the new wireless device
        await loadDevices();
      } else {
        setWirelessStatus((prev) => ({
          ...prev,
          [serial]: { message: result.error || 'Failed to enable wireless ADB' },
        }));
      }
    } catch (e: any) {
      setWirelessStatus((prev) => ({
        ...prev,
        [serial]: { message: e.message || 'Error enabling wireless ADB' },
      }));
    } finally {
      setEnablingWireless((prev) => ({ ...prev, [serial]: false }));
    }
  };

  const handleWirelessConnect = async () => {
    if (!wirelessIp) {
      setConnectStatus({ type: 'error', message: 'Please enter an IP address' });
      return;
    }

    setIsConnecting(true);
    setConnectStatus({ type: null, message: '' });

    try {
      const result = await window.api.invoke('mobile:connect-wireless', wirelessIp, wirelessPort);
      if (result.success) {
        setConnectStatus({ type: 'success', message: result.message || 'Connected successfully!' });
        setTimeout(() => {
          loadDevices();
          setViewMode('list');
        }, 1500);
      } else {
        setConnectStatus({ type: 'error', message: result.error || 'Connection failed' });
      }
    } catch (e: any) {
      setConnectStatus({ type: 'error', message: e.message || 'Connection failed' });
    } finally {
      setIsConnecting(false);
    }
  };

  const filteredDevices = useMemo(() => {
    // Filter out already-added devices
    const existingSerials = new Set(existingApps.map((app) => app.emulatorSerial).filter(Boolean));
    let availableDevices = deviceList.filter((d) => {
      // Hide devices without serial (stopped/offline VMs)
      if (!d.serial) return false;

      const serial = d.serial || d.name;
      return !existingSerials.has(serial);
    });

    // Apply search filter
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      availableDevices = availableDevices.filter((d) => d.name.toLowerCase().includes(lower));
    }

    return availableDevices;
  }, [deviceList, searchQuery, existingApps]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-white/5 rounded-xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden h-[70vh]">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {viewMode === 'connect' && (
              <button onClick={() => setViewMode('list')} className="hover:bg-gray-800 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            )}
            {viewMode === 'connect' ? 'Wireless ADB Connection' : 'Add Device'}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col bg-gray-950/50">
          {viewMode === 'list' && (
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-gray-800 bg-gray-900/30 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search devices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500/50 outline-none"
                  />
                </div>
                <button
                  onClick={() => setViewMode('connect')}
                  className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg"
                  title="Wireless ADB"
                >
                  <Wifi className="w-4 h-4" />
                </button>
                <button
                  onClick={loadDevices}
                  className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg"
                >
                  <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {isLoading && deviceList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                    <p className="text-sm text-gray-500">Scanning...</p>
                  </div>
                ) : filteredDevices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Smartphone className="w-8 h-8 opacity-20 text-gray-500 mb-2" />
                    <p className="text-sm text-gray-500">
                      {deviceList.length > 0 ? 'All devices already added.' : 'No devices found.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredDevices.map((device) => {
                      const serial = device.serial || device.name;
                      const isEnabling = enablingWireless[serial];
                      const status = wirelessStatus[serial];
                      const isSelected = selectedDevice === serial;
                      const isWireless = serial.includes(':5555');
                      const isEmulator = device.type === 'running-vm' || device.type === 'vm';

                      // Check if there's a wireless device with the same name
                      const hasWirelessDevice = deviceList.some(
                        (d) => d.name === device.name && d.serial?.includes(':5555'),
                      );

                      // Only show WiFi button for physical USB devices without existing wireless connection
                      const showWifiButton =
                        device.type === 'physical' && !isWireless && !hasWirelessDevice;

                      return (
                        <button
                          key={serial}
                          onClick={() => setSelectedDevice(serial)}
                          className={cn(
                            'relative flex flex-col p-3 rounded-xl border text-left transition-all',
                            isSelected
                              ? 'bg-blue-600/10 border-blue-500/50'
                              : 'bg-gray-800/40 border-gray-800 hover:bg-gray-800/80',
                          )}
                        >
                          {/* Type Badge - Top Right */}
                          <div className="absolute top-2 right-2">
                            {isWireless ? (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20">
                                <Wifi className="w-2.5 h-2.5 text-green-400" />
                                <span className="text-[9px] font-bold text-green-400 uppercase tracking-wide">
                                  Wireless
                                </span>
                              </div>
                            ) : isEmulator ? (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20">
                                <Cloud className="w-2.5 h-2.5 text-purple-400" />
                                <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wide">
                                  Emulator
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                                <Usb className="w-2.5 h-2.5 text-blue-400" />
                                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wide">
                                  USB
                                </span>
                              </div>
                            )}
                          </div>

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
                            {showWifiButton && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEnableWireless(device);
                                }}
                                disabled={isEnabling}
                                className={cn(
                                  'p-1.5 rounded-lg transition-all',
                                  isEnabling
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-gray-700/50 text-gray-400 hover:bg-blue-500/20 hover:text-blue-400',
                                )}
                                title={
                                  isEnabling ? 'Enabling wireless ADB...' : 'Enable wireless ADB'
                                }
                              >
                                {isEnabling ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Wifi className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                          <h4
                            className={cn(
                              'font-medium truncate text-sm',
                              isSelected ? 'text-blue-100' : 'text-gray-200',
                            )}
                          >
                            {device.name}
                          </h4>
                          <p className="text-[10px] text-gray-500 truncate font-mono uppercase">
                            {device.type === 'physical'
                              ? isWireless
                                ? 'Running • Wireless'
                                : 'Running • USB'
                              : device.type === 'running-vm'
                                ? 'Running • VM'
                                : 'Stopped • VM'}
                          </p>
                          {status?.message && !status?.ip && (
                            <div className="mt-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-[9px] text-yellow-400">
                              {status.message}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-gray-800 bg-gray-900 flex justify-end">
                <button
                  onClick={handleAddMobile}
                  disabled={!selectedDevice}
                  className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                >
                  Add to Dashboard
                </button>
              </div>
            </div>
          )}

          {viewMode === 'connect' && (
            <div className="flex flex-col h-full p-6 items-center justify-center">
              <div className="w-full max-w-md space-y-4">
                <p className="text-sm text-gray-400 text-center mb-4">
                  Ensure device is on the same network and ADB over TCP/IP is enabled (port 5555).
                </p>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                    Device IP Address
                  </label>
                  <div className="relative">
                    <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                      type="text"
                      value={wirelessIp}
                      onChange={(e) => setWirelessIp(e.target.value)}
                      placeholder="192.168.1.x"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-500/50 outline-none font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                    Port
                  </label>
                  <input
                    type="text"
                    value={wirelessPort}
                    onChange={(e) => setWirelessPort(e.target.value)}
                    placeholder="5555"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none font-mono"
                  />
                </div>
                {connectStatus.type && (
                  <div
                    className={cn(
                      'rounded-lg p-3 flex items-start gap-2 text-sm',
                      connectStatus.type === 'success'
                        ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400',
                    )}
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    <span>{connectStatus.message}</span>
                  </div>
                )}
                <button
                  onClick={handleWirelessConnect}
                  disabled={isConnecting || !wirelessIp || !wirelessPort}
                  className="w-full mt-4 flex items-center justify-center py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Connect
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
