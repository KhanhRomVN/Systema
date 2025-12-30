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
    <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {msg.role === 'assistant' && (
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-4 h-4 text-primary" />
            </div>
          )}

          <div
            className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-muted/80 border border-border rounded-tl-sm text-foreground'
              }`}
            >
              {msg.parsed ? (
                <div className="flex flex-col gap-1">
                  {msg.parsed.contentBlocks.map((block, idx) => (
                    <RenderBlock key={idx} block={block} />
                  ))}
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground/70 px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {msg.role === 'user' && (
            <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>
      ))}

      {isProcessing && (
        <div className="flex gap-3 justify-start">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div className="bg-muted/50 border border-border/50 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
            <div
              className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
