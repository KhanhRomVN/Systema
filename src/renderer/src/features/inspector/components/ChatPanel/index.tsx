import { useState } from 'react';
import { Send, Bot, Paperclip, ChevronLeft } from 'lucide-react';

interface ChatPanelProps {
  sessionId: string;
  onBack: () => void;
}

export function ChatPanel({ sessionId, onBack }: ChatPanelProps) {
  const [input, setInput] = useState('');

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Navigation Header */}
      <div className="h-10 flex items-center px-2 border-b border-border bg-muted/40 gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
          Back
        </button>
        <div className="h-4 w-px bg-border/50" />
        <span className="text-xs text-muted-foreground truncate flex-1">
          Session: <span className="text-foreground font-mono">{sessionId}</span>
        </span>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50">
          <Bot className="w-12 h-12 mb-2" />
          <p className="text-sm">Start a conversation</p>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-background">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about network requests..."
            className="w-full bg-muted/50 border border-border rounded-md pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-border transition-all"
          />
          <div className="absolute right-1 top-1 flex items-center gap-1">
            <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <Paperclip className="h-4 w-4" />
            </button>
            <button className="p-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
              <Send className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
