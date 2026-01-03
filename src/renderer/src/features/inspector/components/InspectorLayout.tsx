import { ResizableSplit } from '../../../components/ResizableSplit';
import { RequestList } from './RequestList';
import { RequestDetails } from './RequestDetails';
import { FilterPanel, initialFilterState, InspectorFilter } from './FilterPanel';
import { ChatContainer } from './ChatContainer';
import { useState, useMemo, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { NetworkRequest } from '../types';

interface InspectorLayoutProps {
  onBack: () => void;
  requests: NetworkRequest[];
  appName: string;
}

export function InspectorLayout({ onBack, requests, appName }: InspectorLayoutProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [detailsTab, setDetailsTab] = useState('overview');
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

      // Pending requests (status 0) should always be visible to show activity
      if (req.status === 0) return true;

      // Host
      // Host (Whitelist)
      const hostWhitelist = filter.host.whitelist || [];
      if (hostWhitelist.length > 0 && !hostWhitelist.some((allowed) => req.host.includes(allowed)))
        return false;

      // Path (Whitelist)
      const pathWhitelist = filter.path.whitelist || [];
      if (pathWhitelist.length > 0 && !pathWhitelist.some((allowed) => req.path.includes(allowed)))
        return false;

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
