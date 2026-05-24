import React from 'react';
import { Play, Pause, Clock, Globe } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { MemoryMonitor } from '../MemoryMonitor';
import { formatDistanceToNow } from 'date-fns';

// Countdown timer component - separated to prevent re-rendering parent
const CountdownTimer = React.memo(({ nextSaveTime }: { nextSaveTime: number | null }) => {
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!nextSaveTime) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [nextSaveTime]);

  if (!nextSaveTime) return null;

  const diff = Math.max(0, Math.ceil((nextSaveTime - Date.now()) / 1000));
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;

  return (
    <span className="text-[10px] text-text-secondary px-1.5 border-l border-divider/50 tabular-nums">
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  );
});
CountdownTimer.displayName = 'CountdownTimer';

export interface TopbarProps {
  appId?: string;
  appName: string;
  onOpenTargetSelector: () => void;
  composerRequest: any;
  selectedRequest: any;
  requests: any[];
  isPaused: boolean;
  setIsPaused: (val: boolean) => void;
  isIntercepting: boolean;
  onSetIntercept: (val: boolean) => void;
  autoSaveInterval: number;
  setAutoSaveInterval: (val: number) => void;
  nextSaveTime: number | null;
  setNextSaveTime: (val: number | null) => void;
  lastSavedTime: number | null;
  platform?: 'web' | 'pc' | 'android';
  fridaStatus?: 'running' | 'installed' | 'not_installed' | 'unknown';
  onInstallFrida?: () => void;
  onStartFrida?: () => void;
  onInjectBypass?: () => void;
  onInstallCert?: () => void;
  onOpenSaveProfile: () => void;
  _emulatorSerial?: string;
}

