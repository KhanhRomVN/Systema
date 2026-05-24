import { RequestTable } from './RequestTable';
import { NetworkRequest } from '../../../../types/inspector';
import { InspectorFilter, initialFilterState } from '../RequestDetails/Filter';

interface RequestListProps {
  filteredRequests: NetworkRequest[];
  requests: NetworkRequest[];
  selectedId: string | null;
  onSelectRequest: (id: string | null) => void;
  onSetComposerRequest: (req: NetworkRequest | null) => void;
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
}

export function RequestList({
  filteredRequests,
  requests,
  selectedId,
  onSelectRequest,
  onSetComposerRequest,
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
}: RequestListProps) {
  return (
    <div className="h-full flex flex-col">
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
      <RequestTable
        requests={filteredRequests}
        selectedId={selectedId}
        onSelect={(id) => {
          onSelectRequest(id);
          onSetComposerRequest(null);
        }}
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
      />
    </div>
  );
}
