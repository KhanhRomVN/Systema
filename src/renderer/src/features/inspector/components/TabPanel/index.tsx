import { RefreshCw, History, Plus, Settings, Check, Copy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { TabList, ChatSession } from './TabList';
import TabFooter from './TabFooter';

interface TabPanelProps {
  onSelectSession: (id: string) => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

export function TabPanel({ onSelectSession, onOpenHistory, onOpenSettings }: TabPanelProps) {
  const [port, setPort] = useState(3000);
  const [copiedPort, setCopiedPort] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]); // Default empty (waiting for connection)
  const [wsConnected, setWsConnected] = useState(false); // Default disconnected

  useEffect(() => {
    // Fetch real port from backend
    // @ts-ignore
    const ipc = window.electron?.ipcRenderer;
    if (ipc) {
      ipc.invoke('ws:get-port').then((p: number) => setPort(p));

      // Listen for WS events
      const removeListener = ipc.on('ws:event', (_: any, { type, data }: any) => {
        console.log('WS Event:', type, data);
        if (type === 'client-connected') {
          setWsConnected(true);
          // Simulate session creation on connection for now
          if (data.count > 0 && sessions.length === 0) {
            const newSession: ChatSession = {
              id: 'client-' + Date.now(),
              title: 'Connected Client',
              timestamp: Date.now(),
              messageCount: 0,
              preview: 'Ready for analysis',
              status: 'free',
              provider: 'deepseek',
              containerName: 'Container #01',
            };
            setSessions([newSession]);
          }
        } else if (type === 'client-disconnected') {
          if (data.count === 0) {
            setWsConnected(false);
            setSessions([]);
          }
        }
      });

      return () => {
        // Cleanup if needed, though ipc.on usually returns disposer in electron-toolkit
        // If not, we might need ipc.removeListener, but electron-toolkit exposes a wrapped on
        removeListener();
      };
    }
  }, []);

  const handleCopyPort = () => {
    navigator.clipboard.writeText(`localhost:${port}`).then(() => {
      setCopiedPort(true);
      setTimeout(() => setCopiedPort(false), 2000);
    });
  };

  const handleNewChat = () => {
    // For now, new chat creates a local session, but in real scenarios implies starting a new analysis context
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
    setSessions([newSession, ...sessions]);
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

      <TabFooter />
    </div>
  );
}
