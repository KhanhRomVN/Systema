import { NetworkRequest } from '../../../../types/inspector';
import { cn } from '../../../../shared/lib/utils';
import { useMemo } from 'react';

interface TimelineViewProps {
  requests: NetworkRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function parseTimeMs(time: string): number {
  if (!time || time === 'Pending') return 0;
  const n = parseFloat(time);
  if (time.endsWith('s') && !time.endsWith('ms')) return n * 1000;
  return n;
}

const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-blue-500',
  POST: 'bg-green-500',
  PUT: 'bg-orange-500',
  DELETE: 'bg-red-500',
  PATCH: 'bg-yellow-500',
};

function statusColor(status: number) {
  if (status === 0) return 'text-text-secondary';
  if (status < 300) return 'text-green-400';
  if (status < 400) return 'text-yellow-400';
  return 'text-red-400';
}

export function TimelineView({ requests, selectedId, onSelect }: TimelineViewProps) {
  const maxMs = useMemo(
    () => Math.max(1, ...requests.map((r) => parseTimeMs(r.time))),
    [requests],
  );

  if (requests.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-text-secondary">
        No requests
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-w-0">
        {requests.map((req) => {
          const ms = parseTimeMs(req.time);
          const pct = Math.max(2, (ms / maxMs) * 100);
          const barColor = METHOD_COLOR[req.method] ?? 'bg-primary';
          const isSelected = req.id === selectedId;

          return (
            <div
              key={req.id}
              onClick={() => onSelect(req.id)}
              className={cn(
                'flex items-center gap-2 px-2 py-1 cursor-pointer border-b border-divider/30 hover:bg-muted/30 transition-colors',
                isSelected && 'bg-primary/10',
              )}
            >
              {/* Method badge */}
              <span
                className={cn(
                  'text-[9px] font-bold w-10 shrink-0 text-right',
                  req.method === 'GET' && 'text-blue-400',
                  req.method === 'POST' && 'text-green-400',
                  req.method === 'PUT' && 'text-orange-400',
                  req.method === 'DELETE' && 'text-red-400',
                  req.method === 'PATCH' && 'text-yellow-400',
                )}
              >
                {req.method}
              </span>

              {/* Host truncated */}
              <span className="text-[10px] text-text-secondary w-28 shrink-0 truncate">
                {req.host}
              </span>

              {/* Timeline bar */}
              <div className="flex-1 flex items-center gap-1.5 min-w-0">
                <div className="flex-1 h-3 bg-muted/30 rounded-sm overflow-hidden">
                  <div
                    className={cn('h-full rounded-sm opacity-80', barColor)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={cn('text-[9px] w-12 shrink-0 text-right tabular-nums', statusColor(req.status))}>
                  {ms > 0 ? `${ms}ms` : '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
