import { Settings, X, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ProviderConfig, ProviderType, ElaraFreeConfig } from '../../../../../../types/provider-types';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { cn } from '../../../../../../shared/lib/utils';

interface SettingsPanelProps {
  onClose: () => void;
  currentProviderConfig: ProviderConfig | null;
  onUpdateProviderConfig: (config: ProviderConfig) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

const STORAGE_KEY = 'systema-agent-ai-language';

export default function SettingsPanel({ onClose, currentProviderConfig, onUpdateProviderConfig }: SettingsPanelProps) {
  const [baseURL, setBaseURL] = useState('http://localhost:8888');
  const [aiLanguage, setAiLanguage] = useState(() => localStorage.getItem(STORAGE_KEY) || 'English');

  useEffect(() => {
    if (currentProviderConfig?.type === ProviderType.ELARA_FREE) {
      setBaseURL((currentProviderConfig as ElaraFreeConfig).baseURL || 'http://localhost:8888');
    }
  }, [currentProviderConfig]);

  const { isConnected, isChecking } = useHealthCheck(baseURL);

  const handleBaseURLBlur = () => {
    if (currentProviderConfig?.type === ProviderType.ELARA_FREE) {
      onUpdateProviderConfig({ ...currentProviderConfig, baseURL: baseURL.trim() } as ElaraFreeConfig);
    }
  };

  return (
    <div className="h-full w-full bg-table-bodyBg flex flex-col">
      {/* Head Panel */}
      <div className="px-4 pt-4 pb-3 border-b border-border shrink-0 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-500/15 to-violet-500/15 border border-violet-500/40 text-violet-400">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground block mb-0.5">Settings</span>
            <p className="text-[11px] text-muted-foreground/70 leading-snug">Configure your AI provider</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/40 transition-all shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 p-5 space-y-5 overflow-y-auto">
        {/* API Base URL */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">API Base URL</label>
            <div className="flex items-center gap-1.5 text-[10px]">
              {isChecking ? (
                <><Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /><span className="text-muted-foreground">Checking...</span></>
              ) : isConnected ? (
                <><Wifi className="w-3 h-3 text-green-500" /><span className="text-green-500">Connected</span></>
              ) : (
                <><WifiOff className="w-3 h-3 text-red-500" /><span className="text-red-500">Unreachable</span></>
              )}
            </div>
          </div>
          <input
            type="text"
            className={cn(
              'w-full bg-table-headerBg border rounded-lg px-3 py-2.5 text-xs font-mono transition-all focus:outline-none focus:ring-1 focus:ring-primary/50',
              isConnected ? 'border-border hover:border-primary/30' : 'border-red-500/60 focus:ring-red-500/30',
            )}
            placeholder="http://localhost:8888"
            value={baseURL}
            onChange={(e) => setBaseURL(e.target.value)}
            onBlur={handleBaseURLBlur}
          />
        </div>

        {/* AI Response Language */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">AI Response Language</label>
          <select
            value={aiLanguage}
            onChange={(e) => { setAiLanguage(e.target.value); localStorage.setItem(STORAGE_KEY, e.target.value); }}
            className="w-full bg-table-headerBg border border-border rounded-lg px-3 py-2.5 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary/50 hover:border-primary/30 cursor-pointer appearance-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.name}>{l.flag} {l.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 border-t border-border bg-muted/10">
        <p className="text-[10px] text-muted-foreground text-center">More advanced settings will be available soon.</p>
      </div>
    </div>
  );
}
