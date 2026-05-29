import { useState, useEffect } from 'react';
import { X, Play, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface PendingBreakpoint {
  id: string;
  phase: 'request' | 'response';
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  statusCode?: number;
}

function headersToText(h: Record<string, string>) {
  return Object.entries(h).map(([k, v]) => `${k}: ${v}`).join('\n');
}

function textToHeaders(t: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of t.split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return result;
}

export function BreakpointEditorModal() {
  const [pending, setPending] = useState<PendingBreakpoint | null>(null);
  const [headersText, setHeadersText] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [showHeaders, setShowHeaders] = useState(true);

  useEffect(() => {
    const handler = (_: any, bp: PendingBreakpoint) => {
      setPending(bp);
      setHeadersText(headersToText(bp.headers || {}));
      setStatusCode(bp.statusCode?.toString() || '');
      setShowHeaders(true);
    };
    window.api.on('proxy:breakpoint-hit', handler);
    return () => window.api.off('proxy:breakpoint-hit', handler);
  }, []);

  if (!pending) return null;

  const resolve = async (drop: boolean) => {
    if (drop) {
      await window.api.invoke('proxy:resolve-breakpoint', pending.id, null);
    } else {
      const edited = {
        ...pending,
        headers: textToHeaders(headersText),
        statusCode: statusCode ? parseInt(statusCode) : pending.statusCode,
      };
      await window.api.invoke('proxy:resolve-breakpoint', pending.id, edited);
    }
    setPending(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[600px] max-h-[80vh] flex flex-col bg-dialog-background border border-divider rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-divider shrink-0">
          <div className={`px-2 py-0.5 rounded text-xs font-bold ${pending.phase === 'request' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
            {pending.phase.toUpperCase()}
          </div>
          <span className="text-xs font-bold text-text-secondary uppercase">{pending.method}</span>
          <span className="flex-1 text-xs text-text-primary truncate">{pending.url}</span>
          <button onClick={() => resolve(true)} className="p-1 rounded hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status code (response only) */}
        {pending.phase === 'response' && (
          <div className="px-4 py-2 border-b border-divider shrink-0 flex items-center gap-3">
            <span className="text-xs text-text-secondary w-24 shrink-0">Status Code</span>
            <input
              type="number"
              value={statusCode}
              onChange={e => setStatusCode(e.target.value)}
              className="w-24 h-7 bg-input-background border border-input-border-default rounded px-2 text-xs text-text-primary outline-none focus:border-primary/50"
            />
          </div>
        )}

        {/* Headers */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <button
            onClick={() => setShowHeaders(v => !v)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary border-b border-divider shrink-0"
          >
            {showHeaders ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Headers
          </button>
          {showHeaders && (
            <textarea
              value={headersText}
              onChange={e => setHeadersText(e.target.value)}
              className="flex-1 resize-none bg-[#1e1e1e] text-purple-100 font-mono text-xs p-3 outline-none min-h-[200px]"
              spellCheck={false}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-divider shrink-0">
          <button
            onClick={() => resolve(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Drop
          </button>
          <button
            onClick={() => resolve(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> Forward
          </button>
        </div>
      </div>
    </div>
  );
}
