import { useState, useEffect, memo, useCallback, useRef } from 'react';
import { HomePanel } from './Agent/HomePanel';
import { ChatPanel } from './Agent/ChatPanel';
import SettingsPanel from './Agent/SettingsPanel';
import { InspectorFilter } from '../RequestDetails/Filter';
import { NetworkRequest } from '../../../../types/inspector';
import { SourcesPanel } from './Source';
import { LogViewer } from './Log';
import { ComposerManager } from './Composer/ComposerManager';
import { DiagramViewMemo as DiagramView } from './Composer/DiagramComposer';
import { TraceTab } from './Trace';
import { CryptoTab } from './Crypto';
import { ComparePanel } from './Compare';
import { WasmPanel } from './Wasm';
import { MediaPanel } from './Media';
import { TargetSelector } from './Target';
import { ConfirmSwitchDrawer } from './Target/ConfirmSwitchDrawer';
import { FuzzerPanel } from './Fuzzer';
import { Tooltip } from './Tooltip';
import { MessageSquare, FileCode, TerminalSquare, BookmarkPlus, GitBranch, KeyRound, ArrowRightLeft, Image, Cpu, Crosshair, Zap } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { DiffTab } from './Compare/DiffView';
import { ProviderConfig, ProviderType } from '../../../../types/provider-types';
import { ProviderStorage } from '../../../../services/provider-storage';
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
  platform?: 'web' | 'pc' | 'android' | 'cli';
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
  analyzingRequest?: NetworkRequest | null;
  onClearAnalyzing?: () => void;
  activeSidebarTab?: string;
  onSetActiveSidebarTab?: (tab: string) => void;
  onNodeClick?: (request: NetworkRequest) => void;
  // Target selector
  onSelectApp?: (appName: string, proxyUrl: string, customUrl?: string, mode?: 'browser' | 'electron' | 'native') => Promise<void>;
  onStopSession?: () => Promise<void>;
  onLoadProfile?: (profile: any) => void;
  // Confirm switch drawer
  isConfirmSwitchOpen?: boolean;
  onCloseConfirmSwitch?: () => void;
  onConfirmSwitch?: () => void;
  currentAppName?: string;
  newAppName?: string;
  // Confirm stop drawer
  isConfirmStopOpen?: boolean;
  onCloseConfirmStop?: () => void;
  onConfirmStop?: () => void;
  onOpenStopConfirm?: () => void;
}

interface ChatContainerProps {
  inspectorContext: InspectorContext;
}

