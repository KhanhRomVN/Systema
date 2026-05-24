import { useMemo } from 'react';
import { NetworkRequest } from '../../../../types/inspector';
import { findVariableRelationships, TrackedVariable } from '../../../../utils/regexMatcher';
import { DiffTab } from '../../Sidebar/Compare/DiffView';
import { cn } from '../../../../shared/lib/utils';
import { History, ArrowRight, Search, Hash, ScanEye } from 'lucide-react';

interface VariableTrackerPanelProps {
  requests: NetworkRequest[];
  onSelectRequest: (id: string) => void;
  selectedRequestId?: string | null;
  onJumpToValue?: (requestId: string, tab: string, value: string) => void;
  onCompareRequests?: (
    req1: NetworkRequest,
    req2: NetworkRequest,
    initialTab?: DiffTab,
    value?: string,
  ) => void;
}

export function VariableTrackerPanel({
  requests,
  onSelectRequest,
  selectedRequestId,
  onJumpToValue,
  onCompareRequests,
}: VariableTrackerPanelProps) {
  const allVariables = useMemo(() => findVariableRelationships(requests), [requests]);

  const variables = useMemo(() => {
    if (!selectedRequestId) return allVariables;
    return allVariables.filter(
      (v) =>
        v.sourceRequestId === selectedRequestId ||
        v.usages.some((u) => u.requestId === selectedRequestId),
    );
  }, [allVariables, selectedRequestId]);

  if (variables.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-background/50">
        <Hash className="w-12 h-12 mb-4 opacity-20" />
        <h3 className="text-sm font-medium mb-1">No variables tracked yet</h3>
        <p className="text-xs opacity-70 max-w-[200px]">
          Start capturing traffic to see how values flow between requests.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background/50 border-l border-border/50 flex flex-col font-sans select-none">
      <div className="p-4 border-b border-border/40 bg-muted/20 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold flex items-center gap-2">
            <History className="w-3.5 h-3.5" />
            Variable Tracker
          </h3>
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
            {variables.length} Discovered
          </span>
        </div>
      </div>

      <div className="p-2 space-y-3">
        {variables.map((v, idx) => (
          <VariableCard
            key={idx}
            variable={v}
            requests={requests}
            onSelectRequest={onSelectRequest}
            isSelected={
              v.sourceRequestId === selectedRequestId ||
              v.usages.some((u) => u.requestId === selectedRequestId)
            }
            onJumpToValue={onJumpToValue}
            onCompareRequests={onCompareRequests}
            selectedRequestId={selectedRequestId}
          />
        ))}
      </div>
    </div>
  );
}

