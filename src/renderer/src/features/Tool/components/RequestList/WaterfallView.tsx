import { NetworkRequest } from '../../../../types/inspector';
import { cn } from '../../../../shared/lib/utils';
import { useMemo, useRef, useState } from 'react';

interface WaterfallViewProps {
  requests: NetworkRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// HAR-style timing phases (Chrome DevTools order)
interface Phases {
  blocked: number;
  dns: number;
  connect: number;
  ssl: number;
  send: number;
  wait: number;     // TTFB
  receive: number;  // Content Download
}

const PHASE_META: { key: keyof Phases; label: string; color: string }[] = [
  { key: 'blocked',  label: 'Stalled',  color: '#9ca3af' },
  { key: 'dns',      label: 'DNS',      color: '#a78bfa' },
  { key: 'connect',  label: 'Connect',  color: '#f97316' },
  { key: 'ssl',      label: 'SSL',      color: '#f59e0b' },
  { key: 'send',     label: 'Send',     color: '#34d399' },
  { key: 'wait',     label: 'TTFB',     color: '#60a5fa' },
  { key: 'receive',  label: 'Download', color: '#4ade80' },
];

function parseMs(v: unknown): number {
  if (v == null || v === -1) return 0;
  const n = parseFloat(String(v));
  return isNaN(n) || n < 0 ? 0 : n;
}

function parseTotalMs(time: string): number {
  if (!time || time === 'Pending') return 0;
  const n = parseFloat(time);
  if (time.endsWith('s') && !time.endsWith('ms')) return n * 1000;
  return n;
}

function getPhases(req: NetworkRequest): Phases {
  const t = req.timing;
  if (t && typeof t === 'object') {
    return {
      blocked: parseMs(t.blocked),
      dns:     parseMs(t.dns),
      connect: parseMs(t.connect),
      ssl:     parseMs(t.ssl),
      send:    parseMs(t.send),
      wait:    parseMs(t.wait),
      receive: parseMs(t.receive),
    };
  }
  const total = parseTotalMs(req.time);
  if (total <= 0) return { blocked: 0, dns: 0, connect: 0, ssl: 0, send: 0, wait: 0, receive: 0 };
  return { blocked: 0, dns: 0, connect: 0, ssl: 0, send: 0, wait: total * 0.7, receive: total * 0.3 };
}

function phaseTotal(p: Phases) {
  return p.blocked + p.dns + p.connect + p.ssl + p.send + p.wait + p.receive;
}

function statusColor(status: number) {
  if (status === 0) return 'text-text-secondary';
  if (status < 300) return 'text-green-400';
  if (status < 400) return 'text-yellow-400';
  return 'text-red-400';
}

const ROW_H = 30;
const LABEL_W = 300;
const TICK_COUNT = 5;

export function WaterfallView({ requests, selectedId, onSelect }: WaterfallViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; req: NetworkRequest; phases: Phases;
  } | null>(null);

  const { totalMs, startOffsets, allPhases } = useMemo(() => {
    const allPhases = requests.map(getPhases);
    const durations = allPhases.map(phaseTotal);
    const starts: number[] = [];
    let cursor = 0;
    for (let i = 0; i < requests.length; i++) {
      starts.push(cursor);
      cursor += durations[i] * 0.3;
    }
    const total = Math.max(1, ...starts.map((s, i) => s + durations[i]));
    return { totalMs: total, startOffsets: starts, allPhases };
  }, [requests]);