export function ChatContainerInner({ inspectorContext }: ChatContainerProps) {
  const [activeTab, setActiveTab] = useState<string>('chat');
  const inspectorContextRef = useRef(inspectorContext);
  inspectorContextRef.current = inspectorContext;
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

  // Auto-switch to crypto tab when "Add to Crypto" event fires
  useEffect(() => {
    const handler = () => setActiveTab('crypto');
    window.addEventListener('add-to-crypto', handler);
    return () => window.removeEventListener('add-to-crypto', handler);
  }, []);

  // Sync active tab from context (for external navigation like Analyze Request)
  useEffect(() => {
    if (inspectorContext.activeSidebarTab) {
      setActiveTab(inspectorContext.activeSidebarTab);
      // Don't reset the prop here - it should stay true while composer is active
      // The prop will be set to false when the user navigates away from composer tab
    }
  }, [inspectorContext.activeSidebarTab, inspectorContext.onSetActiveSidebarTab]);

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
        baseURL: 'http://localhost:8888',
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
        const { loadCollections } = await import('../../../../utils/collections');
        const collections = loadCollections(inspectorContext.appId || 'unknown');
        const totalCount = collections.reduce((sum, col) => sum + col.requests.length, 0);
        setCollectionCount(totalCount);
      };

      loadCount();

      const handleUpdate = () => loadCount();

      // Dynamically import to get the event name
      import('../../../../utils/collections').then(({ COLLECTIONS_UPDATED_EVENT: eventName }) => {
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

  const handleDiagramClose = useCallback(() => {
    inspectorContextRef.current.onClearAnalyzing?.();
    setActiveTab('chat');
  }, []);

  const renderContent = () => {
    if (activeTab === 'target') {
      return (
        <TargetSelector
          activeAppId={inspectorContext.appId || ''}
          activeAppName={inspectorContext.targetApp || ''}
          onSelectApp={inspectorContext.onSelectApp || (async () => {})}
          onStopSession={inspectorContext.onStopSession || (async () => {})}
          onLoadProfile={inspectorContext.onLoadProfile || (() => {})}
          platform={inspectorContext.requests.find(r => r.id === inspectorContext.selectedRequestId)?.protocol as any}
          onOpenStopConfirm={inspectorContext.onOpenStopConfirm}
        />
      );
    }

    if (activeTab === 'crypto') {
      return <CryptoTab targetApp={inspectorContext.targetApp} />;
    }

    if (activeTab === 'media') {
      return <MediaPanel requests={inspectorContext.requests} onClose={() => setActiveTab('chat')} />;
    }

    if (activeTab === 'wasm') {
      return <WasmPanel requests={inspectorContext.requests} onClose={() => setActiveTab('chat')} />;
    }

    if (activeTab === 'fuzzer') {
      return <FuzzerPanel requests={inspectorContext.requests} isTargetRunning={!!inspectorContext.appId} />;
    }

    if (activeTab === 'compare') {
      return <ComparePanel inspectorContext={inspectorContext} />;
    }

    if (activeTab === 'trace') {
      return (
        <TraceTab
          requests={inspectorContext.requests}
          onSelectRequest={inspectorContext.onSelectRequest}
          appId={inspectorContext.appId || 'global'}
        />
      );
    }

    if (activeTab === 'collections') {
      return (
        <ComposerManager
          onSelectRequest={inspectorContext.onSelectSavedRequest || (() => {})}
          appId={inspectorContext.appId || 'unknown'}
          requests={inspectorContext.requests}
        />
      );
    }

    if (activeTab === 'composer') {
      return (
        <DiagramView
          request={inspectorContext.analyzingRequest}
          onClose={handleDiagramClose}
          onNodeClick={inspectorContext.onNodeClick}
          isTemp={true}
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

  const allTabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare, color: 'blue', description: 'AI-powered chat assistant for debugging and analysis', showAlways: true },
    { id: 'target', label: 'Target', icon: Crosshair, color: 'emerald', description: 'Select and manage target applications', showAlways: true },
    { id: 'sources', label: 'Sources', icon: FileCode, color: 'purple', description: 'View and analyze source code files', platforms: ['web'] as Array<'web' | 'pc' | 'android' | 'cli'> },
    { id: 'logs', label: 'Log', icon: TerminalSquare, color: 'green', description: 'Real-time log viewer and filter', platforms: ['android'] as Array<'web' | 'pc' | 'android' | 'cli'> },
    { id: 'collections', label: 'Composers Manager', icon: BookmarkPlus, color: 'orange', description: 'Save and organize HTTP requests', showAlways: true },
    { id: 'trace', label: 'Trace', icon: GitBranch, color: 'pink', description: 'Request trace and call hierarchy', showAlways: true },
    { id: 'compare', label: 'Compare', icon: ArrowRightLeft, color: 'indigo', description: 'Compare two requests side by side', showAlways: true },
    { id: 'crypto', label: 'Crypto', icon: KeyRound, color: 'yellow', description: 'Cryptographic tools and analysis', showAlways: true },
    { id: 'media', label: 'Media', icon: Image, color: 'blue', description: 'Media files and assets viewer', showAlways: true },
    { id: 'wasm', label: 'WASM', icon: Cpu, color: 'purple', description: 'WebAssembly module analyzer', showAlways: true },
    { id: 'fuzzer', label: 'Fuzzer', icon: Zap, color: 'amber', description: 'Spam HTTPS với nhiều payload', showAlways: true },
  ] as const;

  const platform = inspectorContext.platform;
  
  const tabs = allTabs.filter(tab => {
    if ('showAlways' in tab && tab.showAlways) return true;
    if ('platforms' in tab && tab.platforms && platform) {
      return tab.platforms.includes(platform);
    }
    // Nếu tab có điều kiện platforms nhưng platform hiện tại không khớp → ẩn
    if ('platforms' in tab) return false;
    return true; // Hiển thị nếu không có điều kiện
  });

  // Auto-switch về 'chat' nếu tab hiện tại bị ẩn
  useEffect(() => {
    const isTabVisible = tabs.some(t => t.id === activeTab);
    if (!isTabVisible) {
      setActiveTab('chat');
    }
  }, [tabs, activeTab]);

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  };

  return (
    <div className="flex h-full bg-background relative overflow-hidden">
      {/* Vertical Tab Bar */}
      <div className="w-12 border-r border-border flex flex-col items-center py-3 gap-1.5 shrink-0 bg-table-headerBg z-10">
        {tabs.map(({ id, label, icon: Icon, color, description }) => (
          <Tooltip key={id} title={label} description={description}>
            <button
              onClick={() => setActiveTab(id)}
              className={cn(
                'relative flex items-center justify-center w-8 h-8 rounded-md transition-all border',
                activeTab === id
                  ? colorMap[color]
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {id === 'collections' && collectionCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
              )}
            </button>
          </Tooltip>
        ))}
      </div>

      <div className="flex-1 overflow-hidden relative min-w-0">
        {renderContent()}
      </div>

      <ConfirmSwitchDrawer
        isOpen={inspectorContext.isConfirmSwitchOpen || false}
        onClose={inspectorContext.onCloseConfirmSwitch || (() => {})}
        onConfirm={inspectorContext.onConfirmSwitch || (() => {})}
        currentAppName={inspectorContext.currentAppName || ''}
        newAppName={inspectorContext.newAppName || ''}
      />
      <ConfirmSwitchDrawer
        isOpen={inspectorContext.isConfirmStopOpen || false}
        onClose={inspectorContext.onCloseConfirmStop || (() => {})}
        onConfirm={inspectorContext.onConfirmStop || (() => {})}
        currentAppName={inspectorContext.currentAppName || ''}
        newAppName=""
      />
    </div>
  );
}

export const ChatContainer = memo(ChatContainerInner);
