import { useState, useEffect } from 'react';
import { HomePanel } from './Agent/HomePanel';
import { ChatPanel } from './Agent/ChatPanel';
import SettingsPanel from './Agent/SettingsPanel';
import { InspectorFilter } from '../RequestDetails/Filter';
import { NetworkRequest } from '../../types/inspector';
import { SourcesPanel } from './Source';
import { LogViewer } from './Log';
import { CollectionsTab } from './Collection';
import { TraceTab } from './Trace';
import { CryptoTab } from './Crypto';
import { ComparePanel } from './Compare';
import { MessageSquare, FileCode, TerminalSquare, BookmarkPlus, GitBranch, KeyRound, ArrowRightLeft } from 'lucide-react';
import { cn } from '../../shared/lib/utils';
import { DiffTab } from './Compare/DiffView';
import { ProviderConfig, ProviderType } from '../../types/provider-types';
import { ProviderStorage } from '../../services/provider-storage';
export interface InspectorContext {
  requests: NetworkRequest[];
  filteredRequests?: NetworkRequest[]; // Optional for backward compact
  selectedRequestId: string | null;
  filter: InspectorFilter;
  onSetFilter: (filter: InspectorFilter) => void;
  onSelectRequest: (id: string) => void;
  onDeleteRequest?: (id: string) => void;
  onSelectSavedRequest?: (request: NetworkRequest) => void;
  targetApp: string;
  emulatorSerial?: string;
  appId?: string;
  compareRequest1?: NetworkRequest | null;
  compareRequest2?: NetworkRequest | null;
  onClearComparison?: () => void;
  onJumpToValue?: (requestId: string, tab: string, value: string) => void;
  onCompareRequests?: (
    req1: NetworkRequest,
    req2: NetworkRequest,
    initialTab?: DiffTab,
    value?: string,
  ) => void;
  initialDiffTab?: DiffTab;
  initialDiffSearch?: string;
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

  const [collectionCount, setCollectionCount] = useState(0);

  // Auto-switch to compare tab if comparison is active
  useEffect(() => {
    if (inspectorContext.compareRequest1 || inspectorContext.compareRequest2) {
      setActiveTab('compare');
    }
  }, [inspectorContext.compareRequest1, inspectorContext.compareRequest2]);

  // Load saved provider config on mount
  useEffect(() => {
    const savedConfig = ProviderStorage.loadConfig();
    if (savedConfig && savedConfig.type === ProviderType.ELARA_FREE) {
      setProviderConfig(savedConfig);
    } else {
      // Default to Elara if no config or invalid config
      const defaultConfig: ProviderConfig = {
        type: ProviderType.ELARA_FREE,
        name: 'Elara (Free)',
        model: '',
        baseURL: 'http://localhost:11434',
      } as ProviderConfig;
      setProviderConfig(defaultConfig);
      ProviderStorage.saveConfig(defaultConfig);
    }
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (activeTab === 'collections') {
      let COLLECTIONS_UPDATED_EVENT: string;

      const loadCount = async () => {
        const { loadCollections } = await import('../../utils/collections');
        const collections = loadCollections(inspectorContext.appId || 'unknown');
        const totalCount = collections.reduce((sum, col) => sum + col.requests.length, 0);
        setCollectionCount(totalCount);
      };

      loadCount();

      const handleUpdate = () => loadCount();

      // Dynamically import to get the event name
      import('../../utils/collections').then(({ COLLECTIONS_UPDATED_EVENT: eventName }) => {
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

    if (activeTab === 'compare') {
      return <ComparePanel inspectorContext={inspectorContext} />;
    }

    if (activeTab === 'trace') {
      return (
        <TraceTab
          requests={inspectorContext.requests}
          onSelectRequest={inspectorContext.onSelectRequest}
        />
      );
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
      return (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          currentProviderConfig={providerConfig}
          onUpdateProviderConfig={(newConfig) => {
            setProviderConfig(newConfig);
            ProviderStorage.saveConfig(newConfig);
          }}
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
          initialInput={activeSession.initialInput}
          initialAttachments={activeSession.initialAttachments}
          initialStreamEnabled={activeSession.initialStreamEnabled}
          initialThinkingEnabled={activeSession.initialThinkingEnabled}
          onUpdateSession={(updates) => {
            setActiveSession((prev: any) => (prev ? { ...prev, ...updates } : prev));
          }}
        />
      );
    }

    return (
      <HomePanel
        onSelectSession={(session) => {
          setActiveSession(session);
        }}
        onOpenSettings={() => setShowSettings(true)}
        currentProviderConfig={providerConfig}
        onUpdateProviderConfig={(newConfig) => {
          setProviderConfig(newConfig);
          ProviderStorage.saveConfig(newConfig);
        }}
      />
    );
  };

  return (
    <div className="flex h-full bg-background relative overflow-hidden">
      {/* Vertical Tab Bar */}
      <div className="w-12 border-r border-border flex flex-col items-center py-3 gap-2.5 shrink-0 bg-table-headerBg z-10">
        <button
            onClick={() => setActiveTab('chat')}
            title="Chat"
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md transition-all border',
              activeTab === 'chat'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent',
            )}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            title="Sources"
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md transition-all border',
              activeTab === 'sources'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent',
            )}
          >
            <FileCode className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            title="Log"
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md transition-all border',
              activeTab === 'logs'
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent',
            )}
          >
            <TerminalSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            title="Collections"
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md transition-all border relative',
              activeTab === 'collections'
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent',
            )}
          >
            <BookmarkPlus className="w-4 h-4" />
            {collectionCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('trace')}
            title="Trace"
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md transition-all border',
              activeTab === 'trace'
                ? 'bg-pink-500/10 text-pink-400 border-pink-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent',
            )}
          >
            <GitBranch className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            title="Compare"
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md transition-all border',
              activeTab === 'compare'
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent',
            )}
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('crypto')}
            title="Crypto"
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md transition-all border',
              activeTab === 'crypto'
                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent',
            )}
          >
            <KeyRound className="w-4 h-4" />
          </button>
        </div>

      <div className="flex-1 overflow-hidden relative min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}
