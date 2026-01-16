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
import { CollectionsTab } from './CollectionsTab';
import { CryptoTab } from './CryptoTab';
import { MessageSquare, FileCode, TerminalSquare, BookmarkPlus, KeyRound } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';

export interface InspectorContext {
  requests: NetworkRequest[];
  filteredRequests?: NetworkRequest[]; // Optional for backward compact
  selectedRequestId: string | null;
  filter: InspectorFilter;
  onSetFilter: (filter: InspectorFilter) => void;
  onSelectRequest: (id: string) => void;
  onSelectSavedRequest?: (request: NetworkRequest) => void;
  targetApp: string;
  emulatorSerial?: string;
  appId?: string;
}

interface ChatContainerProps {
  inspectorContext: InspectorContext;
}

type TabType = 'chat' | 'sources' | 'logs' | 'collections' | 'crypto';

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
    if (activeTab === 'crypto') {
      return <CryptoTab />;
    }

    if (activeTab === 'collections') {
      const selectedRequest = inspectorContext.requests.find(
        (r) => r.id === inspectorContext.selectedRequestId,
      );
      return (
        <CollectionsTab
          currentRequest={selectedRequest}
          onSelectRequest={inspectorContext.onSelectSavedRequest}
          appId={inspectorContext.appId || 'unknown'}
        />
      );
    }

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
              'flex items-center justify-center gap-2 px-6 h-full text-xs font-medium transition-all border-b-2',
              activeTab === 'chat'
                ? 'bg-background text-foreground shadow-sm border-blue-500'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50 border-transparent',
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat &amp; AI
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={cn(
              'flex items-center justify-center gap-2 px-6 h-full text-xs font-medium transition-all border-b-2',
              activeTab === 'sources'
                ? 'bg-background text-foreground shadow-sm border-purple-500'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50 border-transparent',
            )}
          >
            <FileCode className="w-3.5 h-3.5" />
            Sources
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={cn(
              'flex items-center justify-center gap-2 px-6 h-full text-xs font-medium transition-all border-b-2',
              activeTab === 'logs'
                ? 'bg-background text-foreground shadow-sm border-green-500'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50 border-transparent',
            )}
          >
            <TerminalSquare className="w-3.5 h-3.5" />
            Log
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={cn(
              'flex items-center justify-center gap-2 px-6 h-full text-xs font-medium transition-all border-b-2',
              activeTab === 'collections'
                ? 'bg-background text-foreground shadow-sm border-orange-500'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50 border-transparent',
            )}
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            Collections
          </button>
          <button
            onClick={() => setActiveTab('crypto')}
            className={cn(
              'flex items-center justify-center gap-2 px-6 h-full text-xs font-medium transition-all border-b-2',
              activeTab === 'crypto'
                ? 'bg-background text-foreground shadow-sm border-pink-500'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50 border-transparent',
            )}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Crypto
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">{renderContent()}</div>
    </div>
  );
}
