import { Settings, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ProviderConfig, ProviderType, ElaraFreeConfig } from '../../../../../../types/provider-types';

interface SettingsPanelProps {
  onClose: () => void;
  currentProviderConfig: ProviderConfig | null;
  onUpdateProviderConfig: (config: ProviderConfig) => void;
}

export default function SettingsPanel({
  onClose,
  currentProviderConfig,
  onUpdateProviderConfig,
}: SettingsPanelProps) {
  const [baseURL, setBaseURL] = useState('');

  useEffect(() => {
    if (currentProviderConfig?.type === ProviderType.ELARA_FREE) {
      setBaseURL((currentProviderConfig as ElaraFreeConfig).baseURL || 'http://localhost:11434');
    }
  }, [currentProviderConfig]);

  const handleSave = () => {
    if (currentProviderConfig?.type === ProviderType.ELARA_FREE) {
      onUpdateProviderConfig({
        ...currentProviderConfig,
        baseURL: baseURL.trim(),
      } as ElaraFreeConfig);
    }
    onClose();
  };

  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="h-10 flex items-center px-4 border-b border-border bg-muted/40 justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
            Settings
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded transition-colors"
        >
          Close
        </button>
      </div>

      <div className="flex-1 p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
              API Base URL
            </label>
            <div className="relative group">
              <input
                type="text"
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs font-mono transition-all focus:outline-none focus:ring-1 focus:ring-primary/50 group-hover:border-primary/30"
                placeholder="http://localhost:11434"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
              />
              <div className="mt-1.5 text-[10px] text-muted-foreground/60 italic">
                The local or remote endpoint for your Elara server.
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-xs font-bold hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98]"
        >
          <Save className="w-4 h-4" /> Save Configuration
        </button>
      </div>

      <div className="p-4 border-t border-border bg-muted/20">
        <p className="text-[10px] text-muted-foreground text-center">
          More advanced settings will be available soon.
        </p>
      </div>
    </div>
  );
}
