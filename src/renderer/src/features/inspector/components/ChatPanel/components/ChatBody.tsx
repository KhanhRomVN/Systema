import React, { useRef, useEffect } from 'react';
import { Bot, User, Terminal, CheckCircle2, PlayCircle } from 'lucide-react';
import { ParsedResponse, ContentBlock } from '../../../../../services/ResponseParser';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string; // Keep raw for fallback
  parsed?: ParsedResponse; // New parsed structure
  timestamp: number;
  timestampStr?: string;
}

interface ChatBodyProps {
  messages: Message[];
  isProcessing?: boolean;
}

const RenderBlock = ({ block }: { block: ContentBlock }) => {
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
    return (
      <div className="my-2 p-3 bg-muted/30 rounded-lg border border-primary/20 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Terminal className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase">{action.type}</span>
        </div>
        <div className="text-xs font-mono bg-background/50 p-2 rounded border border-border/50 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(action.params, null, 2)}
        </div>
      </div>
    );
  }
  if (block.type === 'table') {
    return (
      <div className="my-2 overflow-x-auto border border-border rounded-lg bg-background/50">
        <pre className="text-xs p-2 whitespace-pre text-foreground/80 font-mono">
          {block.content}
        </pre>
      </div>
    );
  }
  return null;
};

export function ChatBody({ messages, isProcessing }: ChatBodyProps) {
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

        return (
          <div key={msg.id} className="flex flex-col w-full animate-in fade-in duration-300">
            {/* Request Divider for User Messages */}
            {isUser && (
              <div className="flex items-center gap-3 mt-6 mb-3 select-none">
                <div className="h-px bg-border/40 flex-1" />
                <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                  Request {String(requestCount).padStart(2, '0')}
                </span>
                <div className="h-px bg-border/40 flex-1" />
              </div>
            )}

            <div className="flex flex-col gap-1 w-full pl-1">
              {/* Message Content */}
              <div
                className={`text-sm leading-relaxed ${isUser ? 'font-medium text-foreground/90' : 'text-foreground/80 font-normal'}`}
              >
                {msg.parsed ? (
                  <div className="flex flex-col gap-2">
                    {msg.parsed.contentBlocks.map((block, idx) => (
                      <RenderBlock key={idx} block={block} />
                    ))}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-[10px] text-muted-foreground/40 mt-1 select-none">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
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
