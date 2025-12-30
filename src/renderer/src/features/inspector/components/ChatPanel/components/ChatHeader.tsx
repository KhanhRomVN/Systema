import { ChevronLeft, Plus, Settings, History } from 'lucide-react';

interface ChatHeaderProps {
  sessionId: string;
  title?: string;
  provider?: string;
  onBack: () => void;
  onNewChat: () => void;
  onSettings: () => void;
  onHistory: () => void;
}

export function ChatHeader({
  sessionId,
  title,
  provider,
  onBack,
  onNewChat,
  onSettings,
  onHistory,
}: ChatHeaderProps) {
  return (
    <div className="h-12 flex items-center px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 shrink-0 gap-3">
      {/* 
        Original Back Button - Keeps navigation flow if needed. 
        User asked for "History" button separately. 
        If "History" does the same as Back, we might hide this or keep it for distinct navigation.
        For now, I'll keep it but maybe we can discuss removing it if History covers it.
        Actually, looking at Zen, there isn't usually a back button IN the header if it's a split view. 
        But here it seems we are in a sub-view. 
        I'll keep standard 'Back' as ChevronLeft for now as it was there.
      */}
      <button
        onClick={onBack}
        className="flex items-center justify-center h-8 w-8 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
        title="Back to sessions"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="h-5 w-px bg-border/50" />

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate">
            {title || 'New Chat'}
          </span>
          {provider && (
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {provider}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground truncate font-mono">
          ID: {sessionId}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onHistory}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
          title="History"
        >
          <History className="w-4 h-4" />
        </button>
        <button
          onClick={onNewChat}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
          title="New Conversation"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={onSettings}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
