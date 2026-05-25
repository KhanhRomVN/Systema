import React, { useState, useEffect, useMemo } from 'react';
import { AppPlatform, AppMode, DiscoveredApp, MobileEmulator } from '../../../../../types/apps';
import {
  X,
  Search,
  Loader2,
  Monitor,
  RefreshCw,
  Smartphone,
  Wifi,
  Zap,
  Cloud,
  Usb,
  AlertCircle,
  Check,
  Terminal,
  Globe,
} from 'lucide-react';
import { cn } from '../../../../../shared/lib/utils';

type DrawerPlatform = 'web' | 'pc' | 'android' | 'cli';

interface AddTargetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  platform: DrawerPlatform;
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
  // For edit mode
  editApp?: { id: string; name: string; url?: string; executablePath?: string } | null;
  onEdit?: (id: string, data: { name: string; url?: string; executablePath?: string }) => void;
}

export const AddTargetDrawer: React.FC<AddTargetDrawerProps> = ({
  isOpen,
  onClose,
  platform,
  onAdd,
  existingApps = [],
  editApp,
  onEdit,
}) => {
  // Web / CLI form
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [command, setCommand] = useState('');

  // PC
  const [discoveredApps, setDiscoveredApps] = useState<DiscoveredApp[]>([]);
  const [selectedPcApp, setSelectedPcApp] = useState<DiscoveredApp | null>(null);
  const [pcLoading, setPcLoading] = useState(false);
  const [pcSearch, setPcSearch] = useState('');

  // Android
  const [deviceList, setDeviceList] = useState<
    { name: string; type: 'vm' | 'physical' | 'running-vm'; serial?: string }[]
  >([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [androidLoading, setAndroidLoading] = useState(false);
  const [androidSearch, setAndroidSearch] = useState('');
  const [androidView, setAndroidView] = useState<'list' | 'connect'>('list');
  const [wirelessIp, setWirelessIp] = useState('');
  const [wirelessPort, setWirelessPort] = useState('5555');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectStatus, setConnectStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [enablingWireless, setEnablingWireless] = useState<Record<string, boolean>>({});
  const [wirelessStatus, setWirelessStatus] = useState<
    Record<string, { ip?: string; message?: string }>
  >({});

  const isEdit = !!editApp;

  useEffect(() => {
    if (!isOpen) return;
    // Pre-fill for edit
    if (editApp) {
      setName(editApp.name || '');
      setUrl(editApp.url || '');
      setCommand(editApp.executablePath || '');
    } else {
      setName('');
      setUrl('');
      setCommand('');
      setSelectedPcApp(null);
      setSelectedDevice(null);
      setPcSearch('');
      setAndroidSearch('');
      setAndroidView('list');
    }
    if (platform === 'pc') loadPcApps();
    if (platform === 'android') loadAndroidDevices();
  }, [isOpen, platform]);

  const loadPcApps = async () => {
    setPcLoading(true);
    try {
      setDiscoveredApps(await window.api.invoke('apps:scan-pc'));
    } catch (e) {
      console.error(e);
    } finally {
      setPcLoading(false);
    }
  };

  const loadAndroidDevices = async () => {
    setAndroidLoading(true);
    try {
      const [vms, connected] = await Promise.all([
        window.api.invoke('mobile:list-genymotion-vms'),
        window.api.invoke('mobile:detect-emulators'),
      ]);
      const list: typeof deviceList = [];
      connected.forEach((dev: any) =>
        list.push({
          name: dev.name || dev.serial,
          type: dev.type === 'physical' ? 'physical' : 'running-vm',
          serial: dev.serial,
        }),
      );
      vms.forEach((vm: string) => {
        if (!connected.some((d: any) => d.name === vm || d.id === vm))
          list.push({ name: vm, type: 'vm', serial: vm });
      });
      setDeviceList(list);
    } catch (e) {
      console.error(e);
    } finally {
      setAndroidLoading(false);
    }
  };

  const handleEnableWireless = async (device: { name: string; serial?: string }) => {
    const serial = device.serial || device.name;
    setEnablingWireless((p) => ({ ...p, [serial]: true }));
    try {
      const result = await window.api.invoke('mobile:enable-wireless-adb', serial);
      setWirelessStatus((p) => ({
        ...p,
        [serial]: result.success
          ? { ip: result.ip, message: result.message }
          : { message: result.error || 'Failed' },
      }));
      if (result.success) await loadAndroidDevices();
    } catch (e: any) {
      setWirelessStatus((p) => ({ ...p, [serial]: { message: e.message } }));
    } finally {
      setEnablingWireless((p) => ({ ...p, [serial]: false }));
    }
  };

  const handleWirelessConnect = async () => {
    if (!wirelessIp) {
      setConnectStatus({ type: 'error', message: 'Enter an IP address' });
      return;
    }
    setIsConnecting(true);
    setConnectStatus({ type: null, message: '' });
    try {
      const result = await window.api.invoke('mobile:connect-wireless', wirelessIp, wirelessPort);
      if (result.success) {
        setConnectStatus({ type: 'success', message: result.message || 'Connected!' });
        setTimeout(() => {
          loadAndroidDevices();
          setAndroidView('list');
        }, 1500);
      } else setConnectStatus({ type: 'error', message: result.error || 'Failed' });
    } catch (e: any) {
      setConnectStatus({ type: 'error', message: e.message });
    } finally {
      setIsConnecting(false);
    }
  };

  const filteredPcApps = useMemo(() => {
    if (!pcSearch) return discoveredApps;
    const l = pcSearch.toLowerCase();
    return discoveredApps.filter(
      (a) => a.name.toLowerCase().includes(l) || a.description?.toLowerCase().includes(l),
    );
  }, [discoveredApps, pcSearch]);

  const filteredDevices = useMemo(() => {
    const existingSerials = new Set(existingApps.map((a) => a.emulatorSerial).filter(Boolean));
    return deviceList.filter(
      (d) =>
        d.serial &&
        !existingSerials.has(d.serial) &&
        (!androidSearch || d.name.toLowerCase().includes(androidSearch.toLowerCase())),
    );
  }, [deviceList, androidSearch, existingApps]);

  const checkDuplicate = () => {
    if (platform === 'web') {
      const existingWebApp = existingApps.find(
        (app) => app.name?.toLowerCase() === name.toLowerCase() || app.url?.toLowerCase() === url.toLowerCase()
      );
      if (existingWebApp) {
        alert(`Target already exists with name "${existingWebApp.name}" or URL "${existingWebApp.url}"`);
        return true;
      }
    } else if (platform === 'cli') {
      const existingCliApp = existingApps.find(
        (app) => app.name?.toLowerCase() === name.toLowerCase() || app.executablePath?.toLowerCase() === command.toLowerCase()
      );
      if (existingCliApp) {
        alert(`Target already exists with name "${existingCliApp.name}" or command "${existingCliApp.executablePath}"`);
        return true;
      }
    } else if (platform === 'pc') {
      if (selectedPcApp) {
        const existingPcApp = existingApps.find(
          (app) => app.name?.toLowerCase() === selectedPcApp.name.toLowerCase() || 
                   app.executablePath?.toLowerCase() === selectedPcApp.exec.toLowerCase()
        );
        if (existingPcApp) {
          alert(`Target already exists with name "${existingPcApp.name}" or path "${existingPcApp.executablePath}"`);
          return true;
        }
      }
    } else if (platform === 'android') {
      if (selectedDevice) {
        const device = deviceList.find((d) => (d.serial || d.name) === selectedDevice);
        if (device) {
          const existingAndroidApp = existingApps.find(
            (app) => app.name?.toLowerCase() === device.name.toLowerCase() || 
                     app.emulatorSerial?.toLowerCase() === (device.serial || device.name).toLowerCase()
          );
          if (existingAndroidApp) {
            alert(`Target already exists with name "${existingAndroidApp.name}" or device "${existingAndroidApp.emulatorSerial}"`);
            return true;
          }
        }
      }
    }
    return false;
  };

  const handleSubmit = () => {
    if (isEdit && editApp && onEdit) {
      onEdit(editApp.id, {
        name,
        url: platform === 'web' ? url : undefined,
        executablePath: platform === 'cli' ? command : undefined,
      });
      onClose();
      return;
    }
    
    if (checkDuplicate()) return;
    
    if (platform === 'web') {
      if (!name || !url) return;
      onAdd({ name, url, mode: 'browser', platform: 'web' });
    } else if (platform === 'cli') {
      if (!name || !command) return;
      onAdd({ name, executablePath: command, mode: 'native', platform: 'cli' });
    } else if (platform === 'pc') {
      if (!selectedPcApp) return;
      onAdd({
        name: selectedPcApp.name,
        executablePath: selectedPcApp.exec,
        platform: 'pc',
        mode: 'native',
        icon: selectedPcApp.icon,
      });
    } else if (platform === 'android') {
      if (!selectedDevice) return;
      const device = deviceList.find((d) => (d.serial || d.name) === selectedDevice);
      if (!device) return;
      onAdd({
        name: device.name,
        platform: 'android',
        mode: 'native',
        emulatorSerial: device.serial || device.name,
      });
    }
    onClose();
  };

  const canSubmit =
    platform === 'web'
      ? !!(name && url)
      : platform === 'cli'
        ? !!(name && command)
        : platform === 'pc'
          ? !!selectedPcApp
          : !!selectedDevice;

  const platformMeta = {
    web: { icon: Globe, label: 'Website', color: 'text-sky-400' },
    pc: { icon: Monitor, label: 'PC App', color: 'text-violet-400' },
    android: { icon: Smartphone, label: 'Android', color: 'text-emerald-400' },
    cli: { icon: Terminal, label: 'CLI Command', color: 'text-amber-400' },
  }[platform];
  const PlatformIcon = platformMeta.icon;

  if (!isOpen) return null;

  return (
    <>
      <div className="absolute inset-0 bg-black/40 z-40" onClick={onClose} />
      <div
        className="absolute bottom-0 left-0 right-0 z-50 bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: '80%' }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
          <div
            className={cn(
              'flex items-center justify-center w-9 h-10 rounded-lg border shrink-0',
              platform === 'web'
                ? 'bg-sky-500/15 border-sky-500/25'
                : platform === 'pc'
                  ? 'bg-violet-500/15 border-violet-500/25'
                  : platform === 'android'
                    ? 'bg-emerald-500/15 border-emerald-500/25'
                    : 'bg-amber-500/15 border-amber-500/25',
            )}
          >
            <PlatformIcon className={cn('w-4 h-4', platformMeta.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-text-primary">
              {isEdit ? `Edit ${platformMeta.label}` : `Add ${platformMeta.label}`}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {isEdit
                ? 'Update target details'
                : `Configure a new ${platformMeta.label.toLowerCase()} target`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-secondary text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Web */}
          {platform === 'web' && (
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My API Server"
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* CLI */}
          {platform === 'cli' && (
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Node API"
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  COMMAND
                </label>
                <textarea
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="e.g. npm run start"
                  rows={3}
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary outline-none focus:border-primary resize-none"
                />
                <p className="text-[10px] text-text-secondary mt-1.5 italic">
                  Proxy env vars will be auto-injected.
                </p>
              </div>
            </div>
          )}

          {/* PC */}
          {platform === 'pc' && (
            <div className="flex flex-col" style={{ height: '50vh' }}>
              <div className="p-3 border-b border-divider flex gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search apps..."
                    value={pcSearch}
                    onChange={(e) => setPcSearch(e.target.value)}
                    className="w-full bg-table-headerBg border border-input-border-default rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary outline-none focus:border-primary/50"
                  />
                </div>
                <button
                  onClick={loadPcApps}
                  className="p-2 bg-secondary hover:bg-sidebar-itemHover border border-divider rounded-lg"
                >
                  <RefreshCw
                    className={cn('w-4 h-4 text-text-secondary', pcLoading && 'animate-spin')}
                  />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {pcLoading && !discoveredApps.length ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-sm text-text-secondary">Scanning...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredPcApps.map((app) => {
                      const isSelected =
                        selectedPcApp?.exec === app.exec && selectedPcApp?.name === app.name;
                      return (
                        <button
                          key={`${app.name}-${app.exec}`}
                          onClick={() => setSelectedPcApp(app)}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                            isSelected
                              ? 'bg-primary/10 border-primary/40'
                              : 'bg-table-headerBg border-divider/40 hover:bg-sidebar-itemHover/60',
                          )}
                        >
                          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                            {app.icon ? (
                              <img
                                src={`media://${app.icon}`}
                                alt={app.name}
                                className="w-8 h-8 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Monitor className="w-4 h-4 text-text-secondary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-text-primary truncate">
                              {app.name}
                            </div>
                            <div className="text-[10px] text-text-secondary truncate">
                              {app.description || 'System App'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Android */}
          {platform === 'android' && (
            <div className="flex flex-col" style={{ height: '50vh' }}>
              {androidView === 'list' ? (
                <>
                  <div className="p-3 border-b border-divider flex gap-2 shrink-0">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                      <input
                        type="text"
                        placeholder="Search devices..."
                        value={androidSearch}
                        onChange={(e) => setAndroidSearch(e.target.value)}
                        className="w-full bg-table-headerBg border border-input-border-default rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary outline-none focus:border-primary/50"
                      />
                    </div>
                    <button
                      onClick={() => setAndroidView('connect')}
                      className="p-2 bg-secondary hover:bg-sidebar-itemHover border border-divider rounded-lg"
                      title="Wireless ADB"
                    >
                      <Wifi className="w-4 h-4 text-text-secondary" />
                    </button>
                    <button
                      onClick={loadAndroidDevices}
                      className="p-2 bg-secondary hover:bg-sidebar-itemHover border border-divider rounded-lg"
                    >
                      <RefreshCw
                        className={cn(
                          'w-4 h-4 text-text-secondary',
                          androidLoading && 'animate-spin',
                        )}
                      />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    {androidLoading && !deviceList.length ? (
                      <div className="flex flex-col items-center justify-center h-full gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <p className="text-sm text-text-secondary">Scanning...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {filteredDevices.map((device) => {
                          const serial = device.serial || device.name;
                          const isSelected = selectedDevice === serial;
                          const isWireless = serial.includes(':5555');
                          const isEnabling = enablingWireless[serial];
                          const status = wirelessStatus[serial];
                          const showWifi =
                            device.type === 'physical' &&
                            !isWireless &&
                            !deviceList.some(
                              (d) => d.name === device.name && d.serial?.includes(':5555'),
                            );
                          return (
                            <button
                              key={serial}
                              onClick={() => setSelectedDevice(serial)}
                              className={cn(
                                'relative flex flex-col p-3 rounded-xl border text-left transition-all',
                                isSelected
                                  ? 'bg-primary/10 border-primary/40'
                                  : 'bg-table-headerBg border-divider/40 hover:bg-sidebar-itemHover/60',
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
                                        : 'bg-secondary text-text-secondary',
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
                                {showWifi && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEnableWireless(device);
                                    }}
                                    disabled={isEnabling}
                                    className="p-1.5 rounded-lg bg-secondary hover:bg-blue-500/20 hover:text-blue-400 text-text-secondary transition-all"
                                  >
                                    {isEnabling ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Wifi className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                              <div className="text-xs font-semibold text-text-primary truncate">
                                {device.name}
                              </div>
                              <div className="text-[10px] text-text-secondary mt-0.5">
                                {isWireless
                                  ? 'Wireless'
                                  : device.type === 'physical'
                                    ? 'USB'
                                    : device.type === 'running-vm'
                                      ? 'Running VM'
                                      : 'Stopped VM'}
                              </div>
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
                </>
              ) : (
                <div className="flex-1 p-5 space-y-4">
                  <button
                    onClick={() => setAndroidView('list')}
                    className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
                  >
                    <X className="w-3.5 h-3.5" />
                    Back to device list
                  </button>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1.5">
                      DEVICE IP
                    </label>
                    <input
                      type="text"
                      value={wirelessIp}
                      onChange={(e) => setWirelessIp(e.target.value)}
                      placeholder="192.168.1.x"
                      className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1.5">
                      PORT
                    </label>
                    <input
                      type="text"
                      value={wirelessPort}
                      onChange={(e) => setWirelessPort(e.target.value)}
                      placeholder="5555"
                      className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary outline-none focus:border-primary"
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
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      {connectStatus.message}
                    </div>
                  )}
                  <button
                    onClick={handleWirelessConnect}
                    disabled={isConnecting || !wirelessIp}
                    className="w-full py-2.5 rounded-lg font-bold text-sm bg-primary hover:bg-primary/90 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Connect
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-divider flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {isEdit ? 'Save Changes' : 'Add Target'}
          </button>
        </div>
      </div>
    </>
  );
};
