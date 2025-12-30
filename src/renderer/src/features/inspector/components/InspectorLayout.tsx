import { ResizableSplit } from '../../../components/ResizableSplit';
import { RequestList } from './RequestList';
import { RequestDetails } from './RequestDetails';
import { FilterPanel, initialFilterState, InspectorFilter } from './FilterPanel';
import { ChatContainer } from './ChatContainer';
import { useState, useMemo, useEffect } from 'react';
import { NetworkRequest } from '../types';

interface InspectorLayoutProps {
  onBack: () => void;
  requests: NetworkRequest[];
  appName: string;
}

export function InspectorLayout({ onBack, requests, appName }: InspectorLayoutProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InspectorFilter>(() => {
    try {
      const saved = localStorage.getItem('inspector-filter-state');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed) {
        // Migration: Remove whitelist if present
        if ('whitelist' in parsed.host) delete (parsed.host as any).whitelist;
        if ('whitelist' in parsed.path) delete (parsed.path as any).whitelist;
        return { ...initialFilterState, ...parsed };
      }
      return initialFilterState;
    } catch {
      return initialFilterState;
    }
  });

  useEffect(() => {
    localStorage.setItem('inspector-filter-state', JSON.stringify(filter));
  }, [filter]);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Method
      if (
        !filter.methods[req.method as keyof typeof filter.methods] &&
        !(
          req.method !== 'GET' &&
          req.method !== 'POST' &&
          req.method !== 'PUT' &&
          req.method !== 'DELETE' &&
          filter.methods.OPTIONAL
        )
      ) {
        return false;
      }

      // Host
      if (filter.host.blacklist.some((blocked) => req.host.includes(blocked))) return false;

      // Path
      if (filter.path.blacklist.some((blocked) => req.path.includes(blocked))) return false;

      // Status
      const status = req.status;
      if (status === 0) {
        // Pending
        if (!filter.status.other) return false;
      } else if (status >= 200 && status < 300) {
        if (!filter.status.success) return false;
      } else if (status >= 300 && status < 400) {
        if (!filter.status.redirect) return false;
      } else if (status >= 400 && status < 500) {
        if (!filter.status.clientError) return false;
      } else if (status >= 500) {
        if (!filter.status.serverError) return false;
      } else {
        if (!filter.status.other) return false;
      }

      // Type
      const type = req.type.toLowerCase(); // 'xhr', 'js' etc usually set in InspectorPage
      // Simplistic mapping
      let typeKey: keyof typeof filter.type = 'other';
      if (type.includes('xhr') || type.includes('fetch')) typeKey = 'xhr';
      else if (type.includes('js') || type.includes('script')) typeKey = 'js';
      else if (type.includes('css')) typeKey = 'css';
      else if (
        type.includes('img') ||
        type.includes('image') ||
        type.includes('png') ||
        type.includes('jpg')
      )
        typeKey = 'img';
      else if (type.includes('media') || type.includes('video') || type.includes('audio'))
        typeKey = 'media';

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
            <RequestList
              requests={filteredRequests}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            <ResizableSplit direction="horizontal" initialSize={65} minSize={30} maxSize={80}>
              <RequestDetails request={selectedRequest} />
              <FilterPanel filter={filter} onChange={setFilter} />
            </ResizableSplit>
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