  if (requests.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-text-secondary bg-table-bodyBg">
        No requests
      </div>
    );
  }

  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => ({
    pct: i / TICK_COUNT,
    ms: Math.round((totalMs * i) / TICK_COUNT),
  }));

  return (
    <div className="flex-1 overflow-auto relative bg-table-bodyBg" ref={containerRef}>
      {/* Header */}
      <div className="sticky top-0 z-10 flex bg-table-headerBg border-b border-divider/20" style={{ height: 40 }}>
        <div
          className="shrink-0 flex items-center px-3 gap-0 border-r border-divider/20 text-xs text-text-secondary font-semibold"
          style={{ width: LABEL_W }}
        >
          <span className="w-12 shrink-0">Method</span>
          <span className="flex-1 min-w-0">Host</span>
          <span className="w-12 text-right shrink-0">Status</span>
          <span className="w-14 text-right shrink-0 pr-1">Time</span>
        </div>
        {/* Ruler + legend */}
        <div className="flex-1 relative overflow-hidden">
          {ticks.map((t) => (
            <div
              key={t.pct}
              className="absolute top-0 h-full flex flex-col justify-end pb-1"
              style={{ left: `${t.pct * 100}%`, transform: t.pct > 0 ? 'translateX(-50%)' : undefined }}
            >
              <span className="text-[9px] text-text-secondary tabular-nums px-0.5">{t.ms}ms</span>
              <div className="w-px h-2 bg-divider/50 mx-auto" />
            </div>
          ))}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {PHASE_META.filter(p => p.key !== 'blocked').map(p => (
              <span key={p.key} className="flex items-center gap-0.5 text-[9px] text-text-secondary">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: p.color }} />
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Rows */}
      <div>
        {requests.map((req, i) => {
          const phases = allPhases[i];
          const total = phaseTotal(phases);
          const startPct = (startOffsets[i] / totalMs) * 100;
          const totalPct = Math.max(0.3, (total / totalMs) * 100);
          const isSelected = req.id === selectedId;
          const isPending = total === 0;
          const reqMs = parseTotalMs(req.time);

          return (
            <div
              key={req.id}
              onClick={() => onSelect(req.id)}
              className={cn(
                'flex items-center border-b border-divider/20 cursor-pointer transition-colors text-xs',
                isSelected
                  ? 'bg-primary/15 border-l-2 border-l-primary hover:bg-primary/20'
                  : 'hover:bg-table-hoverItemBodyBg',
              )}
              style={{ height: ROW_H }}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Info columns */}
              <div
                className="shrink-0 flex items-center gap-0 px-3 border-r border-divider/20 h-full"
                style={{ width: LABEL_W }}
              >
                <span className="w-12 shrink-0 font-bold text-blue-400">{req.method}</span>
                <span className="flex-1 min-w-0 text-text-secondary truncate">{req.host}</span>
                <span className={cn('w-12 text-right shrink-0 tabular-nums font-medium', statusColor(req.status))}>
                  {req.status || '—'}
                </span>
                <span className="w-14 text-right shrink-0 tabular-nums text-text-secondary pr-1">
                  {reqMs > 0 ? `${reqMs}ms` : '—'}
                </span>
              </div>

              {/* Waterfall */}
              <div className="flex-1 relative h-full overflow-hidden">
                {ticks.map((t) => (
                  <div key={t.pct} className="absolute top-0 h-full w-px bg-divider/10" style={{ left: `${t.pct * 100}%` }} />
                ))}
                {isPending ? (
                  <span className="absolute top-1/2 -translate-y-1/2 left-3 text-[10px] text-text-secondary italic">pending…</span>
                ) : (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 flex h-3.5 overflow-hidden rounded-sm"
                    style={{ left: `${startPct}%`, width: `${totalPct}%` }}
                    onMouseEnter={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setTooltip({ x: rect.left, y: rect.top, req, phases });
                    }}
                  >
                    {PHASE_META.map(({ key, color }) => {
                      const pct = total > 0 ? (phases[key] / total) * 100 : 0;
                      if (pct < 0.1) return null;
                      return <div key={key} style={{ width: `${pct}%`, backgroundColor: color, opacity: isSelected ? 1 : 0.8 }} />;
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-table-headerBg border border-divider rounded-md shadow-xl px-3 py-2 text-xs pointer-events-none min-w-[200px]"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="font-medium text-text-primary truncate max-w-[260px] mb-1.5">
            {tooltip.req.host}{tooltip.req.path}
          </div>
          <div className="space-y-0.5">
            {PHASE_META.map(({ key, label, color }) => {
              const ms = tooltip.phases[key];
              if (ms <= 0) return null;
              return (
                <div key={key} className="flex items-center gap-2 justify-between">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <span className="w-2 h-2 rounded-sm inline-block shrink-0" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                  <span className="tabular-nums text-text-primary font-medium">{ms.toFixed(1)}ms</span>
                </div>
              );
            })}
            <div className="border-t border-divider/30 mt-1 pt-1 flex justify-between">
              <span className="text-text-secondary">Total</span>
              <span className="tabular-nums font-bold text-text-primary">{phaseTotal(tooltip.phases).toFixed(1)}ms</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
