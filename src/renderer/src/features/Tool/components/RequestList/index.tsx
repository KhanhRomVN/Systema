import { useState, useEffect } from 'react';
import { RequestTable } from './RequestTable';
import { WaterfallView } from './WaterfallView';
import { WebSocketTable } from './WebSocketTable';
import { BrowserViewPanel } from './BrowserViewPanel';
import { NetworkRequest, WebSocketConnection } from '../../../../types/inspector';
import { InspectorFilter, initialFilterState } from '../RequestDetails/Filter';
import { Tooltip } from '../Sidebar/Tooltip';
import { useI18n } from '../../../../i18n/i18nContext';
import { List, BarChart2, Wifi, LayoutTemplate } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';

interface RequestListProps {
  filteredRequests: NetworkRequest[];
  requests: NetworkRequest[];
  selectedId: string | null;
  onSelectRequest: (id: string | null) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  interceptedIds: Set<string>;
  pendingActionIds: Set<string>;
  onForward: (id: string) => void;
  onDrop: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  appId: string;
  onSetCompare1: (req: NetworkRequest | null) => void;
  onSetCompare2: (req: NetworkRequest | null) => void;
  setFilter: (filter: InspectorFilter) => void;
  onAnalyzeRequest?: (req: NetworkRequest) => void;
  onSendToFuzzer?: (req: NetworkRequest) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  // WebSocket
  wsConnections: WebSocketConnection[];
  selectedWsId: string | null;
  onSelectWsConnection: (id: string | null) => void;
  onDeleteWsConnection: (id: string) => void;
  // BrowserView
  browserViewUrl: string | null;
}

export function RequestList({
  filteredRequests,
  requests,
  selectedId,
  onSelectRequest,
  searchTerm,
  onSearchTermChange,
  interceptedIds,
  pendingActionIds,
  onForward,
  onDrop,
  onDeleteRequest,
  appId,
  onSetCompare1,
  onSetCompare2,
  setFilter,
  onAnalyzeRequest,
  onSendToFuzzer,
  onSelectionChange,
  wsConnections,
  selectedWsId,
  onSelectWsConnection,
  onDeleteWsConnection,
  browserViewUrl,
}: RequestListProps) {
  const [view, setView] = useState<'table' | 'timeline' | 'websocket' | 'browser'>('table');
  const { t } = useI18n();

  // Auto-switch to browser view when URL is set from Target selector
  useEffect(() => {
    if (browserViewUrl) {
      setView('browser');
    }
  }, [browserViewUrl]);

  return (
    <div className="h-full flex">
      {/* Left tab bar */}
      <div className="w-12 border-r border-border flex flex-col items-center py-3 gap-1.5 shrink-0 bg-table-headerBg z-10">
        <Tooltip title={t.requestList.table} description={t.requestList.tableDesc} side="right">
          <button
            onClick={() => setView('table')}
            className={cn(
              'relative flex items-center justify-center w-8 h-8 rounded-md transition-all border',
              view === 'table'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent',
            )}
          >
            <List className="w-4 h-4 shrink-0" />
          </button>
        </Tooltip>
        <Tooltip title={t.requestList.timeline} description={t.requestList.timelineDesc} side="right">
          <button
            onClick={() => setView('timeline')}
            className={cn(
              'relative flex items-center justify-center w-8 h-8 rounded-md transition-all border',
              view === 'timeline'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent',
            )}
          >
            <BarChart2 className="w-4 h-4 shrink-0" />
          </button>
        </Tooltip>
        <Tooltip title={t.requestList.websocket} description={t.requestList.websocketDesc} side="right">
          <button
            onClick={() => setView('websocket')}
            className={cn(
              'relative flex items-center justify-center w-8 h-8 rounded-md transition-all border',
              view === 'websocket'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent',
            )}
          >
            <Wifi className="w-4 h-4 shrink-0" />
            {wsConnections.filter((c) => c.status === 'connected').length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-background" />
            )}
          </button>
        </Tooltip>
        <Tooltip title={t.requestList.browserView || 'Browser View'} description={t.requestList.browserViewDesc || 'View website in embedded browser'} side="right">
          <button
            onClick={() => setView('browser')}
            className={cn(
              'relative flex items-center justify-center w-8 h-8 rounded-md transition-all border',
              view === 'browser'
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent',
            )}
          >
            <LayoutTemplate className="w-4 h-4 shrink-0" />
          </button>
        </Tooltip>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {view === 'table' && filteredRequests.length === 0 && requests.length > 0 && (
          <div className="p-4 bg-warning/10 text-warning text-xs text-center border-b border-warning/20 shrink-0">
            {t.requestList.allHidden.replace('{count}', String(requests.length))}
            <button
              onClick={() => setFilter({ ...initialFilterState })}
              className="ml-2 underline hover:text-warning"
            >
              {t.requestList.resetFilters}
            </button>
          </div>
        )}
        {view === 'table' ? (
          <RequestTable
            requests={filteredRequests}
            selectedId={selectedId}
            onSelect={(id) => onSelectRequest(id)}
            searchTerm={searchTerm}
            onSearchChange={onSearchTermChange}
            interceptedIds={interceptedIds}
            pendingActionIds={pendingActionIds}
            onForward={onForward}
            onDrop={onDrop}
            onDelete={onDeleteRequest}
            appId={appId || 'unknown'}
            onSetCompare1={onSetCompare1}
            onSetCompare2={onSetCompare2}
            onAnalyzeRequest={onAnalyzeRequest}
            onSendToFuzzer={onSendToFuzzer}
            onSelectionChange={onSelectionChange}
          />
        ) : view === 'websocket' ? (
          <WebSocketTable
            connections={wsConnections}
            selectedWsId={selectedWsId}
            onSelectConnection={onSelectWsConnection}
            onDeleteConnection={onDeleteWsConnection}
            searchTerm={searchTerm}
            onSearchTermChange={onSearchTermChange}
          />
        ) : view === 'browser' ? (
          <BrowserViewPanel url={browserViewUrl} />
        ) : (
          <WaterfallView
            requests={filteredRequests}
            selectedId={selectedId}
            onSelect={(id) => onSelectRequest(id)}
          />
        )}
      </div>
    </div>
  );
}
