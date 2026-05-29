import { useState } from 'react';
import { RequestTable } from './RequestTable';
import { WaterfallView } from './WaterfallView';
import { NetworkRequest } from '../../../../types/inspector';
import { InspectorFilter, initialFilterState } from '../RequestDetails/Filter';
import { List, BarChart2 } from 'lucide-react';
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
}: RequestListProps) {
  const [view, setView] = useState<'table' | 'timeline'>('table');

  return (
    <div className="h-full flex">
      {/* Left tab bar */}
      <div className="w-12 border-r border-divider flex flex-col items-center py-2 gap-1.5 shrink-0 bg-table-headerBg">
        <button
          onClick={() => setView('table')}
          title="Table View"
          className={cn(
            'w-6 h-6 flex items-center justify-center rounded transition-colors',
            view === 'table'
              ? 'bg-primary/15 text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-muted/50',
          )}
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setView('timeline')}
          title="Timeline View"
          className={cn(
            'w-6 h-6 flex items-center justify-center rounded transition-colors',
            view === 'timeline'
              ? 'bg-primary/15 text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-muted/50',
          )}
        >
          <BarChart2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {filteredRequests.length === 0 && requests.length > 0 && (
          <div className="p-4 bg-warning/10 text-warning text-xs text-center border-b border-warning/20 shrink-0">
            All {requests.length} requests are hidden by filters.
            <button
              onClick={() => setFilter({ ...initialFilterState })}
              className="ml-2 underline hover:text-warning"
            >
              Reset Filters
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
          />
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
