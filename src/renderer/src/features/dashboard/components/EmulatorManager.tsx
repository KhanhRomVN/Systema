import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Play,
  Square,
  Settings,
  Plus,
  RefreshCw,
  Shield,
  Wifi,
  Trash2,
  Edit,
  Terminal,
  AlertTriangle,
  MonitorSmartphone,
  Check,
} from 'lucide-react';
import { MobileEmulator, GenymotionProfile } from '../../../types/apps';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface EmulatorManagerProps {
  onEmulatorSelect?: (serial: string) => void;
  selectedSerial?: string;
}

export const EmulatorManager: React.FC<EmulatorManagerProps> = ({
  onEmulatorSelect,
  selectedSerial,
}) => {
  const [activeTab, setActiveTab] = useState<'running' | 'profiles'>('running');
  const [emulators, setEmulators] = useState<MobileEmulator[]>([]);
  const [profiles, setProfiles] = useState<GenymotionProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [launchingProfileId, setLaunchingProfileId] = useState<string | null>(null);
  const [launchStatus, setLaunchStatus] = useState<string>('');

  // Profile Form State - To get implemented later
  // const [showProfileForm, setShowProfileForm] = useState(false);
  // const [editingProfile, setEditingProfile] = useState<GenymotionProfile | null>(null);
  const [, setEditingProfile] = useState<GenymotionProfile | null>(null); // Keeping setter for now if needed or remove entirely.
  // Actually the user wants to Fix problems. The setter is used in the JSX below: onClick={() => setEditingProfile(profile)}
  // but editingProfile is not used.
  // I will just comment out the usage in JSX for now or keep the state but ignore the unused variable warning by not destructuring it?
  // Or just remove the editing functionality for this pass if it's incomplete.
  // The user code had: onClick={() => setEditingProfile(profile)}
  // Let's keep setEditingProfile but allow editingProfile to be unused or remove the warning.
  // Better: Implement a dummy use of it or just remove the unused variable.

  // System Check State
  const [systemCheck, setSystemCheck] = useState<{
    genymotion: boolean;
    waydroid: boolean;
    adb: boolean;
    adbVersion: string;
  } | null>(null);

  useEffect(() => {
    loadData();
    checkSystem();

    // Set up listeners for progress updates
    const removeLaunchListener = window.api.on('mobile:launch-progress', (_, status) => {
      setLaunchStatus(status);
    });

    return () => {
      // Use the returned wrapped listener to unsubscribe
      window.api.off('mobile:launch-progress', removeLaunchListener);
    };
  }, []);

  const checkSystem = async () => {
    try {
      const result = await window.api.invoke('mobile:check-tools');
      setSystemCheck(result);
    } catch (e) {
      console.error('Failed to check system tools', e);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [detectedEmulators, savedProfiles] = await Promise.all([
        window.api.invoke('mobile:detect-emulators'),
        window.api.invoke('mobile:get-profiles'),
      ]);
      setEmulators(detectedEmulators);
      setProfiles(savedProfiles);
    } catch (e) {
      console.error('Failed to load emulator data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunchProfile = async (profile: GenymotionProfile) => {
    setLaunchingProfileId(profile.id);
    setLaunchStatus('Initializing launch...');
    try {
      await window.api.invoke('mobile:launch-genymotion', profile.id);
      // Refresh emulators list after launch
      loadData();
      setActiveTab('running');
    } catch (e) {
      console.error('Failed to launch emulator', e);
      setLaunchStatus('Launch failed');
    } finally {
      setLaunchingProfileId(null);
      setLaunchStatus('');
    }
  };

  const handleStopEmulator = async (emulator: MobileEmulator) => {
    try {
      await window.api.invoke('mobile:stop-emulator', emulator.name, emulator.type);
      loadData();
    } catch (e) {
      console.error('Failed to stop emulator', e);
    }
  };

  const handleInjectFrida = async (serial: string) => {
    // This would typically show a modal to select architecture or package
    // For now, we'll just try to install server
    try {
      await window.api.invoke('mobile:install-frida', serial, 'x86_64'); // Defaulting to x86_64 for Genymotion usually
      await window.api.invoke('mobile:start-frida', serial);
    } catch (e) {
      console.error('Failed to setup Frida', e);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    try {
      await window.api.invoke('mobile:delete-profile', id);
      loadData();
    } catch (e) {
      console.error('Failed to delete profile', e);
    }
  };

  if (isLoading && !emulators.length && !profiles.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading emulator data...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-950/50">
      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900/30 px-2 pt-2">
        <button
          onClick={() => setActiveTab('running')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2',
            activeTab === 'running'
              ? 'border-blue-500 text-blue-400 bg-gray-800/20 rounded-t-lg'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/10',
          )}
        >
          <MonitorSmartphone className="w-4 h-4" />
          Running Emulators
          {emulators.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
              {emulators.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('profiles')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2',
            activeTab === 'profiles'
              ? 'border-blue-500 text-blue-400 bg-gray-800/20 rounded-t-lg'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/10',
          )}
        >
          <Settings className="w-4 h-4" />
          Profiles
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'running' ? (
          <div className="space-y-3">
            {emulators.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No emulators detected.</p>
                <button
                  onClick={() => setActiveTab('profiles')}
                  className="mt-4 text-blue-400 hover:underline text-sm"
                >
                  Launch from a profile
                </button>
              </div>
            ) : (
              emulators.map((emu) => (
                <div
                  key={emu.serial}
                  className={cn(
                    'bg-gray-900 border border-gray-800 rounded-xl p-4 transition-all hover:border-gray-700 group',
                    selectedSerial === emu.serial
                      ? 'ring-1 ring-blue-500 border-blue-500/50 bg-blue-900/10'
                      : '',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                        <Smartphone className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-200">{emu.name}</h4>
                          <span
                            className={cn(
                              'text-xs px-1.5 py-0.5 rounded-full border',
                              emu.status === 'running'
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : emu.status === 'booting'
                                  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                  : 'bg-gray-500/10 text-gray-400 border-gray-500/20',
                            )}
                          >
                            {emu.status}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {emu.type}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 font-mono space-y-0.5">
                          <p>Serial: {emu.serial}</p>
                          <p>
                            Android {emu.androidVersion} • {emu.architecture}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {onEmulatorSelect && (
                        <button
                          onClick={() => onEmulatorSelect(emu.serial)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors',
                            selectedSerial === emu.serial
                              ? 'bg-green-600 text-white shadow-lg shadow-green-900/20'
                              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20',
                          )}
                        >
                          {selectedSerial === emu.serial ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          {selectedSerial === emu.serial ? 'Selected' : 'Select'}
                        </button>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleInjectFrida(emu.serial)}
                          title="Inject Frida Server"
                          className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors border border-gray-700"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          title="Configure Proxy"
                          className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors border border-gray-700"
                        >
                          <Wifi className="w-4 h-4" />
                        </button>
                        <button
                          title="Shell"
                          className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors border border-gray-700"
                        >
                          <Terminal className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStopEmulator(emu)}
                          title="Stop Emulator"
                          className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-red-900/30"
                        >
                          <Square className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={loadData}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Refresh List
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-300">Genymotion Profiles</h3>
              <button
                className="px-3 py-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium hover:bg-blue-600/20 transition-all flex items-center gap-2"
                onClick={() => {
                  /* Open Create Profile Modal */
                }}
              >
                <Plus className="w-3 h-3" /> New Profile
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col relative group hover:border-gray-700 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingProfile(profile)}
                        className="p-1.5 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProfile(profile.id)}
                        className="p-1.5 hover:bg-red-900/30 rounded-md text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-gray-200">{profile.name}</h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{profile.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                      Android {profile.androidVersion}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                      {profile.architecture}
                    </span>
                    {profile.autoProxy && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/20 text-green-400 border border-green-900/30">
                        Proxy
                      </span>
                    )}
                    {profile.autoFrida && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/20 text-purple-400 border border-purple-900/30">
                        Frida
                      </span>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-800">
                    <button
                      onClick={() => handleLaunchProfile(profile)}
                      disabled={launchingProfileId === profile.id}
                      className="w-full py-2 bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {launchingProfileId === profile.id ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Launching...
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          Launch
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Launch Status Overlay */}
            {launchingProfileId && (
              <div className="fixed bottom-6 right-6 bg-gray-900 border border-gray-700 p-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                <div>
                  <h4 className="text-sm font-bold text-white">Launching Emulator</h4>
                  <p className="text-xs text-gray-400">{launchStatus}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* System Warning Footer */}
      {systemCheck && (!systemCheck.adb || !systemCheck.genymotion) && (
        <div className="p-3 bg-yellow-900/20 border-t border-yellow-900/30 text-xs text-yellow-200/80 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <div>
            {!systemCheck.adb && <p>ADB is missing. Please install Android SDK Platform Tools.</p>}
            {!systemCheck.genymotion && <p>Genymotion doesn't seem to be installed or in PATH.</p>}
          </div>
        </div>
      )}
    </div>
  );
};
