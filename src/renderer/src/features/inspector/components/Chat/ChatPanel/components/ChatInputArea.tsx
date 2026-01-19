import React, { useRef, useEffect } from 'react';
import { Send, Paperclip, X, Search, Brain } from 'lucide-react';
import { cn } from '../../../../../../shared/lib/utils';

interface ChatInputAreaProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  onStop: () => void;

  // Attachments
  attachments: File[];
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (index: number) => void;

  // Features
  thinkingEnabled: boolean;
  setThinkingEnabled: (v: boolean) => void;
  searchEnabled: boolean;
  setSearchEnabled: (v: boolean) => void;

  // Styling
  disabled?: boolean;
}

export function ChatInputArea({
  input,
  setInput,
  onSend,
  isLoading,
  onStop,
  attachments,
  onFileSelect,
  onRemoveAttachment,
  thinkingEnabled,
  setThinkingEnabled,
  searchEnabled,
  setSearchEnabled,
  disabled,
}: ChatInputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-4 bg-background border-t border-border">
      <div className="flex flex-col gap-2 relative bg-muted/30 border border-border rounded-xl focus-within:ring-1 focus-within:ring-primary/50 transition-all p-2">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 px-1">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="relative group w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-border bg-background"
              >
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    className="w-full h-full object-cover"
                    alt="preview"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-xs text-muted-foreground p-1 text-center break-words bg-muted">
                    {file.name.slice(0, 8)}...
                  </div>
                )}
                <button
                  onClick={() => onRemoveAttachment(idx)}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled || isLoading}
          className="w-full bg-transparent border-none outline-none resize-none min-h-[44px] max-h-[200px] px-2 py-1 text-sm disabled:opacity-50 placeholder:text-muted-foreground/50"
          rows={1}
        />

        {/* Action Toolbar */}
        <div className="flex items-center justify-between px-1 pt-1 border-t border-border/50">
          <div className="flex items-center gap-1">
            {/* Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileSelect}
              className="hidden"
              multiple
            />
            <button
              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isLoading}
              title="Add Attachment"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-border mx-1" />

            {/* Feature Toggles */}
            <button
              className={cn(
                'h-7 px-2 flex items-center justify-center rounded-md text-xs gap-1.5 transition-colors disabled:opacity-50',
                thinkingEnabled
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'text-muted-foreground hover:bg-muted/50',
              )}
              onClick={() => setThinkingEnabled(!thinkingEnabled)}
              title="Toggle Thinking Mode"
              disabled={disabled}
            >
              <Brain className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Think</span>
            </button>

            <button
              className={cn(
                'h-7 px-2 flex items-center justify-center rounded-md text-xs gap-1.5 transition-colors disabled:opacity-50',
                searchEnabled
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'text-muted-foreground hover:bg-muted/50',
              )}
              onClick={() => setSearchEnabled(!searchEnabled)}
              title="Toggle Web Search"
              disabled={disabled}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>

          {/* Send/Stop Button */}
          {isLoading ? (
            <button
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-destructive hover:bg-destructive/90 text-white transition-colors"
              onClick={onStop}
            >
              <div className="w-2.5 h-2.5 bg-current rounded-sm" />
            </button>
          ) : (
            <button
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onSend}
              disabled={disabled || (!input.trim() && attachments.length === 0)}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
