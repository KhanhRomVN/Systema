import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [systemPrompt, setSystemPrompt] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('systema-system-prompt');
    setSystemPrompt(saved || 'You are a Network Analysis Assistant...');
  }, []);

  const handleSave = () => {
    localStorage.setItem('systema-system-prompt', systemPrompt);
    onClose();
  };

  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="h-10 flex items-center px-4 border-b border-border bg-muted/40 justify-between">
        <span className="font-semibold text-sm">Settings</span>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs font-bold text-muted-foreground uppercase">
            System Prompt Override
          </label>
          <textarea
            className="flex-1 bg-muted/50 border border-border rounded-lg p-3 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
          />
        </div>
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Save className="w-4 h-4" /> Save Settings
        </button>
      </div>
    </div>
  );
}
