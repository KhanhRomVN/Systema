import { useState } from 'react';
import { Send, Bot, User, Paperclip, ChevronLeft } from 'lucide-react';
import { cn } from '../../../shared/lib/utils'; // Assuming this exists, based on other files

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
        {/* Fake User Message */}
        <div className="flex gap-3 justify-end">
          <div className="flex flex-col gap-1 items-end max-w-[85%]">
            <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg rounded-tr-none text-sm">
              tìm kiếm req liên quan có gọi extension tailwind
            </div>
            <span className="text-[10px] text-muted-foreground">18:23</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center border border-border shrink-0">
            <User className="h-4 w-4 text-accent-foreground" />
          </div>
        </div>

        {/* Fake Bot Response */}
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
            <Bot className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex flex-col gap-1 max-w-[85%]">
            <div className="bg-muted px-3 py-2 rounded-lg rounded-tl-none text-sm border border-border">
              <p className="mb-2">
                Scanning network traffic for requests related to "tailwind extension"...
              </p>

              <div className="flex flex-col gap-2 my-2">
                <div className="bg-background rounded border border-border p-2 text-xs flex items-center gap-2 cursor-pointer hover:border-primary transition-colors">
                  <div className="font-mono text-green-500 bg-green-500/10 px-1 rounded">GET</div>
                  <div className="truncate text-muted-foreground">
                    marketplace.visualstudio.com/_apis/public/gallery/extensionquery
                  </div>
                </div>
                <div className="bg-background rounded border border-border p-2 text-xs flex items-center gap-2 cursor-pointer hover:border-primary transition-colors">
                  <div className="font-mono text-blue-500 bg-blue-500/10 px-1 rounded">POST</div>
                  <div className="truncate text-muted-foreground">
                    telemetry.vscode.dev/extension/usage
                  </div>
                </div>
              </div>

              <p>Found 2 relevant requests in the last session.</p>
            </div>
            <span className="text-[10px] text-muted-foreground">18:23</span>
          </div>
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
