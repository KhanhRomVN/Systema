import { useState, useEffect } from 'react';
import { HomePanel } from './Chat/HomePanel';
import { ChatPanel } from './Chat/ChatPanel';
import SettingsPanel from './Chat/SettingsPanel';
import { InspectorFilter } from './FilterPanel';
import { NetworkRequest } from '../types';
import { SourcesPanel } from './SourcesPanel';
import { LogViewer } from './LogViewer';
import { CollectionsTab } from './CollectionsTab';
import { CryptoTab } from './CryptoTab';
import { MessageSquare, FileCode, TerminalSquare, BookmarkPlus, KeyRound } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { DiffView } from './DiffView';
import { ProviderSelectionPanel } from './ProviderSelectionPanel';
import { ProviderConfig } from '../types/provider-types';
import { ProviderStorage } from '../../../services/provider-storage';

import { WasmPanel } from './WasmPanel';
import { MediaPanel } from './Media';
import { ControlFlowPanel, FlowCard } from './Flow';

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
  isWasmMode?: boolean;
  onCloseWasmMode?: () => void;
  isMediaMode?: boolean;
  onCloseMediaMode?: () => void;
  isControlFlowMode?: boolean;
  onCloseControlFlowMode?: () => void;
  onOpenFlow?: (data: any) => void;
  flows?: FlowCard[];
  onDeleteFlow?: (id: string) => void;
  onUpdateFlow?: (id: string, data: { nodes: any[]; edges: any[] }) => void;
  activeFlowData?: { nodes: any[]; edges: any[] } | null;
  selectedFlowRequest?: NetworkRequest | null;
  onUpdateNodeRequest?: (req: NetworkRequest) => void;
}

interface ChatContainerProps {
  inspectorContext: InspectorContext;
}

export function ChatContainer({ inspectorContext }: ChatContainerProps) {
  const [activeTab, setActiveTab] = useState<string>('chat');
  // Lifted state from TabPanel
  // History removed, using single active session or similar if needed.
  // For now just tracking selected ID is enough if we generate it on demand?
  // Actually we need to store the session info if we want to display title etc.
  const [activeSession, setActiveSession] = useState<any | null>(null);

  // Missing state variables
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProviderSelection, setShowProviderSelection] = useState(false);

  const [collectionCount, setCollectionCount] = useState(0);

  // Load saved provider config on mount
  useEffect(() => {
    const savedConfig = ProviderStorage.loadConfig();
    if (savedConfig) {
      setProviderConfig(savedConfig);
    }
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

    if (showSettings) {
      return <SettingsPanel onClose={() => setShowSettings(false)} />;
    }

    if (showProviderSelection) {
      return (
        <ProviderSelectionPanel
          onProviderConfigured={(config) => {
            setProviderConfig(config);
            ProviderStorage.saveConfig(config);
            setShowProviderSelection(false);
          }}
          onBack={() => setShowProviderSelection(false)}
        />
      );
    }

    if (activeSession) {
      return (
        <ChatPanel
          key={activeSession.id}
          sessionId={activeSession.id}
          title={activeSession.title}
          provider={activeSession.provider}
          initialConversationId={activeSession.conversationId}
          onBack={() => setActiveSession(null)}
          inspectorContext={inspectorContext}
          providerConfig={providerConfig}
        />
      );
    }

    return (
      <HomePanel
        onSelectSession={(session) => {
          setActiveSession(session);
        }}
        onOpenSettings={() => setShowSettings(true)}
        onOpenProviderSelection={() => setShowProviderSelection(true)}
        currentProviderConfig={providerConfig}
        onUpdateProviderConfig={(newConfig) => {
          setProviderConfig(newConfig);
          ProviderStorage.saveConfig(newConfig);
        }}
      />
    );
  };

  // WASM Mode Overrides
  if (inspectorContext.isWasmMode) {
    return (
      <WasmPanel
        requests={inspectorContext.requests}
        onClose={inspectorContext.onCloseWasmMode || (() => {})}
      />
    );
  }

  // Media Mode Overrides
  if (inspectorContext.isMediaMode) {
    return (
      <MediaPanel
        requests={inspectorContext.requests}
        onClose={inspectorContext.onCloseMediaMode || (() => {})}
      />
    );
  }

  // Control Flow Mode Overrides
  if (inspectorContext.isControlFlowMode) {
    return (
      <ControlFlowPanel
        onClose={inspectorContext.onCloseControlFlowMode || (() => {})}
        onOpenFlow={inspectorContext.onOpenFlow || (() => {})}
        flows={inspectorContext.flows || []}
        onDeleteFlow={inspectorContext.onDeleteFlow || (() => {})}
        onUpdateFlow={inspectorContext.onUpdateFlow || (() => {})}
        activeFlowData={inspectorContext.activeFlowData}
        selectedRequest={
          inspectorContext.selectedFlowRequest ||
          inspectorContext.requests.find((r) => r.id === inspectorContext.selectedRequestId) ||
          null
        }
        onRequestChange={inspectorContext.onUpdateNodeRequest}
      />
    );
  }

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
              Chat
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
