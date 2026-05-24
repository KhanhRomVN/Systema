
import { ChatContainer } from '../../Sidebar';
import { NetworkRequest } from '../../../types/inspector';
import { InspectorFilter } from '../../RequestDetails/Filter';
import { DiffTab } from '../../Sidebar/Compare/DiffView';

interface RightPanelProps {
  requests: NetworkRequest[];
  filteredRequests: NetworkRequest[];
  selectedId: string | null;
  filter: InspectorFilter;
  setFilter: (filter: InspectorFilter) => void;
  setSelectedId: (id: string | null) => void;
  onDelete: (id: string) => void;
  setComposerRequest: (req: NetworkRequest | null) => void;
  appName: string;
  emulatorSerial: string;
  appId?: string;
  compareRequest1: NetworkRequest | null;
  compareRequest2: NetworkRequest | null;
  setCompareRequest1: (req: NetworkRequest | null) => void;
  setCompareRequest2: (req: NetworkRequest | null) => void;
  handleJumpToValue: (requestId: string, tab: string, value: string) => void;
  handleCompareRequests: (
    req1: NetworkRequest,
    req2: NetworkRequest,
    initialTab?: DiffTab,
    value?: string,
  ) => void;
  initialDiffTab?: DiffTab;
  initialDiffSearch?: string;
}

export function RightPanel({
  requests,
  filteredRequests,
  selectedId,
  filter,
  setFilter,
  setSelectedId,
  onDelete,
  setComposerRequest,
  appName,
  emulatorSerial,
  appId,
  compareRequest1,
  compareRequest2,
  setCompareRequest1,
  setCompareRequest2,
  handleJumpToValue,
  handleCompareRequests,
  initialDiffTab,
  initialDiffSearch,
}: RightPanelProps) {
  return (
    <ChatContainer
      inspectorContext={{
        requests,
        filteredRequests,
        selectedRequestId: selectedId,
        filter,
        onSetFilter: setFilter,
        onSelectRequest: setSelectedId,
        onDeleteRequest: onDelete,
        onSelectSavedRequest: setComposerRequest,
        targetApp: appName,
        emulatorSerial: emulatorSerial || '',
        appId: appId || '',
        compareRequest1,
        compareRequest2,
        onClearComparison: () => {
          setCompareRequest1(null);
          setCompareRequest2(null);
        },
        onJumpToValue: handleJumpToValue,
        onCompareRequests: handleCompareRequests,
        initialDiffTab,
        initialDiffSearch,
      }}
    />
  );
}
