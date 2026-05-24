
import { RequestComposer } from '../RequestComposer';
import { RequestDetails } from '../../RequestDetails';
import { NetworkRequest } from '../../../types/inspector';
import { InspectorFilter } from '../../RequestDetails/Filter';
import { DiffTab } from '../../Sidebar/Compare/DiffView';

interface DetailSectionProps {
  composerRequest: NetworkRequest | null;
  appId?: string;
  selectedRequest: NetworkRequest | null;
  searchTerm: string;
  detailsTab: string;
  setDetailsTab: (tab: string) => void;
  isFilterPanelOpen: boolean;
  setIsFilterPanelOpen: (open: boolean) => void;
  filter: InspectorFilter;
  setFilter: (filter: InspectorFilter) => void;
  requests: NetworkRequest[];
  onSearchTermChange: (term: string) => void;
  setSelectedId: (id: string | null) => void;
  handleJumpToValue: (requestId: string, tab: string, value: string) => void;
  handleCompareRequests: (
    req1: NetworkRequest,
    req2: NetworkRequest,
    initialTab?: DiffTab,
    value?: string,
  ) => void;
  setCompareRequest1: (req: NetworkRequest | null) => void;
  setCompareRequest2: (req: NetworkRequest | null) => void;
}

export function DetailSection({
  composerRequest,
  appId,
  selectedRequest,
  searchTerm,
  detailsTab,
  setDetailsTab,
  isFilterPanelOpen,
  setIsFilterPanelOpen,
  filter,
  setFilter,
  requests,
  onSearchTermChange,
  setSelectedId,
  handleJumpToValue,
  handleCompareRequests,
  setCompareRequest1,
  setCompareRequest2,
}: DetailSectionProps) {
  if (composerRequest) {
    return <RequestComposer initialRequest={composerRequest} appId={appId} />;
  }

  return (
    <RequestDetails
      request={selectedRequest}
      searchTerm={searchTerm}
      activeTab={detailsTab}
      onTabChange={setDetailsTab}
      onToggleFilter={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
      isFilterOpen={isFilterPanelOpen}
      filter={filter}
      onFilterChange={setFilter}
      requests={requests}
      onSearchTermChange={onSearchTermChange}
      onSelectRequest={setSelectedId}
      onJumpToValue={handleJumpToValue}
      onCompareRequests={handleCompareRequests}
      onSetCompare1={setCompareRequest1}
      onSetCompare2={setCompareRequest2}
    />
  );
}
