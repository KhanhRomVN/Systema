import { useState, useEffect, useMemo } from 'react';
import { NetworkRequest } from '../../../../../types/inspector';
import { FileCode, Download, Search, Cpu } from 'lucide-react';
import { cn } from '../../../../../shared/lib/utils';
import { useI18n } from '../../../../../i18n/i18nContext';
import { detectWasmModules, WasmItem } from '../../../../../utils/detectors';

interface WasmPanelProps {
  requests: NetworkRequest[];
  onClose: () => void;
}

function WasmCard({ item, request, t }: { item: WasmItem; request?: NetworkRequest; t: any }) {
  const isClickable = item.detectionMethod !== 'JS Heuristic';

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!request?.responseBody) return;
    try {
      const bytes = Uint8Array.from(atob(request.responseBody), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/wasm' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: item.filename });
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <div className={cn(
      'group rounded-xl border border-divider bg-muted/10 p-3 flex flex-col gap-2.5 transition-all',
      !isClickable && 'opacity-60'
    )}>
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
          <Cpu className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate leading-tight">{item.filename}</p>
          <p className="text-[10px] text-text-secondary truncate mt-0.5">{item.url}</p>
        </div>
        {isClickable && (
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-text-secondary hover:text-purple-400 hover:bg-purple-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
            title={t.wasm.download}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function WasmPanel({ requests, onClose }: WasmPanelProps) {
  const { t } = useI18n();
  const [wasmItems, setWasmItems] = useState<WasmItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setWasmItems(detectWasmModules(requests));
  }, [requests]);

  const filtered = useMemo(() =>
    wasmItems.filter(item =>
      !searchTerm ||
      item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.url.toLowerCase().includes(searchTerm.toLowerCase())
    ), [wasmItems, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-table-bodyBg">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-purple-500/15 border border-purple-500/25 shrink-0">
          <FileCode className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-text-primary">{t.wasm.title}</h2>
          <p className="text-xs text-text-secondary mt-0.5">{t.wasm.desc}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all">
          ✕
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-divider shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder={t.wasm.searchModules}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-11 bg-input-background border border-input-border-default rounded-lg pl-8 pr-3 text-sm text-text-primary focus:border-primary/50 outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {filtered.map(item => (
          <WasmCard key={item.id} item={item} request={requests.find(r => r.id === item.id)} t={t} />
        ))}

        {wasmItems.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 py-20 gap-3">
            <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <FileCode className="w-7 h-7 text-purple-400/50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary">{t.wasm.noModules}</p>
              <p className="text-xs text-text-secondary mt-0.5">{t.wasm.noModulesDesc}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export type { WasmPanelProps };
