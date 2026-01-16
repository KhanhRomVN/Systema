import { useState, useEffect, useRef } from 'react';
import { TabPanel } from './TabPanel';
import { ChatPanel } from './ChatPanel';
import { HistoryPanel } from './HistoryPanel';
import SettingsPanel from './SettingsPanel';
import { InspectorFilter } from './FilterPanel';
import { NetworkRequest } from '../types';
import { ChatSession } from './TabPanel/TabList';
import { SourcesPanel } from './SourcesPanel';
import { LogViewer } from './LogViewer';
import { MessageSquare, FileCode, TerminalSquare } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';

export interface InspectorContext {
  requests: NetworkRequest[];
  filteredRequests?: NetworkRequest[]; // Optional for backward compact
  selectedRequestId: string | null;
  filter: InspectorFilter;
  onSetFilter: (filter: InspectorFilter) => void;
  onSelectRequest: (id: string) => void;
  targetApp: string;
  emulatorSerial?: string;
}

interface ChatContainerProps {
  inspectorContext: InspectorContext;
}

type TabType = 'chat' | 'sources' | 'logs';

export function ChatContainer({ inspectorContext }: ChatContainerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Lifted state from TabPanel
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [port, setPort] = useState(3000);
  const [wsConnected, setWsConnected] = useState(false);
  const lastActiveSessionRef = useRef<ChatSession | null>(null);

  useEffect(() => {
    // @ts-ignore
    const ipc = window.electron?.ipcRenderer;
    if (ipc) {
      ipc.invoke('ws:get-port').then((p: number) => setPort(p));

      const removeListener = ipc.on('ws:event', (_: any, { type, data }: any) => {
        if (type === 'client-connected') {
          setWsConnected(true);
          // Ask for real tabs from the connected agent
          ipc.invoke('ws:send', { type: 'requestFocusedTabs', timestamp: Date.now() });
        } else if (type === 'client-disconnected') {
          if (data.count === 0) {
            setWsConnected(false);
            setSessions([]);
          }
        } else if (type === 'message') {
          const wsData = data;
          if (wsData.type === 'focusedTabsUpdate') {
            if (Array.isArray(wsData.data)) {
              const mappedSessions = wsData.data.map((tab: any) => ({
                id: String(tab.tabId), // Ensure string ID
                title: tab.title || `Tab ${tab.tabId}`,
                timestamp: Date.now(),
                messageCount: tab.requestCount || 0,
                preview: tab.url || 'Ready for analysis',
                status: tab.status || 'free',
                provider: tab.provider || 'deepseek',
                containerName: tab.containerName,
                // conversationId: tab.conversationId, // Always start fresh when selecting from list
              }));
              setSessions(mappedSessions);
            }
          }
        }
      });
      return () => removeListener();
    }
    return undefined;
  }, []);

  const renderContent = () => {
    if (activeTab === 'logs') {
      return <LogViewer emulatorSerial={inspectorContext.emulatorSerial} />;
    }

    if (activeTab === 'sources') {
      return <SourcesPanel requests={inspectorContext.requests} />;
    }

    if (showHistory) {
      return (
        <HistoryPanel
          onClose={() => setShowHistory(false)}
          onSelectSession={setSelectedSessionId}
        />
      );
    }

    if (showSettings) {
      return <SettingsPanel onClose={() => setShowSettings(false)} />;
    }

    if (selectedSessionId) {
      let activeSession = sessions.find((s) => s.id === selectedSessionId);

      // If we rely on the list having NO conversationId, we shouldn't patch it back from cache.
      if (activeSession) {
        lastActiveSessionRef.current = activeSession;
      }

      // Fallback if not found at all
      if (!activeSession) {
        activeSession = (lastActiveSessionRef.current?.id === selectedSessionId
          ? lastActiveSessionRef.current
          : null) || {
          id: selectedSessionId,
          title: 'History Chat',
          provider: 'Systema',
          timestamp: Date.now(),
          messageCount: 0,
          preview: '',
          status: 'free',
          conversationId: undefined,
        };
      }

      return (
        <ChatPanel
          key={selectedSessionId} // Force remount on session change
          sessionId={selectedSessionId}
          title={activeSession.title}
          provider={activeSession.provider}
          initialConversationId={activeSession.conversationId}
          onBack={() => setSelectedSessionId(null)}
          inspectorContext={inspectorContext}
        />
      );
    }

    return (
      <TabPanel
        sessions={sessions}
        port={port}
        wsConnected={wsConnected}
        onSelectSession={setSelectedSessionId}
        onOpenHistory={() => setShowHistory(true)}
        onOpenSettings={() => setShowSettings(true)}
        onSessionsChange={setSessions}
      />
    );
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header Tab Switcher */}
      <div className="h-10 border-b border-border flex items-center shrink-0 bg-background/50 z-10">
        <div className="flex bg-muted/60 w-full h-full">
          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              'flex items-center justify-center gap-2 px-6 h-full text-xs font-medium transition-all',
              activeTab === 'chat'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat &amp; AI
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={cn(
              'flex items-center justify-center gap-2 px-6 h-full text-xs font-medium transition-all',
              activeTab === 'sources'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
            )}
          >
            <FileCode className="w-3.5 h-3.5" />
            Sources
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={cn(
              'flex items-center justify-center gap-2 px-6 h-full text-xs font-medium transition-all',
              activeTab === 'logs'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
            )}
          >
            <TerminalSquare className="w-3.5 h-3.5" />
            Log
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">{renderContent()}</div>
    </div>
  );
}
