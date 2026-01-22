import React, { useRef, useEffect, useState } from 'react';
import { Bot, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import {
  ParsedResponse,
  ContentBlock,
  parseAIResponse,
} from '../../../../../../services/ResponseParser';
import { FilePreviewModal } from './FilePreviewModal';
import { getFileIconPath } from '../../../../../../shared/utils/fileIconMapper';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string; // Keep raw for fallback
  parsed?: ParsedResponse; // New parsed structure
  fullPrompt?: string; // 🆕 Full Prompt debug data
  timestamp: number;
  timestampStr?: string;
  executedToolIndices?: number[]; // Track executed tools
  isStreaming?: boolean;
  reasoning?: string;
  isHidden?: boolean; // 🆕 Hidden from UI (for bg tools)
  attachments?: {
    name: string;
    type: string;
    url?: string;
    fileId?: string;
  }[];
}

interface ChatBodyProps {
  messages: Message[];
  isProcessing?: boolean;
  onExecuteTool?: (action: any, msgId: string, index: number) => void;
  onPreviewTool?: (action: any) => Promise<string | null>;
  inspectorFilter?: any; // To display current filter state
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
    const [isExpanded, setIsExpanded] = React.useState(false); // Default collapsed
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

    const handleRun = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isExecuted && isEnabled && onExecuteTool) {
        onExecuteTool(action, msgId, index);
      } else {
        setIsExpanded(!isExpanded);
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

    // Status Determination
    let statusColor = 'bg-muted-foreground/30'; // Gray (Pending)
    if (isLoadingPreview) statusColor = 'bg-yellow-500 animate-pulse'; // Yellow (Running/Fetching)
    if (isExecuted) statusColor = 'bg-green-500'; // Green (Success)
    // if (isError) statusColor = 'bg-red-500'; // Red (Error) - needs error state pass down if possible

    return (
      <div className="my-0.5 overflow-hidden">
        {/* Header - Click to Run/Toggle */}
        <div
          className="flex items-center gap-2 py-1.5 cursor-pointer hover:opacity-80 transition-opacity select-none group"
          onClick={handleRun}
        >
          {/* Status Dot */}
          <div className={`w-1.5 h-1.5 rounded-full ${statusColor} shadow-sm shrink-0`} />

          {/* Title */}
          <div className="flex-1 font-mono text-xs text-foreground/60 truncate group-hover:text-foreground transition-colors">
            {/* Friendly Name Mappings */}
            {action.type === 'get_filter'
              ? 'Get filter https detail'
              : action.type === 'list_https'
                ? 'List HTTPS Requests'
                : action.type === 'get_https_details'
                  ? 'Get HTTPS Details'
                  : action.type === 'edit_filter'
                    ? 'Edit Filter'
                    : action.type === 'delete_https'
                      ? 'Delete HTTPS Request'
                      : action.type === 'list_requests'
                        ? 'List Requests'
                        : action.type === 'get_request_details'
                          ? 'Get Request Details'
                          : action.type}
          </div>

          {/* Preview Button (Only for list_requests) - Inline */}
          {action.type === 'list_requests' && onPreviewTool && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePreview();
              }}
              disabled={isLoadingPreview}
              className={`p-1 rounded hover:bg-muted/50 transition-colors ${showPreview ? 'text-primary' : 'text-muted-foreground'}`}
              title="Preview List"
            >
              {isLoadingPreview ? (
                <span className="w-3 h-3 block rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              ) : showPreview ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Expanded Body */}
        {(isExpanded || showPreview) && (
          <div className="bg-black/10 py-1.5 px-1 rounded">
            <div className="border-l border-primary/20 pl-3 ml-0.5">
              {/* Params */}
              {!showPreview && (
                <div className="text-[10px] font-mono whitespace-pre-wrap text-muted-foreground overflow-x-auto">
                  {JSON.stringify(action.params, null, 2)}
                </div>
              )}

              {/* Preview Area */}
              {(showPreview || isReset) && (
                <div className="text-[10px] font-mono overflow-auto max-h-[300px] whitespace-pre-wrap text-foreground/80">
                  {isReset && !previewData ? (
                    <span className="text-muted-foreground italic">Fetching filters...</span>
                  ) : (
                    previewData || 'No output available.'
                  )}
                </div>
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
  const [previewFile, setPreviewFile] = useState<any | null>(null);
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
        if (msg.role === 'system') return null;
        if (msg.isHidden) return null; // 🆕 Filter hidden messages
        if (isUser) requestCount++;

        // Calculate tool execution state for this message
        let pendingToolFound = false;

        // Ensure we have parsed content (fallback for old messages)
        const parsedMsg = msg.parsed || parseAIResponse(msg.content);

        return (
          <div
            key={msg.id}
            className={`flex flex-col w-full animate-in fade-in duration-300 ${isUser ? 'items-end' : 'items-start'}`}
          >
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

            <div
              className={`flex flex-col gap-1 w-full max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}
            >
              {/* Message Content */}
              <div
                className={`text-sm leading-relaxed rounded-lg px-3 py-2 ${
                  isUser
                    ? 'bg-primary text-primary-foreground font-medium rounded-br-none'
                    : 'bg-transparent text-foreground/80 font-normal px-0 py-0' // Assistant messages transparent
                }`}
              >
                {parsedMsg ? (
                  <div className="flex flex-col gap-2">
                    {parsedMsg.contentBlocks.map((block, idx) => {
                      const isExecuted = msg.executedToolIndices?.includes(idx) ?? false;
                      const isTool = block.type === 'tool';

                      let isEnabled = false;
                      if (isTool) {
                        if (!isExecuted) {
                          isEnabled = !pendingToolFound;
                          if (isEnabled) pendingToolFound = true;
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
                ) : null}
              </div>

              {/* Message Attachments */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 mb-1">
                  {msg.attachments.map((att, idx) => (
                    <div
                      key={att.fileId || idx}
                      className="group relative flex items-center gap-2 p-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors max-w-[200px]"
                      onClick={() => setPreviewFile(att)}
                    >
                      <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center bg-background border border-border overflow-hidden">
                        {att.type?.startsWith('image/') ? (
                          <img
                            src={att.url}
                            alt={att.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={getFileIconPath(att.name)}
                            alt=""
                            className="w-5 h-5 object-contain"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 pr-1">
                        <span className="text-[11px] font-medium truncate text-foreground/80">
                          {att.name}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase opacity-70">
                          {att.type?.split('/')[1] || 'FILE'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Preview Modal */}
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}

      {isProcessing && (
        <div className="flex flex-col w-full gap-2 mt-4 animate-in fade-in">
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
