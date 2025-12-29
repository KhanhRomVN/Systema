interface HistoryPanelProps {
  onClose: () => void;
}

export function HistoryPanel({ onClose }: HistoryPanelProps) {
  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="h-10 flex items-center px-4 border-b border-border bg-muted/40 justify-between">
        <span className="font-semibold text-sm">History</span>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>
      <div className="flex-1">{/* Empty UI for now */}</div>
    </div>
  );
}
