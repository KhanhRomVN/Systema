interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="h-10 flex items-center px-4 border-b border-border bg-muted/40 justify-between">
        <span className="font-semibold text-sm">Settings</span>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>
      <div className="flex-1 p-4 text-center text-muted-foreground">Settings Placeholder</div>
    </div>
  );
}
