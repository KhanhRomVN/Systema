import { ChevronLeft } from 'lucide-react';

interface ChatHeaderProps {
  sessionId: string;
  title?: string;
  provider?: string;
  onBack: () => void;
  onClearChat?: () => void;
}

export function ChatHeader({ sessionId, title, provider, onBack, onClearChat }: ChatHeaderProps) {
  return (
    <div className="h-12 flex items-center px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 shrink-0 gap-3">
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

      {/* Placeholder for header actions like "Clear Chat" or "Settings" specific to this chat */}
      {onClearChat && (
        <button
          onClick={onClearChat}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
