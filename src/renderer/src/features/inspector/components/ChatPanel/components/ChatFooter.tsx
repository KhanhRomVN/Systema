import React, { useRef, useEffect } from 'react';
import { Send, Paperclip, X, Shield } from 'lucide-react';

interface ChatFooterProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  isProcessing?: boolean;
  onOpenAgentOptions?: () => void;
}

export function ChatFooter({
  input,
  setInput,
  onSend,
  isProcessing,
  onOpenAgentOptions,
}: ChatFooterProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-4 bg-background border-t border-border">
      <div className="relative flex flex-col gap-2 bg-muted/30 border border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 rounded-xl transition-all shadow-sm">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your traffic..."
          className="w-full bg-transparent border-none text-sm px-4 py-3 min-h-[44px] max-h-[200px] resize-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/60 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          rows={1}
          disabled={isProcessing}
        />

        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-1">
            <button
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Attach file (Coming soon)"
              disabled={isProcessing}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenAgentOptions}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Agent Capabilities"
              disabled={isProcessing}
            >
              <Shield className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onSend}
            disabled={!input.trim() || isProcessing}
            className={`p-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
              input.trim() && !isProcessing
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