export function Topbar({
  appId,
  appName,
  onOpenTargetSelector,
  composerRequest,
  selectedRequest,
  requests,
  isPaused,
  setIsPaused,
  isIntercepting,
  onSetIntercept,
  autoSaveInterval,
  setAutoSaveInterval,
  nextSaveTime,
  setNextSaveTime,
  lastSavedTime,
  platform,
  fridaStatus,
  onInstallFrida,
  onStartFrida,
  onInjectBypass,
  onInstallCert,
  onOpenSaveProfile,
}: TopbarProps) {
  return (
    <div className="h-10 border-b border-divider flex items-center px-3 bg-table-headerBg gap-3 select-none">
      {/* Left Section - Target Selector */}
      <button
        onClick={onOpenTargetSelector}
        className={cn(
          'text-xs px-2.5 py-1 rounded font-bold transition-all flex items-center gap-1.5 active:scale-95 border cursor-pointer select-none',
          appId
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
            : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
        )}
      >
        {appId ? (
          <>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Target: {appName}
          </>
        ) : (
          <>
            <Globe className="w-3.5 h-3.5" />
            Select Target...
          </>
        )}
      </button>
      <div className="h-4 w-px bg-divider/50" />

      {/* Current URL & App Info */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {composerRequest ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-500 font-medium whitespace-nowrap">
              Composer
            </span>
            <span
              className="text-xs text-text-secondary truncate max-w-[300px]"
              title={`${composerRequest.protocol}://${composerRequest.host}${composerRequest.path}`}
            >
              {composerRequest.protocol}://{composerRequest.host}
              {composerRequest.path}
            </span>
          </div>
        ) : selectedRequest ? (
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-xs text-text-secondary truncate max-w-[300px]"
              title={`${selectedRequest.protocol}://${selectedRequest.host}${selectedRequest.path}`}
            >
              {selectedRequest.protocol}://{selectedRequest.host}
              {selectedRequest.path}
            </span>
          </div>
        ) : (
          <span className="text-xs text-text-secondary italic">No request selected</span>
        )}
        {requests.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border transition-all',
                isPaused
                  ? 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20'
                  : 'bg-success/10 text-success border-success/30 hover:bg-success/20',
              )}
              title={isPaused ? 'Resume Tracking' : 'Pause Tracking'}
            >
              {isPaused ? (
                <Pause className="w-3 h-3 fill-current" />
              ) : (
                <Play className="w-3 h-3 fill-current" />
              )}
              {isPaused ? 'Paused' : 'Tracking'}
            </button>
          </div>
        )}

        {/* Auto-save & Profile Status */}
        <div className="flex items-center gap-2 ml-2">
          {/* Auto-save Config */}
          <div className="flex items-center rounded-md border border-divider/50 p-0.5 bg-background/50">
            <button
              onClick={() => {
                // Cycle modes: 0 -> 1 -> 5 -> 10 -> 0
                const modes = [0, 1, 5, 10];
                const next = modes[(modes.indexOf(autoSaveInterval) + 1) % modes.length];
                setAutoSaveInterval(next);
                if (next > 0) setNextSaveTime(Date.now() + next * 60 * 1000);
                else setNextSaveTime(null);
              }}
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors',
                autoSaveInterval > 0
                  ? 'text-primary bg-primary/10'
                  : 'text-text-secondary hover:text-text-primary',
              )}
              title="Toggle Auto-save Interval (Off, 1m, 5m, 10m)"
            >
              <Clock className="w-3 h-3" />
              {autoSaveInterval > 0 ? `${autoSaveInterval}m` : 'Off'}
            </button>
            {autoSaveInterval > 0 && <CountdownTimer nextSaveTime={nextSaveTime} />}
          </div>

          {/* Last Saved Profile Badge */}
          {lastSavedTime && (
            <div className="flex items-center gap-1 text-[10px] text-text-secondary animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Saved {formatDistanceToNow(lastSavedTime, { addSuffix: true })}
            </div>
          )}
        </div>
      </div>

      {/* Center - Toolbar Menu */}
      <div className="flex items-center gap-1 border-x border-divider/50 px-2 min-w-fit">
        {/* Intercept Button */}
        <button
          onClick={() => onSetIntercept(!isIntercepting)}
          className={cn(
            'p-1.5 rounded text-xs font-medium transition-all',
            isIntercepting
              ? 'bg-error/20 text-error hover:bg-error/30'
              : 'text-text-secondary hover:bg-secondary hover:text-text-primary',
          )}
          title={isIntercepting ? 'Stop Intercepting' : 'Start Intercepting'}
        >
          <div
            className={cn(
              'w-4 h-4 rounded-full border-2',
              isIntercepting ? 'border-error bg-error' : 'border-divider',
            )}
          />
        </button>

        {/* Profile Save Button */}
        {appId && (
          <button
            onClick={onOpenSaveProfile}
            className="px-2 py-1 rounded text-xs font-medium border border-divider hover:bg-secondary text-text-secondary hover:text-text-primary transition-all"
            title="Save Current Profile"
          >
            Save Profile
          </button>
        )}
      </div>

      {/* Right Section - Metrics */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 text-primary text-xs whitespace-nowrap">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span className="font-medium">
            {requests.filter((r) => r.protocol === 'https').length}
          </span>
        </div>
        <MemoryMonitor />
      </div>

      {platform === 'android' && (
        <div className="flex items-center gap-2 border-l border-divider/50 pl-2">
          <span className="text-xs text-text-secondary">Frida:</span>
          {fridaStatus === 'running' ? (
            <>
              <span className="text-xs text-success font-medium flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                Running
              </span>
              <button
                onClick={onInjectBypass}
                className="px-2 py-1 rounded text-xs bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600/20 border border-indigo-500/30 transition-colors"
                title="Inject Universal SSL Pinning Bypass"
              >
                SSL Bypass
              </button>
              <button
                onClick={onInstallCert}
                className="px-2 py-1 rounded text-xs bg-warning/10 text-warning hover:bg-warning/20 border border-warning/30 transition-colors"
                title="Install Proxy CA Certificate (Requires Root)"
              >
                Install Cert
              </button>
            </>
          ) : fridaStatus === 'installed' ? (
            <button
              onClick={onStartFrida}
              className="px-2 py-1 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-colors"
              title="Start Frida Server"
            >
              Start
            </button>
          ) : (
            <button
              onClick={onInstallFrida}
              className="px-2 py-1 rounded text-xs bg-secondary hover:bg-secondary/80 border border-divider transition-colors"
              title="Install Frida Server on Device"
            >
              Install
            </button>
          )}
        </div>
      )}
    </div>
  );
}