function VariableCard({
  variable,
  requests,
  onSelectRequest,
  isSelected,
  onJumpToValue,
  onCompareRequests,
  selectedRequestId,
}: {
  variable: TrackedVariable;
  requests: NetworkRequest[];
  onSelectRequest: (id: string) => void;
  isSelected?: boolean;
  onJumpToValue?: (requestId: string, tab: string, value: string) => void;
  onCompareRequests?: (
    req1: NetworkRequest,
    req2: NetworkRequest,
    initialTab?: DiffTab,
    value?: string,
  ) => void;
  selectedRequestId?: string | null;
}) {
  const sourceRequest = requests.find((r) => r.id === variable.sourceRequestId);

  // Tìm usage của request đang chọn (nếu có)
  const selectedUsage = variable.usages.find((u) => u.requestId === selectedRequestId);
  const selectedIsSource = variable.sourceRequestId === selectedRequestId;

  // Request hiện tại (có thể là source hoặc usage)
  const currentRequest = selectedIsSource
    ? sourceRequest
    : requests.find((r) => r.id === selectedRequestId);

  const getLocation = (req: NetworkRequest, val: string, isResponse: boolean): string => {
    if (isResponse) {
      if (req.responseBody?.includes(val)) return 'body';
      if (Object.values(req.responseHeaders || {}).some((v) => (v as string).includes(val))) return 'headers';
      if (Object.values(req.responseCookies || {}).some((v) => (v as string).includes(val))) return 'cookies';
      return 'body';
    } else {
      if (req.requestBody?.includes(val)) return 'body';
      if (Object.values(req.requestHeaders || {}).some((v) => (v as string).includes(val))) return 'headers';
      if (Object.values(req.requestCookies || {}).some((v) => (v as string).includes(val))) return 'cookies';
      if (req.url.includes(val)) return 'params';
      return 'body';
    }
  };

  const getUsageLocation = (req: NetworkRequest, val: string): DiffTab => {
    if (req.requestBody?.includes(val)) return 'body';
    if (Object.values(req.requestHeaders || {}).some((v) => (v as string).includes(val))) return 'headers';
    if (Object.values(req.requestCookies || {}).some((v) => (v as string).includes(val))) return 'cookies';
    if (req.url.includes(val)) return 'params';
    return 'body';
  };

  // Truncate value if too long
  const displayValue =
    variable.value.length > 64
      ? variable.value.substring(0, 32) +
        '...' +
        variable.value.substring(variable.value.length - 32)
      : variable.value;

  // Danh sách các requests khác (không phải request hiện tại)
  const otherRequests: Array<{ request: NetworkRequest; location: string; isSource: boolean }> = [];

  // Thêm source nếu không phải là request hiện tại
  if (sourceRequest && !selectedIsSource) {
    otherRequests.push({
      request: sourceRequest,
      location: getLocation(sourceRequest, variable.value, true),
      isSource: true,
    });
  }

  // Thêm các usages khác
  variable.usages.forEach((usage) => {
    if (usage.requestId !== selectedRequestId) {
      const req = requests.find((r) => r.id === usage.requestId);
      if (req) {
        otherRequests.push({
          request: req,
          location: usage.location,
          isSource: false,
        });
      }
    }
  });

  return (
    <div
      className={cn(
        'rounded-lg border border-border/50 bg-background/80 overflow-hidden transition-all duration-200 hover:border-primary/30',
        isSelected && 'border-primary/50 ring-1 ring-primary/20 bg-primary/5',
      )}
    >
      {/* 1. Regex của HTTPS đang chọn */}
      <div className="p-3 bg-muted/10 border-b border-border/30">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-1 rounded bg-purple-500/10 text-purple-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[9px] text-muted-foreground uppercase font-bold">
                {variable.matcherName || 'Pattern'}
              </span>
              <span
                className="text-[11px] font-mono font-bold break-all line-clamp-1"
                title={variable.value}
              >
                {displayValue}
              </span>
            </div>
          </div>
          {currentRequest && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const location = selectedIsSource
                  ? getLocation(currentRequest, variable.value, true)
                  : selectedUsage
                    ? selectedUsage.location
                    : 'body';
                onJumpToValue?.(currentRequest.id, location, variable.value);
              }}
              className="p-1.5 rounded bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border border-purple-500/20 transition-all hover:scale-110"
              title="Jump to matched value"
            >
              <ScanEye className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Current Request Info */}
        {currentRequest && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="text-[8px] uppercase font-bold">
              {selectedIsSource ? 'Source:' : 'In:'}
            </span>
            <button
              onClick={() => onSelectRequest(currentRequest.id)}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <span
                className={cn(
                  'font-bold uppercase',
                  currentRequest.method === 'GET' ? 'text-blue-400' : 'text-green-400',
                )}
              >
                {currentRequest.method}
              </span>
              <span className="truncate max-w-[200px]">{currentRequest.path}</span>
              <span className="text-[8px] text-muted-foreground/70 uppercase">
                {selectedIsSource
                  ? getLocation(currentRequest, variable.value, true)
                  : selectedUsage?.location || 'body'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Danh sách các HTTPS khác */}
      {otherRequests.length > 0 && (
        <div className="p-2 space-y-1 bg-muted/5">
          <div className="px-1 flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <ArrowRight className="w-2.5 h-2.5" />
              {otherRequests.length} other request{otherRequests.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-1">
            {otherRequests.slice(0, 5).map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-1 p-1.5 rounded hover:bg-muted/30 transition-colors group"
              >
                <button
                  onClick={() => {
                    if (currentRequest) {
                      onCompareRequests?.(
                        currentRequest,
                        item.request,
                        getUsageLocation(item.request, variable.value),
                        variable.value,
                      );
                    } else {
                      onSelectRequest(item.request.id);
                    }
                  }}
                  className="flex-1 flex items-center gap-2 text-[10px] text-left min-w-0"
                >
                  <span
                    className={cn(
                      'font-bold uppercase shrink-0 text-[9px]',
                      item.request.method === 'GET' ? 'text-blue-400' : 'text-green-400',
                    )}
                  >
                    {item.request.method}
                  </span>
                  <span className="truncate text-muted-foreground group-hover:text-foreground flex-1">
                    {item.request.path}
                  </span>
                  <span className="text-[8px] text-muted-foreground/70 uppercase shrink-0">
                    {item.location}
                    {item.isSource && ' (source)'}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onJumpToValue?.(item.request.id, item.location, variable.value);
                  }}
                  className="p-1 rounded bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border border-purple-500/20 transition-all opacity-0 group-hover:opacity-100"
                  title="Jump to value"
                >
                  <ScanEye className="w-3 h-3" />
                </button>
              </div>
            ))}

            {otherRequests.length > 5 && (
              <div className="text-[9px] text-muted-foreground text-center py-1 italic">
                + {otherRequests.length - 5} more...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
