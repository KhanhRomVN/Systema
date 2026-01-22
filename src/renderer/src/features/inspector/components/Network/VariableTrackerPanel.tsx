import { useMemo } from 'react';
import { NetworkRequest } from '../../types';
import { findVariableRelationships, TrackedVariable } from '../../utils/regexMatcher';
import { DiffTab } from '../DiffView';
import { cn } from '../../../../shared/lib/utils';
import {
  History,
  ArrowRight,
  ExternalLink,
  Link2,
  Database,
  Search,
  Hash,
  ScanEye,
} from 'lucide-react';

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
}) {
  const sourceRequest = requests.find((r) => r.id === variable.sourceRequestId);

  const getSourceLocation = (req: NetworkRequest, val: string): string => {
    if (req.responseBody?.includes(val)) return 'body';
    if (Object.values(req.responseHeaders || {}).some((v) => v.includes(val))) return 'headers';
    if (Object.values(req.responseCookies || {}).some((v) => v.includes(val))) return 'cookies';
    return 'body';
  };

  const getUsageLocation = (req: NetworkRequest, val: string): DiffTab => {
    if (req.requestBody?.includes(val)) return 'body';
    if (Object.values(req.requestHeaders || {}).some((v) => v.includes(val))) return 'headers';
    if (Object.values(req.requestCookies || {}).some((v) => v.includes(val))) return 'cookies';
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

  return (
    <div
      className={cn(
        'rounded-lg border border-border/50 bg-background/80 overflow-hidden transition-all duration-200 hover:border-primary/30',
        isSelected && 'border-primary/50 ring-1 ring-primary/20 bg-primary/5',
      )}
    >
      {/* Header: Value */}
      <div className="p-3 bg-muted/10 border-b border-border/30">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1 rounded bg-blue-500/10 text-blue-500">
            <Hash className="w-3.5 h-3.5" />
          </div>
          <span
            className="text-[11px] font-mono font-bold break-all line-clamp-2"
            title={variable.value}
          >
            {displayValue}
          </span>
        </div>

        {/* Source info */}
        {sourceRequest && (
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              Captured from Response
            </span>
            <div className="flex items-center gap-1 w-full">
              <button
                onClick={() => onSelectRequest(sourceRequest.id)}
                className="flex-1 flex items-center gap-1.5 p-1.5 rounded bg-muted/30 hover:bg-muted/50 text-[10px] text-left transition-colors group"
              >
                <span
                  className={cn(
                    'font-bold uppercase shrink-0',
                    sourceRequest.method === 'GET' ? 'text-blue-400' : 'text-green-400',
                  )}
                >
                  {sourceRequest.method}
                </span>
                <span className="truncate text-muted-foreground group-hover:text-foreground">
                  {sourceRequest.path}
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToValue?.(
                    sourceRequest.id,
                    getSourceLocation(sourceRequest, variable.value),
                    variable.value,
                  );
                }}
                className="p-1.5 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 transition-all opacity-40 hover:opacity-100"
                title="Jump to value in details"
              >
                <ScanEye className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Usages section */}
      <div className="p-2 space-y-1.5 bg-muted/5">
        <div className="px-1 flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground uppercase font-bold flex items-center gap-1">
            <ArrowRight className="w-2.5 h-2.5" />
            Used in {variable.usages.length} calls
          </span>
        </div>

        <div className="space-y-1">
          {variable.usages.slice(0, 5).map((usage, i) => {
            const usageReq = requests.find((r) => r.id === usage.requestId);
            if (!usageReq) return null;

            return (
              <div key={i} className="flex items-center gap-1 w-full">
                <button
                  onClick={() => {
                    if (sourceRequest) {
                      onCompareRequests?.(
                        sourceRequest,
                        usageReq,
                        getUsageLocation(usageReq, variable.value),
                        variable.value,
                      );
                    } else {
                      onSelectRequest(usage.requestId);
                    }
                  }}
                  className="flex-1 flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 text-[10px] text-left transition-colors group"
                >
                  <div className="flex flex-col shrink-0 min-w-[50px]">
                    <span
                      className={cn(
                        'font-bold uppercase',
                        usageReq.method === 'GET' ? 'text-blue-400' : 'text-green-400',
                      )}
                    >
                      {usageReq.method}
                    </span>
                    <span className="text-[8px] text-muted-foreground/70 leading-none uppercase">
                      IN {usage.location}
                    </span>
                  </div>
                  <span className="truncate text-muted-foreground group-hover:text-foreground">
                    {usageReq.path}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onJumpToValue?.(
                      usageReq.id,
                      getUsageLocation(usageReq, variable.value),
                      variable.value,
                    );
                  }}
                  className="p-1.5 rounded bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20 transition-all opacity-40 hover:opacity-100"
                  title="Jump to value in details"
                >
                  <ScanEye className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {variable.usages.length > 5 && (
            <div className="text-[9px] text-muted-foreground text-center py-1">
              + {variable.usages.length - 5} more usages
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
