import React, { useRef, useEffect } from 'react';
import { Bot, User, Terminal, CheckCircle2, PlayCircle, Eye, EyeOff } from 'lucide-react';
import { ParsedResponse, ContentBlock } from '../../../../../services/ResponseParser';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string; // Keep raw for fallback
  parsed?: ParsedResponse; // New parsed structure
  fullPrompt?: string; // 🆕 Full Prompt debug data
  timestamp: number;
  timestampStr?: string;
  executedToolIndices?: number[]; // Track executed tools
}

interface ChatBodyProps {
  messages: Message[];
  isProcessing?: boolean;
  onExecuteTool?: (action: any, msgId: string, index: number) => void;
  onPreviewTool?: (action: any) => Promise<string | null>;
}

const RenderBlock = ({
  block,
  msgId,
  index,
  isExecuted,
  isEnabled,
  onExecuteTool,
  onPreviewTool,
}: {
  block: ContentBlock;
  msgId: string;
  index: number;
  isExecuted: boolean;
  isEnabled: boolean;
  onExecuteTool?: (action: any, msgId: string, index: number) => void;
  onPreviewTool?: (action: any) => Promise<string | null>;
}) => {
  const [showPreview, setShowPreview] = React.useState(false);
  const [previewData, setPreviewData] = React.useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);

  if (block.type === 'text') {
    return <div className="whitespace-pre-wrap">{block.content}</div>;
  }
  if (block.type === 'code') {
    return (
      <div className="my-2 bg-black/80 rounded-md overflow-hidden border border-border/50">
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/20 border-b border-border/10">
          <span className="text-xs text-muted-foreground font-mono">
            {block.language || 'text'}
          </span>
        </div>
        <pre className="p-3 text-xs font-mono overflow-x-auto text-foreground/90">
          {block.content}
        </pre>
      </div>
    );
  }
  if (block.type === 'tool') {
    const { action } = block;

    // Special Case: attempt_completion treated as final text message
    if (action.type === 'attempt_completion') {
      return (
        <div className="my-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-foreground/90">
          <div className="font-semibold text-green-500 flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            Task Completed
          </div>
          <div className="whitespace-pre-wrap">{action.params.result}</div>
        </div>
      );
    }

    const handleRun = () => {
      if (onExecuteTool && !isExecuted && isEnabled) {
        onExecuteTool(action, msgId, index);
      }
    };

    const handlePreview = async () => {
      if (showPreview) {
        setShowPreview(false);
        return;
      }

      if (previewData) {
        setShowPreview(true);
        return;
      }

      if (onPreviewTool) {
        setIsLoadingPreview(true);
        try {
          const result = await onPreviewTool(action);
          if (result) {
            setPreviewData(result);
            setShowPreview(true);
          }
        } catch (e) {
          console.error('Preview failed', e);
        } finally {
          setIsLoadingPreview(false);
        }
      }
    };

    const isReset = action.type === 'get_active_filters';

    useEffect(() => {
      if (isReset && !previewData && onPreviewTool) {
        handlePreview(); // Auto-trigger preview
      }
    }, [action.type]);

    return (
      <div className="relative my-2 bg-muted/30 rounded-lg border border-primary/20 flex flex-col overflow-hidden group">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-2 text-primary">
            <Terminal className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">{action.type}</span>
          </div>

          {/* Actions (Top Right) */}
          <div className="absolute top-1.5 right-2 flex items-center gap-1 opacity-100 transition-opacity">
            {/* Preview Button (Only for list_requests) */}
            {action.type === 'list_requests' && onPreviewTool && (
              <button
                onClick={handlePreview}
                disabled={isLoadingPreview}
                className={`p-1 rounded hover:bg-muted/50 transition-colors ${showPreview ? 'text-primary' : 'text-muted-foreground'}`}
                title="Preview Output"
              >
                {isLoadingPreview ? (
                  <span className="w-4 h-4 block rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                ) : showPreview ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Execute Button */}
            <button
              onClick={handleRun}
              disabled={isExecuted || !isEnabled}
              className={`p-1 rounded transition-all ${
                isExecuted
                  ? 'text-green-500 cursor-not-allowed'
                  : isEnabled
                    ? 'text-primary hover:bg-primary/10 hover:scale-105 active:scale-95'
                    : 'text-muted-foreground cursor-not-allowed opacity-50'
              }`}
              title={isExecuted ? 'Executed' : isEnabled ? 'Execute Tool' : 'Pending previous tool'}
            >
              {isExecuted ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Body (Params) */}
        {!showPreview && !isReset && (
          <div className="p-3 text-xs font-mono bg-background/50 overflow-x-auto whitespace-pre-wrap text-foreground/80">
            {JSON.stringify(action.params, null, 2)}
          </div>
        )}

        {/* Preview Area (Always show for reset/get_active_filters) */}
        {(showPreview || isReset) && (
          <div className="border-t border-border/50">
            <div className="bg-background/80 p-3 text-xs font-mono overflow-auto max-h-[300px] whitespace-pre-wrap animate-in slide-in-from-top-2 duration-200">
              {isReset && !previewData ? (
                <span className="text-muted-foreground italic">Fetching filters...</span>
              ) : (
                previewData || 'No output available.'
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  if (block.type === 'table') {
    // Explicit table parser or passed data structure
    // Since we updated ResponseParser, `block` might have `data: { headers, rows }`
    // We need to extend the type definition in this file or cast it.
    const tableBlock = block as any;
    const { headers, rows } = tableBlock.data || { headers: [], rows: [] };

    if (!headers.length && !rows.length) {
      // Fallback for raw content
      return (
        <div className="my-2 overflow-x-auto border border-border rounded-lg bg-background/50">
          <pre className="text-xs p-2 whitespace-pre text-foreground/80 font-mono">
            {block.content}
          </pre>
        </div>
      );
    }

    return (
      <div className="my-2 overflow-hidden border border-border rounded-lg bg-background/50 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground font-medium border-b border-border/50">
              <tr>
                {headers.map((h: string, i: number) => (
                  <th key={i} className="px-3 py-2 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-foreground/80">
              {rows.map((row: string[], i: number) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  {row.map((cell: string, j: number) => (
                    <td key={j} className="px-3 py-2 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  return null;
};

export function ChatBody({ messages, isProcessing, onExecuteTool, onPreviewTool }: ChatBodyProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  let requestCount = 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground/50 select-none">
        <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4 ring-1 ring-border/50">
          <Bot className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-medium text-foreground/80 mb-2">Systema AI</h3>
        <p className="text-sm text-center max-w-[250px] leading-relaxed">
          Ask questions about your captured network traffic, analyze headers, or debug requests.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth">
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        if (isUser) requestCount++;

        // Calculate tool execution state for this message
        let pendingToolFound = false;

        return (
          <div key={msg.id} className="flex flex-col w-full animate-in fade-in duration-300">
            {/* Request Divider for User Messages */}
            {isUser && (
              <div className="flex flex-col gap-1 mt-6 mb-3 select-none animate-in slide-in-from-left-2 fade-in duration-300">
                <div className="flex items-center gap-3">
                  <div className="h-px bg-border/40 flex-1" />
                  <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                    Request {String(requestCount).padStart(2, '0')}
                  </span>
                  <div className="h-px bg-border/40 flex-1" />
                </div>
                {msg.fullPrompt && (
                  <details className="group">
                    <summary className="cursor-pointer text-[10px] text-muted-foreground/40 hover:text-primary/70 transition-colors flex items-center justify-center gap-1">
                      PROMPT REQUEST
                    </summary>
                    <div className="mt-2 p-2 bg-black/50 border border-border/30 rounded text-[10px] font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto max-h-[300px]">
                      {msg.fullPrompt}
                    </div>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1 w-full pl-1">
              {/* Message Content */}
              <div
                className={`text-sm leading-relaxed ${isUser ? 'font-medium text-foreground/90' : 'text-foreground/80 font-normal'}`}
              >
                {msg.parsed ? (
                  <div className="flex flex-col gap-2">
                    {msg.parsed.contentBlocks.map((block, idx) => {
                      const isExecuted = msg.executedToolIndices?.includes(idx) ?? false;
                      const isTool = block.type === 'tool';

                      // Determine if enabled:
                      // Must be a tool.
                      // If processed previous tools (pendingToolFound is false), then this one is enabled.
                      // If we find an unexecuted tool, subsequent tools are disabled.
                      let isEnabled = false;
                      if (isTool) {
                        if (!isExecuted) {
                          isEnabled = !pendingToolFound; // Only enable if it's the first pending one
                          if (isEnabled) pendingToolFound = true; // Mark that we found the pending one, so next are disabled
                        } else {
                          // Already executed, so it's not "enabled" for running again (button handles this with isExecuted check too)
                          // But functionally, we don't block based on this.
                        }
                      }

                      return (
                        <RenderBlock
                          key={idx}
                          block={block}
                          msgId={msg.id}
                          index={idx}
                          isExecuted={isExecuted}
                          isEnabled={isEnabled}
                          onExecuteTool={onExecuteTool}
                          onPreviewTool={onPreviewTool}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {isProcessing && (
        <div className="flex flex-col w-full gap-2 mt-4 animate-in fade-in">
          {/* No Avatar, just a loader indicator */}
          <div className="flex items-center gap-2 pl-1 opacity-50">
            <div
              className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
}
