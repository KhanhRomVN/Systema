import { useState, useEffect, useRef } from 'react';
import { TabPanel } from './TabPanel';
import { ChatPanel } from './ChatPanel';
import { HistoryPanel } from './HistoryPanel';
import SettingsPanel from './SettingsPanel';
import { InspectorFilter } from './FilterPanel';
import { NetworkRequest } from '../types';
import { ChatSession } from './TabPanel/TabList';

export interface InspectorContext {
  requests: NetworkRequest[];
  filteredRequests?: NetworkRequest[]; // Optional for backward compact
  selectedRequestId: string | null;
  filter: InspectorFilter;
  onSetFilter: (filter: InspectorFilter) => void;
  onSelectRequest: (id: string) => void;
  targetApp: string;
}

interface ChatContainerProps {
  inspectorContext: InspectorContext;
}

export function ChatContainer({ inspectorContext }: ChatContainerProps) {
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

  if (showHistory) {
    return (
      <HistoryPanel onClose={() => setShowHistory(false)} onSelectSession={setSelectedSessionId} />
    );
  }

  if (showSettings) {
    return <SettingsPanel onClose={() => setShowSettings(false)} />;
  }

  if (selectedSessionId) {
    let activeSession = sessions.find((s) => s.id === selectedSessionId);

    // If we rely on the list having NO conversationId, we shouldn't patch it back from cache.
    // The previous fix (patching conversationId) conflicts with the requirement to "Always start fresh".
    // However, if we don't cache, we might get flickering if the session drops from the list.
    // BUT since we want NEW chat, `conversationId` is naturally undefined.
    // So we just need to ensure `activeSession` exists.

    // Update cache ONLY if we have a valid session object (ignoring conversationId content)
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
}
