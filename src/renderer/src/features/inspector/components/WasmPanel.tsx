import { useState, useEffect, useMemo } from 'react';
import { NetworkRequest } from '../types';
import { X, FileCode, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { WasmViewer } from './WasmViewer';
import { detectWasmModules, WasmItem } from '../utils/detectors';

interface WasmPanelProps {
  requests: NetworkRequest[];
  onClose: () => void;
}

export function WasmPanel({ requests, onClose }: WasmPanelProps) {
  const [wasmItems, setWasmItems] = useState<WasmItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedWasmId, setSelectedWasmId] = useState<string | null>(null);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedWasmId),
    [requests, selectedWasmId],
  );

  useEffect(() => {
    setIsScanning(true);
    const items = detectWasmModules(requests);
    setWasmItems(items);
    setIsScanning(false);
  }, [requests]);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="h-10 border-b border-border flex items-center shrink-0 bg-background/50 z-10 px-4 justify-between">
        <div className="flex items-center gap-2 font-medium text-sm text-purple-400">
          <FileCode className="w-4 h-4" />
          Web Assembly (WASM) Modules
          <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            {wasmItems.length} found
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          {wasmItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.detectionMethod !== 'JS Heuristic') {
                  setSelectedWasmId(item.id);
                }
              }}
              title={
                item.detectionMethod === 'JS Heuristic'
                  ? 'JS Loader - Not a binary WASM file'
                  : 'Click to disassemble'
              }
              className={cn(
                'border border-border rounded-lg bg-card p-3 flex flex-col gap-3 hover:border-purple-500/50 transition-colors shadow-sm group',
                item.detectionMethod !== 'JS Heuristic'
                  ? 'cursor-pointer hover:bg-muted/50'
                  : 'cursor-default opacity-80',
              )}
            >
              {/* Row 1: Header (Icon + Name) */}
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                  <span className="text-xs font-bold">ASM</span>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate" title={item.filename}>
                      {item.filename}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate" title={item.url}>
                    {item.url}
                  </span>
                </div>
              </div>

              {/* Row 2: Stats Grid */}
              <div className="grid grid-cols-3 gap-2 w-full p-2 rounded bg-muted/30 text-xs">
                <div className="flex flex-col overflow-hidden">
                  <span className="text-muted-foreground text-[10px] uppercase tracking-wider truncate">
                    Size
                  </span>
                  <span className="font-medium truncate" title={item.size}>
                    {item.size}
                  </span>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-muted-foreground text-[10px] uppercase tracking-wider truncate">
                    Detection
                  </span>
                  <span className="font-medium truncate" title={item.detectionMethod}>
                    {item.detectionMethod}
                  </span>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-muted-foreground text-[10px] uppercase tracking-wider truncate">
                    Confidence
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {item.confidence === 'High' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    )}
                    {item.confidence === 'Medium' && (
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                    )}
                    {item.confidence === 'Low' && (
                      <ShieldAlert className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    )}
                    <span
                      className={cn(
                        'font-medium truncate',
                        item.confidence === 'High'
                          ? 'text-green-500'
                          : item.confidence === 'Medium'
                            ? 'text-yellow-500'
                            : 'text-blue-500',
                      )}
                    >
                      {item.confidence}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 3: Extra Details (if any) */}
              {item.details && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1.5 rounded">
                  <div className="w-1 h-1 rounded-full bg-purple-500/50 shrink-0" />
                  <span className="truncate" title={item.details}>
                    {item.details}
                  </span>
                </div>
              )}
            </div>
          ))}

          {wasmItems.length === 0 && !isScanning && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileCode className="w-8 h-8 opacity-50" />
              </div>
              <p>No WebAssembly modules detected yet.</p>
              <p className="text-xs opacity-70 mt-1">
                Try navigating to a page that uses WASM (like Figma, Earth, etc.)
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedRequest && (
        <WasmViewer
          url={`${selectedRequest.protocol}://${selectedRequest.host}${selectedRequest.path}`}
          responseBody={selectedRequest.responseBody}
          onClose={() => setSelectedWasmId(null)}
        />
      )}
    </div>
  );
}
