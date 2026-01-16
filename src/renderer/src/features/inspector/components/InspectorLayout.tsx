import { ResizableSplit } from '../../../components/ResizableSplit';
import { RequestList } from './RequestList';
import { RequestDetails } from './RequestDetails';
import { initialFilterState, InspectorFilter } from './FilterPanel';
import { ChatContainer } from './ChatContainer';
import { useState, useMemo, useEffect } from 'react';
import { NetworkRequest } from '../types';
import { cn } from '../../../shared/lib/utils';

interface InspectorLayoutProps {
  onBack: () => void;
  requests: NetworkRequest[];
  appName: string;
  onDelete: (id: string) => void;
  platform?: 'web' | 'pc' | 'android';
  fridaStatus?: 'running' | 'stopped' | 'unknown';
  onInstallFrida?: () => void;
  onStartFrida?: () => void;
  onInjectBypass?: () => void;
}

export function InspectorLayout({
  onBack,
  requests,
  appName,
  onDelete,
  platform,
  fridaStatus,
  onInstallFrida,
  onStartFrida,
  onInjectBypass,
}: InspectorLayoutProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [detailsTab, setDetailsTab] = useState('overview');

  // Intercept state
  const [isIntercepting, setIsIntercepting] = useState(false);
  const [interceptedIds, setInterceptedIds] = useState<Set<string>>(new Set());
  const [pendingActionIds, setPendingActionIds] = useState<Set<string>>(new Set());
  const [processedIds] = useState(new Set<string>()); // helper to track seen IDs for interception

  const handleSetIntercept = (enabled: boolean) => {
    setIsIntercepting(enabled);
    window.api.invoke('proxy:set-intercept', enabled);
    if (!enabled) {
      setPendingActionIds(new Set()); // Clear pending actions when disabled
    }
  };

  const handleForward = async (id: string) => {
    await window.api.invoke('proxy:forward-request', id);
    setPendingActionIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleDrop = async (id: string) => {
    await window.api.invoke('proxy:drop-request', id);
    setPendingActionIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Track new requests for interception
  useEffect(() => {
    let hasNewIntercepted = false;
    let hasNewPending = false;
    const newIntercepted = new Set(interceptedIds);
    const newPending = new Set(pendingActionIds);

    requests.forEach((req) => {
      // If we haven't processed this ID yet
      if (!processedIds.has(req.id)) {
        processedIds.add(req.id); // Mark as seen

        // If request is marked as intercepted by proxy (BLOCKING)
        if (req.isIntercepted) {
          newIntercepted.add(req.id);
          newPending.add(req.id);
          hasNewIntercepted = true;
          hasNewPending = true;
        }
        // Logic solely for local highlighting if enabled (fallback)
        else if (isIntercepting) {
          newIntercepted.add(req.id);
          hasNewIntercepted = true;
        }
      }
    });

    if (hasNewIntercepted) setInterceptedIds(newIntercepted);
    if (hasNewPending) setPendingActionIds(newPending);
  }, [requests, isIntercepting, processedIds]);

  // Make sure we mark all initial/incoming requests as processed even if not intercepting
  // so we don't "catch up" old requests when turning on intercept
  useEffect(() => {
    requests.forEach((req) => {
      if (!processedIds.has(req.id)) {
        processedIds.add(req.id);
      }
    });
  }, [requests]);

  const [filter, setFilter] = useState<InspectorFilter>(() => {
    try {
      const saved = localStorage.getItem(`inspector-filter-state-${appName}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed) {
        // Migration: Remove blacklist if present (migrated to whitelist)
        if ('blacklist' in parsed.host) delete (parsed.host as any).blacklist;
        if ('blacklist' in parsed.path) delete (parsed.path as any).blacklist;

        // Migration: Check for legacy status keys (success, redirect, etc)
        const statusKeys = Object.keys(parsed.status || {});
        if (
          statusKeys.some((k) =>
            ['success', 'redirect', 'clientError', 'serverError', 'other'].includes(k),
          )
        ) {
          // Found legacy status, reset status to initial (granular)
          parsed.status = initialFilterState.status;
        }

        return { ...initialFilterState, ...parsed };
      }
      return initialFilterState;
    } catch {
      return initialFilterState;
    }
  });

  useEffect(() => {
    localStorage.setItem(`inspector-filter-state-${appName}`, JSON.stringify(filter));
  }, [filter, appName]);

  const filteredRequests = useMemo(() => {
    const result = requests.filter((req) => {
      // Method
      if (!filter.methods[req.method as keyof typeof filter.methods]) {
        return false;
      }

      // Host (Whitelist) - Apply even to pending requests
      const hostWhitelist = filter.host.whitelist || [];
      if (hostWhitelist.length > 0 && !hostWhitelist.some((allowed) => req.host.includes(allowed)))
        return false;

      // Path (Whitelist) - Apply even to pending requests
      const pathWhitelist = filter.path.whitelist || [];
      if (pathWhitelist.length > 0 && !pathWhitelist.some((allowed) => req.path.includes(allowed)))
        return false;

      // Pending requests (status 0) skip remaining filters but respect host/path
      if (req.status === 0) return true;

      // Status
      if (
        req.status !== 0 &&
        typeof filter.status[req.status] !== 'undefined' &&
        !filter.status[req.status]
      ) {
        return false;
      }

      // Type
      const type = req.type.toLowerCase();
      let typeKey: keyof typeof filter.type = 'other';

      // Improved Type Detection
      if (type.includes('xhr') || type.includes('fetch')) typeKey = 'xhr';
      else if (type.includes('js') || type.includes('script') || req.path.match(/\.js(\?|$)/))
        typeKey = 'js';
      else if (type.includes('css') || req.path.match(/\.css(\?|$)/)) typeKey = 'css';
      else if (
        type.includes('img') ||
        type.includes('image') ||
        type.includes('png') ||
        type.includes('jpg') ||
        type.includes('jpeg') ||
        type.includes('gif') ||
        type.includes('svg') ||
        type.includes('ico') ||
        type.includes('webp') ||
        req.path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)(\?|$)/)
      )
        typeKey = 'img';
      else if (
        type.includes('media') ||
        type.includes('video') ||
        type.includes('audio') ||
        req.path.match(/\.(mp4|webm|ogg|mp3|wav)(\?|$)/)
      )
        typeKey = 'media';
      else if (
        type.includes('font') ||
        type.includes('woff') ||
        type.includes('ttf') ||
        req.path.match(/\.(woff|woff2|ttf|otf|eot)(\?|$)/)
      )
        typeKey = 'font';
      else if (
        type.includes('ws') ||
        type.includes('websocket') ||
        req.protocol === 'ws' ||
        req.protocol === 'wss'
      )
        typeKey = 'ws';
      else if (type.includes('wasm') || req.path.match(/\.wasm(\?|$)/)) typeKey = 'wasm';
      else if (type.includes('manifest') || req.path.match(/manifest\.json(\?|$)/))
        // Simple check
        typeKey = 'manifest';
      else if (
        type.includes('doc') ||
        type.includes('html') ||
        type.includes('document') ||
        (!typeKey && !req.path.includes('.')) // no extension often implies doc/api
      )
        typeKey = 'doc';

      if (!filter.type[typeKey]) return false;

      // Size
      if (filter.size.min || filter.size.max) {
        const sizeBytes = parseSize(req.size);
        if (filter.size.min && sizeBytes < parseInt(filter.size.min)) return false;
        if (filter.size.max && sizeBytes > parseInt(filter.size.max)) return false;
      }

      // Time
      if (filter.time.min || filter.time.max) {
        const timeMs = parseTime(req.time);
        if (filter.time.min && timeMs < parseInt(filter.time.min)) return false;
        if (filter.time.max && timeMs > parseInt(filter.time.max)) return false;
      }

      return true;
    });

    return result;
  }, [requests, filter]);

  const selectedRequest = requests.find((r) => r.id === selectedId) || null;

  return (
    <div className="h-full w-full bg-background text-foreground flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="h-10 border-b border-border flex items-center px-4 bg-muted/40 gap-4">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2 py-1 rounded text-xs border border-transparent hover:border-border transition-all"
        >
          &larr; Back
        </button>
        <div className="h-4 w-px bg-border/50" />
        <span className="font-semibold text-sm">Network Inspector</span>

        {/* Intercept Button */}
        <button
          onClick={() => handleSetIntercept(!isIntercepting)}
          className={cn(
            'ml-2 px-3 py-1 rounded text-xs font-medium border transition-all flex items-center gap-2',
            isIntercepting
              ? 'bg-red-500/10 text-red-500 border-red-500/30 animate-pulse'
              : 'bg-transparent text-muted-foreground border-border hover:bg-muted/50',
          )}
        >
          <div
            className={cn('w-2 h-2 rounded-full', isIntercepting ? 'bg-red-500' : 'bg-gray-400')}
          />
          {isIntercepting ? 'Intercepting (Blocking)' : 'Intercept'}
        </button>

        {platform === 'android' && (
          <div className="flex items-center gap-2 ml-2 border-l border-border/50 pl-2">
            <span className="text-xs text-muted-foreground mr-1">Frida:</span>

            {fridaStatus === 'running' ? (
              <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Running
              </span>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={onInstallFrida}
                  className="px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80 border border-border transition-colors"
                  title="Install Frida Server on Device"
                >
                  Install
                </button>
                <button
                  onClick={onStartFrida}
                  className="px-2 py-1 rounded text-xs bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 border border-blue-500/30 transition-colors"
                  title="Start Frida Server"
                >
                  Start
                </button>
              </div>
            )}

            {fridaStatus === 'running' && (
              <button
                onClick={onInjectBypass}
                className="px-2 py-1 rounded text-xs bg-purple-600/10 text-purple-500 hover:bg-purple-600/20 border border-purple-500/30 transition-colors ml-1"
                title="Inject Universal SSL Pinning Bypass"
              >
                Inject SSL Bypass
              </button>
            )}
          </div>
        )}

        <div className="ml-auto text-xs text-muted-foreground">
          {filteredRequests.length} / {requests.length} requests
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <ResizableSplit direction="horizontal" initialSize={70} minSize={30} maxSize={80}>
          <ResizableSplit direction="vertical" initialSize={50} minSize={20} maxSize={80}>
            <div className="h-full flex flex-col">
              {filteredRequests.length === 0 && requests.length > 0 && (
                <div className="p-4 bg-yellow-500/10 text-yellow-500 text-xs text-center border-b border-yellow-500/20">
                  All {requests.length} requests are hidden by filters.
                  <button
                    onClick={() => setFilter({ ...initialFilterState })}
                    className="ml-2 underline hover:text-yellow-400"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
              <RequestList
                requests={filteredRequests}
                selectedId={selectedId}
                onSelect={setSelectedId}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                interceptedIds={interceptedIds}
                pendingActionIds={pendingActionIds}
                onForward={handleForward}
                onDrop={handleDrop}
                onDelete={onDelete}
              />
            </div>

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
            />
          </ResizableSplit>

          <ChatContainer
            inspectorContext={{
              requests,
              filteredRequests, // Pass the filtered list
              selectedRequestId: selectedId,
              filter,
              onSetFilter: setFilter,
              onSelectRequest: setSelectedId,
              targetApp: appName,
            }}
          />
        </ResizableSplit>
      </div>
    </div>
  );
}

function parseSize(sizeStr: string): number {
  if (!sizeStr || sizeStr === 'Pending') return 0;
  const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  const match = sizeStr.match(/^([\d.]+)\s*([A-Za-z]+)$/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase() as keyof typeof units;
  return val * (units[unit] || 1);
}

function parseTime(timeStr: string): number {
  if (!timeStr || timeStr === 'Pending') return 0;
  return parseFloat(timeStr.replace('ms', '').replace('s', '000')); // simplistic
}
