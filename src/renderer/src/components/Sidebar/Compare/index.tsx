import { useState, useMemo } from 'react';
import { ArrowRightLeft, Search, X, FileCheck } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { NetworkRequest } from '../../../types/inspector';
import { InspectorContext } from '../index';
import { DiffView } from './DiffView';

interface ComparePanelProps {
  inspectorContext: InspectorContext;
}

export function ComparePanel({ inspectorContext }: ComparePanelProps) {
  if (inspectorContext.compareRequest1 || inspectorContext.compareRequest2) {
    return (
      <DiffView
        request1={inspectorContext.compareRequest1 || null}
        request2={inspectorContext.compareRequest2 || null}
        onClose={() => inspectorContext.onClearComparison?.()}
        initialTab={inspectorContext.initialDiffTab}
        initialSearchTerm={inspectorContext.initialDiffSearch}
      />
    );
  }

  const [localRequest1, setLocalRequest1] = useState<NetworkRequest | null>(null);
  const [localRequest2, setLocalRequest2] = useState<NetworkRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const requests = inspectorContext.requests || [];

  // Filter requests based on search term
  const filteredRequests = useMemo(() => {
    if (!searchTerm.trim()) return requests;
    const term = searchTerm.toLowerCase();
    return requests.filter(
      (r) =>
        r.method?.toLowerCase().includes(term) ||
        r.host?.toLowerCase().includes(term) ||
        r.path?.toLowerCase().includes(term) ||
        String(r.status).includes(term),
    );
  }, [requests, searchTerm]);

  const handleCompare = () => {
    if (localRequest1 && localRequest2) {
      inspectorContext.onCompareRequests?.(localRequest1, localRequest2);
    }
  };

  const getMethodColor = (method: string) => {
    switch (method?.toUpperCase()) {
      case 'GET':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'POST':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'PUT':
        return 'text-warning bg-warning/10 border-warning/20';
      case 'DELETE':
        return 'text-error bg-error/10 border-error/20';
      default:
        return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-success';
    if (status >= 300 && status < 400) return 'text-warning';
    if (status >= 400) return 'text-error';
    return 'text-zinc-500';
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-purple-500" />
          <h2 className="text-sm font-medium">Compare Requests</h2>
        </div>
        {(localRequest1 || localRequest2) && (
          <button
            onClick={() => {
              setLocalRequest1(null);
              setLocalRequest2(null);
            }}
            className="flex items-center gap-1 px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
          >
            Clear Selected
          </button>
        )}
      </div>

      {/* Compare Slots */}
      <div className="p-3 border-b border-border bg-muted/10 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Request A Slot */}
          <div
            className={cn(
              'border rounded-md p-2 flex flex-col justify-between min-h-[64px] relative transition-all',
              localRequest1
                ? 'border-red-500/30 bg-red-500/5'
                : 'border-dashed border-border hover:border-zinc-700 bg-zinc-950/20',
            )}
          >
            <div className="text-[10px] font-semibold text-red-400/80 mb-1 flex items-center justify-between">
              <span>REQUEST A</span>
              {localRequest1 && (
                <button
                  onClick={() => setLocalRequest1(null)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {localRequest1 ? (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={cn('text-[9px] px-1 py-0.2 rounded border font-bold', getMethodColor(localRequest1.method))}>
                    {localRequest1.method}
                  </span>
                  <span className={cn('text-[10px] font-mono', getStatusColor(localRequest1.status))}>
                    {localRequest1.status}
                  </span>
                </div>
                <div className="text-[10px] truncate text-zinc-300 font-mono" title={localRequest1.path}>
                  {localRequest1.path}
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-zinc-600 flex items-center justify-center flex-1 italic">
                Set A from list
              </div>
            )}
          </div>

          {/* Request B Slot */}
          <div
            className={cn(
              'border rounded-md p-2 flex flex-col justify-between min-h-[64px] relative transition-all',
              localRequest2
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-dashed border-border hover:border-zinc-700 bg-zinc-950/20',
            )}
          >
            <div className="text-[10px] font-semibold text-green-400/80 mb-1 flex items-center justify-between">
              <span>REQUEST B</span>
              {localRequest2 && (
                <button
                  onClick={() => setLocalRequest2(null)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {localRequest2 ? (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={cn('text-[9px] px-1 py-0.2 rounded border font-bold', getMethodColor(localRequest2.method))}>
                    {localRequest2.method}
                  </span>
                  <span className={cn('text-[10px] font-mono', getStatusColor(localRequest2.status))}>
                    {localRequest2.status}
                  </span>
                </div>
                <div className="text-[10px] truncate text-zinc-300 font-mono" title={localRequest2.path}>
                  {localRequest2.path}
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-zinc-600 flex items-center justify-center flex-1 italic">
                Set B from list
              </div>
            )}
          </div>
        </div>

        {/* Compare Button */}
        <button
          onClick={handleCompare}
          disabled={!localRequest1 || !localRequest2}
          className={cn(
            'w-full py-2 text-xs font-semibold rounded transition-all duration-300 flex items-center justify-center gap-1.5 border',
            localRequest1 && localRequest2
              ? 'bg-purple-600 text-zinc-950 hover:bg-purple-500 border-purple-500 shadow-lg shadow-purple-600/20'
              : 'bg-zinc-800/50 text-zinc-600 border-zinc-800/80 cursor-not-allowed',
          )}
        >
          <FileCheck className="w-3.5 h-3.5" />
          Compare Selected Requests
        </button>
      </div>

      {/* Requests List */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-2 border-b border-border bg-zinc-950/40 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Search recent requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-0 outline-none text-xs text-foreground placeholder-zinc-600"
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {filteredRequests.length > 0 ? (
            filteredRequests.map((req) => {
              const isSelectedA = localRequest1?.id === req.id;
              const isSelectedB = localRequest2?.id === req.id;

              return (
                <div
                  key={req.id}
                  className={cn(
                    'p-2.5 flex items-center justify-between gap-2 transition-all group',
                    isSelectedA
                      ? 'bg-red-500/5 border-l-2 border-l-red-500'
                      : isSelectedB
                        ? 'bg-green-500/5 border-l-2 border-l-green-500'
                        : 'hover:bg-muted/10 border-l-2 border-l-transparent',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={cn('text-[9px] px-1 py-0.2 rounded border font-bold scale-90 origin-left', getMethodColor(req.method))}>
                        {req.method}
                      </span>
                      <span className={cn('text-[10px] font-mono font-semibold', getStatusColor(req.status))}>
                        {req.status}
                      </span>
                      <span className="text-[10px] text-zinc-500 truncate font-mono max-w-[120px]">
                        {req.host}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-300 truncate" title={req.path}>
                      {req.path}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setLocalRequest1(req)}
                      className={cn(
                        'px-1.5 py-0.8 text-[9px] font-medium rounded transition-all',
                        isSelectedA
                          ? 'bg-red-500 text-zinc-950 font-semibold'
                          : 'bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20',
                      )}
                    >
                      {isSelectedA ? 'Set A ✓' : 'Set A'}
                    </button>
                    <button
                      onClick={() => setLocalRequest2(req)}
                      className={cn(
                        'px-1.5 py-0.8 text-[9px] font-medium rounded transition-all',
                        isSelectedB
                          ? 'bg-green-500 text-zinc-950 font-semibold'
                          : 'bg-green-500/10 text-green-400 hover:bg-green-500/25 border border-green-500/20',
                      )}
                    >
                      {isSelectedB ? 'Set B ✓' : 'Set B'}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-zinc-600 italic">
              No requests captured yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
