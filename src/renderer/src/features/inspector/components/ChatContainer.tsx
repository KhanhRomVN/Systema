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
import { DiffView } from './DiffView';

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
  compareRequest1?: NetworkRequest | null;
  compareRequest2?: NetworkRequest | null;
  onClearComparison?: () => void;
}

interface ChatContainerProps {
  inspectorContext: InspectorContext;
}

export function ChatContainer({ inspectorContext }: ChatContainerProps) {
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Lifted state from TabPanel
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [port, setPort] = useState<number | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const [collectionCount, setCollectionCount] = useState(0);
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

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (activeTab === 'collections') {
      let COLLECTIONS_UPDATED_EVENT: string;

      const loadCount = async () => {
        const { loadCollections } = await import('../utils/collections');
        const collections = loadCollections(inspectorContext.appId || 'unknown');
        const totalCount = collections.reduce((sum, col) => sum + col.requests.length, 0);
        setCollectionCount(totalCount);
      };

      loadCount();

      const handleUpdate = () => loadCount();

      // Dynamically import to get the event name
      import('../utils/collections').then(({ COLLECTIONS_UPDATED_EVENT: eventName }) => {
        COLLECTIONS_UPDATED_EVENT = eventName;
        window.addEventListener(COLLECTIONS_UPDATED_EVENT, handleUpdate);
      });

      cleanup = () => {
        if (COLLECTIONS_UPDATED_EVENT) {
          window.removeEventListener(COLLECTIONS_UPDATED_EVENT, handleUpdate);
        }
      };
    }
    return cleanup;
  }, [activeTab, inspectorContext.appId]);

  const renderContent = () => {
    if (activeTab === 'crypto') {
      return <CryptoTab />;
    }

    if (activeTab === 'collections') {
      const selectedRequest = inspectorContext.filteredRequests?.find(
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
      {!(inspectorContext.compareRequest1 || inspectorContext.compareRequest2) && (
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
              {collectionCount > 0 && (
                <span
                  className={cn(
                    'ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                    activeTab === 'collections'
                      ? 'bg-orange-500/20 text-orange-500'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {collectionCount}
                </span>
              )}
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
      )}

      <div className="flex-1 overflow-hidden relative">
        {inspectorContext.compareRequest1 || inspectorContext.compareRequest2 ? (
          <DiffView
            request1={inspectorContext.compareRequest1 || null}
            request2={inspectorContext.compareRequest2 || null}
            onClose={() => inspectorContext.onClearComparison?.()}
          />
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
}
