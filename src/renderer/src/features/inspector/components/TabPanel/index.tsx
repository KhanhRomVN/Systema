import { RefreshCw, History, Plus, Settings, Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { TabList, ChatSession } from './TabList';
import TabFooter from './TabFooter';

interface TabPanelProps {
  sessions: ChatSession[];
  port: number;
  wsConnected: boolean;
  onSelectSession: (id: string) => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onSessionsChange: (sessions: ChatSession[]) => void;
}

export function TabPanel({
  sessions,
  port,
  wsConnected,
  onSelectSession,
  onOpenHistory,
  onOpenSettings,
  onSessionsChange,
}: TabPanelProps) {
  const [copiedPort, setCopiedPort] = useState(false);

  const handleCopyPort = () => {
    navigator.clipboard.writeText(`localhost:${port}`).then(() => {
      setCopiedPort(true);
      setTimeout(() => setCopiedPort(false), 2000);
    });
  };

  const handleNewChat = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newSession: ChatSession = {
      id: newId,
      title: 'New Analysis Session',
      timestamp: Date.now(),
      messageCount: 0,
      preview: 'Start analyzing network traffic...',
      status: 'free',
      provider: 'deepseek',
      containerName: 'Container #01',
    };
    onSessionsChange([newSession, ...sessions]);
    onSelectSession(newId);
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border relative pb-[60px]">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Systema Assistant</span>
          <div
            onClick={handleCopyPort}
            className="flex items-center gap-1 bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono cursor-pointer hover:bg-muted/50 transition-colors"
            title="Click to copy"
          >
            {copiedPort ? (
              <Check className="w-2.5 h-2.5 text-green-500" />
            ) : (
              <Copy className="w-2.5 h-2.5" />
            )}
            <span className={copiedPort ? 'text-green-500 font-medium' : ''}>localhost:{port}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenHistory}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
            title="History"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={handleNewChat}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <TabList sessions={sessions} onSelect={onSelectSession} onNewChat={handleNewChat} />

      <TabFooter port={port} />
    </div>
  );
}
